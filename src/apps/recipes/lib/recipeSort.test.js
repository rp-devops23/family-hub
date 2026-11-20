import test from 'node:test'
import assert from 'node:assert/strict'
import { sortRecipes, lastPlannedMap, agoLabel } from './recipeSort.js'

const cost = (known, missing = 0) => ({ known_cost: known, missing_count: missing })
const recipes = [
  { id: 'a', name: 'Lasagnes', created_at: '2026-01-01', prep_time_minutes: 60, cost: cost('9.5') },
  { id: 'b', name: 'Carbonara', created_at: '2026-03-01', prep_time_minutes: 20, cost: cost('5') },
  { id: 'c', name: 'Soupe', created_at: '2026-02-01', prep_time_minutes: null },
  { id: 'd', name: 'Tarte', created_at: '2026-04-01', prep_time_minutes: 45, cost: cost('7') },
]
const ids = (l) => l.map((r) => r.id).join('')

test('tri par nom, récents, temps', () => {
  assert.equal(ids(sortRecipes(recipes, 'name')), 'bacd')
  assert.equal(ids(sortRecipes(recipes, 'recent')), 'dbca')
  assert.equal(ids(sortRecipes(recipes, 'time')), 'bdac') // inconnu en dernier
})

test('tri par prix : inconnus toujours à la fin', () => {
  assert.equal(ids(sortRecipes(recipes, 'priceAsc')), 'bdac')
  assert.equal(ids(sortRecipes(recipes, 'priceDesc')), 'adbc')
})

test('lastPlannedMap ignore le futur ; longAgo : jamais cuisiné d’abord, puis le plus ancien', () => {
  const plans = [
    { recipe_id: 'a', planned_date: '2026-10-01' }, { recipe_id: 'a', planned_date: '2026-11-10' },
    { recipe_id: 'b', planned_date: '2026-06-01' }, { recipe_id: 'd', planned_date: '2026-12-25' },
  ]
  const last = lastPlannedMap(plans, '2026-11-20')
  assert.equal(last.get('a'), '2026-11-10'); assert.equal(last.get('b'), '2026-06-01'); assert.equal(last.has('d'), false)
  assert.equal(ids(sortRecipes(recipes, 'longAgo', last)), 'cdba') // Soupe, Tarte (jamais) ; Carbonara (juin) ; Lasagnes (nov.)
})

test('agoLabel', () => {
  assert.equal(agoLabel('2026-11-20', '2026-11-20'), 'aujourd’hui')
  assert.equal(agoLabel('2026-11-08', '2026-11-20'), 'il y a 12 j')
  assert.equal(agoLabel('2026-10-30', '2026-11-20'), 'il y a 3 sem.')
  assert.equal(agoLabel('2026-08-20', '2026-11-20'), 'il y a 3 mois')
  assert.equal(agoLabel('2024-11-20', '2026-11-20'), 'il y a 2 ans')
})
