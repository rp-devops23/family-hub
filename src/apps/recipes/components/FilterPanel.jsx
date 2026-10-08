import { useState } from 'react'
import { useApp } from '../context/RecipeContext'
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, getSeasonColor } from '../lib/theme'
import { SEASONS, DIFFICULTIES, MEAL_TYPES, PRICE_RANGES, getSeasonEmoji, getMealTypeEmoji, getPriceRangeSymbol } from '../lib/i18n'

export default function FilterPanel({ filters, onChange }) {
  const { t, getName, tags, bases, cuisines } = useApp()
  const [isExpanded, setIsExpanded] = useState(false)

  const hasActiveFilters =
    filters.seasons.length > 0 || filters.tags.length > 0 || filters.bases.length > 0 ||
    filters.cuisines.length > 0 || filters.difficulties.length > 0 ||
    filters.mealTypes.length > 0 || filters.priceRanges.length > 0

  const activeCount = Object.values(filters).reduce((n, f) => n + f.length, 0)

  const toggle = (key, value) => {
    const current = filters[key]
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
    onChange({ ...filters, [key]: next })
  }

  const clearFilters = () => onChange({ seasons: [], tags: [], bases: [], cuisines: [], difficulties: [], mealTypes: [], priceRanges: [] })

  const chip = (active, activeColor) => ({
    ...styles.chip,
    backgroundColor: active ? activeColor + (activeColor.length === 7 ? '1A' : '') : colors.background,
    color: active ? activeColor : colors.textSecondary,
    borderColor: active ? activeColor + '40' : 'transparent'
  })

  return (
    <div style={styles.container}>
      <button onClick={() => setIsExpanded(!isExpanded)} style={styles.toggleButton}>
        <span style={styles.toggleText}>
          ⚙️ {t('recipes.filters')}
          {hasActiveFilters && <span style={styles.badge}>{activeCount}</span>}
        </span>
        <span style={{ ...styles.arrow, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </button>

      {isExpanded && (
        <div style={styles.panel}>
          <div style={styles.section}>
            <label style={styles.sectionLabel}>{t('recipe.mealType')}</label>
            <div style={styles.chipGroup}>
              {MEAL_TYPES.map(type => (
                <button key={type} type="button" onClick={() => toggle('mealTypes', type)}
                  style={chip(filters.mealTypes.includes(type), colors.terracotta)}>
                  {getMealTypeEmoji(type)} {t(`mealType.${type}`)}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.section}>
            <label style={styles.sectionLabel}>{t('recipe.priceRange')}</label>
            <div style={styles.chipGroup}>
              {PRICE_RANGES.map(price => (
                <button key={price} type="button" onClick={() => toggle('priceRanges', price)}
                  style={chip(filters.priceRanges.includes(price), colors.gold)}>
                  {getPriceRangeSymbol(price)} {t(`priceRange.${price}`)}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.section}>
            <label style={styles.sectionLabel}>{t('recipe.seasons')}</label>
            <div style={styles.chipGroup}>
              {SEASONS.map(season => (
                <button key={season} type="button" onClick={() => toggle('seasons', season)}
                  style={{ ...styles.chip, backgroundColor: filters.seasons.includes(season) ? getSeasonColor(season) + '1A' : colors.background, color: filters.seasons.includes(season) ? getSeasonColor(season) : colors.textSecondary, borderColor: filters.seasons.includes(season) ? getSeasonColor(season) + '40' : 'transparent' }}>
                  {getSeasonEmoji(season)} {t(`season.${season}`)}
                </button>
              ))}
            </div>
          </div>

          {tags.length > 0 && (
            <div style={styles.section}>
              <label style={styles.sectionLabel}>{t('recipe.tags')}</label>
              <div style={styles.chipGroup}>
                {tags.map(tag => (
                  <button key={tag.id} type="button" onClick={() => toggle('tags', tag.id)}
                    style={chip(filters.tags.includes(tag.id), colors.forest)}>
                    {tag.icon} {getName(tag)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {bases.length > 0 && (
            <div style={styles.section}>
              <label style={styles.sectionLabel}>{t('recipe.base')}</label>
              <div style={styles.chipGroup}>
                {bases.map(base => (
                  <button key={base.id} type="button" onClick={() => toggle('bases', base.id)}
                    style={chip(filters.bases.includes(base.id), colors.terracotta)}>
                    {getName(base)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {cuisines.length > 0 && (
            <div style={styles.section}>
              <label style={styles.sectionLabel}>{t('recipe.cuisine')}</label>
              <div style={styles.chipGroup}>
                {cuisines.map(cuisine => (
                  <button key={cuisine.id} type="button" onClick={() => toggle('cuisines', cuisine.id)}
                    style={chip(filters.cuisines.includes(cuisine.id), colors.gold)}>
                    {cuisine.flag} {getName(cuisine)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={styles.section}>
            <label style={styles.sectionLabel}>{t('recipe.difficulty')}</label>
            <div style={styles.chipGroup}>
              {DIFFICULTIES.map(diff => (
                <button key={diff} type="button" onClick={() => toggle('difficulties', diff)}
                  style={chip(filters.difficulties.includes(diff), colors.forest)}>
                  {t(`difficulty.${diff}`)}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <button onClick={clearFilters} style={styles.clearButton}>
              ✕ {t('recipes.clearFilters')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { marginBottom: '12px' },
  toggleButton: {
    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', backgroundColor: 'white', border: '1px solid rgba(0,0,0,0.04)',
    borderRadius: '14px', boxShadow: shadows.sm, cursor: 'pointer', fontFamily: fonts.body,
    fontSize: '14px', color: colors.textSecondary, transition: 'all 0.2s ease'
  },
  toggleText: { display: 'flex', alignItems: 'center', gap: '8px' },
  badge: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.forest, color: 'white', fontSize: '10px', fontWeight: '700',
    width: '20px', height: '20px', borderRadius: '10px'
  },
  arrow: { fontSize: '10px', color: colors.textMuted, transition: 'transform 0.25s ease' },
  panel: { marginTop: '8px', padding: '18px', backgroundColor: 'white', borderRadius: '14px', boxShadow: shadows.sm, border: '1px solid rgba(0,0,0,0.04)' },
  section: { marginBottom: '16px' },
  sectionLabel: { display: 'block', fontSize: '11px', fontWeight: 700, color: colors.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.6px' },
  chipGroup: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  chip: { padding: '6px 12px', borderRadius: borderRadius.full, border: '1.5px solid transparent', fontSize: '13px', fontFamily: fonts.body, cursor: 'pointer', transition: 'all 0.2s ease', fontWeight: 500 },
  clearButton: { width: '100%', padding: '10px', backgroundColor: colors.background, border: 'none', borderRadius: '12px', color: colors.textSecondary, fontSize: '13px', fontFamily: fonts.body, cursor: 'pointer', marginTop: '4px', fontWeight: 500, transition: 'all 0.2s ease' }
}
