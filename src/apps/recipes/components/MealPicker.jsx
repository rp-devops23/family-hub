import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useApp } from '../context/RecipeContext'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { colors, fonts, fontSizes, borderRadius, commonStyles } from '../lib/theme'
import { MEAL_TYPES } from '../lib/i18n'
import { recipePrice, formatEuro } from '../lib/price'
import { agoLabel, lastPlannedMap, sortRecipes } from '../lib/recipeSort'

// Choisir un plat pour un jour : recherche, type de plat, et tri « pas cuisiné depuis longtemps » par défaut.
export default function MealPicker({ date, onClose }) {
  const { user } = useAuth()
  const { t, language, recipes, createMealPlan } = useApp()
  const fr_ = language === 'fr'
  const [query, setQuery] = useState('')
  const [type, setType] = useState('main') // '' = tous
  const [sort, setSort] = useState('longAgo')
  const [plans, setPlans] = useState([])
  const [saving, setSaving] = useState(false)

  const locale = fr_ ? fr : enUS
  const formattedDate = format(date, 'EEEE d MMMM', { locale })
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    let cancelled = false
    supabase.from('meal_plans').select('recipe_id, planned_date').eq('user_id', user.id).order('planned_date', { ascending: false }).limit(5000)
      .then(({ data }) => { if (!cancelled) setPlans(data ?? []) })
    return () => { cancelled = true }
  }, [user.id])

  const last = useMemo(() => lastPlannedMap(plans, today), [plans, today])
  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = recipes.filter(r => (!type || (r.meal_type || 'main') === type) && (!q || r.name.toLowerCase().includes(q)))
    return sortRecipes(filtered, sort, last)
  }, [recipes, query, type, sort, last])

  const handleSelect = async (recipe) => {
    if (saving) return
    setSaving(true)
    try {
      await createMealPlan(recipe.id, format(date, 'yyyy-MM-dd'))
      onClose()
    } catch (error) {
      console.error('Failed to add meal:', error)
      setSaving(false)
    }
  }

  const SORTS = [
    ['longAgo', fr_ ? 'Pas cuisiné depuis longtemps' : 'Not cooked for a while'],
    ['name', fr_ ? 'Nom (A → Z)' : 'Name (A → Z)'],
    ['priceAsc', fr_ ? 'Prix croissant' : 'Price: low to high'],
    ['time', fr_ ? 'Temps de préparation' : 'Prep time'],
  ]

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>{t('calendar.addMeal')}</h2>
            <p style={styles.date}>{formattedDate}</p>
          </div>
          <button onClick={onClose} style={styles.closeButton} aria-label="Retour">←</button>
        </div>

        <div style={styles.tools}>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={t('recipes.search')} style={styles.searchInput} autoFocus />
          <div style={styles.types}>
            {[['', fr_ ? 'Tous' : 'All'], ...MEAL_TYPES.map(m => [m, t(`mealType.${m}`)])].map(([k, label]) => (
              <button key={k || 'all'} type="button" onClick={() => setType(k)} style={{ ...styles.chip, ...(type === k ? styles.chipOn : {}) }}>{label}</button>
            ))}
          </div>
          <label style={styles.sortRow}>
            <span style={styles.sortLabel}>{fr_ ? 'Trier' : 'Sort'}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={styles.sortSelect}>
              {SORTS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </label>
        </div>

        <div style={styles.list}>
          {list.length === 0 ? (
            <div style={styles.empty}><p style={styles.emptyText}>{t('calendar.noRecipes')}</p></div>
          ) : list.map(recipe => {
            const price = recipePrice(recipe)
            const lastDate = last.get(recipe.id)
            return (
              <button key={recipe.id} onClick={() => handleSelect(recipe)} disabled={saving} style={styles.recipeItem}>
                <span style={styles.recipeInfo}>
                  <span style={styles.recipeName}>{recipe.name}</span>
                  <span style={styles.recipeMeta}>
                    {lastDate ? (fr_ ? `Cuisiné ${agoLabel(lastDate, today, language)}` : `Cooked ${agoLabel(lastDate, today, language)}`) : (fr_ ? 'Jamais planifié' : 'Never planned')}
                    {recipe.prep_time_minutes ? ` · ${recipe.prep_time_minutes} ${t('common.minutes')}` : ''}
                  </span>
                </span>
                <span style={styles.recipePrice}>{price.amount != null ? `${price.status === 'partial' ? '≥ ' : ''}${formatEuro(price.amount, language)}` : ''}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: colors.background, display: 'flex', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: colors.white, width: '100%', maxWidth: '600px', height: '100%', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 20px', borderBottom: `1px solid ${colors.warmGray}` },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.lg, color: colors.forest, margin: 0, fontWeight: 700 },
  date: { fontSize: fontSizes.sm, color: colors.textSecondary, margin: 0, marginTop: '2px', textTransform: 'capitalize' },
  closeButton: { width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', backgroundColor: colors.background, borderRadius: '10px', cursor: 'pointer', fontSize: fontSizes.md, color: colors.textSecondary },
  tools: { padding: '12px 16px', borderBottom: `1px solid ${colors.warmGray}`, display: 'flex', flexDirection: 'column', gap: '10px' },
  searchInput: { ...commonStyles.input, padding: '10px 14px' },
  types: { display: 'flex', gap: '6px', overflowX: 'auto', margin: '0 -16px', padding: '0 16px' },
  chip: { flexShrink: 0, padding: '7px 13px', borderRadius: borderRadius.full, border: 'none', backgroundColor: colors.background, color: colors.textSecondary, fontSize: '13px', fontWeight: 600, fontFamily: fonts.body, cursor: 'pointer' },
  chipOn: { backgroundColor: colors.forest, color: 'white' },
  sortRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  sortLabel: { fontSize: '13px', color: colors.textMuted },
  sortSelect: { flex: 1, padding: '8px 10px', border: `1.5px solid ${colors.warmGray}`, borderRadius: '10px', background: 'white', fontSize: '14px', fontFamily: fonts.body, color: colors.textPrimary },
  list: { flex: 1, overflowY: 'auto', padding: '8px 10px max(24px, env(safe-area-inset-bottom))' },
  empty: { textAlign: 'center', padding: '32px 0' },
  emptyText: { fontSize: fontSizes.md, color: colors.textMuted },
  recipeItem: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '12px 10px', backgroundColor: 'transparent', border: 'none', borderBottom: `1px solid ${colors.background}`, cursor: 'pointer', fontFamily: fonts.body, textAlign: 'left' },
  recipeInfo: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  recipeName: { fontSize: fontSizes.md, color: colors.textPrimary, fontWeight: 600 },
  recipeMeta: { fontSize: '12px', color: colors.textMuted },
  recipePrice: { flexShrink: 0, fontSize: fontSizes.sm, fontWeight: 600, color: colors.textSecondary },
}
