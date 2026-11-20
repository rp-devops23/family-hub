import test from 'node:test'
import assert from 'node:assert/strict'
import { buildMealStats, seasonKey, costOf } from './mealStats.js'

const recipes = [
  { id: 'a', name: 'Pâtes tomate', meal_type: 'main', cost: { known_cost: '8.40', missing_count: 0 } },
  { id: 'b', name: 'Carbonara', meal_type: 'main', cost: { known_cost: '5.10', missing_count: 2 } },
  { id: 'c', name: 'Tarte', meal_type: 'dessert' },
  { id: 'd', name: 'Jamais', meal_type: 'main' },
]
const plans = [
  { recipe_id: 'a', planned_date: '2025-12-20' }, { recipe_id: 'a', planned_date: '2026-01-10' },
  { recipe_id: 'b', planned_date: '2026-02-01' }, { recipe_id: 'a', planned_date: '2026-07-04' },
  { recipe_id: 'c', planned_date: '2026-07-05' }, { recipe_id: 'zz', planned_date: '2026-07-06' },
]

test('seasonKey : l’hiver de décembre appartient à l’hiver commencé cette année-là', () => {
  assert.equal(seasonKey('2025-12-31').label, 'Hiver 2025-26')
  assert.equal(seasonKey('2026-01-01').label, 'Hiver 2025-26')
  assert.equal(seasonKey('2026-03-01').label, 'Printemps 2026')
  assert.equal(seasonKey('2026-09-01', 'en').label, 'Autumn 2026')
})

test('costOf : inconnu, partiel, complet', () => {
  assert.equal(costOf(recipes[2]), null)
  assert.deepEqual(costOf(recipes[1]), { cost: 5.1, complete: false })
  assert.deepEqual(costOf(recipes[0]), { cost: 8.4, complete: true })
})

test('par saison : repas, plats distincts, coût et repas sans coût complet', () => {
  const s = buildMealStats(plans, recipes, { groupBy: 'season' })
  assert.equal(s.total, 5) // la recette inconnue « zz » est ignorée
  assert.deepEqual(s.periods.map((p) => [p.label, p.meals]), [['Hiver 2025-26', 3], ['Été 2026', 2]])
  const winter = s.periods[0]
  assert.equal(winter.distinct, 2)
  assert.equal(winter.cost, 21.9)
  assert.equal(winter.withoutCost, 1)
  assert.deepEqual(winter.top[0], { id: 'a', name: 'Pâtes tomate', times: 2 })
  assert.equal(s.periods[1].withoutCost, 1) // la tarte n'a pas de coût
})

test('par année, filtre type de repas, jamais planifiés', () => {
  const y = buildMealStats(plans, recipes, { groupBy: 'year' })
  assert.deepEqual(y.periods.map((p) => [p.label, p.meals]), [['2025', 1], ['2026', 4]])
  const dessert = buildMealStats(plans, recipes, { groupBy: 'none', mealType: 'dessert' })
  assert.equal(dessert.total, 1)
  assert.deepEqual(dessert.never, [])
  assert.deepEqual(y.never, ['Jamais'])
  assert.equal(y.overallTop[0].name, 'Pâtes tomate')
})
