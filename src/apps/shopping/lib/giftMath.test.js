import test from 'node:test'
import assert from 'node:assert/strict'
import { ideaAmount, personTotals, groupTotals, eventTotals, nextStatus, parseMoney, splitNames, share, toBuyByStore, parseQuickIdea, nextYearName, nextYearDate } from './giftMath.js'

const idea = (o) => ({ person_id: 'p1', status: 'idea', estimated_price: null, actual_price: null, ...o })

test('ideaAmount : prix réel si acheté, sinon estimation, sinon 0', () => {
  assert.equal(ideaAmount(idea({ status: 'bought', estimated_price: 30, actual_price: 25 })), 25)
  assert.equal(ideaAmount(idea({ status: 'bought', estimated_price: 30 })), 30)
  assert.equal(ideaAmount(idea({ status: 'decided', estimated_price: '12.5', actual_price: 99 })), 12.5)
  assert.equal(ideaAmount(idea({})), 0)
})

test('personTotals : séparation acheté / décidé / idée, reste et dépassement', () => {
  const p = { id: 'p1', budget: 50 }
  const ideas = [
    idea({ status: 'bought', estimated_price: 20, actual_price: 18 }),
    idea({ status: 'decided', estimated_price: 25 }),
    idea({ status: 'idea', estimated_price: 40 }),
    idea({ person_id: 'autre', status: 'bought', actual_price: 999 }),
  ]
  const t = personTotals(p, ideas)
  assert.deepEqual([t.bought, t.decided, t.idea, t.firm, t.withIdeas], [18, 25, 40, 43, 83])
  assert.equal(t.remaining, 7)
  assert.equal(t.over, false)
  assert.equal(t.overWithIdeas, true)
  assert.deepEqual(t.counts, { idea: 1, decided: 1, bought: 1 })
})

test('personTotals : aucune idée, aucun budget', () => {
  const t = personTotals({ id: 'p1', budget: null }, [])
  assert.equal(t.count, 0); assert.equal(t.budget, null); assert.equal(t.remaining, null); assert.equal(t.over, false)
})

test('personTotals : dépassement du budget par des cadeaux fermes', () => {
  const t = personTotals({ id: 'p1', budget: 20 }, [idea({ status: 'decided', estimated_price: 30 })])
  assert.equal(t.over, true); assert.equal(t.remaining, -10)
})

test('groupTotals : budget effectif = budget du groupe, sinon somme des personnes', () => {
  const people = [{ id: 'p1', group_id: 'g1', budget: 50 }, { id: 'p2', group_id: 'g1', budget: 30 }, { id: 'p3', group_id: 'g1', budget: null }]
  const ideas = [idea({ person_id: 'p1', status: 'bought', actual_price: 40 })]
  const sansPlafond = groupTotals({ id: 'g1', budget: null }, people, ideas)
  assert.equal(sansPlafond.budget, 80); assert.equal(sansPlafond.remaining, 40); assert.equal(sansPlafond.withoutIdea, 2)
  const avecPlafond = groupTotals({ id: 'g1', budget: 70 }, people, ideas)
  assert.equal(avecPlafond.budget, 70); assert.equal(avecPlafond.allocationOver, true) // 80 alloués > 70
  assert.equal(groupTotals({ id: 'g1', budget: 100 }, people, ideas).allocationOver, false)
})

test('groupTotals : aucun budget nulle part → budget null', () => {
  const t = groupTotals({ id: 'g1', budget: null }, [{ id: 'p1', group_id: 'g1', budget: null }], [])
  assert.equal(t.budget, null); assert.equal(t.remaining, null)
})

test('eventTotals : cascade personnes → groupes → événement', () => {
  const groups = [{ id: 'g1', event_id: 'e1', budget: 100 }, { id: 'g2', event_id: 'e1', budget: null }, { id: 'gx', event_id: 'autre', budget: 5000 }]
  const people = [{ id: 'p1', group_id: 'g1', budget: 10 }, { id: 'p2', group_id: 'g2', budget: 60 }, { id: 'p3', group_id: 'gx', budget: 1 }]
  const ideas = [idea({ person_id: 'p1', status: 'bought', actual_price: 15 }), idea({ person_id: 'p2', status: 'decided', estimated_price: 20 })]
  const e = eventTotals({ id: 'e1', total_budget: null }, groups, people, ideas)
  assert.equal(e.budget, 160); assert.equal(e.firm, 35); assert.equal(e.remaining, 125); assert.equal(e.peopleCount, 2)
  const plafonne = eventTotals({ id: 'e1', total_budget: 120 }, groups, people, ideas)
  assert.equal(plafonne.budget, 120); assert.equal(plafonne.allocationOver, true)
})

test('nextStatus : cycle idée → décidé → acheté → idée', () => {
  assert.equal(nextStatus('idea'), 'decided'); assert.equal(nextStatus('decided'), 'bought'); assert.equal(nextStatus('bought'), 'idea')
})

test('parseMoney : formats usuels, jamais négatif', () => {
  assert.equal(parseMoney('25'), 25); assert.equal(parseMoney('25,50'), 25.5); assert.equal(parseMoney(' 25.5 € '), 25.5)
  assert.equal(parseMoney(''), null); assert.equal(parseMoney('abc'), null); assert.equal(parseMoney('-5'), null); assert.equal(parseMoney(null), null)
  assert.equal(parseMoney('0'), 0)
})

test('splitNames : séparateurs variés, doublons et existants ignorés', () => {
  assert.deepEqual(splitNames('Mamie, Papi ; Oncle  Jean\nTante Lou,, '), ['Mamie', 'Papi', 'Oncle Jean', 'Tante Lou'])
  assert.deepEqual(splitNames('Mamie, mamie, Léa', ['MAMIE']), ['Léa'])
  assert.deepEqual(splitNames(''), [])
})

test('share : borné entre 0 et 1', () => {
  assert.equal(share(5, 10), 0.5); assert.equal(share(20, 10), 1); assert.equal(share(-1, 10), 0); assert.equal(share(5, 0), 0)
})

test('toBuyByStore : idées décidées par magasin, sans magasin en dernier', () => {
  const groups = [{ id: 'g1', event_id: 'e1' }]
  const people = [{ id: 'p1', group_id: 'g1', name: 'Mamie' }]
  const ideas = [
    idea({ id: 'a', status: 'decided', estimated_price: 10, store: 'Fnac' }),
    idea({ id: 'b', status: 'decided', estimated_price: 5 }),
    idea({ id: 'c', status: 'decided', estimated_price: 7, store: 'Fnac' }),
    idea({ id: 'd', status: 'idea', estimated_price: 99, store: 'Fnac' }),
    idea({ id: 'e', status: 'decided', estimated_price: 3, store: 'Amazon' }),
  ]
  const r = toBuyByStore({ id: 'e1' }, groups, people, ideas)
  assert.deepEqual(r.map((x) => x.store), ['Amazon', 'Fnac', ''])
  assert.equal(r[1].total, 17); assert.equal(r[1].items.length, 2)
})

test('parseQuickIdea : prix final optionnel', () => {
  assert.deepEqual(parseQuickIdea('Foulard en soie 30'), { title: 'Foulard en soie', price: 30 })
  assert.deepEqual(parseQuickIdea('Livre 12,50 €'), { title: 'Livre', price: 12.5 })
  assert.deepEqual(parseQuickIdea('Lego 75192'), { title: 'Lego', price: 75192 })
  assert.deepEqual(parseQuickIdea('Foulard'), { title: 'Foulard', price: null })
  assert.deepEqual(parseQuickIdea('42'), { title: '42', price: null })
})

test('nextYearName / nextYearDate', () => {
  assert.equal(nextYearName('Noël 2026'), 'Noël 2027'); assert.equal(nextYearName('Anniversaire'), 'Anniversaire (copie)')
  assert.equal(nextYearDate('2026-12-25'), '2027-12-25'); assert.equal(nextYearDate('2028-02-29'), '2029-02-28'); assert.equal(nextYearDate(null), null)
})
