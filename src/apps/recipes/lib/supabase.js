// Re-export shared Supabase client + all recipe query helpers
export { supabase } from '../../../lib/supabase'
import { supabase } from '../../../lib/supabase'

// ============================================
// PROFILE
// ============================================

export async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  if (!data) {
    // First login — create profile row
    const { data: created, error: createError } = await supabase
      .from('profiles').insert({ id: userId, language: 'fr' }).select().maybeSingle()
    if (createError) throw createError
    return created
  }
  return data
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single()
  if (error) throw error
  return data
}

// ============================================
// TAGS
// ============================================

export async function getTags(userId) {
  const { data, error } = await supabase.from('tags').select('*').eq('user_id', userId).order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function createTag(userId, tag) {
  const { data, error } = await supabase.from('tags').insert({ user_id: userId, ...tag }).select().single()
  if (error) throw error
  return data
}

export async function updateTag(tagId, updates) {
  const { data, error } = await supabase.from('tags').update(updates).eq('id', tagId).select().single()
  if (error) throw error
  return data
}

export async function deleteTag(tagId) {
  const { error } = await supabase.from('tags').delete().eq('id', tagId)
  if (error) throw error
}

// ============================================
// BASES
// ============================================

export async function getBases(userId) {
  const { data, error } = await supabase.from('bases').select('*').eq('user_id', userId).order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function createBase(userId, base) {
  const { data, error } = await supabase.from('bases').insert({ user_id: userId, ...base }).select().single()
  if (error) throw error
  return data
}

export async function updateBase(baseId, updates) {
  const { data, error } = await supabase.from('bases').update(updates).eq('id', baseId).select().single()
  if (error) throw error
  return data
}

export async function deleteBase(baseId) {
  const { error } = await supabase.from('bases').delete().eq('id', baseId)
  if (error) throw error
}

// ============================================
// CUISINES
// ============================================

export async function getCuisines() {
  const { data, error } = await supabase.from('cuisines').select('*').order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

// ============================================
// INGREDIENTS
// ============================================

export async function getIngredients(userId) {
  const { data, error } = await supabase.from('ingredients').select('*').eq('user_id', userId).order('name_fr', { ascending: true })
  if (error) throw error
  return data
}

export async function createIngredient(userId, ingredient) {
  const { data, error } = await supabase.from('ingredients').insert({ user_id: userId, ...ingredient }).select().single()
  if (error) throw error
  return data
}

export async function updateIngredient(ingredientId, updates) {
  const { data, error } = await supabase.from('ingredients').update(updates).eq('id', ingredientId).select().single()
  if (error) throw error
  return data
}

export async function deleteIngredient(ingredientId) {
  const { error } = await supabase.from('ingredients').delete().eq('id', ingredientId)
  if (error) throw error
}

// ============================================
// RECIPES
// ============================================

export async function getRecipes(userId) {
  const { data, error } = await supabase
    .from('recipes')
    .select(`*, base:bases(*), cuisine:cuisines(*), recipe_tags(tag_id), recipe_ingredients(id, ingredient_id, quantity, unit, sort_order, ingredient:ingredients(*))`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createRecipe(userId, recipe, tagIds = [], ingredientsList = []) {
  const { data: newRecipe, error: recipeError } = await supabase.from('recipes').insert({ user_id: userId, ...recipe }).select().single()
  if (recipeError) throw recipeError
  if (tagIds.length > 0) {
    const { error } = await supabase.from('recipe_tags').insert(tagIds.map(tagId => ({ recipe_id: newRecipe.id, tag_id: tagId })))
    if (error) throw error
  }
  if (ingredientsList.length > 0) {
    const { error } = await supabase.from('recipe_ingredients').insert(
      ingredientsList.map((ing, i) => ({ recipe_id: newRecipe.id, ingredient_id: ing.ingredient_id, quantity: ing.quantity || null, unit: ing.unit || null, sort_order: i }))
    )
    if (error) throw error
  }
  return newRecipe
}

export async function updateRecipe(recipeId, recipe, tagIds = [], ingredientsList = []) {
  const { data: updatedRecipe, error: recipeError } = await supabase.from('recipes').update(recipe).eq('id', recipeId).select().single()
  if (recipeError) throw recipeError
  await supabase.from('recipe_tags').delete().eq('recipe_id', recipeId)
  await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId)
  if (tagIds.length > 0) {
    await supabase.from('recipe_tags').insert(tagIds.map(tagId => ({ recipe_id: recipeId, tag_id: tagId })))
  }
  if (ingredientsList.length > 0) {
    await supabase.from('recipe_ingredients').insert(
      ingredientsList.map((ing, i) => ({ recipe_id: recipeId, ingredient_id: ing.ingredient_id, quantity: ing.quantity || null, unit: ing.unit || null, sort_order: i }))
    )
  }
  return updatedRecipe
}

export async function deleteRecipe(recipeId) {
  const { error } = await supabase.from('recipes').delete().eq('id', recipeId)
  if (error) throw error
}

// ============================================
// MEAL PLANS
// ============================================

export async function getMealPlans(userId, startDate, endDate) {
  const { data, error } = await supabase
    .from('meal_plans')
    .select(`*, recipe:recipes(*, recipe_tags(tag_id))`)
    .eq('user_id', userId)
    .gte('planned_date', startDate)
    .lte('planned_date', endDate)
    .order('planned_date', { ascending: true })
  if (error) throw error
  return data
}

export async function createMealPlan(userId, recipeId, plannedDate) {
  const { data, error } = await supabase
    .from('meal_plans')
    .insert({ user_id: userId, recipe_id: recipeId, planned_date: plannedDate })
    .select(`*, recipe:recipes(*, recipe_tags(tag_id))`)
    .single()
  if (error) throw error
  return data
}

export async function deleteMealPlan(mealPlanId) {
  const { error } = await supabase.from('meal_plans').delete().eq('id', mealPlanId)
  if (error) throw error
}

// ============================================
// SHOPPING LIST
// ============================================

export async function getShoppingItems(userId) {
  const { data, error } = await supabase
    .from('shopping_items')
    .select(`*, ingredient:ingredients(*)`)
    .eq('user_id', userId)
    .order('checked', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createShoppingItem(userId, item) {
  const { data, error } = await supabase.from('shopping_items').insert({ user_id: userId, ...item }).select(`*, ingredient:ingredients(*)`).single()
  if (error) throw error
  return data
}

export async function createShoppingItems(userId, items) {
  const { data, error } = await supabase.from('shopping_items').insert(items.map(item => ({ user_id: userId, ...item }))).select(`*, ingredient:ingredients(*)`)
  if (error) throw error
  return data
}

export async function updateShoppingItem(itemId, updates) {
  const { data, error } = await supabase.from('shopping_items').update(updates).eq('id', itemId).select(`*, ingredient:ingredients(*)`).single()
  if (error) throw error
  return data
}

export async function deleteShoppingItem(itemId) {
  const { error } = await supabase.from('shopping_items').delete().eq('id', itemId)
  if (error) throw error
}

export async function deleteCheckedShoppingItems(userId) {
  const { error } = await supabase.from('shopping_items').delete().eq('user_id', userId).eq('checked', true)
  if (error) throw error
}

export async function deleteAllShoppingItems(userId) {
  const { error } = await supabase.from('shopping_items').delete().eq('user_id', userId)
  if (error) throw error
}
