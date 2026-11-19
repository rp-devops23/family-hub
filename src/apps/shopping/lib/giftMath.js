// Calculs du planificateur de cadeaux — fonctions pures, sans React ni Supabase.
// Statuts d'une idée : idea (simple idée) · decided (je compte l'acheter) · bought (acheté).
// Budgets facultatifs et en cascade : personne → groupe → événement.

export const STATUSES = ['idea', 'decided', 'bought']

const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v))
const round = (n) => Math.round(n * 100) / 100

/** Prix retenu pour une idée : le prix réel une fois acheté, sinon l'estimation (0 si inconnu). */
export function ideaAmount(idea) {
  if (idea.status === 'bought') return num(idea.actual_price) ?? num(idea.estimated_price) ?? 0
  return num(idea.estimated_price) ?? 0
}

/** Totaux d'une personne. `firm` = acheté + décidé ; `withIdeas` y ajoute les simples idées. */
export function personTotals(person, ideas) {
  const mine = ideas.filter((i) => i.person_id === person.id)
  const sum = (status) => round(mine.filter((i) => i.status === status).reduce((a, i) => a + ideaAmount(i), 0))
  const bought = sum('bought'), decided = sum('decided'), idea = sum('idea')
  const firm = round(bought + decided)
  const budget = num(person.budget)
  return {
    count: mine.length,
    counts: { idea: mine.filter((i) => i.status === 'idea').length, decided: mine.filter((i) => i.status === 'decided').length, bought: mine.filter((i) => i.status === 'bought').length },
    bought, decided, idea, firm, withIdeas: round(firm + idea),
    budget,
    remaining: budget === null ? null : round(budget - firm),
    over: budget !== null && firm > budget,
    overWithIdeas: budget !== null && firm + idea > budget,
  }
}

/** Totaux d'un groupe. Budget effectif = budget du groupe, sinon somme des budgets des personnes. */
export function groupTotals(group, people, ideas) {
  const members = people.filter((p) => p.group_id === group.id)
  const totals = members.map((p) => personTotals(p, ideas))
  const sum = (key) => round(totals.reduce((a, t) => a + t[key], 0))
  const bought = sum('bought'), decided = sum('decided'), idea = sum('idea'), firm = round(bought + decided)
  const personBudgets = members.map((p) => num(p.budget)).filter((b) => b !== null)
  const personBudgetSum = round(personBudgets.reduce((a, b) => a + b, 0))
  const own = num(group.budget)
  const budget = own ?? (personBudgets.length > 0 ? personBudgetSum : null)
  return {
    peopleCount: members.length,
    withoutIdea: members.filter((p, i) => totals[i].count === 0).length,
    bought, decided, idea, firm, withIdeas: round(firm + idea),
    budget, ownBudget: own, personBudgetSum,
    remaining: budget === null ? null : round(budget - firm),
    over: budget !== null && firm > budget,
    // Les budgets des personnes dépassent le plafond fixé pour le groupe
    allocationOver: own !== null && personBudgetSum > own,
  }
}

/** Totaux d'un événement. Budget effectif = budget total, sinon somme des budgets effectifs des groupes. */
export function eventTotals(event, groups, people, ideas) {
  const mine = groups.filter((g) => g.event_id === event.id)
  const totals = mine.map((g) => groupTotals(g, people, ideas))
  const sum = (key) => round(totals.reduce((a, t) => a + t[key], 0))
  const bought = sum('bought'), decided = sum('decided'), idea = sum('idea'), firm = round(bought + decided)
  const groupBudgets = totals.map((t) => t.budget).filter((b) => b !== null)
  const groupBudgetSum = round(groupBudgets.reduce((a, b) => a + b, 0))
  const own = num(event.total_budget)
  const budget = own ?? (groupBudgets.length > 0 ? groupBudgetSum : null)
  return {
    groupCount: mine.length,
    peopleCount: totals.reduce((a, t) => a + t.peopleCount, 0),
    withoutIdea: totals.reduce((a, t) => a + t.withoutIdea, 0),
    bought, decided, idea, firm, withIdeas: round(firm + idea),
    budget, ownBudget: own, groupBudgetSum,
    remaining: budget === null ? null : round(budget - firm),
    over: budget !== null && firm > budget,
    allocationOver: own !== null && groupBudgetSum > own,
  }
}

/** Part (0–1) de `value` dans `total`, bornée ; 0 si total vide. */
export function share(value, total) {
  if (!total || total <= 0) return 0
  return Math.max(0, Math.min(1, value / total))
}

/** Statut suivant dans le cycle idée → décidé → acheté → idée. */
export function nextStatus(status) {
  return STATUSES[(STATUSES.indexOf(status) + 1) % STATUSES.length]
}

/** Interprète « 25 », « 25,50 », « 25.5 € » ; renvoie null si vide ou invalide (jamais négatif). */
export function parseMoney(text) {
  if (text === null || text === undefined) return null
  const cleaned = String(text).replace(/[€\s]/g, '').replace(',', '.')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) && n >= 0 ? round(n) : null
}

/** « Mamie, Papi ; Oncle Jean\nTante Lou » → liste de noms nets, sans doublon (insensible à la casse). */
export function splitNames(text, existing = []) {
  const seen = new Set(existing.map((n) => n.trim().toLowerCase()))
  const out = []
  for (const raw of String(text ?? '').split(/[,;\n]+/)) {
    const name = raw.trim().replace(/\s+/g, ' ')
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    out.push(name)
  }
  return out
}

/** Liste « à acheter » : idées décidées, regroupées par magasin (sans magasin en dernier). */
export function toBuyByStore(event, groups, people, ideas) {
  const groupIds = new Set(groups.filter((g) => g.event_id === event.id).map((g) => g.id))
  const peopleById = new Map(people.filter((p) => groupIds.has(p.group_id)).map((p) => [p.id, p]))
  const rows = ideas.filter((i) => i.status === 'decided' && peopleById.has(i.person_id))
    .map((i) => ({ ...i, person: peopleById.get(i.person_id) }))
  const byStore = new Map()
  for (const r of rows) {
    const store = (r.store ?? '').trim() || ''
    if (!byStore.has(store)) byStore.set(store, [])
    byStore.get(store).push(r)
  }
  return [...byStore.entries()]
    .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
    .map(([store, items]) => ({ store, items, total: round(items.reduce((a, i) => a + ideaAmount(i), 0)) }))
}

/** « Foulard en soie 30 » → { title: 'Foulard en soie', price: 30 } ; sans prix final, price = null. */
export function parseQuickIdea(text) {
  const raw = String(text ?? '').trim().replace(/\s+/g, ' ')
  const m = raw.match(/^(.*\S)\s+(\d+(?:[.,]\d{1,2})?)\s*€?$/)
  if (m) return { title: m[1], price: parseMoney(m[2]) }
  return { title: raw.replace(/\s*€$/, ''), price: null }
}

/** Duplique le nom d'un événement pour l'année suivante (« Noël 2026 » → « Noël 2027 »). */
export function nextYearName(name) {
  return /\b(20\d\d)\b/.test(name) ? name.replace(/\b(20\d\d)\b/, (y) => String(Number(y) + 1)) : `${name} (copie)`
}

/** Même jour, un an plus tard (format AAAA-MM-JJ) ; 29 février → 28 février. */
export function nextYearDate(date) {
  if (!date) return null
  const [y, m, d] = date.split('-').map(Number)
  const leap = (yr) => (yr % 4 === 0 && yr % 100 !== 0) || yr % 400 === 0
  const day = m === 2 && d === 29 && !leap(y + 1) ? 28 : d
  return `${y + 1}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
