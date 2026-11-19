// Prix d'une recette, calculé par la base (vue recipe_costs) d'après les prix des ingrédients
// et les quantités de la recette. Une recette n'a plus de niveau de prix choisi à la main.
//
//   complete : tous les ingrédients sont chiffrés → prix exact (d'après les prix connus)
//   partial  : certains ingrédients ne sont pas chiffrés → le prix affiché est un minimum
//   unknown  : aucun ingrédient chiffré (quantités ou prix manquants)

export function recipePrice(recipe) {
  const cost = recipe?.cost
  const amount = cost && cost.known_cost != null ? Number(cost.known_cost) : null
  if (amount === null || Number.isNaN(amount)) {
    return { status: 'unknown', amount: null, missing: splitMissing(cost?.missing_ingredients) }
  }
  const missingCount = Number(cost.missing_count) || 0
  return {
    status: missingCount === 0 ? 'complete' : 'partial',
    amount,
    missing: splitMissing(cost.missing_ingredients),
  }
}

function splitMissing(text) {
  return text ? String(text).split(',').map(s => s.trim()).filter(Boolean) : []
}

export function formatEuro(amount, language = 'fr') {
  return new Intl.NumberFormat(language === 'fr' ? 'fr-BE' : 'en-GB', { style: 'currency', currency: 'EUR' }).format(amount)
}

/**
 * Filtre « prix max » : une recette passe si son prix connu (ou minimum connu) ne dépasse pas le plafond.
 * Une recette sans aucun prix ne peut pas être comparée : elle est écartée (et comptée à part).
 */
export function priceFilter(recipe, maxPrice) {
  if (maxPrice === '' || maxPrice == null) return 'pass'
  const max = Number(String(maxPrice).replace(',', '.'))
  if (!Number.isFinite(max)) return 'pass'
  const { status, amount } = recipePrice(recipe)
  if (status === 'unknown') return 'unknown'
  return amount <= max ? 'pass' : 'too-expensive'
}
