// Tests de l'agent (lancer : deno test supabase/functions/_shared/agent.test.ts)
// Utilisent une fausse base en mémoire et un faux modèle : aucun réseau, aucune clé.

import assert from 'node:assert/strict'
import { cancelAction, confirmAction, undoAction } from './agent_actions.ts'
import { handleChat, loadHistory, type ModelCall, needsSonnet, resolveProfile } from './agent_chat.ts'
import { executeTool, type GoogleBridge, type ToolContext } from './agent_tools.ts'

// ---------------------------------------------------------------------------
// Fausse base : le sous-ensemble de l'API supabase-js utilisé par l'agent
// ---------------------------------------------------------------------------
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>
const DEFAULTS: Record<string, Row> = { shopping_items: { checked: false }, tasks: { done: false } }

class FakeDb {
  tables: Record<string, Row[]> = {}
  failNext: { table: string; op: string } | null = null
  private clock = 0
  from(table: string) { return new Query(this, table) }
  rows(table: string) { return (this.tables[table] ??= []) }
  stamp() { return new Date(Date.UTC(2026, 0, 1) + ++this.clock * 1000).toISOString() }
}

class Query {
  private op = 'select'; private filters: ((r: Row) => boolean)[] = []; private payload: Row[] | Row = []
  private ord: { col: string; asc: boolean } | null = null; private lim: number | null = null; private rng: [number, number] | null = null
  private mode: 'many' | 'single' | 'maybe' = 'many'; private returning = false
  constructor(private db: FakeDb, private table: string) {}
  select(_cols?: string) { if (this.op !== 'select') this.returning = true; return this }
  insert(p: Row | Row[]) { this.op = 'insert'; this.payload = Array.isArray(p) ? p : [p]; return this }
  update(v: Row) { this.op = 'update'; this.payload = v; return this }
  delete() { this.op = 'delete'; return this }
  eq(c: string, v: unknown) { this.filters.push((r) => r[c] === v); return this }
  in(c: string, vs: unknown[]) { this.filters.push((r) => vs.includes(r[c])); return this }
  gte(c: string, v: string) { this.filters.push((r) => r[c] >= v); return this }
  lte(c: string, v: string) { this.filters.push((r) => r[c] <= v); return this }
  ilike(c: string, p: string) { const n = p.replace(/%/g, '').toLowerCase(); this.filters.push((r) => String(r[c] ?? '').toLowerCase().includes(n)); return this }
  order(col: string, o?: { ascending?: boolean }) { this.ord = { col, asc: o?.ascending !== false }; return this }
  limit(n: number) { this.lim = n; return this }
  range(a: number, b: number) { this.rng = [a, b]; return this }
  single() { this.mode = 'single'; return this }
  maybeSingle() { this.mode = 'maybe'; return this }
  // deno-lint-ignore no-explicit-any
  then(resolve: (v: any) => unknown, reject?: (e: unknown) => unknown) { return Promise.resolve(this.run()).then(resolve, reject) }

  private run() {
    if (this.db.failNext?.table === this.table && this.db.failNext.op === this.op) {
      this.db.failNext = null
      return { data: null, error: { message: `forced ${this.op} failure` } }
    }
    const all = this.db.rows(this.table)
    const match = (r: Row) => this.filters.every((f) => f(r))
    let out: Row[] = []
    if (this.op === 'insert') {
      out = (this.payload as Row[]).map((p) => ({ id: crypto.randomUUID(), created_at: this.db.stamp(), ...DEFAULTS[this.table], ...structuredClone(p) }))
      all.push(...out)
    } else if (this.op === 'update') {
      out = all.filter(match); out.forEach((r) => Object.assign(r, structuredClone(this.payload as Row)))
    } else if (this.op === 'delete') {
      out = all.filter(match); this.db.tables[this.table] = all.filter((r) => !match(r))
    } else {
      out = all.filter(match)
      if (this.ord) { const { col, asc } = this.ord; out = [...out].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1)) }
      if (this.rng) out = out.slice(this.rng[0], this.rng[1] + 1)
      if (this.lim != null) out = out.slice(0, this.lim)
    }
    if ((this.op === 'select') || this.returning) {
      out = structuredClone(out)
      if (this.mode === 'many') return { data: out, error: null }
      if (this.mode === 'maybe') return { data: out[0] ?? null, error: null }
      return out.length ? { data: out[0], error: null } : { data: null, error: { message: 'no rows' } }
    }
    return { data: null, error: null }
  }
}

// ---------------------------------------------------------------------------
// Jeu de données
// ---------------------------------------------------------------------------
const ME = 'user-me', OTHER = 'user-other'
const NOW = new Date('2026-10-20T10:00:00Z') // mardi 20 octobre 2026

function seed(db: FakeDb) {
  const t = db.tables
  t.categories = [{ id: 'c-food', user_id: ME, name_fr: 'Alimentation', name_en: 'Food' }, { id: 'c-fun', user_id: ME, name_fr: 'Loisirs', name_en: 'Leisure' }]
  t.subcategories = [
    { id: 's-groc', user_id: ME, category_id: 'c-food', name_fr: 'Courses', name_en: 'Groceries' },
    { id: 's-rest', user_id: ME, category_id: 'c-food', name_fr: 'Restaurant', name_en: 'Restaurant' },
    { id: 's-cine', user_id: ME, category_id: 'c-fun', name_fr: 'Cinéma', name_en: 'Cinema' },
  ]
  t.accounts = [{ id: 'a-main', user_id: ME, name: 'Compte commun', bank: 'X', is_default: true }]
  t.ingredients = [
    { id: 'i-lait', user_id: ME, name_fr: 'Lait', name_en: 'Milk' },
    { id: 'i-oeuf', user_id: ME, name_fr: 'Œufs', name_en: 'Eggs' },
    { id: 'i-tom', user_id: ME, name_fr: 'Tomate', name_en: 'Tomato' },
    { id: 'i-other', user_id: OTHER, name_fr: 'Secret', name_en: 'Secret' },
  ]
  t.recipes = [
    { id: 'r-lasa', user_id: ME, name: 'Lasagnes', meal_type: 'main', prep_time_minutes: 60 },
    { id: 'r-pat1', user_id: ME, name: 'Pâtes tomate', meal_type: 'main', prep_time_minutes: 20 },
    { id: 'r-pat2', user_id: ME, name: 'Pâtes carbonara', meal_type: 'main', prep_time_minutes: 25 },
    { id: 'r-other', user_id: OTHER, name: 'Recette privée', meal_type: 'main' },
  ]
  t.recipe_ingredients = [
    { id: 'ri1', recipe_id: 'r-pat1', ingredient_id: 'i-tom' },
    { id: 'ri2', recipe_id: 'r-other', ingredient_id: 'i-other' },
  ]
  t.tags = []; t.recipe_tags = []
  t.transactions = [
    { id: 'tx1', user_id: ME, date: '2026-10-03', amount: 100, type: 'expense', description: 'Carrefour', subcategory_id: 's-groc', account_id: 'a-main' },
    { id: 'tx2', user_id: ME, date: '2026-10-10', amount: 50, type: 'expense', description: 'Resto', subcategory_id: 's-rest', account_id: 'a-main' },
    { id: 'tx3', user_id: ME, date: '2026-10-01', amount: 2500, type: 'income', description: 'Salaire', subcategory_id: null, account_id: 'a-main' },
    { id: 'tx4', user_id: ME, date: '2026-09-15', amount: 999, type: 'expense', description: 'Septembre', subcategory_id: 's-cine', account_id: 'a-main' },
    { id: 'txo', user_id: OTHER, date: '2026-10-05', amount: 7777, type: 'expense', description: 'Autre', subcategory_id: null, account_id: null },
  ]
  t.budgets = []; t.budget_categories = []; t.budget_subcategories = []
  t.shopping_items = [{ id: 'sh-pain', user_id: ME, name: 'Pain', ingredient_id: null, checked: false }, { id: 'sh-other', user_id: OTHER, name: 'Privé', checked: false }]
  t.meal_plans = []; t.tasks = [{ id: 'tk1', user_id: ME, name: 'Poubelles', category: 'chore', done: false, expires_at: '2026-10-18' }, { id: 'tk-o', user_id: OTHER, name: 'Autre', category: 'chore', done: false }]
  t.agent_conversations = []; t.agent_messages = []; t.agent_actions = []
}

function setup(google: GoogleBridge | null = null) {
  const db = new FakeDb(); seed(db)
  const ctx: ToolContext = { db, userId: ME, lang: 'fr', google, now: NOW }
  return { db, ctx }
}
// deno-lint-ignore no-explicit-any
const run = (ctx: ToolContext, name: string, input: any) => executeTool(name, input, ctx)

// ---------------------------------------------------------------------------
// Faux modèle
// ---------------------------------------------------------------------------
// deno-lint-ignore no-explicit-any
type Json = any
const text = (t: string) => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: t }] })
const toolUse = (...uses: [string, Json][]) => ({
  stop_reason: 'tool_use',
  content: uses.map(([name, input], i) => ({ type: 'tool_use', id: `tu_${name}_${i}`, name, input })),
})
function scriptedModel(steps: (Json | Error)[]) {
  const calls: { model: string; effort?: string; system: string; messages: Json[]; tools?: Json[] }[] = []
  const fn = (call: ModelCall) => {
    calls.push({ model: call.model, effort: call.effort, system: call.system, messages: structuredClone(call.messages), tools: call.tools })
    const next = steps.shift()
    if (next instanceof Error) return Promise.reject(next)
    return Promise.resolve(next ?? text('(fin)'))
  }
  return { fn, calls }
}

// ===========================================================================
// COURSES
// ===========================================================================
Deno.test('courses: ajoute, relie aux ingrédients, ignore les doublons, puis annule', async () => {
  const { db, ctx } = setup()
  const out = await run(ctx, 'add_shopping_items', { items: [{ name: 'lait', quantity: '2', unit: 'L' }, { name: 'Pain' }, { name: 'Café' }, { name: 'oeufs' }, { name: 'LAIT' }] })
  assert.deepEqual((out.result as Json).added, ['Lait', 'Café', 'Œufs'])
  assert.deepEqual((out.result as Json).skipped, ['Pain', 'Lait']) // Pain déjà en liste, « LAIT » doublon du lot
  const mine = db.rows('shopping_items').filter((r) => r.user_id === ME)
  assert.equal(mine.length, 4)
  assert.equal(mine.find((r) => r.name === 'Lait')?.ingredient_id, 'i-lait')
  assert.equal(mine.find((r) => r.name === 'Café')?.ingredient_id, null)
  assert.equal(out.action?.status, 'done')

  const row = await (await import('./agent_actions.ts')).recordAction(db, ME, 'conv', out.action!)
  const undone = await undoAction(db, ME, row.id)
  assert.equal(undone.status, 'undone')
  const left = db.rows('shopping_items').filter((r) => r.user_id === ME).map((r) => r.name)
  assert.deepEqual(left, ['Pain']) // seuls les articles ajoutés ont disparu
  assert.equal(db.rows('shopping_items').some((r) => r.id === 'sh-other'), true) // données d'un autre utilisateur intactes
})

Deno.test('courses: cocher puis annuler restaure l’état précédent ; ids étrangers ignorés', async () => {
  const { db, ctx } = setup()
  const out = await run(ctx, 'check_shopping_items', { item_ids: ['sh-pain', 'sh-other'], checked: true })
  assert.equal(db.rows('shopping_items').find((r) => r.id === 'sh-pain')?.checked, true)
  assert.equal(db.rows('shopping_items').find((r) => r.id === 'sh-other')?.checked, false, 'ne touche pas aux données des autres')
  const row = await (await import('./agent_actions.ts')).recordAction(db, ME, 'conv', out.action!)
  await undoAction(db, ME, row.id)
  assert.equal(db.rows('shopping_items').find((r) => r.id === 'sh-pain')?.checked, false)
})

// ===========================================================================
// REPAS
// ===========================================================================
Deno.test('repas: planifie, gère l’ambiguïté, les doublons, et annule', async () => {
  const { db, ctx } = setup()
  const amb = await run(ctx, 'plan_meal', { recipe_name: 'pâtes', dates: ['2026-10-22'] })
  assert.equal(amb.isError, true)
  assert.deepEqual((amb.result as Json).candidates.sort(), ['Pâtes carbonara', 'Pâtes tomate'])

  const none = await run(ctx, 'plan_meal', { recipe_name: 'Pizza', dates: ['2026-10-22'] })
  assert.equal(none.isError, true)
  const badDate = await run(ctx, 'plan_meal', { recipe_name: 'Lasagnes', dates: ['2026-02-31'] })
  assert.equal(badDate.isError, true, 'date impossible refusée')
  const foreign = await run(ctx, 'plan_meal', { recipe_id: 'r-other', dates: ['2026-10-22'] })
  assert.equal(foreign.isError, true, 'recette d’un autre utilisateur introuvable')

  const ok = await run(ctx, 'plan_meal', { recipe_name: 'lasagnes', dates: ['2026-10-22', '2026-10-23'] })
  assert.deepEqual((ok.result as Json).planned, ['2026-10-22', '2026-10-23'])
  const again = await run(ctx, 'plan_meal', { recipe_name: 'Lasagnes', dates: ['2026-10-22'] })
  assert.match(String((again.result as Json).note), /already planned/)
  assert.equal(db.rows('meal_plans').length, 2)

  const row = await (await import('./agent_actions.ts')).recordAction(db, ME, 'conv', ok.action!)
  await undoAction(db, ME, row.id)
  assert.equal(db.rows('meal_plans').length, 0)
})

Deno.test('repas: search_recipes filtre par ingrédient sans fuiter les recettes des autres', async () => {
  const { ctx } = setup()
  const out = (await run(ctx, 'search_recipes', { ingredient: 'tomates' })).result as Json
  assert.deepEqual(out.recipes.map((r: Json) => r.name), ['Pâtes tomate'])
  const all = (await run(ctx, 'search_recipes', {})).result as Json
  assert.equal(all.recipes.some((r: Json) => r.name === 'Recette privée'), false)
})

// ===========================================================================
// TÂCHES
// ===========================================================================
Deno.test('tâches: ajoute, termine (détecte le retard), annule', async () => {
  const { db, ctx } = setup()
  const list = (await run(ctx, 'get_tasks', {})).result as Json
  assert.deepEqual(list.tasks.map((t: Json) => [t.name, t.overdue]), [['Poubelles', true]])
  const R = await import('./agent_actions.ts')

  const add = await run(ctx, 'add_task', { name: 'Peindre le salon', category: 'work', due_date: '2026-11-01' })
  const addRow = await R.recordAction(db, ME, 'conv', add.action!)
  assert.equal(db.rows('tasks').filter((t) => t.user_id === ME).length, 2)

  const done = await run(ctx, 'complete_task', { task_id: 'tk1' })
  const doneRow = await R.recordAction(db, ME, 'conv', done.action!)
  assert.equal(db.rows('tasks').find((t) => t.id === 'tk1')?.done, true)
  assert.equal((await run(ctx, 'complete_task', { task_id: 'tk-o' })).isError, true, 'tâche d’un autre utilisateur refusée')

  await undoAction(db, ME, doneRow.id)
  assert.equal(db.rows('tasks').find((t) => t.id === 'tk1')?.done, false)
  await undoAction(db, ME, addRow.id)
  assert.equal(db.rows('tasks').filter((t) => t.user_id === ME).length, 1)
})

// ===========================================================================
// FINANCES
// ===========================================================================
Deno.test('finances: la dépense n’est enregistrée qu’après confirmation, une seule fois, et annulable', async () => {
  const { db, ctx } = setup()
  const R = await import('./agent_actions.ts')
  const out = await run(ctx, 'create_transaction', { amount: 45, description: 'Restaurant Le Jardin', type: 'expense', date: '2026-10-19', category: 'restaurant' })
  assert.equal((out.result as Json).status, 'awaiting_user_confirmation')
  assert.equal(out.action?.status, 'pending')
  assert.equal(db.rows('transactions').length, 5, 'rien d’inséré avant confirmation')
  const row = await R.recordAction(db, ME, 'conv', out.action!)
  assert.equal(row.details.subcategory_id, 's-rest')
  assert.equal(row.details.account_id, 'a-main', 'compte unique : choisi automatiquement')

  const [a, b] = await Promise.all([confirmAction(db, ME, row.id), confirmAction(db, ME, row.id)]) // double clic
  assert.equal(a.status, 'done'); assert.equal(b.status, 'done')
  const created = db.rows('transactions').filter((t) => t.description === 'Restaurant Le Jardin')
  assert.equal(created.length, 1, 'jamais de doublon')
  assert.equal(created[0].amount, 45)

  const undone = await undoAction(db, ME, row.id)
  assert.equal(undone.status, 'undone')
  assert.equal(db.rows('transactions').some((t) => t.description === 'Restaurant Le Jardin'), false)
})

Deno.test('finances: refuser, valider les entrées, plusieurs comptes, isolation', async () => {
  const { db, ctx } = setup()
  const R = await import('./agent_actions.ts')
  const out = await run(ctx, 'create_transaction', { amount: 12, description: 'Ciné', type: 'expense' })
  const row = await R.recordAction(db, ME, 'conv', out.action!)
  assert.equal((await cancelAction(db, ME, row.id)).status, 'cancelled')
  assert.equal((await confirmAction(db, ME, row.id)).status, 'cancelled', 'une action refusée ne peut plus être confirmée')
  assert.equal(db.rows('transactions').some((t) => t.description === 'Ciné'), false)

  for (const bad of [{ amount: 'abc' }, { amount: 0 }, { amount: 10, description: '' }, { amount: 10, description: 'x', type: 'virement' }]) {
    const r = await run(ctx, 'create_transaction', { description: 'x', type: 'expense', ...bad })
    assert.equal(r.isError, true, JSON.stringify(bad))
  }

  const negative = await run(ctx, 'create_transaction', { amount: -5, description: 'x', type: 'expense' })
  assert.equal((negative.action?.details as Json).amount, 5, 'le signe est porté par « type » : un montant négatif est ramené à sa valeur absolue')

  const other = await R.recordAction(db, OTHER, 'conv-o', { tool: 'create_transaction', input: {}, summary: 's', status: 'pending', undo: null, details: { type: 'expense', amount: 1, description: 'piège', date: '2026-10-20', subcategory_id: null, account_id: null } })
  await assert.rejects(() => confirmAction(db, ME, other.id), /not found/i, 'impossible de confirmer l’action d’un autre')
  await assert.rejects(() => undoAction(db, ME, other.id), /not found/i)

  db.rows('accounts').push({ id: 'a-2', user_id: ME, name: 'Épargne', is_default: false })
  const ask = await run(ctx, 'create_transaction', { amount: 10, description: 'x', type: 'expense' })
  assert.equal(ask.isError, true, 'plusieurs comptes sans précision : demander')
  assert.deepEqual((ask.result as Json).available_accounts, ['Compte commun', 'Épargne'])
  const picked = await run(ctx, 'create_transaction', { amount: 10, description: 'x', type: 'expense', account: 'epargne' })
  assert.equal((picked.action?.details as Json).account_id, 'a-2')
})

Deno.test('finances: résumé du mois (jamais les données d’un autre), par catégorie', async () => {
  const { ctx } = setup()
  const r = (await run(ctx, 'get_spending_summary', { group_by: 'category' })).result as Json
  assert.deepEqual(r.period, { start: '2026-10-01', end: '2026-10-20' })
  assert.deepEqual(r.totals, { income: 2500, expenses: 150, balance: 2350, transactions: 3 })
  assert.deepEqual(r.groups.map((g: Json) => [g.name, g.total]), [['Alimentation', 150]])
  const wide = (await run(ctx, 'get_spending_summary', { start_date: '2026-09-01', end_date: '2026-10-31', group_by: 'month' })).result as Json
  assert.deepEqual(wide.groups.map((g: Json) => [g.name, g.total]), [['2026-09', 999], ['2026-10', 150]])
  const tx = (await run(ctx, 'list_transactions', { category: 'courses' })).result as Json
  assert.deepEqual(tx.transactions.map((t: Json) => t.description), ['Carrefour'])
})

// ===========================================================================
// GOOGLE / OUTILS
// ===========================================================================
Deno.test('google: refuse proprement si non connecté, marque le contenu comme non fiable', async () => {
  const off = await run(setup().ctx, 'get_calendar', {})
  assert.equal(off.isError, true)
  const bridge: GoogleBridge = { calendar: () => Promise.resolve('2026-10-21: Dentiste'), emails: () => Promise.resolve('[lu] x') }
  const on = (await run(setup(bridge).ctx, 'get_calendar', { days_ahead: 9999 })).result as Json
  assert.equal(on.untrusted_content, true)
  assert.equal(on.days_ahead, 60, 'plafonné')
  assert.equal((await run(setup().ctx, 'outil_inconnu', {})).isError, true)
})

// ===========================================================================
// HISTORIQUE & BOUCLE
// ===========================================================================
Deno.test('historique: charge les 40 derniers messages (le plus récent inclus), en commençant par l’utilisateur', async () => {
  const { db } = setup()
  for (let i = 1; i <= 60; i++) db.rows('agent_messages').push({ id: `m${i}`, conversation_id: 'c1', role: i % 2 ? 'user' : 'assistant', content: `msg ${i}`, created_at: db.stamp() })
  const h = await loadHistory(db, 'c1')
  assert.equal(h.at(-1).content, 'msg 60', 'le dernier message est présent (bug de l’ancienne version : les 40 plus anciens)')
  assert.equal(h[0].role, 'user')
  assert.ok(h.length >= 39 && h.length <= 40)
})

Deno.test('boucle: plusieurs outils dans un message → un tool_result chacun, puis réponse', async () => {
  const { db } = setup()
  const model = scriptedModel([
    toolUse(['add_shopping_items', { items: [{ name: 'Beurre' }] }], ['plan_meal', { recipe_name: 'Lasagnes', dates: ['2026-10-21'] }], ['get_spending_summary', {}]),
    text('Fait : beurre ajouté, lasagnes planifiées.'),
  ])
  const res = await handleChat({ db, userId: ME, lang: 'fr', google: null, now: NOW, callAnthropic: model.fn }, { message: 'Ajoute du beurre et planifie les lasagnes demain' })
  assert.equal(res.message, 'Fait : beurre ajouté, lasagnes planifiées.')
  assert.equal(res.actions.length, 2)
  assert.ok(res.actions.every((a) => a.message_id === res.assistantMessageId))
  const second = model.calls[1].messages.at(-1)
  assert.equal(second.role, 'user')
  assert.deepEqual(second.content.map((b: Json) => b.tool_use_id), ['tu_add_shopping_items_0', 'tu_plan_meal_1', 'tu_get_spending_summary_2'])
  assert.equal(model.calls[0].model, 'claude-haiku-5-5', 'par défaut : le modèle le moins cher')
  assert.equal(model.calls[0].effort, 'low')
  assert.match(model.calls[0].system, /2026-10-20 \(mardi\)/)
  assert.ok(!/UUID|subcategory_id/.test(model.calls[0].system), 'plus de dump d’identifiants dans le prompt')
})

Deno.test('boucle: plusieurs dépenses → plusieurs propositions à confirmer, aucune insertion', async () => {
  const { db } = setup()
  const model = scriptedModel([
    toolUse(['create_transaction', { amount: 20, description: 'Déjeuner', type: 'expense', category: 'restaurant' }], ['create_transaction', { amount: 15, description: 'Essence', type: 'expense' }]),
    text('Deux dépenses prêtes : merci de confirmer.'),
  ])
  const res = await handleChat({ db, userId: ME, lang: 'fr', google: null, now: NOW, callAnthropic: model.fn }, { message: "J'ai dépensé 20€ au resto et 15€ d'essence" })
  assert.equal(res.actions.length, 2)
  assert.deepEqual(res.actions.map((a) => a.status), ['pending', 'pending'])
  assert.equal(db.rows('transactions').length, 5)
})

Deno.test('boucle: une erreur après une action garde une trace annulable', async () => {
  const { db } = setup()
  const model = scriptedModel([toolUse(['add_task', { name: 'Tondre' }]), new Error('Anthropic 529: overloaded')])
  const res = await handleChat({ db, userId: ME, lang: 'fr', google: null, now: NOW, callAnthropic: model.fn }, { message: 'Ajoute une tâche : tondre' })
  assert.match(res.warning ?? '', /529/)
  assert.match(res.message, /Tondre/)
  assert.equal(res.actions.length, 1)
  assert.equal(db.rows('agent_actions')[0].message_id, res.assistantMessageId, 'action rattachée donc visible et annulable')
  // Sans action effectuée, l'erreur remonte
  await assert.rejects(() => handleChat({ db, userId: ME, lang: 'fr', google: null, now: NOW, callAnthropic: scriptedModel([new Error('boom')]).fn }, { message: 'bonjour' }), /boom/)
})

Deno.test('conversation: on ne peut pas écrire dans la conversation d’un autre utilisateur', async () => {
  const { db } = setup()
  db.rows('agent_conversations').push({ id: 'conv-o', user_id: OTHER, title: 't' })
  await assert.rejects(
    () => handleChat({ db, userId: ME, lang: 'fr', google: null, now: NOW, callAnthropic: scriptedModel([]).fn }, { message: 'salut', conversationId: 'conv-o' }),
    /introuvable/,
  )
  assert.equal(db.rows('agent_messages').length, 0)
})

Deno.test('boucle: trop de tours → réponse finale sans outils', async () => {
  const { db } = setup()
  const loop = Array.from({ length: 6 }, () => toolUse(['get_tasks', {}]))
  const model = scriptedModel([...loop, text('Voici ce que j’ai.')])
  const res = await handleChat({ db, userId: ME, lang: 'fr', google: null, now: NOW, callAnthropic: model.fn }, { message: 'liste mes tâches' })
  assert.equal(res.message, 'Voici ce que j’ai.')
  assert.equal(model.calls.at(-1)?.tools, undefined, 'dernier appel sans outils')
})

Deno.test('routage de modèle', () => {
  assert.equal(needsSonnet('Bonjour !'), false)
  assert.equal(needsSonnet('Ajoute du lait'), true)
  assert.equal(needsSonnet('Planifie les lasagnes'), true)
})

Deno.test('journal indisponible (migration absente) : l’écriture est annulée, le modèle reçoit une erreur claire', async () => {
  const { db } = setup()
  db.failNext = { table: 'agent_actions', op: 'insert' } // simule la table agent_actions manquante
  const before = db.rows('shopping_items').length
  const model = scriptedModel([
    toolUse(['add_shopping_items', { items: [{ name: 'Beurre' }] }]),
    text('Je ne peux pas le faire pour le moment : le journal des actions est indisponible.'),
  ])
  const res = await handleChat({ db, userId: ME, lang: 'fr', google: null, now: NOW, callAnthropic: model.fn }, { message: 'Ajoute du beurre à ma liste' })
  assert.equal(db.rows('shopping_items').length, before, 'aucune écriture ne doit rester sans possibilité d’annuler')
  const result = model.calls[1].messages.at(-1).content[0]
  assert.equal(result.is_error, true)
  assert.match(result.content, /action_log_unavailable/)
  assert.equal(res.actions.length, 0)
  assert.match(res.message, /indisponible/)
})

// ===========================================================================
// CHOIX DU MODÈLE & CONSOMMATION
// ===========================================================================
const withUsage = (r: Json, input: number, output: number) => ({ ...r, usage: { input_tokens: input, output_tokens: output } })
const chat = (db: FakeDb, fn: (c: ModelCall) => Promise<Json>, message = 'Bonjour') =>
  handleChat({ db, userId: ME, lang: 'fr', google: null, now: NOW, callAnthropic: fn }, { message })

Deno.test('modèle: mode économique par défaut, réglage de l’utilisateur respecté, mode inconnu ignoré', async () => {
  for (const [mode, expected, effort] of [
    [undefined, 'claude-haiku-5-5', 'low'], ['economy', 'claude-haiku-5-5', 'low'], ['balanced', 'claude-sonnet-5-5', 'medium'],
    ['quality', 'claude-opus-5-5', 'medium'], ['nimportequoi', 'claude-haiku-5-5', 'low'],
  ] as const) {
    const { db } = setup()
    if (mode) db.rows('agent_settings').push({ user_id: ME, model_mode: mode })
    const model = scriptedModel([text('ok')])
    await chat(db, model.fn)
    assert.equal(model.calls[0].model, expected, `mode ${mode}`)
    assert.equal(model.calls[0].effort, effort)
  }
  const { db } = setup(); db.failNext = { table: 'agent_settings', op: 'select' } // table absente / erreur
  const model = scriptedModel([text('ok')]); await chat(db, model.fn)
  assert.equal(model.calls[0].model, 'claude-haiku-5-5', 'sans réglage lisible : économique')
})

Deno.test('modèle: le mode auto choisit selon la question', () => {
  assert.equal(resolveProfile('auto', 'Bonjour').profile.model, 'claude-haiku-5-5')
  assert.equal(resolveProfile('auto', 'Ajoute du lait à la liste').profile.model, 'claude-sonnet-5-5')
  assert.equal(resolveProfile('auto', 'x'.repeat(400)).profile.model, 'claude-sonnet-5-5')
  assert.equal(resolveProfile('economy', 'Ajoute du lait à la liste').profile.model, 'claude-haiku-5-5', 'économique ne monte jamais')
})

Deno.test('consommation: tokens cumulés sur tous les tours, coût estimé, ligne enregistrée', async () => {
  const { db } = setup()
  const model = scriptedModel([
    withUsage(toolUse(['get_tasks', {}]), 1000, 200),
    withUsage(text('Une tâche en retard.'), 1500, 300),
  ])
  const res = await chat(db, model.fn, 'Quelles tâches sont en retard ?')
  assert.deepEqual([res.usage.input_tokens, res.usage.output_tokens, res.usage.calls], [2500, 500, 2])
  // 2500 × 0,10 $/M + 500 × 0,50 $/M
  assert.equal(res.usage.cost_usd, 0.0005)
  assert.equal(res.usage.model, 'claude-haiku-5-5')
  const row = db.rows('agent_usage')[0]
  assert.equal(row.message_id, res.assistantMessageId)
  assert.equal(row.user_id, ME)
  assert.deepEqual([row.input_tokens, row.output_tokens, row.calls], [2500, 500, 2])
})

Deno.test('consommation: un échec d’enregistrement du suivi ne casse jamais la réponse', async () => {
  const { db } = setup()
  db.failNext = { table: 'agent_usage', op: 'insert' }
  const res = await chat(db, scriptedModel([withUsage(text('Salut !'), 10, 5)]).fn)
  assert.equal(res.message, 'Salut !')
  assert.equal(db.rows('agent_usage').length, 0)
})

Deno.test('modèle de secours: seulement si le modèle choisi est refusé dès le premier appel', async () => {
  const { db } = setup()
  const model = scriptedModel([new Error('Anthropic 400: model not supported'), withUsage(text('Réponse de secours'), 100, 50)])
  const res = await chat(db, model.fn)
  assert.equal(res.message, 'Réponse de secours')
  assert.deepEqual(model.calls.map((c) => c.model), ['claude-haiku-5-5', 'claude-haiku-4-5'])
  assert.equal(model.calls[1].effort, undefined, 'le modèle de secours ne reçoit pas le paramètre effort')
  assert.equal(res.usage.used_fallback, true)
  assert.equal(res.usage.cost_usd, 0.00035, 'coût calculé au tarif du modèle de secours')

  // Une surcharge temporaire n'est PAS un problème de modèle : pas de repli, l'erreur remonte
  const { db: db2 } = setup()
  const overloaded = scriptedModel([new Error('Anthropic 529: overloaded')])
  await assert.rejects(() => chat(db2, overloaded.fn), /529/)
  assert.equal(overloaded.calls.length, 1)
})

Deno.test('refus du modèle: message clair plutôt qu’une réponse vide', async () => {
  const { db } = setup()
  const res = await chat(db, scriptedModel([{ stop_reason: 'refusal', content: [] }]).fn)
  assert.match(res.message, /ne peux pas/)
})
