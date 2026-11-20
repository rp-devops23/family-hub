import test from 'node:test'
import assert from 'node:assert/strict'
import { parseNumber, priceStatus, unitPriceLabel, buildPriceRow, formFromRow, usageCounts, sortIngredients } from './priceEntry.js'

test('parseNumber : virgule, symbole €, vide, négatif', () => {
  assert.equal(parseNumber('6,79'), 6.79); assert.equal(parseNumber(' 6.79 € '), 6.79); assert.equal(parseNumber('0'), 0)
  assert.equal(parseNumber(''), null); assert.equal(parseNumber('abc'), null); assert.equal(parseNumber('-1'), null); assert.equal(parseNumber(null), null)
})

test('priceStatus', () => {
  assert.equal(priceStatus(undefined), 'none')
  assert.equal(priceStatus({ source: 'gratuit' }), 'free')
  assert.equal(priceStatus({ source: 'negligeable' }), 'free')
  assert.equal(priceStatus({ source: 'a_completer' }), 'todo')
  assert.equal(priceStatus({ source: 'delhaize_ticket', price: 6.79, pack_qty: 370, pack_unit: 'g' }), 'priced')
  assert.equal(priceStatus({ source: 'delhaize_ticket', price: 6.79, pack_qty: null, pack_unit: 'g' }), 'todo')
  assert.equal(priceStatus({ source: 'autre_magasin', price: null, pack_qty: 500, pack_unit: 'g' }), 'todo')
})

test('unitPriceLabel : €/kg, €/l, €/pièce', () => {
  assert.equal(unitPriceLabel({ price: 7, pack_qty: 500, pack_unit: 'g' }), '14 €/kg')
  assert.equal(unitPriceLabel({ price: 1.2, pack_qty: 1000, pack_unit: 'ml' }), '1,2 €/l')
  assert.equal(unitPriceLabel({ price: 1.8, pack_qty: 10, pack_unit: 'piece' }), '0,18 €/pièce')
  assert.equal(unitPriceLabel({ price: 1, pack_qty: null, pack_unit: 'g' }), null)
})

test('buildPriceRow : prix, gratuit, erreurs', () => {
  const now = new Date('2026-11-20T10:00:00Z')
  const ok = buildPriceRow('i1', { mode: 'price', price: '7,5', packQty: '500', packUnit: 'g', store: ' Saison ' }, now)
  assert.deepEqual(ok.row, { ingredient_id: 'i1', source: 'autre_magasin', store: 'Saison', price: 7.5, pack_qty: 500, pack_unit: 'g', updated_at: now.toISOString() })
  const free = buildPriceRow('i1', { mode: 'gratuit' }, now)
  assert.equal(free.row.source, 'gratuit'); assert.equal(free.row.price, 0); assert.equal(free.row.pack_qty, null)
  assert.deepEqual(buildPriceRow('i1', { mode: 'price', price: '', packQty: '5', packUnit: 'g' }), { error: 'price' })
  assert.deepEqual(buildPriceRow('i1', { mode: 'price', price: '5', packQty: '0', packUnit: 'g' }), { error: 'packQty' })
  assert.deepEqual(buildPriceRow('i1', { mode: 'price', price: '5', packQty: '5', packUnit: 'kg' }), { error: 'packUnit' })
})

test('formFromRow : reprend la ligne existante', () => {
  assert.deepEqual(formFromRow({ source: 'delhaize_ticket', price: 6.79, pack_qty: '370.000', pack_unit: 'g', store: 'Delhaize' }), { mode: 'price', price: '6.79', packQty: '370', packUnit: 'g', store: 'Delhaize' })
  assert.equal(formFromRow({ source: 'gratuit' }).mode, 'gratuit')
  assert.deepEqual(formFromRow(undefined), { mode: 'price', price: '', packQty: '', packUnit: 'g', store: '' })
})

test('usageCounts et sortIngredients : sans prix et très utilisés d’abord', () => {
  const recipes = [
    { recipe_ingredients: [{ ingredient_id: 'a' }, { ingredient_id: 'a' }, { ingredient_id: 'b' }] },
    { recipe_ingredients: [{ ingredient_id: 'b' }, { ingredient_id: 'c' }] },
  ]
  const usage = usageCounts(recipes)
  assert.equal(usage.get('a'), 1); assert.equal(usage.get('b'), 2)
  const ings = [{ id: 'a', n: 'Ail' }, { id: 'b', n: 'Beurre' }, { id: 'c', n: 'Carotte' }, { id: 'd', n: 'Dinde' }]
  const prices = new Map([['c', { source: 'delhaize_ticket', price: 1, pack_qty: 100, pack_unit: 'g' }]])
  const order = sortIngredients(ings, prices, usage, (i) => i.n).map((i) => i.id)
  assert.deepEqual(order, ['b', 'a', 'd', 'c']) // sans prix : Beurre (2), Ail (1), Dinde (0) ; puis Carotte chiffrée
})
