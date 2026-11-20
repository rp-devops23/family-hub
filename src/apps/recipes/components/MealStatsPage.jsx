import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useApp } from '../context/RecipeContext'
import { colors, fontSizes, borderRadius, shadows } from '../lib/theme'
import { formatEuro } from '../lib/price'
import { buildMealStats } from '../lib/mealStats'

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
const SEASON_ICON = { winter: '❄️', spring: '🌸', summer: '☀️', autumn: '🍂' }

// Statistiques des repas planifiés : plats les plus fréquents, par saison / année / mois, coût estimé.
export default function MealStatsPage() {
  const { user } = useAuth()
  const { language, recipes } = useApp()
  const fr = language === 'fr'
  const tt = (a, b) => (fr ? a : b)

  const [plans, setPlans] = useState(null)
  const [error, setError] = useState('')
  const [groupBy, setGroupBy] = useState('season')
  const [mainOnly, setMainOnly] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const all = []
      for (let from = 0; from < 10000; from += 1000) {
        const { data, error: err } = await supabase.from('meal_plans').select('recipe_id, planned_date')
          .eq('user_id', user.id).order('planned_date', { ascending: true }).range(from, from + 999)
        if (err) { if (!cancelled) setError(err.message); return }
        all.push(...data)
        if (data.length < 1000) break
      }
      if (!cancelled) setPlans(all)
    }
    load()
    return () => { cancelled = true }
  }, [user.id])

  const stats = useMemo(
    () => (plans ? buildMealStats(plans, recipes, { groupBy, mealType: mainOnly ? 'main' : null, top: 5, lang: language }) : null),
    [plans, recipes, groupBy, mainOnly, language],
  )

  if (error) return <p style={styles.muted}>⚠️ {error}</p>
  if (!stats) return <p style={styles.muted}>{tt('Chargement…', 'Loading…')}</p>

  const periods = [...stats.periods].reverse() // le plus récent en premier
  const maxTop = Math.max(1, ...stats.overallTop.map((d) => d.times))
  const distinct = recipes.length - stats.never.length

  return (
    <div style={styles.page}>
      <div style={styles.tabs}>
        {[['season', tt('Saison', 'Season')], ['year', tt('Année', 'Year')], ['month', tt('Mois', 'Month')]].map(([k, label]) => (
          <button key={k} onClick={() => setGroupBy(k)} style={{ ...styles.tab, ...(groupBy === k ? styles.tabOn : {}) }}>{label}</button>
        ))}
      </div>
      <label style={styles.check}>
        <input type="checkbox" checked={mainOnly} onChange={(e) => setMainOnly(e.target.checked)} />
        {tt('Plats principaux seulement', 'Main dishes only')}
      </label>

      {stats.total === 0 ? (
        <div style={styles.card}><p style={styles.muted}>{tt('Aucun repas planifié pour l’instant.', 'No planned meals yet.')}</p></div>
      ) : (
        <>
          <div style={styles.summary}>
            <div><div style={styles.big}>{stats.total}</div><div style={styles.label}>{tt('repas planifiés', 'planned meals')}</div></div>
            <div><div style={styles.big}>{distinct}</div><div style={styles.label}>{tt('plats différents', 'different dishes')}</div></div>
            <div><div style={styles.big}>{stats.never.length}</div><div style={styles.label}>{tt('jamais planifiés', 'never planned')}</div></div>
          </div>

          <h3 style={styles.h}>{tt('🏆 Les plus cuisinés (au total)', '🏆 Most cooked (overall)')}</h3>
          <div style={styles.card}>
            {stats.overallTop.map((d) => (
              <div key={d.id} style={styles.barRow}>
                <span style={styles.barName}>{d.name}</span>
                <span style={styles.barTrack}><span style={{ ...styles.barFill, width: `${(d.times / maxTop) * 100}%` }} /></span>
                <span style={styles.barCount}>{d.times}×</span>
              </div>
            ))}
          </div>

          <h3 style={styles.h}>{groupBy === 'season' ? tt('Par saison', 'By season') : groupBy === 'year' ? tt('Par année', 'By year') : tt('Par mois', 'By month')}</h3>
          {periods.map((p) => (
            <div key={p.key} style={styles.card}>
              <div style={styles.periodHead}>
                <span style={styles.periodName}>{p.season ? `${SEASON_ICON[p.season]} ` : ''}{p.label}</span>
                <span style={styles.periodMeals}>{p.meals} {tt('repas', 'meals')}</span>
              </div>
              <div style={styles.costLine}>
                💶 {p.cost > 0 ? `${p.withoutCost > 0 ? tt('au moins ', 'at least ') : ''}${formatEuro(p.cost, language)}` : tt('coût inconnu', 'cost unknown')}
                <span style={styles.costNote}>
                  {p.withoutCost > 0 ? ` · ${tt(`${p.withoutCost} repas sans prix complet`, `${p.withoutCost} meals without a full price`)}` : ''}
                </span>
              </div>
              <ol style={styles.topList}>
                {p.top.map((d) => <li key={d.id}>{d.name} <b>{d.times}×</b></li>)}
              </ol>
            </div>
          ))}

          {stats.never.length > 0 && (
            <>
              <h3 style={styles.h}>{tt('😴 Jamais planifiés', '😴 Never planned')}</h3>
              <div style={styles.card}><p style={styles.neverText}>{stats.never.join(' · ')}</p></div>
            </>
          )}
          <p style={styles.footnote}>{tt('Coûts estimés pour 4 personnes, d’après les prix des ingrédients ; ce sont des minimums quand des prix ou des quantités manquent.', 'Costs are estimated for 4 people from ingredient prices; they are minimums when prices or quantities are missing.')}</p>
        </>
      )}
    </div>
  )
}

const styles = {
  page: { padding: '12px 12px 40px', fontFamily: FONT },
  muted: { textAlign: 'center', color: colors.textMuted, fontSize: fontSizes.sm, padding: '24px 0' },
  tabs: { display: 'flex', gap: '6px', background: colors.warmGray, padding: '4px', borderRadius: '12px', marginBottom: '10px' },
  tab: { flex: 1, padding: '9px 6px', border: 'none', borderRadius: '9px', background: 'transparent', fontSize: fontSizes.sm, fontWeight: 600, color: colors.textSecondary, cursor: 'pointer', fontFamily: FONT },
  tabOn: { background: 'white', color: colors.forest, boxShadow: shadows.sm },
  check: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: fontSizes.sm, color: colors.textSecondary, margin: '0 2px 12px' },
  summary: { display: 'flex', justifyContent: 'space-around', textAlign: 'center', background: 'white', borderRadius: '16px', padding: '14px 8px', boxShadow: shadows.sm, marginBottom: '6px' },
  big: { fontSize: '24px', fontWeight: 800, color: colors.forest },
  label: { fontSize: '12px', color: colors.textMuted },
  h: { margin: '18px 4px 8px', fontSize: fontSizes.sm, fontWeight: 700, color: colors.textSecondary },
  card: { background: 'white', borderRadius: '16px', padding: '12px 14px', boxShadow: shadows.sm, marginBottom: '10px', border: '1px solid rgba(0,0,0,0.04)' },
  barRow: { display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0' },
  barName: { flex: '0 0 38%', fontSize: fontSizes.sm, color: colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  barTrack: { flex: 1, height: '8px', background: colors.background, borderRadius: borderRadius.full, overflow: 'hidden', display: 'flex' },
  barFill: { background: colors.forest, borderRadius: borderRadius.full },
  barCount: { width: '28px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: colors.textSecondary },
  periodHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  periodName: { fontSize: fontSizes.md, fontWeight: 700, color: colors.textPrimary },
  periodMeals: { fontSize: fontSizes.sm, color: colors.textMuted },
  costLine: { fontSize: fontSizes.sm, color: colors.textPrimary, margin: '6px 0 4px', fontWeight: 600 },
  costNote: { fontWeight: 400, color: colors.textMuted, fontSize: '12px' },
  topList: { margin: '6px 0 0', paddingLeft: '20px', fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 1.6 },
  neverText: { margin: 0, fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 1.6 },
  footnote: { fontSize: '11px', color: colors.textMuted, textAlign: 'center', margin: '14px 8px 0' },
}
