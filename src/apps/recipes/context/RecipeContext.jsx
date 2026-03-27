import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import {
  getProfile,
  getTags, createTag as apiCreateTag, updateTag as apiUpdateTag, deleteTag as apiDeleteTag,
  getBases, createBase as apiCreateBase, updateBase as apiUpdateBase, deleteBase as apiDeleteBase,
  getCuisines,
  getIngredients, createIngredient as apiCreateIngredient, updateIngredient as apiUpdateIngredient, deleteIngredient as apiDeleteIngredient,
  getRecipes, createRecipe as apiCreateRecipe, updateRecipe as apiUpdateRecipe, deleteRecipe as apiDeleteRecipe,
  getMealPlans, createMealPlan as apiCreateMealPlan, deleteMealPlan as apiDeleteMealPlan,
  getShoppingItems, createShoppingItem as apiCreateShoppingItem, createShoppingItems as apiCreateShoppingItems,
  updateShoppingItem as apiUpdateShoppingItem, deleteShoppingItem as apiDeleteShoppingItem,
  deleteCheckedShoppingItems as apiDeleteCheckedShoppingItems, deleteAllShoppingItems as apiDeleteAllShoppingItems
} from '../lib/supabase'
import { createT, getLocalizedName } from '../lib/i18n'
import { useAuth } from '../../../context/AuthContext'

const RecipeContext = createContext(null)

export function useApp() {
  const context = useContext(RecipeContext)
  if (!context) throw new Error('useApp must be used within RecipeProvider')
  return context
}

export function RecipeProvider({ children }) {
  const auth = useAuth()
  const { user } = auth

  const [profile, setProfile] = useState(null)
  const [tags, setTags] = useState([])
  const [bases, setBases] = useState([])
  const [cuisines, setCuisines] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [recipes, setRecipes] = useState([])
  const [mealPlans, setMealPlans] = useState([])
  const [shoppingItems, setShoppingItems] = useState([])
  const [dataLoading, setDataLoading] = useState(false)
  const [currentTab, setCurrentTab] = useState('recipes')

  // Language & i18n from shared AuthContext
  const language = auth.language
  const t = useMemo(() => createT(language), [language])
  const getName = useCallback((item) => getLocalizedName(item, language), [language])

  // Language update (delegates to AuthContext toggle)
  const updateLanguage = useCallback((newLang) => {
    if (newLang !== auth.language) auth.toggleLanguage()
  }, [auth])

  // ============================================
  // LOAD DATA
  // ============================================

  useEffect(() => {
    if (!user) {
      setProfile(null); setTags([]); setBases([]); setIngredients([])
      setRecipes([]); setMealPlans([]); setShoppingItems([])
      return
    }
    let mounted = true
    async function loadUserData() {
      setDataLoading(true)
      try {
        const [profileData, tagsData, basesData, cuisinesData, ingredientsData, recipesData, shoppingData] = await Promise.all([
          getProfile(user.id), getTags(user.id), getBases(user.id), getCuisines(),
          getIngredients(user.id), getRecipes(user.id), getShoppingItems(user.id)
        ])
        if (mounted) {
          setProfile(profileData); setTags(tagsData); setBases(basesData)
          setCuisines(cuisinesData); setIngredients(ingredientsData)
          setRecipes(recipesData); setShoppingItems(shoppingData)
        }
      } catch (error) {
        console.error('Load recipe data error:', error)
      } finally {
        if (mounted) setDataLoading(false)
      }
    }
    loadUserData()
    return () => { mounted = false }
  }, [user])

  // ============================================
  // TAG ACTIONS
  // ============================================

  const createTag = useCallback(async (tagData) => {
    if (!user) return
    const newTag = await apiCreateTag(user.id, tagData)
    setTags(prev => [...prev, newTag].sort((a, b) => a.sort_order - b.sort_order))
    return newTag
  }, [user])

  const updateTag = useCallback(async (tagId, tagData) => {
    const updated = await apiUpdateTag(tagId, tagData)
    setTags(prev => prev.map(t => t.id === tagId ? updated : t))
    return updated
  }, [])

  const deleteTag = useCallback(async (tagId) => {
    await apiDeleteTag(tagId)
    setTags(prev => prev.filter(t => t.id !== tagId))
    setRecipes(prev => prev.map(r => ({ ...r, recipe_tags: r.recipe_tags.filter(rt => rt.tag_id !== tagId) })))
  }, [])

  // ============================================
  // BASE ACTIONS
  // ============================================

  const createBase = useCallback(async (baseData) => {
    if (!user) return
    const newBase = await apiCreateBase(user.id, baseData)
    setBases(prev => [...prev, newBase].sort((a, b) => a.sort_order - b.sort_order))
    return newBase
  }, [user])

  const updateBase = useCallback(async (baseId, baseData) => {
    const updated = await apiUpdateBase(baseId, baseData)
    setBases(prev => prev.map(b => b.id === baseId ? updated : b))
    return updated
  }, [])

  const deleteBase = useCallback(async (baseId) => {
    await apiDeleteBase(baseId)
    setBases(prev => prev.filter(b => b.id !== baseId))
    setRecipes(prev => prev.map(r => r.base_id === baseId ? { ...r, base_id: null, base: null } : r))
  }, [])

  // ============================================
  // INGREDIENT ACTIONS
  // ============================================

  const createIngredient = useCallback(async (ingredientData) => {
    if (!user) return
    const newIngredient = await apiCreateIngredient(user.id, ingredientData)
    setIngredients(prev => [...prev, newIngredient].sort((a, b) => a.name_fr.localeCompare(b.name_fr)))
    return newIngredient
  }, [user])

  const updateIngredient = useCallback(async (ingredientId, ingredientData) => {
    const updated = await apiUpdateIngredient(ingredientId, ingredientData)
    setIngredients(prev => prev.map(i => i.id === ingredientId ? updated : i))
    return updated
  }, [])

  const deleteIngredient = useCallback(async (ingredientId) => {
    await apiDeleteIngredient(ingredientId)
    setIngredients(prev => prev.filter(i => i.id !== ingredientId))
  }, [])

  // ============================================
  // RECIPE ACTIONS
  // ============================================

  const createRecipe = useCallback(async (recipeData, tagIds, ingredientsList) => {
    if (!user) return
    const newRecipe = await apiCreateRecipe(user.id, recipeData, tagIds, ingredientsList)
    const allRecipes = await getRecipes(user.id)
    setRecipes(allRecipes)
    return newRecipe
  }, [user])

  const updateRecipe = useCallback(async (recipeId, recipeData, tagIds, ingredientsList) => {
    if (!user) return
    await apiUpdateRecipe(recipeId, recipeData, tagIds, ingredientsList)
    const allRecipes = await getRecipes(user.id)
    setRecipes(allRecipes)
  }, [user])

  const deleteRecipe = useCallback(async (recipeId) => {
    await apiDeleteRecipe(recipeId)
    setRecipes(prev => prev.filter(r => r.id !== recipeId))
    setMealPlans(prev => prev.filter(mp => mp.recipe_id !== recipeId))
  }, [])

  // ============================================
  // MEAL PLAN ACTIONS
  // ============================================

  const loadMealPlans = useCallback(async (startDate, endDate) => {
    if (!user) return
    const plans = await getMealPlans(user.id, startDate, endDate)
    setMealPlans(plans)
  }, [user])

  const createMealPlan = useCallback(async (recipeId, plannedDate) => {
    if (!user) return
    const newPlan = await apiCreateMealPlan(user.id, recipeId, plannedDate)
    setMealPlans(prev => [...prev, newPlan])
    return newPlan
  }, [user])

  const deleteMealPlan = useCallback(async (mealPlanId) => {
    await apiDeleteMealPlan(mealPlanId)
    setMealPlans(prev => prev.filter(mp => mp.id !== mealPlanId))
  }, [])

  // ============================================
  // SHOPPING LIST ACTIONS
  // ============================================

  const createShoppingItem = useCallback(async (itemData) => {
    if (!user) return
    const newItem = await apiCreateShoppingItem(user.id, itemData)
    setShoppingItems(prev => [...prev, newItem])
    return newItem
  }, [user])

  const createShoppingItems = useCallback(async (items) => {
    if (!user) return
    const newItems = await apiCreateShoppingItems(user.id, items)
    setShoppingItems(prev => [...prev, ...newItems])
    return newItems
  }, [user])

  const updateShoppingItem = useCallback(async (itemId, updates) => {
    const updated = await apiUpdateShoppingItem(itemId, updates)
    setShoppingItems(prev => prev.map(item => item.id === itemId ? updated : item))
    return updated
  }, [])

  const deleteShoppingItem = useCallback(async (itemId) => {
    await apiDeleteShoppingItem(itemId)
    setShoppingItems(prev => prev.filter(item => item.id !== itemId))
  }, [])

  const deleteCheckedShoppingItems = useCallback(async () => {
    if (!user) return
    await apiDeleteCheckedShoppingItems(user.id)
    setShoppingItems(prev => prev.filter(item => !item.checked))
  }, [user])

  const deleteAllShoppingItems = useCallback(async () => {
    if (!user) return
    await apiDeleteAllShoppingItems(user.id)
    setShoppingItems([])
  }, [user])

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value = useMemo(() => ({
    // Auth (from shared AuthContext)
    ...auth,
    // Override t with recipe-specific translation function
    t,
    getName,
    updateLanguage,

    // Recipe data
    profile, tags, bases, cuisines, ingredients, recipes, mealPlans, shoppingItems, dataLoading,

    // UI
    currentTab, setCurrentTab,

    // Tag actions
    createTag, updateTag, deleteTag,

    // Base actions
    createBase, updateBase, deleteBase,

    // Ingredient actions
    createIngredient, updateIngredient, deleteIngredient,

    // Recipe actions
    createRecipe, updateRecipe, deleteRecipe,

    // Meal plan actions
    loadMealPlans, createMealPlan, deleteMealPlan,

    // Shopping actions
    createShoppingItem, createShoppingItems, updateShoppingItem,
    deleteShoppingItem, deleteCheckedShoppingItems, deleteAllShoppingItems,
  }), [
    auth, t, getName, updateLanguage,
    profile, tags, bases, cuisines, ingredients, recipes, mealPlans, shoppingItems, dataLoading,
    currentTab,
    createTag, updateTag, deleteTag,
    createBase, updateBase, deleteBase,
    createIngredient, updateIngredient, deleteIngredient,
    createRecipe, updateRecipe, deleteRecipe,
    loadMealPlans, createMealPlan, deleteMealPlan,
    createShoppingItem, createShoppingItems, updateShoppingItem,
    deleteShoppingItem, deleteCheckedShoppingItems, deleteAllShoppingItems,
  ])

  return <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>
}
