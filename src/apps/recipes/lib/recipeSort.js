// Tri des recettes et « dernière fois cuisiné » — fonctions pures.
import { recipePrice } from './price.js'

export const SORT_KEYS = ['name', 'recent', 'priceAsc', 'priceDesc', 'time', 'longAgo']

const byName = (a, b) => a.name.localeCompare(b.name)
// Valeurs inconnues (null) toujours à la fin
const nullsLast = (get, dir) => (a, b) => {
  const x = get(a), y = get(b)
  if (x == null && y == null) return byName(a, b)
  if (x == null) return 1
  if (y == null) return -1
  return (x - y) * dir || byName(a, b)
}

/**
 * @param recipes liste de recettes
 * @param key     'name' | 'recent' | 'priceAsc' | 'priceDesc' | 'time' | 'longAgo'
 * @param lastPlanned Map(recipe_id → 'AAAA-MM-JJ') — requis pour 'longAgo' (jamais cuisiné en premier, puis le plus ancien)
 */
export function sortRecipes(recipes, key, lastPlanned = new Map()) {
  const list = [...recipes]
  const price = (r) => { const p = recipePrice(r); return p.amount }
  switch (key) {
    case 'recent': return list.sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')) || byName(a, b))
    case 'priceAsc': return list.sort(nullsLast(price, 1))
    case 'priceDesc': return list.sort(nullsLast(price, -1))
    case 'time': return list.sort(nullsLast((r) => r.prep_time_minutes ?? null, 1))
    case 'longAgo': return list.sort((a, b) => {
      const x = lastPlanned.get(a.id), y = lastPlanned.get(b.id)
      if (!x && !y) return byName(a, b)
      if (!x) return -1
      if (!y) return 1
      return x.localeCompare(y) || byName(a, b)
    })
    default: return list.sort(byName)
  }
}

/** Dernière date (≤ aujourd'hui) à laquelle chaque recette était au menu : Map(recipe_id → date). */
export function lastPlannedMap(plans, today) {
  const map = new Map()
  for (const p of plans) {
    if (p.planned_date > today) continue
    if (!map.has(p.recipe_id) || p.planned_date > map.get(p.recipe_id)) map.set(p.recipe_id, p.planned_date)
  }
  return map
}

/** « aujourd'hui », « il y a 12 j », « il y a 3 sem. », « il y a 2 mois », « il y a 1 an ». */
export function agoLabel(date, today, lang = 'fr') {
  const days = Math.round((new Date(`${today}T00:00:00Z`) - new Date(`${date}T00:00:00Z`)) / 86400000)
  const fr = lang === 'fr'
  if (days <= 0) return fr ? 'aujourd’hui' : 'today'
  if (days < 14) return fr ? `il y a ${days} j` : `${days} d ago`
  if (days < 60) return fr ? `il y a ${Math.round(days / 7)} sem.` : `${Math.round(days / 7)} wk ago`
  if (days < 365) return fr ? `il y a ${Math.round(days / 30)} mois` : `${Math.round(days / 30)} mo ago`
  const years = Math.round(days / 365)
  return fr ? `il y a ${years} an${years > 1 ? 's' : ''}` : `${years} yr ago`
}
