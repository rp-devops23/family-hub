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
            <span style={{ ...styles.badge, backgroundColor: getDifficultyColor(recipe.difficulty) + '20', color: getDifficultyColor(recipe.difficulty) }}>
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
            <span key={season} style={{ ...styles.seasonBadge, backgroundColor: getSeasonColor(season) + '20', color: getSeasonColor(season) }}>
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
    backgroundColor: 'white', borderRadius: '12px', padding: '14px 16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'pointer'
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, marginBottom: '8px' },
  titleRow: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1 },
  mealTypeEmoji: { fontSize: '20px', flexShrink: 0 },
  name: { fontFamily: fonts.heading, fontSize: fontSizes.lg, fontWeight: 600, color: '#2D3436', margin: 0, flex: 1 },
  badges: { display: 'flex', gap: spacing.xs, flexShrink: 0 },
  badge: { fontSize: fontSizes.xs, fontWeight: 600, padding: '2px 8px', borderRadius: borderRadius.full, whiteSpace: 'nowrap' },
  priceBadge: { fontSize: fontSizes.xs, fontWeight: 700, padding: '2px 8px', borderRadius: borderRadius.full, backgroundColor: colors.gold + '25', color: colors.gold },
  meta: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' },
  metaItem: { fontSize: '13px', color: '#636E72' },
  seasons: { display: 'flex', flexWrap: 'wrap', gap: spacing.xs, marginBottom: '6px' },
  seasonBadge: { fontSize: fontSizes.xs, fontWeight: 600, padding: '2px 8px', borderRadius: borderRadius.full },
  tags: { display: 'flex', flexWrap: 'wrap', gap: spacing.xs, marginBottom: '6px' },
  tag: { fontSize: fontSizes.xs, color: '#636E72', backgroundColor: '#F5F7FA', padding: '2px 8px', borderRadius: borderRadius.full },
  notes: { fontSize: '13px', color: '#636E72', margin: 0, fontStyle: 'italic', lineHeight: 1.4 }
}
