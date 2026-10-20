import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { fetchCalendarEvents, fetchGmailSummary, getValidAccessToken } from "../_shared/google_refresh.ts"
import { AGENT_CONFIG } from "../_shared/agent_config.ts"
import { ChatError, handleChat } from "../_shared/agent_chat.ts"
import { ActionError, cancelAction, confirmAction, undoAction } from "../_shared/agent_actions.ts"
import type { GoogleBridge, Lang } from "../_shared/agent_tools.ts"

// ============================================================================
// family-agent — Point d'entrée : authentification et routage uniquement.
//   • { message, conversationId?, language? }      → conversation avec l'agent
//   • { action: 'confirm' | 'cancel' | 'undo', actionId } → boutons des cartes d'action
// La logique est dans ../_shared (agent_chat, agent_tools, agent_actions, agent_loop).
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function callAnthropic(apiKey: string, model: string, system: string, messages: unknown[], tools?: unknown[]) {
  const body: Record<string, unknown> = { model, max_tokens: AGENT_CONFIG.models.maxTokens, system, messages }
  if (tools?.length) body.tools = tools

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Toujours HTTP 200 : le message d'erreur reste lisible côté application
  const ok = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const body = await req.json()
    const lang: Lang = body.language === 'en' ? 'en' : 'fr'

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

    // Client service : ignore les RLS, d'où le filtrage sur user_id partout dans _shared
    const db = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })

    // ---- Boutons des cartes d'action (Confirmer / Refuser / Annuler) --------
    if (body.action) {
      const actionId = String(body.actionId ?? '')
      const handlers = { confirm: confirmAction, cancel: cancelAction, undo: undoAction } as const
      const handler = handlers[body.action as keyof typeof handlers]
      if (!handler || !actionId) return ok({ error: 'Invalid action' })
      return ok({ action: await handler(db, user.id, actionId) })
    }

    // ---- Conversation -------------------------------------------------------
    // Google est interrogé à la demande (outils), pas à chaque message
    const google: GoogleBridge = {
      async calendar(days) {
        const token = await getValidAccessToken(user.id)
        if (!token) throw new Error('google_not_connected')
        return fetchCalendarEvents(token, days)
      },
      async emails(limit) {
        const token = await getValidAccessToken(user.id)
        if (!token) throw new Error('google_not_connected')
        return fetchGmailSummary(token, limit)
      },
    }

    const result = await handleChat(
      {
        db, userId: user.id, lang, google,
        callAnthropic: (model, system, messages, tools) => callAnthropic(anthropicKey, model, system, messages, tools),
      },
      { message: body.message, conversationId: body.conversationId },
    )
    return ok(result)

  } catch (err) {
    if (err instanceof ChatError || err instanceof ActionError) return ok({ error: err.message })
    console.error('Unhandled:', (err as Error)?.message)
    return ok({ error: 'Unhandled error: ' + ((err as Error)?.message ?? String(err)) })
  }
})
