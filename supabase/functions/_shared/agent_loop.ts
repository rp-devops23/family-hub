// ============================================================================
// AGENT LOOP — Boucle modèle ↔ outils (plusieurs appels d'outils, plusieurs tours)
//
// Le modèle et l'exécution des outils sont injectés : la boucle se teste sans réseau.
// ============================================================================

import { AGENT_CONFIG } from './agent_config.ts'

// deno-lint-ignore no-explicit-any
type Json = any

export interface LoopOptions {
  callModel: (messages: Json[], withTools: boolean) => Promise<Json>
  /** Exécute un outil et renvoie ce que le modèle doit voir (déjà sérialisable). */
  runTool: (name: string, input: unknown) => Promise<{ result: unknown; isError?: boolean }>
  messages: Json[]
  maxSteps?: number
  maxToolCalls?: number
}

const MAX_RESULT_CHARS = 12_000

function serialize(result: unknown): string {
  const text = JSON.stringify(result)
  return text.length > MAX_RESULT_CHARS ? `${text.slice(0, MAX_RESULT_CHARS)}…[truncated]` : text
}

const textOf = (content: Json[] | undefined) =>
  (content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()

export async function runAgentLoop(opts: LoopOptions): Promise<{ text: string; toolCalls: number }> {
  const maxSteps = opts.maxSteps ?? AGENT_CONFIG.loop.maxSteps
  const maxToolCalls = opts.maxToolCalls ?? AGENT_CONFIG.loop.maxToolCalls
  const messages = [...opts.messages]
  let toolCalls = 0

  for (let step = 0; step < maxSteps; step++) {
    const res = await opts.callModel(messages, true)
    const toolUses = (res.content ?? []).filter((b: Json) => b.type === 'tool_use')
    if (res.stop_reason !== 'tool_use' || toolUses.length === 0) {
      return { text: textOf(res.content), toolCalls }
    }

    // Chaque tool_use doit recevoir un tool_result (sinon l'API refuse la suite)
    const results: Json[] = []
    for (const use of toolUses) {
      if (toolCalls >= maxToolCalls) {
        results.push({ type: 'tool_result', tool_use_id: use.id, is_error: true, content: 'Too many tool calls in one turn; stop and answer with what you have.' })
        continue
      }
      toolCalls++
      const out = await opts.runTool(use.name, use.input)
      results.push({ type: 'tool_result', tool_use_id: use.id, content: serialize(out.result), ...(out.isError ? { is_error: true } : {}) })
    }
    messages.push({ role: 'assistant', content: res.content })
    messages.push({ role: 'user', content: results })
  }

  // Trop de tours : on demande une réponse finale sans outils
  messages.push({ role: 'user', content: 'Answer now with what you have, without calling more tools.' })
  const last = await opts.callModel(messages, false)
  return { text: textOf(last.content), toolCalls }
}
