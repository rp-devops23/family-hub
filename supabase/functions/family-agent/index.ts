import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getValidAccessToken, fetchCalendarEvents, fetchGmailSummary } from "../_shared/google_refresh.ts"
import { AGENT_CONFIG } from "../_shared/agent_config.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================================
// TOOL DEFINITIONS — Finance (phase 1)
// ============================================================================

const TOOLS = [
  {
    name: "create_transaction",
    description: `Crée une nouvelle transaction financière (dépense ou revenu) dans la base de données.
Règles importantes :
- N'appelle cet outil QUE si tu as le montant, la description et le type (dépense/revenu).
- Si la date n'est pas précisée, utilise la date d'aujourd'hui.
- Si la sous-catégorie est ambiguë, choisis la plus logique (ex: "restaurant" → Restaurant, "supermarché" → Courses). Mentionne ton choix dans ta réponse.
- Si un seul compte est disponible, utilise-le automatiquement. Si plusieurs et non précisé, demande lequel avant d'appeler l'outil.
- Si des infos critiques manquent (montant ou description), pose une question précise plutôt qu'appeler l'outil.`,
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date de la transaction au format YYYY-MM-DD. Utilise aujourd'hui si non précisé.",
        },
        amount: {
          type: "number",
          description: "Montant en euros, toujours positif (même pour une dépense).",
        },
        description: {
          type: "string",
          description: "Description courte et claire de la transaction (ex: 'Restaurant Le Jardin', 'Courses Carrefour', 'Salaire mai').",
        },
        type: {
          type: "string",
          enum: ["expense", "income"],
          description: "'expense' pour une dépense, 'income' pour un revenu/salaire.",
        },
        subcategory_id: {
          type: "string",
          description: "UUID exact de la sous-catégorie la plus appropriée (disponible dans le contexte). Peut être omis si vraiment aucune ne correspond.",
        },
        account_id: {
          type: "string",
          description: "UUID exact du compte bancaire (disponible dans le contexte). Obligatoire si plusieurs comptes disponibles.",
        },
      },
      required: ["date", "amount", "description", "type"],
    },
  },
]

// ============================================================================
// HELPERS
// ============================================================================

function needsSonnet(message: string): boolean {
  const { smartKeywords, smartMinLength } = AGENT_CONFIG.models
  const actionKeywords = [
    'ajoute', 'ajouter', 'add', 'crée', 'créer', 'create', 'insère', 'insérer', 'insert',
    'dépensé', 'dépense', 'spent', 'acheté', 'achat', 'payé', 'paid',
    'revenu', 'salaire', 'income', 'reçu', 'received',
    'transaction', 'facture',
  ]
  const allKeywords = [...smartKeywords, ...actionKeywords]
  return allKeywords.some(k => message.toLowerCase().includes(k)) || message.length > smartMinLength
}

async function callAnthropic(
  apiKey: string,
  model: string,
  system: string,
  messages: any[],
  tools?: any[],
): Promise<any> {
  const body: any = { model, max_tokens: AGENT_CONFIG.models.maxTokens, system, messages }
  if (tools?.length) body.tools = tools

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Anthropic ${res.status}: ${txt}`)
  }
  return res.json()
}

async function executeTool(
  name: string,
  input: any,
  db: any,
  userId: string,
): Promise<{ success: boolean; data?: any; error?: string; summary?: string }> {
  if (name === 'create_transaction') {
    const payload: any = {
      user_id: userId,
      date: input.date,
      amount: input.amount,
      description: input.description,
      type: input.type,
    }
    if (input.subcategory_id) payload.subcategory_id = input.subcategory_id
    if (input.account_id) payload.account_id = input.account_id

    const { data, error } = await db.from('transactions').insert(payload).select().single()
    if (error) return { success: false, error: error.message }

    return {
      success: true,
      data,
      summary: `Transaction insérée avec succès — ${input.description}, ${input.amount}€ (${input.type === 'expense' ? 'dépense' : 'revenu'}), le ${input.date}`,
    }
  }

  return { success: false, error: `Outil inconnu: ${name}` }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const ok = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const { message, conversationId } = await req.json()
    if (!message?.trim()) return ok({ error: 'Message requis' })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!

    // ---- Auth ---------------------------------------------------------------
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return ok({ error: 'Missing Authorization header' })

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return ok({ error: 'Auth failed: ' + (authError?.message ?? 'no user') })

    const db = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })

    // ---- Conversation -------------------------------------------------------
    let convId = conversationId
    if (!convId) {
      const { data: conv, error: convErr } = await db
        .from('agent_conversations')
        .insert({ user_id: user.id, title: message.slice(0, 60) })
        .select('id').single()
      if (convErr) return ok({ error: 'DB: ' + convErr.message })
      convId = conv.id
    }

    await db.from('agent_messages').insert({ conversation_id: convId, role: 'user', content: message })

    const { data: history } = await db
      .from('agent_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(AGENT_CONFIG.conversation.historyLimit)

    const messages = history?.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })) ?? [{ role: 'user' as const, content: message }]

    // ---- Load all context in parallel ---------------------------------------
    const [
      { data: tx }, { data: budgets },
      { data: recipes }, { data: shopping }, { data: tasks },
      { data: categories }, { data: subcategories }, { data: accounts },
      googleAccessToken,
    ] = await Promise.all([
      db.from('transactions').select('date, amount, type, description, subcategory_id, account_id')
        .eq('user_id', user.id).order('date', { ascending: false }).limit(AGENT_CONFIG.finance.transactionsLimit),
      db.from('budgets').select('name, amount_limit, period')
        .eq('user_id', user.id).eq('is_active', true).limit(AGENT_CONFIG.finance.budgetsLimit),
      db.from('recipes').select('name, meal_type')
        .eq('user_id', user.id).limit(AGENT_CONFIG.recipes.recipesLimit),
      db.from('shopping_items').select('name, quantity, unit')
        .eq('user_id', user.id).eq('checked', false).limit(AGENT_CONFIG.recipes.shoppingItemsLimit),
      db.from('tasks').select('category, name, done, expires_at')
        .eq('user_id', user.id).order('expires_at', { ascending: true }),
      db.from('categories').select('id, name_fr, name_en, color')
        .eq('user_id', user.id).order('sort_order', { ascending: true }),
      db.from('subcategories').select('id, name_fr, name_en, category_id')
        .eq('user_id', user.id).order('sort_order', { ascending: true }),
      db.from('accounts').select('id, name, bank, color, is_default')
        .eq('user_id', user.id).order('sort_order', { ascending: true }),
      getValidAccessToken(user.id),
    ])

    // ---- Build finance context for agent ------------------------------------
    const catMap = new Map((categories ?? []).map((c: any) => [c.id, c]))

    const subcatLines = (subcategories ?? []).map((sc: any) => {
      const cat = catMap.get(sc.category_id)
      return `  • ${cat?.name_fr ?? '?'} › ${sc.name_fr} — subcategory_id: "${sc.id}"`
    }).join('\n')

    const accountLines = (accounts ?? []).length === 0
      ? '  (aucun compte configuré — subcategory_id sera null)'
      : (accounts ?? []).map((a: any) => `  • ${a.name}${a.bank ? ` (${a.bank})` : ''}${a.is_default ? ' [défaut]' : ''} — account_id: "${a.id}"`).join('\n')

    // ---- Finance summary ----------------------------------------------------
    const allTx = tx ?? []
    const now = new Date()
    const thisMonth = now.getMonth(), thisYear = now.getFullYear()
    const monthTx = allTx.filter((t: any) => {
      const d = new Date(t.date)
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear
    })
    const monthIncome = monthTx.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0)
    const monthExpenses = monthTx.filter((t: any) => (t.type || 'expense') === 'expense').reduce((s: number, t: any) => s + t.amount, 0)

    // ---- Tasks --------------------------------------------------------------
    const pendingTasks = (tasks ?? []).filter((t: any) => !t.done)
    const overdueTasks = pendingTasks.filter((t: any) => t.expires_at && new Date(t.expires_at) < now)

    // ---- Google context -----------------------------------------------------
    let calendarCtx = '', gmailCtx = ''
    if (googleAccessToken) {
      const [cal, gmail] = await Promise.all([
        fetchCalendarEvents(googleAccessToken),
        fetchGmailSummary(googleAccessToken),
      ])
      calendarCtx = cal; gmailCtx = gmail
    }
    const googleSection = googleAccessToken
      ? `\nAgenda Google:\n${calendarCtx || '(aucun événement)'}\n\nEmails récents:\n${gmailCtx || '(aucun)'}`
      : '\n(Google non connecté)'

    // ---- System prompt ------------------------------------------------------
    const todayStr = now.toISOString().split('T')[0]
    const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

    const system = `Tu es Family Agent, l'assistant IA de la famille. Tu aides à gérer les finances, recettes, tâches et l'organisation familiale.

## Date & heure actuelle
Aujourd'hui : ${todayStr} (${dayNames[now.getDay()]})
Hier : ${new Date(now.getTime() - 86400000).toISOString().split('T')[0]}

## Finances
Transactions récentes (${allTx.length}) : ${JSON.stringify(allTx.slice(0, 30))}
Ce mois : revenus ${monthIncome.toFixed(2)}€ | dépenses ${monthExpenses.toFixed(2)}€ | balance ${(monthIncome - monthExpenses).toFixed(2)}€
Budgets actifs : ${JSON.stringify(budgets ?? [])}

## Sous-catégories disponibles pour créer une transaction
(utilise l'UUID exact dans subcategory_id)
${subcatLines || '  (aucune sous-catégorie)'}

## Comptes bancaires disponibles
(utilise l'UUID exact dans account_id)
${accountLines}

## Recettes & courses
Recettes : ${JSON.stringify(recipes ?? [])}
Liste de courses (non cochés) : ${JSON.stringify(shopping ?? [])}

## Tâches
En attente (${pendingTasks.length}) : corvées=${pendingTasks.filter((t: any) => t.category === 'chore').length}, travaux=${pendingTasks.filter((t: any) => t.category === 'work').length}${overdueTasks.length > 0 ? ` — EN RETARD : ${overdueTasks.map((t: any) => t.name).join(', ')}` : ''}
${googleSection}

## Comportement pour les insertions financières
- Si le message contient une dépense ou revenu → identifie montant, description, date, type
- Si toutes les infos sont présentes → appelle create_transaction directement
- Si infos manquantes critiques (montant ou description) → pose une question courte et précise
- Si la sous-catégorie est ambiguë → choisis la plus logique, mentionne ton choix dans la réponse
- Si un seul compte → utilise-le automatiquement sans mentionner
- Si plusieurs comptes et non précisé → demande lequel utiliser avant d'agir
- Après succès → confirme avec : description, montant, catégorie, date (format lisible)
- Si erreur DB → explique le problème clairement

Réponds dans la langue de l'utilisateur. Sois concis, chaleureux et efficace.`

    const model = needsSonnet(message) ? AGENT_CONFIG.models.smart : AGENT_CONFIG.models.fast

    // ---- First Claude call (with tools) -------------------------------------
    const ai1 = await callAnthropic(anthropicKey, model, system, messages, TOOLS)

    let finalReply: string
    let actionPerformed: any = null

    if (ai1.stop_reason === 'tool_use') {
      const toolBlock = ai1.content.find((b: any) => b.type === 'tool_use')

      if (toolBlock) {
        // Execute the tool
        const toolResult = await executeTool(toolBlock.name, toolBlock.input, db, user.id)
        actionPerformed = {
          tool: toolBlock.name,
          input: toolBlock.input,
          result: toolResult,
        }

        // Second Claude call with tool result
        const messagesWithResult = [
          ...messages,
          { role: 'assistant', content: ai1.content },
          {
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: toolBlock.id,
              content: JSON.stringify(toolResult),
            }],
          },
        ]

        const ai2 = await callAnthropic(anthropicKey, model, system, messagesWithResult)
        finalReply = ai2.content?.find((b: any) => b.type === 'text')?.text ?? 'Action effectuée.'
      } else {
        finalReply = ai1.content?.find((b: any) => b.type === 'text')?.text ?? ''
      }
    } else {
      finalReply = ai1.content?.find((b: any) => b.type === 'text')?.text ?? ''
    }

    // ---- Persist final reply ------------------------------------------------
    await db.from('agent_messages').insert({ conversation_id: convId, role: 'assistant', content: finalReply })
    await db.from('agent_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId)

    return ok({
      message: finalReply,
      conversationId: convId,
      model,
      actionPerformed,
      googleConnected: !!googleAccessToken,
    })

  } catch (err: any) {
    console.error('Unhandled:', err?.message)
    return ok({ error: 'Unhandled error: ' + (err?.message ?? String(err)) })
  }
})
