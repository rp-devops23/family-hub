import { useApp } from '../context/RecipeContext'
import { colors, fonts, fontSizes, spacing, borderRadius, getSeasonColor, getDifficultyColor } from '../lib/theme'
import { getSeasonEmoji, getMealTypeEmoji, getPriceRangeSymbol } from '../lib/i18n'

export default function RecipeCard({ recipe, onClick }) {
  const { t, getName, tags } = useApp()

  const recipeTags = recipe.recipe_tags
    ?.map(rt => tags.find(tag => tag.id === rt.tag_id))
    .filter(Boolean) || []

  const ingredientsCount = recipe.recipe_ingredients?.length || 0

  return (
    <div style={styles.card} onClick={onClick}>
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <span style={styles.mealTypeEmoji}>{getMealTypeEmoji(recipe.meal_type)}</span>
          <h3 style={styles.name}>{recipe.name}</h3>
        </div>
        <div style={styles.badges}>
          {recipe.price_range && (
            <span style={styles.priceBadge}>{getPriceRangeSymbol(recipe.price_range)}</span>
          )}
          {recipe.difficulty && (
            <span style={{ ...styles.badge, backgroundColor: getDifficultyColor(recipe.difficulty) + '18', color: getDifficultyColor(recipe.difficulty) }}>
              {t(`difficulty.${recipe.difficulty}`)}
            </span>
          )}
        </div>
      </div>

      <div style={styles.meta}>
        {recipe.cuisine && <span style={styles.metaItem}>{recipe.cuisine.flag} {getName(recipe.cuisine)}</span>}
        {recipe.prep_time_minutes && <span style={styles.metaItem}>⏱️ {recipe.prep_time_minutes} {t('common.minutes')}</span>}
        {recipe.base && <span style={styles.metaItem}>🍚 {getName(recipe.base)}</span>}
        {ingredientsCount > 0 && <span style={styles.metaItem}>🥕 {ingredientsCount}</span>}
        {recipe.meal_type && recipe.meal_type !== 'main' && <span style={styles.metaItem}>{t(`mealType.${recipe.meal_type}`)}</span>}
      </div>

      {recipe.seasons && recipe.seasons.length > 0 && (
        <div style={styles.seasons}>
          {recipe.seasons.map(season => (
            <span key={season} style={{ ...styles.seasonBadge, backgroundColor: getSeasonColor(season) + '18', color: getSeasonColor(season) }}>
              {getSeasonEmoji(season)} {t(`season.${season}`)}
            </span>
          ))}
        </div>
      )}

      {recipeTags.length > 0 && (
        <div style={styles.tags}>
          {recipeTags.map(tag => (
            <span key={tag.id} style={styles.tag}>{tag.icon} {getName(tag)}</span>
          ))}
        </div>
      )}

      {recipe.notes && (
        <p style={styles.notes}>{recipe.notes.length > 80 ? recipe.notes.substring(0, 80) + '...' : recipe.notes}</p>
      )}
    </div>
  )
}

const styles = {
  card: {
    backgroundColor: 'white', borderRadius: '16px', padding: '16px 18px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)',
    cursor: 'pointer', transition: 'all 0.2s ease',
    border: '1px solid rgba(0,0,0,0.04)',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, marginBottom: '10px' },
  titleRow: { display: 'flex', alignItems: 'center', gap: '10px', flex: 1 },
  mealTypeEmoji: { fontSize: '22px', flexShrink: 0 },
  name: { fontFamily: fonts.heading, fontSize: fontSizes.lg, fontWeight: 700, color: colors.textPrimary, margin: 0, flex: 1, letterSpacing: '-0.2px' },
  badges: { display: 'flex', gap: '6px', flexShrink: 0 },
  badge: { fontSize: fontSizes.xs, fontWeight: 600, padding: '3px 10px', borderRadius: borderRadius.full, whiteSpace: 'nowrap' },
  priceBadge: { fontSize: fontSizes.xs, fontWeight: 700, padding: '3px 10px', borderRadius: borderRadius.full, backgroundColor: colors.gold + '1A', color: colors.gold },
  meta: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' },
  metaItem: { fontSize: '13px', color: colors.textSecondary },
  seasons: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' },
  seasonBadge: { fontSize: fontSizes.xs, fontWeight: 600, padding: '3px 10px', borderRadius: borderRadius.full },
  tags: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' },
  tag: { fontSize: fontSizes.xs, color: colors.textSecondary, backgroundColor: colors.background, padding: '3px 10px', borderRadius: borderRadius.full },
  notes: { fontSize: '13px', color: colors.textMuted, margin: 0, fontStyle: 'italic', lineHeight: 1.5 }
}
