import { useState, useMemo } from 'react'
import { useApp } from '../context/RecipeContext'
import { colors, fonts, shadows } from '../lib/theme'
import RecipeCard from './RecipeCard'
import RecipeForm from './RecipeForm'
import FilterPanel from './FilterPanel'

const EMPTY_FILTERS = {
  seasons: [], tags: [], bases: [], cuisines: [],
  difficulties: [], mealTypes: [], priceRanges: []
}

export default function RecipesPage() {
  const { t, recipes } = useApp()
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [showForm, setShowForm] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState(null)

  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      if (searchQuery && !recipe.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (filters.seasons.length > 0 && filters.seasons.length < 4) {
        const recipeSeasons = recipe.seasons || []
        if (!filters.seasons.some(s => recipeSeasons.includes(s))) return false
      }
      if (filters.tags.length > 0) {
        const recipeTags = recipe.recipe_tags?.map(rt => rt.tag_id) || []
        if (!filters.tags.every(tagId => recipeTags.includes(tagId))) return false
      }
      if (filters.bases.length > 0 && (!recipe.base_id || !filters.bases.includes(recipe.base_id))) return false
      if (filters.cuisines.length > 0 && (!recipe.cuisine_id || !filters.cuisines.includes(recipe.cuisine_id))) return false
      if (filters.difficulties.length > 0 && !filters.difficulties.includes(recipe.difficulty)) return false
      if (filters.mealTypes.length > 0 && !filters.mealTypes.includes(recipe.meal_type || 'main')) return false
      if (filters.priceRanges.length > 0 && !filters.priceRanges.includes(recipe.price_range || 'medium')) return false
      return true
    })
  }, [recipes, searchQuery, filters])

  const handleAddRecipe = () => { setEditingRecipe(null); setShowForm(true) }
  const handleEditRecipe = (recipe) => { setEditingRecipe(recipe); setShowForm(true) }
  const handleCloseForm = () => { setShowForm(false); setEditingRecipe(null) }

  const hasActiveFilters = Object.values(filters).some(f => f.length > 0)

  return (
    <div style={styles.container}>
      {/* Search bar */}
      <div style={styles.searchBar}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('recipes.search')}
          style={styles.searchInput}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={styles.clearBtn}>✕</button>
        )}
      </div>

      <FilterPanel filters={filters} onChange={setFilters} />

      {(searchQuery || hasActiveFilters) && (
        <div style={styles.resultsCount}>
          {filteredRecipes.length} / {recipes.length} {t('nav.recipes').toLowerCase()}
        </div>
      )}

      <div style={styles.list}>
        {filteredRecipes.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyText}>
              {recipes.length === 0 ? t('recipes.empty') : t('recipes.emptyFiltered')}
            </p>
          </div>
        ) : (
          filteredRecipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} onClick={() => handleEditRecipe(recipe)} />
          ))
        )}
      </div>

      <button onClick={handleAddRecipe} style={styles.fab}>
        <span style={{ fontSize: '26px', lineHeight: 1, fontWeight: 300 }}>+</span>
      </button>

      {showForm && <RecipeForm recipe={editingRecipe} onClose={handleCloseForm} />}
    </div>
  )
}

const styles = {
  container: { padding: '16px 16px 100px' },
  searchBar: {
    display: 'flex', alignItems: 'center', gap: '10px',
    backgroundColor: 'white', borderRadius: '14px', padding: '12px 16px',
    boxShadow: shadows.sm, marginBottom: '12px',
    border: '1px solid rgba(0,0,0,0.04)',
  },
  searchIcon: { fontSize: '16px', opacity: 0.6 },
  searchInput: {
    flex: 1, border: 'none', outline: 'none', fontSize: '15px',
    backgroundColor: 'transparent', fontFamily: fonts.body, color: colors.textPrimary
  },
  clearBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', backgroundColor: colors.background, borderRadius: '50%',
    width: '26px', height: '26px', cursor: 'pointer', color: colors.textMuted, fontSize: '12px',
    transition: 'all 0.2s ease'
  },
  resultsCount: { fontSize: '13px', color: colors.textMuted, marginBottom: '12px', textAlign: 'center', fontWeight: 500 },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  empty: { backgroundColor: 'white', borderRadius: '16px', padding: '48px 20px', textAlign: 'center', boxShadow: shadows.sm },
  emptyText: { fontSize: '15px', color: colors.textMuted, margin: 0 },
  fab: {
    position: 'fixed', bottom: '100px', right: 'max(20px, calc(50% - 280px))',
    width: '56px', height: '56px', borderRadius: '18px',
    backgroundColor: colors.forest, color: 'white', border: 'none',
    boxShadow: '0 4px 16px rgba(27,107,58,0.35)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '28px', fontWeight: '300', fontFamily: fonts.body,
    transition: 'all 0.25s ease'
  }
}
