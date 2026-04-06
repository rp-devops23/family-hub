import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getValidAccessToken, fetchCalendarEvents, fetchGmailSummary } from "../_shared/google_refresh.ts"
import { AGENT_CONFIG } from "../_shared/agent_config.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function needsSonnet(message: string): boolean {
  const { smartKeywords, smartMinLength } = AGENT_CONFIG.models
  return smartKeywords.some(k => message.toLowerCase().includes(k)) || message.length > smartMinLength
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const ok = (body: unknown) => new Response(JSON.stringify(body), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })

  try {
    const { message, conversationId } = await req.json()
    if (!message?.trim()) return ok({ error: 'Message is required' })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!

    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return ok({ error: 'Missing Authorization header — not logged in?' })

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError?.message)
      return ok({ error: 'Auth failed: ' + (authError?.message ?? 'no user') })
    }

    const db = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })

    // Get or create conversation
    let convId = conversationId
    if (!convId) {
      const { data: conv, error: convErr } = await db
        .from('agent_conversations')
        .insert({ user_id: user.id, title: message.slice(0, 60) })
        .select('id').single()
      if (convErr) { console.error('Conv error:', convErr.message); return ok({ error: 'DB: ' + convErr.message }) }
      convId = conv.id
    }

    // Save user message
    const { error: msgErr } = await db.from('agent_messages').insert({ conversation_id: convId, role: 'user', content: message })
    if (msgErr) { console.error('Msg error:', msgErr.message); return ok({ error: 'DB: ' + msgErr.message }) }

    // Load history
    const { data: history } = await db.from('agent_messages').select('role, content').eq('conversation_id', convId).order('created_at', { ascending: true }).limit(AGENT_CONFIG.conversation.historyLimit)
    const messages = history?.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })) ?? [{ role: 'user' as const, content: message }]

    // Load app context + Google context in parallel
    const [
      { data: tx }, { data: budgets }, { data: recipes }, { data: shopping },
      { data: tasks },
      googleAccessToken
    ] = await Promise.all([
      db.from('transactions').select('date, amount, type, description').eq('user_id', user.id).order('date', { ascending: false }).limit(AGENT_CONFIG.finance.transactionsLimit),
      db.from('budgets').select('name, amount_limit, period').eq('user_id', user.id).eq('is_active', true).limit(AGENT_CONFIG.finance.budgetsLimit),
      db.from('recipes').select('name, meal_type').eq('user_id', user.id).limit(AGENT_CONFIG.recipes.recipesLimit),
      db.from('shopping_items').select('name, quantity, unit').eq('user_id', user.id).eq('checked', false).limit(AGENT_CONFIG.recipes.shoppingItemsLimit),
      db.from('tasks').select('category, name, done, expires_at').eq('user_id', user.id).order('expires_at', { ascending: true }),
      getValidAccessToken(user.id),
    ])

    // Fetch Google data if connected
    let calendarCtx = ''
    let gmailCtx = ''
    if (googleAccessToken) {
      const [cal, gmail] = await Promise.all([
        fetchCalendarEvents(googleAccessToken),
        fetchGmailSummary(googleAccessToken),
      ])
      calendarCtx = cal
      gmailCtx = gmail
    }

    const googleSection = googleAccessToken
      ? `\nAgenda Google (7 prochains jours):\n${calendarCtx || '(aucun événement)'}\n\nEmails récents (Gmail):\n${gmailCtx || '(aucun)'}`
      : '\n(Google non connecté — pas de données agenda/email)'

    // Compute financial balance from transactions
    const allTx = tx ?? []
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    const monthTx = allTx.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear
    })
    const monthIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const monthExpenses = monthTx.filter(t => (t.type || 'expense') === 'expense').reduce((s, t) => s + t.amount, 0)
    const monthBalance = monthIncome - monthExpenses

    const financeSection = `Transactions récentes: ${JSON.stringify(allTx)}\nRevenus ce mois: ${monthIncome.toFixed(2)}€ | Dépenses ce mois: ${monthExpenses.toFixed(2)}€ | Balance ce mois: ${monthBalance.toFixed(2)}€`

    // Tasks summary
    const pendingTasks = (tasks ?? []).filter(t => !t.done)
    const overdueTasks = pendingTasks.filter(t => t.expires_at && new Date(t.expires_at) < now)
    const taskSection = `Tâches en attente (${pendingTasks.length}): corvées=${pendingTasks.filter(t=>t.category==='chore').length}, travaux=${pendingTasks.filter(t=>t.category==='work').length}${overdueTasks.length > 0 ? ` — EN RETARD: ${overdueTasks.map(t=>t.name).join(', ')}` : ''}`

    const system = `Tu es Family Agent, l'assistant IA de la famille. Tu aides avec les finances, les recettes, l'organisation, le calendrier et les tâches ménagères.
Finances: ${financeSection}
Budgets: ${JSON.stringify(budgets ?? [])}
Recettes: ${JSON.stringify(recipes ?? [])}
Courses: ${JSON.stringify(shopping ?? [])}
Tâches: ${taskSection}${googleSection}
Réponds dans la langue de l'utilisateur. Sois concis et utile. Pour les suggestions de budget vacances/travaux/épargne, base-toi sur la balance mensuelle réelle. N'invente pas de données.`

    // Call Anthropic
    const model = needsSonnet(message) ? AGENT_CONFIG.models.smart : AGENT_CONFIG.models.fast
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: AGENT_CONFIG.models.maxTokens, system, messages }),
    })

    if (!res.ok) {
      const txt = await res.text()
      console.error('Anthropic error:', res.status, txt)
      return ok({ error: `Anthropic ${res.status}: ${txt}` })
    }

    const ai = await res.json()
    const reply = ai.content?.[0]?.text
    if (!reply) return ok({ error: 'Empty AI response: ' + JSON.stringify(ai) })

    await db.from('agent_messages').insert({ conversation_id: convId, role: 'assistant', content: reply })
    await db.from('agent_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId)

    return ok({ message: reply, conversationId: convId, model, googleConnected: !!googleAccessToken })

  } catch (err) {
    console.error('Unhandled:', err?.message)
    return ok({ error: 'Unhandled error: ' + (err?.message ?? String(err)) })
  }
})
