import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Detect if message likely needs a more capable model
function needsSonnet(message: string): boolean {
  const complexKeywords = ['analyse', 'analyze', 'compare', 'tendance', 'trend', 'prévision', 'forecast', 'explique', 'explain', 'pourquoi', 'why', 'stratégie', 'strategy']
  const lower = message.toLowerCase()
  return complexKeywords.some(k => lower.includes(k)) || message.length > 300
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, conversationId } = await req.json()

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Authenticate user via JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authError } = await anonClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Service client for privileged DB access
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get or create conversation
    let convId = conversationId
    if (!convId) {
      const { data: conv, error: convError } = await db
        .from('agent_conversations')
        .insert({ user_id: user.id, title: message.slice(0, 60) })
        .select('id')
        .single()
      if (convError) throw convError
      convId = conv.id
    }

    // Save user message
    await db.from('agent_messages').insert({
      conversation_id: convId,
      role: 'user',
      content: message
    })

    // Load conversation history (last 20 exchanges)
    const { data: history } = await db
      .from('agent_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(40)

    // Load user context from app tables (read-only, scoped to user)
    const [{ data: recentTx }, { data: budgets }, { data: recipes }, { data: shoppingItems }] = await Promise.all([
      db.from('transactions')
        .select('date, amount, description')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(15),
      db.from('budgets')
        .select('name, amount_limit, period')
        .eq('user_id', user.id)
        .eq('is_active', true),
      db.from('recipes')
        .select('name, meal_type, difficulty, prep_time_minutes')
        .eq('user_id', user.id)
        .limit(20),
      db.from('shopping_items')
        .select('name, quantity, unit, checked')
        .eq('user_id', user.id)
        .eq('checked', false)
        .limit(20),
    ])

    const systemPrompt = `Tu es Family Agent, l'assistant IA personnel de la famille. Tu aides avec les finances personnelles, la planification des repas, les recettes et l'organisation familiale.

Tu as accès en lecture aux données de la famille :

FINANCES :
- Dernières transactions : ${JSON.stringify(recentTx?.slice(0, 10) ?? [])}
- Budgets actifs : ${JSON.stringify(budgets ?? [])}

RECETTES & COURSES :
- Recettes disponibles : ${JSON.stringify(recipes?.slice(0, 10) ?? [])}
- Liste de courses (articles non cochés) : ${JSON.stringify(shoppingItems ?? [])}

INSTRUCTIONS :
- Réponds dans la langue de l'utilisateur (français ou anglais)
- Sois concis, bienveillant et pratique
- Pour les questions financières, base-toi sur les vraies données ci-dessus
- Tu peux suggérer des recettes, analyser les dépenses, aider à planifier les repas
- N'invente jamais de données que tu n'as pas
- Format : texte simple, pas de markdown complexe (l'app ne le rend pas)`

    const model = needsSonnet(message) ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001'

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: (history ?? []).map(m => ({ role: m.role, content: m.content })),
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      throw new Error(`Anthropic error: ${err}`)
    }

    const aiData = await anthropicRes.json()
    const reply = aiData.content[0].text

    // Save assistant reply
    await db.from('agent_messages').insert({
      conversation_id: convId,
      role: 'assistant',
      content: reply
    })

    // Update conversation updated_at
    await db.from('agent_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', convId)

    return new Response(
      JSON.stringify({ message: reply, conversationId: convId, model }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Family agent error:', error)
    return new Response(
      JSON.stringify({ error: error.message ?? 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
