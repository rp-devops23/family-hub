import { useState } from 'react'
import { useApp } from '../context/RecipeContext'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, commonStyles } from '../lib/theme'

export default function MealPicker({ date, onClose }) {
  const { t, getName, language, recipes, tags, createMealPlan } = useApp()
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)

  const locale = language === 'fr' ? fr : enUS
  const formattedDate = format(date, 'EEEE d MMMM', { locale })

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectRecipe = async (recipe) => {
    setSaving(true)
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      await createMealPlan(recipe.id, dateStr)
      onClose()
    } catch (error) {
      console.error('Failed to add meal:', error)
    } finally {
      setSaving(false)
    }
  }

  const getRecipeTags = (recipe) =>
    recipe.recipe_tags?.map(rt => tags.find(tag => tag.id === rt.tag_id)).filter(Boolean) || []

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>{t('calendar.addMeal')}</h2>
            <p style={styles.date}>{formattedDate}</p>
          </div>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>
        <div style={styles.searchContainer}>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('recipes.search')} style={styles.searchInput} autoFocus />
        </div>
        <div style={styles.list}>
          {filteredRecipes.length === 0 ? (
            <div style={styles.empty}><p style={styles.emptyText}>{t('calendar.noRecipes')}</p></div>
          ) : (
            filteredRecipes.map(recipe => {
              const recipeTags = getRecipeTags(recipe)
              return (
                <button key={recipe.id} onClick={() => handleSelectRecipe(recipe)}
                  disabled={saving} style={styles.recipeItem}>
                  <div style={styles.recipeInfo}>
                    <span style={styles.recipeName}>{recipe.name}</span>
                    {recipeTags.length > 0 && <span style={styles.recipeTags}>{recipeTags.map(tag => tag.icon).join(' ')}</span>}
                  </div>
                  {recipe.cuisine && <span style={styles.recipeCuisine}>{recipe.cuisine.flag}</span>}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: colors.white, borderTopLeftRadius: '20px', borderTopRightRadius: '20px', width: '100%', maxWidth: '500px', maxHeight: '70vh', display: 'flex', flexDirection: 'column', boxShadow: shadows.lg },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 20px', borderBottom: `1px solid ${colors.warmGray}` },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.lg, color: colors.forest, margin: 0, fontWeight: 700 },
  date: { fontSize: fontSizes.sm, color: colors.textSecondary, margin: 0, marginTop: '2px', textTransform: 'capitalize' },
  closeButton: { width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', backgroundColor: colors.background, borderRadius: '10px', cursor: 'pointer', fontSize: fontSizes.md, color: colors.textSecondary, transition: 'all 0.2s ease' },
  searchContainer: { padding: '12px 20px', borderBottom: `1px solid ${colors.warmGray}` },
  searchInput: { ...commonStyles.input, padding: '10px 14px' },
  list: { flex: 1, overflowY: 'auto', padding: spacing.sm },
  empty: { textAlign: 'center', padding: spacing.xl },
  emptyText: { fontSize: fontSizes.md, color: colors.textMuted },
  recipeItem: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', backgroundColor: 'transparent', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: fonts.body, textAlign: 'left', transition: 'background-color 0.15s ease' },
  recipeInfo: { display: 'flex', flexDirection: 'column', gap: '3px' },
  recipeName: { fontSize: fontSizes.md, color: colors.textPrimary, fontWeight: 500 },
  recipeTags: { fontSize: fontSizes.sm },
  recipeCuisine: { fontSize: fontSizes.lg }
}
