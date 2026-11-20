import { useApp } from '../context/RecipeContext'
import { colors, fonts, fontSizes } from '../lib/theme'
import { recipePrice, formatEuro } from '../lib/price'

// Carte épurée : une vignette (la photo, quand il y en aura), le nom, le type de plat et le temps, le prix.
// Saison, pays, difficulté, étiquettes… se voient dans la fiche de la recette.
export default function RecipeCard({ recipe, onClick }) {
  const { t, language } = useApp()
  const price = recipePrice(recipe)
  const photo = recipe.photo_url || null

  const details = [
    t(`mealType.${recipe.meal_type || 'main'}`),
    recipe.prep_time_minutes ? `${recipe.prep_time_minutes} ${t('common.minutes')}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <button type="button" style={styles.card} onClick={onClick}>
      <span style={styles.thumb}>
        {photo
          ? <img src={photo} alt="" style={styles.img} loading="lazy" />
          : <span style={styles.initial} aria-hidden="true">{recipe.name.trim().charAt(0).toUpperCase()}</span>}
      </span>
      <span style={styles.text}>
        <span style={styles.name}>{recipe.name}</span>
        <span style={styles.details}>{details}</span>
      </span>
      <span
        style={{ ...styles.price, ...(price.status === 'complete' ? {} : styles.priceMuted) }}
        title={price.status === 'complete' ? undefined
          : price.status === 'partial' ? `${t('price.partialHint')} ${price.missing.join(', ')}`
          : t('price.unknownHint')}
      >
        {price.status === 'complete' && formatEuro(price.amount, language)}
        {price.status === 'partial' && `≥ ${formatEuro(price.amount, language)}`}
        {price.status === 'unknown' && '—'}
      </span>
    </button>
  )
}

const styles = {
  card: {
    width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 14px 10px 10px',
    backgroundColor: 'white', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)', textAlign: 'left',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)', cursor: 'pointer', fontFamily: fonts.body,
  },
  thumb: {
    width: '64px', height: '64px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden',
    backgroundColor: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  img: { width: '100%', height: '100%', objectFit: 'cover' },
  initial: { fontSize: '24px', fontWeight: 700, color: colors.textMuted },
  text: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' },
  name: { fontFamily: fonts.heading, fontSize: fontSizes.md, fontWeight: 700, color: colors.textPrimary, letterSpacing: '-0.2px' },
  details: { fontSize: '13px', color: colors.textMuted },
  price: { flexShrink: 0, fontSize: fontSizes.sm, fontWeight: 700, color: colors.textPrimary },
  priceMuted: { color: colors.textMuted, fontWeight: 600 },
}
