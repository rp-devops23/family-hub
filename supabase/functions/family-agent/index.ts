import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function needsSonnet(message: string): boolean {
  const keywords = ['analyse', 'analyze', 'compare', 'tendance', 'trend', 'prévision', 'forecast', 'explique', 'explain', 'pourquoi', 'why', 'stratégie', 'strategy']
  return keywords.some(k => message.toLowerCase().includes(k)) || message.length > 300
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse body
    const body = await req.json()
    const { message, conversationId } = body

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Auth — get user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!

    // User client (validates JWT)
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(JSON.stringify({ error: 'Unauthorized: ' + (authError?.message ?? 'no user') }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Service client for DB writes
    const db = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })

    // Get or create conversation
    let convId = conversationId
    if (!convId) {
      const { data: conv, error: convErr } = await db
        .from('agent_conversations')
        .insert({ user_id: user.id, title: message.slice(0, 60) })
        .select('id')
        .single()
      if (convErr) {
        console.error('Create conversation error:', convErr)
        return new Response(JSON.stringify({ error: 'DB error: ' + convErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      convId = conv.id
    }

    // Save user message
    const { error: msgErr } = await db.from('agent_messages').insert({
      conversation_id: convId,
      role: 'user',
      content: message
    })
    if (msgErr) {
      console.error('Save message error:', msgErr)
      return new Response(JSON.stringify({ error: 'DB error: ' + msgErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Load conversation history
    const { data: history } = await db
      .from('agent_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(40)

    const messages = history?.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })) ?? [{ role: 'user' as const, content: message }]

    // Load user context
    const [{ data: recentTx }, { data: budgets }, { data: recipes }, { data: shopping }] = await Promise.all([
      db.from('transactions').select('date, amount, description').eq('user_id', user.id).order('date', { ascending: false }).limit(10),
      db.from('budgets').select('name, amount_limit, period').eq('user_id', user.id).eq('is_active', true),
      db.from('recipes').select('name, meal_type').eq('user_id', user.id).limit(15),
      db.from('shopping_items').select('name, quantity, unit').eq('user_id', user.id).eq('checked', false).limit(20),
    ])

    const systemPrompt = `Tu es Family Agent, l'assistant IA de la famille. Tu aides avec les finances, les recettes et l'organisation.

Données de la famille :
- Dernières transactions : ${JSON.stringify(recentTx ?? [])}
- Budgets actifs : ${JSON.stringify(budgets ?? [])}
- Recettes disponibles : ${JSON.stringify(recipes ?? [])}
- Liste de courses : ${JSON.stringify(shopping ?? [])}

Réponds dans la langue de l'utilisateur. Sois concis et pratique. N'invente pas de données.`

    // Call Anthropic
    const model = needsSonnet(message) ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001'
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens: 1024, system: systemPrompt, messages }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      console.error('Anthropic error:', anthropicRes.status, errText)
      return new Response(JSON.stringify({ error: `Anthropic error ${anthropicRes.status}: ${errText}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const aiData = await anthropicRes.json()
    const reply = aiData.content?.[0]?.text
    if (!reply) {
      console.error('Empty Anthropic response:', JSON.stringify(aiData))
      return new Response(JSON.stringify({ error: 'Empty response from AI' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Save assistant reply
    await db.from('agent_messages').insert({ conversation_id: convId, role: 'assistant', content: reply })
    await db.from('agent_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId)

    return new Response(
      JSON.stringify({ message: reply, conversationId: convId, model }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Unhandled error:', err)
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
