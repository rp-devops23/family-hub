import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useApp } from '../context/RecipeContext'
import { colors, fontSizes, borderRadius, shadows } from '../lib/theme'
import { PACK_UNITS, buildPriceRow, formFromRow, priceStatus, sortIngredients, unitPriceLabel, usageCounts } from '../lib/priceEntry'

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

// Prix des ingrédients : de quoi chiffrer les recettes. Les ingrédients sans prix passent en premier.
export default function PricesPage() {
  const { language, ingredients, recipes, getName, refreshRecipes } = useApp()
  const fr = language === 'fr'
  const tt = (a, b) => (fr ? a : b)

  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('todo') // todo | all | priced
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase.from('ingredient_prices').select('*').then(({ data, error: err }) => {
      if (cancelled) return
      if (err) setError(err.message); else setRows(data ?? [])
    })
    return () => { cancelled = true }
  }, [])

  const priceById = useMemo(() => new Map((rows ?? []).map((r) => [r.ingredient_id, r])), [rows])
  const usage = useMemo(() => usageCounts(recipes), [recipes])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sorted = sortIngredients(ingredients, priceById, usage, getName)
    return sorted.filter((i) => {
      const status = priceStatus(priceById.get(i.id))
      if (filter === 'todo' && !(status === 'none' || status === 'todo')) return false
      if (filter === 'priced' && !(status === 'priced' || status === 'free')) return false
      return !q || getName(i).toLowerCase().includes(q)
    })
  }, [ingredients, priceById, usage, filter, query, getName])

  const counts = useMemo(() => {
    let todo = 0
    for (const i of ingredients) { const s = priceStatus(priceById.get(i.id)); if (s === 'none' || s === 'todo') todo++ }
    return { todo, priced: ingredients.length - todo }
  }, [ingredients, priceById])

  const onSaved = (row) => {
    setRows((prev) => [...(prev ?? []).filter((r) => r.ingredient_id !== row.ingredient_id), row])
    setOpenId(null)
    refreshRecipes() // les coûts des recettes se recalculent
  }
  const onRemoved = (ingredientId) => {
    setRows((prev) => (prev ?? []).filter((r) => r.ingredient_id !== ingredientId))
    setOpenId(null)
    refreshRecipes()
  }

  if (error) return <p style={styles.muted}>⚠️ {error}</p>
  if (!rows) return <p style={styles.muted}>{tt('Chargement…', 'Loading…')}</p>

  return (
    <div style={styles.page}>
      <p style={styles.intro}>
        {tt('Le prix d’un paquet et sa taille : le coût des recettes en découle. ', 'The price of a pack and its size: recipe costs follow. ')}
        <b>{counts.todo}</b> {tt('ingrédient(s) sans prix.', 'ingredient(s) without a price.')}
      </p>

      <div style={styles.tabs}>
        {[['todo', tt(`Sans prix (${counts.todo})`, `No price (${counts.todo})`)], ['priced', tt(`Chiffrés (${counts.priced})`, `Priced (${counts.priced})`)], ['all', tt('Tous', 'All')]].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ ...styles.tab, ...(filter === k ? styles.tabOn : {}) }}>{label}</button>
        ))}
      </div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tt('Rechercher un ingrédient…', 'Search an ingredient…')} style={styles.search} />

      {list.length === 0 && <p style={styles.muted}>{filter === 'todo' ? tt('🎉 Tous les ingrédients ont un prix.', '🎉 Every ingredient has a price.') : tt('Aucun ingrédient.', 'No ingredient.')}</p>}

      {list.map((ing) => {
        const row = priceById.get(ing.id)
        const status = priceStatus(row)
        const n = usage.get(ing.id) ?? 0
        const open = openId === ing.id
        return (
          <div key={ing.id} style={styles.card}>
            <button style={styles.rowBtn} onClick={() => setOpenId(open ? null : ing.id)} aria-expanded={open}>
              <span style={styles.rowMain}>
                <span style={styles.name}>{getName(ing)}</span>
                <span style={styles.sub}>{n > 0 ? tt(`dans ${n} recette${n > 1 ? 's' : ''}`, `in ${n} recipe${n > 1 ? 's' : ''}`) : tt('dans aucune recette', 'in no recipe')}</span>
              </span>
              <span style={{ ...styles.badge, ...BADGE[status] }}>
                {status === 'priced' ? `${unitPriceLabel(row, language)}` : status === 'free' ? (row.source === 'gratuit' ? tt('gratuit', 'free') : tt('négligeable', 'negligible')) : status === 'todo' ? tt('à compléter', 'to complete') : tt('pas de prix', 'no price')}
              </span>
            </button>
            {open && <Editor key={ing.id} ingredientId={ing.id} row={row} fr={fr} tt={tt} onSaved={onSaved} onRemoved={onRemoved} />}
          </div>
        )
      })}
    </div>
  )
}

const BADGE = {
  none: { background: '#FDECEA', color: '#C0392B' },
  todo: { background: '#FEF5E7', color: '#B9770E' },
  priced: { background: '#E8F8EF', color: '#1E8449' },
  free: { background: '#EEF0F4', color: '#5D6D7E' },
}

function Editor({ ingredientId, row, tt, onSaved, onRemoved }) {
  const [form, setForm] = useState(() => formFromRow(row))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    const built = buildPriceRow(ingredientId, form)
    if (built.error) {
      setErr(built.error === 'price' ? tt('Indique le prix du paquet.', 'Enter the pack price.') : built.error === 'packQty' ? tt('Indique la quantité du paquet (plus grande que 0).', 'Enter the pack quantity (above 0).') : tt('Choisis l’unité.', 'Pick the unit.'))
      return
    }
    setSaving(true); setErr('')
    const { data, error } = await supabase.from('ingredient_prices').upsert(built.row, { onConflict: 'ingredient_id' }).select().single()
    setSaving(false)
    if (error) setErr(error.message); else onSaved(data ?? built.row)
  }
  const remove = async () => {
    setSaving(true)
    const { error } = await supabase.from('ingredient_prices').delete().eq('ingredient_id', ingredientId)
    setSaving(false)
    if (error) setErr(error.message); else onRemoved(ingredientId)
  }

  const unitLabel = { g: 'g', ml: 'ml', piece: tt('pièce(s)', 'piece(s)') }
  return (
    <div style={styles.editor}>
      <div style={styles.modes}>
        {[['price', tt('💶 Prix', '💶 Price')], ['gratuit', tt('🆓 Gratuit', '🆓 Free')], ['negligeable', tt('➖ Négligeable', '➖ Negligible')]].map(([k, label]) => (
          <button key={k} type="button" onClick={() => set('mode', k)} style={{ ...styles.mode, ...(form.mode === k ? styles.modeOn : {}) }}>{label}</button>
        ))}
      </div>

      {form.mode === 'price' ? (
        <>
          <div style={styles.fields}>
            <label style={styles.field}>
              <span style={styles.label}>{tt('Prix du paquet (€)', 'Pack price (€)')}</span>
              <input inputMode="decimal" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="6,79" style={styles.input} autoFocus />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>{tt('Contenu du paquet', 'Pack content')}</span>
              <span style={styles.qtyRow}>
                <input inputMode="decimal" value={form.packQty} onChange={(e) => set('packQty', e.target.value)} placeholder="500" style={{ ...styles.input, flex: 1, minWidth: 0 }} />
                <select value={form.packUnit} onChange={(e) => set('packUnit', e.target.value)} style={{ ...styles.input, width: '96px' }}>
                  {PACK_UNITS.map((u) => <option key={u} value={u}>{unitLabel[u]}</option>)}
                </select>
              </span>
            </label>
          </div>
          <label style={styles.field}>
            <span style={styles.label}>{tt('Magasin (facultatif)', 'Store (optional)')}</span>
            <input value={form.store} onChange={(e) => set('store', e.target.value)} placeholder="Delhaize" style={styles.input} />
          </label>
          <p style={styles.hint}>{tt('Ex. : un paquet de pâtes à 1,79 € de 500 g → prix 1,79, contenu 500 g. Pour des œufs : le prix de la boîte et le nombre de pièces.', 'E.g. a 500 g pasta pack at €1.79 → price 1.79, content 500 g. For eggs: the box price and number of pieces.')}</p>
        </>
      ) : (
        <p style={styles.hint}>{form.mode === 'gratuit' ? tt('Compte pour 0 € dans les recettes (eau, sel du jardin…).', 'Counts as €0 in recipes (water, garden herbs…).') : tt('Trop petit pour compter (sel, poivre, épices…) : 0 € dans les recettes.', 'Too small to count (salt, pepper, spices…): €0 in recipes.')}</p>
      )}

      {err && <p style={styles.err}>⚠️ {err}</p>}
      <div style={styles.actions}>
        {row && <button type="button" style={styles.removeBtn} onClick={remove} disabled={saving}>{tt('Retirer', 'Remove')}</button>}
        <button type="button" style={{ ...styles.saveBtn, opacity: saving ? 0.6 : 1 }} onClick={save} disabled={saving}>{saving ? '…' : tt('Enregistrer', 'Save')}</button>
      </div>
    </div>
  )
}

const styles = {
  page: { padding: '12px 12px 40px', fontFamily: FONT },
  muted: { textAlign: 'center', color: colors.textMuted, fontSize: fontSizes.sm, padding: '24px 0' },
  intro: { fontSize: fontSizes.sm, color: colors.textSecondary, margin: '0 4px 10px', lineHeight: 1.5 },
  tabs: { display: 'flex', gap: '6px', background: colors.warmGray, padding: '4px', borderRadius: '12px', marginBottom: '10px' },
  tab: { flex: 1, padding: '9px 4px', border: 'none', borderRadius: '9px', background: 'transparent', fontSize: '13px', fontWeight: 600, color: colors.textSecondary, cursor: 'pointer', fontFamily: FONT },
  tabOn: { background: 'white', color: colors.forest, boxShadow: shadows.sm },
  search: { width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: `1.5px solid ${colors.warmGray}`, borderRadius: '12px', fontSize: '16px', fontFamily: FONT, outline: 'none', marginBottom: '10px', background: 'white' },
  card: { background: 'white', borderRadius: '14px', marginBottom: '8px', boxShadow: shadows.sm, border: '1px solid rgba(0,0,0,0.04)', overflow: 'hidden' },
  rowBtn: { width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: FONT },
  rowMain: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
  name: { fontSize: fontSizes.md, fontWeight: 600, color: colors.textPrimary },
  sub: { fontSize: '12px', color: colors.textMuted },
  badge: { fontSize: '12px', fontWeight: 700, borderRadius: borderRadius.full, padding: '4px 10px', whiteSpace: 'nowrap' },
  editor: { padding: '4px 14px 14px', borderTop: `1px solid ${colors.warmGray}` },
  modes: { display: 'flex', gap: '6px', margin: '12px 0' },
  mode: { flex: 1, padding: '9px 4px', border: `1.5px solid ${colors.warmGray}`, borderRadius: '10px', background: 'white', fontSize: '12px', fontWeight: 600, color: colors.textSecondary, cursor: 'pointer', fontFamily: FONT },
  modeOn: { borderColor: colors.forest, background: colors.forest + '12', color: colors.forest },
  fields: { display: 'flex', gap: '10px' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0, marginBottom: '10px' },
  label: { fontSize: '12px', fontWeight: 600, color: colors.textSecondary },
  input: { padding: '11px 12px', border: `1.5px solid ${colors.warmGray}`, borderRadius: '10px', fontSize: '16px', fontFamily: FONT, outline: 'none', boxSizing: 'border-box', background: 'white', width: '100%' },
  qtyRow: { display: 'flex', gap: '6px' },
  hint: { fontSize: '12px', color: colors.textMuted, lineHeight: 1.5, margin: '0 0 10px' },
  err: { fontSize: '13px', color: colors.error, margin: '0 0 10px' },
  actions: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
  removeBtn: { padding: '11px 16px', border: `1.5px solid ${colors.warmGray}`, borderRadius: '10px', background: 'white', color: colors.textSecondary, fontSize: '14px', cursor: 'pointer', fontFamily: FONT },
  saveBtn: { padding: '11px 22px', border: 'none', borderRadius: '10px', background: colors.forest, color: 'white', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: FONT },
}
