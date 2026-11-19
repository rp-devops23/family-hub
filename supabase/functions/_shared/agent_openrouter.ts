// ============================================================================
// AGENT OPENROUTER — Traduction entre le format interne (celui d'Anthropic) et
// l'API « chat completions » d'OpenRouter (compatible OpenAI).
//
// En interne la boucle de l'agent parle le format Anthropic (blocs text / tool_use /
// tool_result). Ces deux fonctions convertissent une requête vers OpenRouter et sa réponse
// vers ce même format, sans réseau : elles se testent seules.
// ============================================================================

// deno-lint-ignore no-explicit-any
type Json = any

export interface OpenRouterInput {
  model: string
  system: string
  messages: Json[]
  tools?: Json[]
}

/** Corps de la requête POST /chat/completions. */
export function toOpenRouterRequest(call: OpenRouterInput, maxTokens: number): Json {
  const messages: Json[] = [{ role: 'system', content: call.system }]

  for (const m of call.messages) {
    if (typeof m.content === 'string') {
      messages.push({ role: m.role, content: m.content })
      continue
    }
    const blocks: Json[] = m.content ?? []
    const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n')

    if (m.role === 'assistant') {
      const toolCalls = blocks.filter((b) => b.type === 'tool_use').map((b) => ({
        id: b.id, type: 'function', function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) },
      }))
      const message: Json = { role: 'assistant', content: text || null }
      if (toolCalls.length > 0) message.tool_calls = toolCalls
      messages.push(message)
    } else {
      // Les résultats d'outils deviennent des messages « tool », qui doivent suivre l'appel
      for (const b of blocks) {
        if (b.type === 'tool_result') {
          messages.push({ role: 'tool', tool_call_id: b.tool_use_id, content: typeof b.content === 'string' ? b.content : JSON.stringify(b.content) })
        }
      }
      if (text) messages.push({ role: 'user', content: text })
    }
  }

  const body: Json = {
    model: call.model,
    messages,
    max_tokens: maxTokens,
    // Demande à OpenRouter le coût réel de l'appel (usage.cost) quand il le fournit
    usage: { include: true },
  }
  if (call.tools?.length) {
    body.tools = call.tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } }))
  }
  return body
}

export interface NormalizedResponse {
  stop_reason: 'tool_use' | 'end_turn' | 'max_tokens' | 'refusal'
  content: Json[]
  usage: { input_tokens: number; output_tokens: number; cost?: number }
  /** Modèle qui a réellement répondu (utile avec openrouter/auto) */
  model?: string
}

/** Réponse OpenRouter → format interne. Une erreur renvoyée dans un corps « 200 » devient une exception. */
export function fromOpenRouterResponse(json: Json): NormalizedResponse {
  if (json?.error) {
    throw new Error(`OpenRouter ${json.error.code ?? 500}: ${json.error.message ?? JSON.stringify(json.error)}`)
  }
  const choice = json?.choices?.[0]
  if (!choice) throw new Error('OpenRouter 502: réponse vide')
  const message = choice.message ?? {}

  const content: Json[] = []
  const text = Array.isArray(message.content)
    ? message.content.map((p: Json) => (typeof p === 'string' ? p : p?.text ?? '')).join('')
    : typeof message.content === 'string' ? message.content : ''
  if (text.trim()) content.push({ type: 'text', text })

  const toolCalls: Json[] = Array.isArray(message.tool_calls) ? message.tool_calls : []
  toolCalls.forEach((tc, i) => {
    let input: Json = {}
    try { input = JSON.parse(tc?.function?.arguments || '{}') } catch { input = {} }
    content.push({ type: 'tool_use', id: tc?.id || `call_${i}`, name: tc?.function?.name, input })
  })

  const finish = choice.finish_reason
  const stop_reason = toolCalls.length > 0 ? 'tool_use'
    : finish === 'length' ? 'max_tokens'
    : finish === 'content_filter' ? 'refusal'
    : 'end_turn'

  const cost = json?.usage?.cost
  return {
    stop_reason,
    content,
    usage: {
      input_tokens: json?.usage?.prompt_tokens ?? 0,
      output_tokens: json?.usage?.completion_tokens ?? 0,
      ...(typeof cost === 'number' ? { cost } : {}),
    },
    model: typeof json?.model === 'string' ? json.model : undefined,
  }
}
