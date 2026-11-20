// Saisie des prix d'ingrédients (table ingredient_prices) — logique pure, sans React ni Supabase.
//
// Une ligne = le prix d'un paquet : price (€) pour pack_qty (g, ml ou pièces).
// Le prix par unité (price_per_unit) est calculé par la base. Sources « gratuit » et « negligeable » :
// l'ingrédient compte pour 0 € dans les recettes. Source « a_completer » : à renseigner plus tard.

export const PACK_UNITS = ['g', 'ml', 'piece']
export const FREE_SOURCES = ['gratuit', 'negligeable']

/** « 6,79 », « 6.79 € » → 6.79 ; vide ou invalide → null ; jamais négatif. */
export function parseNumber(text) {
  if (text === null || text === undefined) return null
  const cleaned = String(text).replace(/[€\s]/g, '').replace(',', '.')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) && n >= 0 ? n : null
}

/**
 * Statut d'un ingrédient d'après sa ligne de prix :
 *  none = pas de prix · todo = « à compléter » ou prix incomplet · free = gratuit/négligeable · priced = chiffré
 */
export function priceStatus(row) {
  if (!row) return 'none'
  if (FREE_SOURCES.includes(row.source)) return 'free'
  if (row.source === 'a_completer') return 'todo'
  const ok = Number(row.price) >= 0 && row.price !== null && Number(row.pack_qty) > 0 && PACK_UNITS.includes(row.pack_unit)
  return ok ? 'priced' : 'todo'
}

/** Prix par unité affichable : « 14 €/kg », « 0,18 €/pièce »… */
export function unitPriceLabel(row, lang = 'fr') {
  const qty = Number(row?.pack_qty), price = Number(row?.price)
  if (!(qty > 0) || Number.isNaN(price) || row?.price === null) return null
  const fmt = (n) => new Intl.NumberFormat(lang === 'fr' ? 'fr-BE' : 'en-GB', { maximumFractionDigits: 2 }).format(n)
  if (row.pack_unit === 'g') return `${fmt((price / qty) * 1000)} €/kg`
  if (row.pack_unit === 'ml') return `${fmt((price / qty) * 1000)} €/l`
  return `${fmt(price / qty)} €/${lang === 'fr' ? 'pièce' : 'piece'}`
}

/**
 * Ligne à enregistrer d'après le formulaire. Renvoie { row } ou { error }.
 * form : { mode: 'price'|'gratuit'|'negligeable', price, packQty, packUnit, store }
 */
export function buildPriceRow(ingredientId, form, now = new Date()) {
  const updated_at = now.toISOString()
  if (form.mode === 'gratuit' || form.mode === 'negligeable') {
    return { row: { ingredient_id: ingredientId, source: form.mode, store: null, product_label: null, price: 0, pack_qty: null, pack_unit: null, updated_at } }
  }
  const price = parseNumber(form.price)
  const packQty = parseNumber(form.packQty)
  if (price === null) return { error: 'price' }
  if (packQty === null || packQty <= 0) return { error: 'packQty' }
  if (!PACK_UNITS.includes(form.packUnit)) return { error: 'packUnit' }
  return {
    row: {
      ingredient_id: ingredientId, source: 'autre_magasin', store: (form.store ?? '').trim() || null,
      price, pack_qty: packQty, pack_unit: form.packUnit, updated_at,
    },
  }
}

/** Valeurs de départ du formulaire d'après la ligne existante. */
export function formFromRow(row) {
  if (row && FREE_SOURCES.includes(row.source)) return { mode: row.source, price: '', packQty: '', packUnit: 'g', store: '' }
  return {
    mode: 'price',
    price: row?.price != null && row.source !== 'a_completer' ? String(row.price) : '',
    packQty: row?.pack_qty != null ? String(Number(row.pack_qty)) : '',
    packUnit: PACK_UNITS.includes(row?.pack_unit) ? row.pack_unit : 'g',
    store: row?.store ?? '',
  }
}

/** Nombre de recettes utilisant chaque ingrédient : Map(ingredient_id → n). */
export function usageCounts(recipes) {
  const counts = new Map()
  for (const r of recipes) {
    for (const id of new Set((r.recipe_ingredients ?? []).map((ri) => ri.ingredient_id))) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

/** Ordre de la liste : sans prix d'abord, puis à compléter, puis chiffrés ; les plus utilisés en premier, puis alphabétique. */
export function sortIngredients(ingredients, priceById, usage, nameOf) {
  const rank = { none: 0, todo: 1, priced: 2, free: 3 }
  return [...ingredients].sort((a, b) =>
    rank[priceStatus(priceById.get(a.id))] - rank[priceStatus(priceById.get(b.id))]
    || (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0)
    || nameOf(a).localeCompare(nameOf(b)))
}
