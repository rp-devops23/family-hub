// Statistiques des repas planifiés — fonctions pures (même logique que l'outil get_meal_stats de l'assistant).

const SEASONS = {
  fr: { winter: 'Hiver', spring: 'Printemps', summer: 'Été', autumn: 'Automne' },
  en: { winter: 'Winter', spring: 'Spring', summer: 'Summer', autumn: 'Autumn' },
}

/** Saison météo d'une date (AAAA-MM-JJ) ; l'hiver de décembre 2025 est « Hiver 2025-26 ». */
export function seasonKey(isoDate, lang = 'fr') {
  const year = Number(isoDate.slice(0, 4)), month = Number(isoDate.slice(5, 7))
  const season = month === 12 || month <= 2 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'autumn'
  const names = SEASONS[lang] ?? SEASONS.fr
  if (season === 'winter') {
    const start = month === 12 ? year : year - 1
    return { key: `${start}-0-winter`, label: `${names.winter} ${start}-${String(start + 1).slice(2)}`, season }
  }
  const order = { spring: 1, summer: 2, autumn: 3 }[season]
  return { key: `${year}-${order}-${season}`, label: `${names[season]} ${year}`, season }
}

/** Coût d'une recette : { cost, complete } ou null si inconnu (d'après recipe.cost de la vue recipe_costs). */
export function costOf(recipe) {
  const known = recipe?.cost?.known_cost
  if (known == null || Number.isNaN(Number(known))) return null
  return { cost: Number(known), complete: Number(recipe.cost.missing_count) === 0 }
}

/**
 * @param plans   [{ recipe_id, planned_date }]
 * @param recipes [{ id, name, meal_type, cost? }]
 * @param opts    { groupBy: 'season'|'year'|'month'|'none', mealType?, top?, lang? }
 */
export function buildMealStats(plans, recipes, { groupBy = 'season', mealType = null, top = 5, lang = 'fr' } = {}) {
  const byId = new Map(recipes.map((r) => [r.id, r]))
  const kept = plans.filter((p) => byId.has(p.recipe_id) && (!mealType || (byId.get(p.recipe_id).meal_type || 'main') === mealType))

  const keyOf = (date) =>
    groupBy === 'season' ? seasonKey(date, lang)
    : groupBy === 'year' ? { key: date.slice(0, 4), label: date.slice(0, 4) }
    : groupBy === 'month' ? { key: date.slice(0, 7), label: date.slice(0, 7) }
    : { key: 'all', label: lang === 'fr' ? 'Total' : 'Total' }

  const topOf = (list, n) => {
    const counts = new Map()
    for (const p of list) counts.set(p.recipe_id, (counts.get(p.recipe_id) ?? 0) + 1)
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || byId.get(a[0]).name.localeCompare(byId.get(b[0]).name))
      .slice(0, n).map(([id, times]) => ({ id, name: byId.get(id).name, times }))
  }
  const summarize = (list) => {
    let cost = 0, withoutCost = 0
    for (const p of list) {
      const c = costOf(byId.get(p.recipe_id))
      if (!c) withoutCost++
      else { cost += c.cost; if (!c.complete) withoutCost++ }
    }
    return {
      meals: list.length,
      distinct: new Set(list.map((p) => p.recipe_id)).size,
      cost: Math.round(cost * 100) / 100,
      withoutCost,
      top: topOf(list, top),
    }
  }

  const groups = new Map()
  for (const p of kept) {
    const k = keyOf(p.planned_date)
    if (!groups.has(k.key)) groups.set(k.key, { label: k.label, season: k.season, list: [] })
    groups.get(k.key).list.push(p)
  }
  const periods = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([key, g]) => ({ key, label: g.label, season: g.season, ...summarize(g.list) }))

  const planned = new Set(kept.map((p) => p.recipe_id))
  const never = recipes.filter((r) => !planned.has(r.id) && (!mealType || (r.meal_type || 'main') === mealType)).map((r) => r.name).sort((a, b) => a.localeCompare(b))
  return { total: kept.length, periods, overallTop: topOf(kept, 10), never }
}
