import { useState } from 'react'
import { useApp } from '../context/RecipeContext'
import { colors, fonts, fontSizes, borderRadius, shadows } from '../lib/theme'
import { SEASONS, DIFFICULTIES, MEAL_TYPES } from '../lib/i18n'

const EMPTY = { seasons: [], tags: [], bases: [], cuisines: [], difficulties: [], mealTypes: [], maxPrice: '' }

// Barre d'outils des recettes : types de plat en un tap, tri, et filtres avancés repliés (sans icônes).
export default function FilterPanel({ filters, onChange, sort, onSort }) {
  const { t, language, getName, tags, bases, cuisines } = useApp()
  const fr = language === 'fr'
  const [open, setOpen] = useState(false)

  // « Filtres » ne compte que ce qui se règle dans le panneau (le type de plat a ses propres boutons)
  const advancedCount = filters.seasons.length + filters.tags.length + filters.bases.length + filters.cuisines.length
    + filters.difficulties.length + (filters.maxPrice !== '' ? 1 : 0)
  const anyActive = advancedCount > 0 || filters.mealTypes.length > 0

  const toggle = (key, value) => {
    const current = filters[key]
    onChange({ ...filters, [key]: current.includes(value) ? current.filter(v => v !== value) : [...current, value] })
  }
  const chip = (active) => ({ ...styles.chip, ...(active ? styles.chipOn : {}) })

  const SORTS = [
    ['name', fr ? 'Nom (A → Z)' : 'Name (A → Z)'],
    ['recent', fr ? 'Ajoutées récemment' : 'Recently added'],
    ['priceAsc', fr ? 'Prix croissant' : 'Price: low to high'],
    ['priceDesc', fr ? 'Prix décroissant' : 'Price: high to low'],
    ['time', fr ? 'Temps de préparation' : 'Prep time'],
  ]

  const group = (label, key, items, labelOf) => items.length > 0 && (
    <div style={styles.section}>
      <span style={styles.sectionLabel}>{label}</span>
      <div style={styles.chipGroup}>
        {items.map(item => (
          <button key={item.value} type="button" onClick={() => toggle(key, item.value)} style={chip(filters[key].includes(item.value))}>
            {labelOf(item)}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div style={styles.container}>
      <div style={styles.types}>
        <button type="button" onClick={() => onChange({ ...filters, mealTypes: [] })} style={chip(filters.mealTypes.length === 0)}>
          {fr ? 'Tous' : 'All'}
        </button>
        {MEAL_TYPES.map(type => (
          <button key={type} type="button" onClick={() => toggle('mealTypes', type)} style={chip(filters.mealTypes.includes(type))}>
            {t(`mealType.${type}`)}
          </button>
        ))}
      </div>

      <div style={styles.toolbar}>
        <button type="button" onClick={() => setOpen(!open)} style={styles.filterBtn} aria-expanded={open}>
          {t('recipes.filters')}{advancedCount > 0 && <span style={styles.badge}>{advancedCount}</span>}
          <span style={{ ...styles.arrow, transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
        </button>
        <label style={styles.sortWrap}>
          <span style={styles.sortLabel}>{fr ? 'Trier' : 'Sort'}</span>
          <select value={sort} onChange={e => onSort(e.target.value)} style={styles.sortSelect}>
            {SORTS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </label>
      </div>

      {open && (
        <div style={styles.panel}>
          {group(t('recipe.seasons'), 'seasons', SEASONS.map(s => ({ value: s })), i => t(`season.${i.value}`))}
          {group(t('recipe.tags'), 'tags', tags.map(x => ({ value: x.id, raw: x })), i => getName(i.raw))}

          <div style={styles.section}>
            <span style={styles.sectionLabel}>{t('filter.maxPrice')}</span>
            <div style={styles.priceRow}>
              <input type="number" inputMode="decimal" min="0" step="1" value={filters.maxPrice}
                onChange={e => onChange({ ...filters, maxPrice: e.target.value })}
                placeholder={t('filter.maxPrice.placeholder')} style={styles.priceInput} />
              <span style={styles.priceUnit}>€</span>
            </div>
          </div>

          {group(t('recipe.base'), 'bases', bases.map(x => ({ value: x.id, raw: x })), i => getName(i.raw))}
          {group(t('recipe.cuisine'), 'cuisines', cuisines.map(x => ({ value: x.id, raw: x })), i => getName(i.raw))}
          {group(t('recipe.difficulty'), 'difficulties', DIFFICULTIES.map(d => ({ value: d })), i => t(`difficulty.${i.value}`))}
        </div>
      )}

      {anyActive && (
        <button type="button" onClick={() => onChange(EMPTY)} style={styles.clearButton}>✕ {t('recipes.clearFilters')}</button>
      )}
    </div>
  )
}

const styles = {
  container: { marginBottom: '12px' },
  types: { display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', margin: '0 -16px 10px', padding: '0 16px 2px' },
  chip: { flexShrink: 0, padding: '8px 14px', borderRadius: borderRadius.full, border: '1.5px solid transparent', backgroundColor: 'white', color: colors.textSecondary, fontSize: '13px', fontFamily: fonts.body, cursor: 'pointer', fontWeight: 600, boxShadow: shadows.sm },
  chipOn: { backgroundColor: colors.forest, color: 'white' },
  toolbar: { display: 'flex', gap: '8px' },
  filterBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', boxShadow: shadows.sm, cursor: 'pointer', fontFamily: fonts.body, fontSize: '14px', color: colors.textSecondary, fontWeight: 600 },
  badge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest, color: 'white', fontSize: '11px', fontWeight: 700, minWidth: '20px', height: '20px', borderRadius: '10px', padding: '0 5px' },
  arrow: { fontSize: '12px', color: colors.textMuted, transition: 'transform .2s ease' },
  sortWrap: { flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', backgroundColor: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', boxShadow: shadows.sm, minWidth: 0 },
  sortLabel: { fontSize: '13px', color: colors.textMuted },
  sortSelect: { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: '14px', fontWeight: 600, color: colors.textPrimary, fontFamily: fonts.body, padding: '10px 0' },
  panel: { marginTop: '8px', padding: '16px', backgroundColor: 'white', borderRadius: '14px', boxShadow: shadows.sm, border: '1px solid rgba(0,0,0,0.04)' },
  section: { marginBottom: '14px' },
  sectionLabel: { display: 'block', fontSize: '11px', fontWeight: 700, color: colors.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.6px' },
  chipGroup: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  priceRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  priceInput: { width: '110px', padding: '8px 12px', fontSize: fontSizes.md, border: `1.5px solid ${colors.warmGray}`, borderRadius: borderRadius.md, backgroundColor: colors.white, color: colors.textPrimary, outline: 'none', fontFamily: fonts.body },
  priceUnit: { fontSize: fontSizes.md, fontWeight: 600, color: colors.textSecondary },
  clearButton: { width: '100%', padding: '10px', backgroundColor: colors.background, border: 'none', borderRadius: '12px', color: colors.textSecondary, fontSize: '13px', fontFamily: fonts.body, cursor: 'pointer', marginTop: '8px', fontWeight: 500 },
}
