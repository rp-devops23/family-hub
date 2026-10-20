// ============================================================================
// AGENT ACTIONS — Journal des actions : enregistrer, confirmer, refuser, annuler
//
// Toutes les fonctions reçoivent le client service (qui ignore les RLS) : chaque
// requête filtre donc sur user_id. Les transitions de statut sont « atomiques »
// (UPDATE … WHERE status = …) pour qu'un double clic ne puisse pas confirmer ou
// annuler deux fois.
// ============================================================================

import { type ActionDraft, type Lang, type UndoPlan, UNDOABLE_TABLES } from './agent_tools.ts'

// deno-lint-ignore no-explicit-any
type Db = any

export interface ActionRow {
  id: string
  user_id: string
  conversation_id: string
  message_id: string | null
  tool: string
  input: unknown
  summary: string
  details: Record<string, unknown>
  status: 'pending' | 'done' | 'cancelled' | 'undone' | 'failed'
  undo: UndoPlan | null
}

const now = () => new Date().toISOString()

export class ActionError extends Error {}

/** Enregistre une action (effectuée ou en attente) et renvoie la ligne créée. */
export async function recordAction(db: Db, userId: string, conversationId: string, draft: ActionDraft): Promise<ActionRow> {
  const { data, error } = await db.from('agent_actions').insert({
    user_id: userId, conversation_id: conversationId, tool: draft.tool, input: draft.input ?? {},
    summary: draft.summary, details: draft.details, status: draft.status, undo: draft.undo,
  }).select().single()
  if (error) throw new Error(`agent_actions: ${error.message}`)
  return data
}

/** Rattache des actions au message de l'assistant (affichage des cartes sous la bulle). */
export async function linkActions(db: Db, userId: string, ids: string[], messageId: string): Promise<void> {
  if (ids.length === 0) return
  const { error } = await db.from('agent_actions').update({ message_id: messageId }).eq('user_id', userId).in('id', ids)
  if (error) throw new Error(`agent_actions link: ${error.message}`)
}

async function load(db: Db, userId: string, actionId: string): Promise<ActionRow> {
  const { data } = await db.from('agent_actions').select('*').eq('id', actionId).eq('user_id', userId).maybeSingle()
  if (!data) throw new ActionError('Action not found')
  return data
}

/** Passe le statut de `from` à `to` si (et seulement si) il vaut encore `from`. */
async function claim(db: Db, userId: string, actionId: string, from: ActionRow['status'], to: ActionRow['status'], extra: Record<string, unknown> = {}) {
  const { data } = await db.from('agent_actions')
    .update({ status: to, updated_at: now(), ...extra })
    .eq('id', actionId).eq('user_id', userId).eq('status', from).select().maybeSingle()
  return data as ActionRow | null
}

/** Confirme une dépense/un revenu proposé : c'est ici (et seulement ici) que la transaction est créée. */
export async function confirmAction(db: Db, userId: string, actionId: string): Promise<ActionRow> {
  const claimed = await claim(db, userId, actionId, 'pending', 'done')
  if (!claimed) return await load(db, userId, actionId) // déjà traitée : on renvoie l'état actuel
  if (claimed.tool !== 'create_transaction') {
    await claim(db, userId, actionId, 'done', 'failed')
    throw new ActionError('This action does not need confirmation')
  }
  const d = claimed.details as { type: string; amount: number; description: string; date: string; subcategory_id: string | null; account_id: string | null }
  const payload: Record<string, unknown> = {
    user_id: userId, date: d.date, amount: d.amount, description: d.description, type: d.type,
  }
  if (d.subcategory_id) payload.subcategory_id = d.subcategory_id
  if (d.account_id) payload.account_id = d.account_id

  const { data: tx, error } = await db.from('transactions').insert(payload).select('id').single()
  if (error) {
    await claim(db, userId, actionId, 'done', 'failed', { details: { ...d, error: error.message } })
    throw new ActionError(error.message)
  }
  const undo: UndoPlan = { ops: [{ op: 'delete', table: 'transactions', ids: [tx.id] }] }
  const { data: updated } = await db.from('agent_actions').update({ undo, updated_at: now() })
    .eq('id', actionId).eq('user_id', userId).select().single()
  return updated
}

export async function cancelAction(db: Db, userId: string, actionId: string): Promise<ActionRow> {
  const claimed = await claim(db, userId, actionId, 'pending', 'cancelled')
  return claimed ?? await load(db, userId, actionId)
}

/** Applique les opérations d'annulation (tables autorisées uniquement, toujours restreintes à l'utilisateur). */
export async function applyUndo(db: Db, userId: string, plan: UndoPlan): Promise<void> {
  for (const op of plan.ops) {
    if (!(UNDOABLE_TABLES as readonly string[]).includes(op.table)) throw new ActionError(`Table not allowed: ${op.table}`)
    if (op.op === 'delete') {
      if (op.ids.length === 0) continue
      const { error } = await db.from(op.table).delete().eq('user_id', userId).in('id', op.ids)
      if (error) throw new ActionError(error.message)
    } else if (op.op === 'update') {
      const { error } = await db.from(op.table).update(op.values).eq('user_id', userId).eq('id', op.id)
      if (error) throw new ActionError(error.message)
    } else if (op.op === 'insert') {
      const rows = op.rows.map((r) => ({ ...r, user_id: userId }))
      if (rows.length === 0) continue
      const { error } = await db.from(op.table).insert(rows)
      if (error) throw new ActionError(error.message)
    }
  }
}

/** Annule une action effectuée. Si l'annulation échoue, l'action redevient « effectuée ». */
export async function undoAction(db: Db, userId: string, actionId: string): Promise<ActionRow> {
  const current = await load(db, userId, actionId)
  if (current.status !== 'done') return current
  if (!current.undo?.ops?.length) throw new ActionError('This action cannot be undone')

  const claimed = await claim(db, userId, actionId, 'done', 'undone')
  if (!claimed) return await load(db, userId, actionId)
  try {
    await applyUndo(db, userId, claimed.undo as UndoPlan)
  } catch (err) {
    await claim(db, userId, actionId, 'undone', 'done')
    throw err
  }
  return claimed
}

/** Texte de secours quand une erreur survient après des actions déjà effectuées. */
export function describeDoneActions(rows: ActionRow[], lang: Lang): string {
  const done = rows.filter((r) => r.status === 'done').map((r) => `• ${r.summary}`)
  if (done.length === 0) return ''
  return `${lang === 'fr' ? 'Déjà effectué avant l’erreur (annulable ci-dessous) :' : 'Already done before the error (you can undo below):'}\n${done.join('\n')}`
}
