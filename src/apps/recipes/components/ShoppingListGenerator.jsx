import { useState, useEffect } from 'react'
import { useApp } from '../context/RecipeContext'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, commonStyles } from '../lib/theme'

// Helper: Normalize unit (treat null, undefined, "" as the same)
function normalizeUnit(unit) {
  if (!unit || unit.trim() === '') return ''
  return unit.toLowerCase().trim()
}

// Helper: Parse quantity string to number (returns null if not parseable)
function parseQuantity(str) {
  if (!str || str.trim() === '') return null
  const cleaned = str.trim().replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

// Helper: Format quantity (remove .0 from whole numbers)
function formatQuantity(num) {
  if (num === null || num === undefined) return null
  return num % 1 === 0 ? num.toString() : num.toFixed(1)
}

// Helper: Add two quantities together
function addQuantities(qty1, unit1, qty2, unit2) {
  const num1 = parseQuantity(qty1)
  const num2 = parseQuantity(qty2)

  const u1 = normalizeUnit(unit1)
  const u2 = normalizeUnit(unit2)

  // Both are numbers and same unit (including both empty = "unités")
  if (num1 !== null && num2 !== null && u1 === u2) {
    const total = num1 + num2
    if (total === 0) return { quantity: null, unit: null }
    return {
      quantity: formatQuantity(total),
      unit: unit1 || unit2 || null
    }
  }

  // One is 0 or empty - return the other
  if (num1 === 0 || qty1 === '0' || !qty1) {
    return { quantity: qty2, unit: unit2 || null }
  }
  if (num2 === 0 || qty2 === '0' || !qty2) {
    return { quantity: qty1, unit: unit1 || null }
  }

  // Can't add directly - concatenate
  const part1 = qty1 ? (unit1 ? `${qty1} ${unit1}` : qty1) : null
  const part2 = qty2 ? (unit2 ? `${qty2} ${unit2}` : qty2) : null

  if (part1 && part2) {
    return { quantity: `${part1} + ${part2}`, unit: null }
  }

  return {
    quantity: part1 || part2 || null,
    unit: part1 ? (unit1 || null) : (unit2 || null)
  }
}

// Helper: Aggregate multiple quantities
function aggregateQuantities(quantities, units) {
  if (quantities.length === 0) {
    return { quantity: null, unit: null }
  }

  if (quantities.length === 1) {
    return {
      quantity: quantities[0],
      unit: units[0] || null
    }
  }

  // Try to sum all numeric quantities with same normalized unit
  const parsed = quantities.map((q, i) => ({
    num: parseQuantity(q),
    normalizedUnit: normalizeUnit(units[i]),
    originalUnit: units[i],
    original: q
  }))

  const allNumeric = parsed.every(p => p.num !== null)
  const allSameUnit = parsed.every(p => p.normalizedUnit === parsed[0].normalizedUnit)

  if (allNumeric && allSameUnit) {
    const total = parsed.reduce((sum, p) => sum + p.num, 0)
    const displayUnit = parsed.find(p => p.originalUnit)?.originalUnit || null
    return {
      quantity: formatQuantity(total),
      unit: displayUnit
    }
  }

  // Can't sum - concatenate with details
  const parts = parsed.map(p => {
    if (p.original && p.originalUnit) return `${p.original} ${p.originalUnit}`
    if (p.original) return p.original
    return null
  }).filter(Boolean)

  return {
    quantity: parts.join(' + '),
    unit: null
  }
}

export default function ShoppingListGenerator({ onClose, onGenerated }) {
  const {
    t, getName, language,
    mealPlans, loadMealPlans,
    shoppingItems,
    createShoppingItem, updateShoppingItem,
    recipes
  } = useApp()

  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedDates, setSelectedDates] = useState([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  const locale = language === 'fr' ? fr : enUS

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: currentWeekStart, end: weekEnd })

  useEffect(() => {
    const startStr = format(currentWeekStart, 'yyyy-MM-dd')
    const endStr = format(weekEnd, 'yyyy-MM-dd')
    loadMealPlans(startStr, endStr)
  }, [currentWeekStart])

  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1))
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1))
  const goToCurrentWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))

  const getMealsForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return mealPlans.filter(mp => mp.planned_date === dayStr)
  }

  const toggleDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    setSelectedDates(prev =>
      prev.includes(dayStr) ? prev.filter(d => d !== dayStr) : [...prev, dayStr]
    )
  }

  const selectAllWithMeals = () => {
    const daysWithMeals = days
      .filter(day => getMealsForDay(day).length > 0)
      .map(day => format(day, 'yyyy-MM-dd'))
    setSelectedDates(daysWithMeals)
  }

  const clearSelection = () => setSelectedDates([])

  const selectedMealsCount = selectedDates.reduce((count, dateStr) => {
    return count + mealPlans.filter(mp => mp.planned_date === dateStr).length
  }, 0)

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)

    try {
      const selectedMealPlans = mealPlans.filter(mp =>
        selectedDates.includes(mp.planned_date)
      )

      const ingredientMap = new Map()

      for (const mealPlan of selectedMealPlans) {
        const recipe = recipes.find(r => r.id === mealPlan.recipe_id)

        if (!recipe?.recipe_ingredients || recipe.recipe_ingredients.length === 0) {
          continue
        }

        for (const ri of recipe.recipe_ingredients) {
          if (!ri.ingredient_id) continue

          const key = ri.ingredient_id
          const rawQty = ri.quantity?.trim() || ''
          const rawUnit = ri.unit?.trim() || ''

          // If no quantity specified, treat as "1" (1 unit of this ingredient)
          const qty = rawQty || '1'
          const unit = rawQty ? rawUnit : ''

          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key)
            existing.quantities.push(qty)
            existing.units.push(unit)
            existing.count += 1
          } else {
            ingredientMap.set(key, {
              ingredient_id: ri.ingredient_id,
              quantities: [qty],
              units: [unit],
              count: 1
            })
          }
        }
      }

      if (ingredientMap.size === 0) {
        setError(language === 'fr'
          ? 'Aucun ingrédient trouvé dans les recettes sélectionnées'
          : 'No ingredients found in selected recipes')
        setGenerating(false)
        return
      }

      const existingItemsMap = new Map(
        shoppingItems
          .filter(item => item.ingredient_id && !item.checked)
          .map(item => [item.ingredient_id, item])
      )

      let itemsProcessed = 0

      for (const [ingredientId, data] of ingredientMap) {
        const aggregated = aggregateQuantities(data.quantities, data.units)
        const existingItem = existingItemsMap.get(ingredientId)

        if (existingItem) {
          const existingQty = existingItem.quantity || '0'
          const existingUnit = existingItem.unit || ''

          const added = addQuantities(existingQty, existingUnit, aggregated.quantity, aggregated.unit)

          await updateShoppingItem(existingItem.id, {
            quantity: added.quantity,
            unit: added.unit,
            count: (existingItem.count || 1) + data.count
          })
        } else {
          await createShoppingItem({
            ingredient_id: data.ingredient_id,
            quantity: aggregated.quantity,
            unit: aggregated.unit,
            count: data.count
          })
        }

        itemsProcessed++
      }

      onGenerated(itemsProcessed)
      onClose()
    } catch (err) {
      console.error('Generate shopping list error:', err)
      setError((language === 'fr' ? 'Erreur: ' : 'Error: ') + err.message)
    } finally {
      setGenerating(false)
    }
  }

  const weekRangeText = `${format(currentWeekStart, 'd MMM', { locale })} - ${format(weekEnd, 'd MMM yyyy', { locale })}`
  const isCurrentWeek = isSameDay(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 }))

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>{t('shopping.selectDays')}</h2>
            <p style={styles.subtitle}>{t('shopping.selectDaysDesc')}</p>
          </div>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>

        <div style={styles.weekNav}>
          <button onClick={goToPreviousWeek} style={styles.weekNavButton}>←</button>
          <div style={styles.weekNavCenter}>
            <span style={styles.weekNavText}>{weekRangeText}</span>
            {!isCurrentWeek && (
              <button onClick={goToCurrentWeek} style={styles.todayButton}>
                {t('calendar.today')}
              </button>
            )}
          </div>
          <button onClick={goToNextWeek} style={styles.weekNavButton}>→</button>
        </div>

        <div style={styles.quickActions}>
          <button onClick={selectAllWithMeals} style={styles.quickButton}>
            ✓ {language === 'fr' ? 'Tout sélectionner' : 'Select all'}
          </button>
          {selectedDates.length > 0 && (
            <button onClick={clearSelection} style={styles.quickButtonClear}>
              ✕ {language === 'fr' ? 'Effacer' : 'Clear'}
            </button>
          )}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.content}>
          {days.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const meals = getMealsForDay(day)
            const isSelected = selectedDates.includes(dayStr)
            const isToday = isSameDay(day, new Date())
            const hasMeals = meals.length > 0

            return (
              <button
                key={dayStr}
                onClick={() => hasMeals && toggleDay(day)}
                style={{
                  ...styles.dayItem,
                  backgroundColor: isSelected ? colors.forest + '0F' : colors.white,
                  borderColor: isSelected ? colors.forest : colors.warmGray,
                  opacity: hasMeals ? 1 : 0.4,
                  cursor: hasMeals ? 'pointer' : 'not-allowed'
                }}
              >
                <div style={styles.dayHeader}>
                  <div style={styles.dayInfo}>
                    <span style={{ ...styles.dayName, color: isToday ? colors.forest : colors.textPrimary }}>
                      {format(day, 'EEEE', { locale })}
                    </span>
                    <span style={styles.dayDate}>{format(day, 'd MMMM', { locale })}</span>
                  </div>
                  {hasMeals && (
                    <div style={{
                      ...styles.checkbox,
                      backgroundColor: isSelected ? colors.forest : colors.white,
                      borderColor: isSelected ? colors.forest : colors.warmGrayDark
                    }}>
                      {isSelected && <span style={styles.checkmark}>✓</span>}
                    </div>
                  )}
                </div>

                {hasMeals ? (
                  <div style={styles.mealsList}>
                    {meals.map(meal => {
                      const recipe = recipes.find(r => r.id === meal.recipe_id)
                      const ingredientCount = recipe?.recipe_ingredients?.length || 0
                      return (
                        <span key={meal.id} style={styles.mealChip}>
                          {meal.recipe?.name || recipe?.name || '?'}
                          {ingredientCount > 0 && (
                            <span style={styles.ingredientCount}> ({ingredientCount})</span>
                          )}
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <span style={styles.noMeals}>{language === 'fr' ? 'Aucun repas' : 'No meals'}</span>
                )}
              </button>
            )
          })}
        </div>

        <div style={styles.footer}>
          <span style={styles.selectedCount}>
            {selectedMealsCount} {t('shopping.selectedMeals')}
          </span>
          <button
            onClick={handleGenerate}
            disabled={generating || selectedMealsCount === 0}
            style={{ ...styles.generateButton, opacity: (generating || selectedMealsCount === 0) ? 0.6 : 1 }}
          >
            {generating ? t('common.loading') : t('shopping.generateList')}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: spacing.md, zIndex: 1000 },
  modal: { backgroundColor: colors.white, borderRadius: '20px', width: '100%', maxWidth: '450px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: shadows.lg },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 20px', borderBottom: `1px solid ${colors.warmGray}` },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.forest, margin: 0, fontWeight: 700 },
  subtitle: { fontSize: fontSizes.sm, color: colors.textMuted, margin: 0, marginTop: '4px' },
  closeButton: { width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', backgroundColor: colors.background, borderRadius: '10px', cursor: 'pointer', fontSize: fontSizes.md, color: colors.textSecondary, transition: 'all 0.2s ease' },
  weekNav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${colors.warmGray}`, backgroundColor: colors.background },
  weekNavButton: { width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${colors.warmGray}`, borderRadius: '10px', backgroundColor: colors.white, fontSize: fontSizes.md, cursor: 'pointer', color: colors.textPrimary, transition: 'all 0.2s ease' },
  weekNavCenter: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  weekNavText: { fontSize: fontSizes.sm, fontWeight: 700, color: colors.textPrimary, textTransform: 'capitalize' },
  todayButton: { padding: '3px 10px', backgroundColor: colors.forest, color: colors.white, border: 'none', borderRadius: borderRadius.full, fontSize: fontSizes.xs, cursor: 'pointer', fontFamily: fonts.body, fontWeight: 600 },
  quickActions: { display: 'flex', gap: spacing.sm, padding: '10px 16px', borderBottom: `1px solid ${colors.warmGray}` },
  quickButton: { flex: 1, padding: '6px', backgroundColor: colors.forest + '12', color: colors.forest, border: 'none', borderRadius: '10px', fontSize: fontSizes.xs, fontWeight: 600, cursor: 'pointer', fontFamily: fonts.body, transition: 'all 0.2s ease' },
  quickButtonClear: { padding: '6px 12px', backgroundColor: 'transparent', color: colors.textMuted, border: `1.5px solid ${colors.warmGray}`, borderRadius: '10px', fontSize: fontSizes.xs, cursor: 'pointer', fontFamily: fonts.body, transition: 'all 0.2s ease' },
  error: { margin: '10px 16px', padding: '10px 14px', backgroundColor: colors.errorLight, color: colors.error, borderRadius: '12px', fontSize: fontSizes.sm, textAlign: 'center' },
  content: { flex: 1, overflowY: 'auto', padding: spacing.md, display: 'flex', flexDirection: 'column', gap: spacing.sm },
  dayItem: { display: 'flex', flexDirection: 'column', gap: spacing.xs, padding: '14px 16px', border: '2px solid', borderRadius: '14px', fontFamily: fonts.body, textAlign: 'left', transition: 'all 0.2s ease' },
  dayHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  dayInfo: { display: 'flex', flexDirection: 'column' },
  dayName: { fontSize: fontSizes.md, fontWeight: 600, textTransform: 'capitalize' },
  dayDate: { fontSize: fontSizes.sm, color: colors.textMuted, textTransform: 'capitalize' },
  checkbox: { width: '24px', height: '24px', borderRadius: '8px', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' },
  checkmark: { color: colors.white, fontSize: fontSizes.sm, fontWeight: 700 },
  mealsList: { display: 'flex', flexWrap: 'wrap', gap: spacing.xs },
  mealChip: { fontSize: fontSizes.xs, backgroundColor: colors.warmGray, padding: '3px 10px', borderRadius: borderRadius.full, color: colors.textSecondary },
  ingredientCount: { color: colors.forest, fontWeight: 600 },
  noMeals: { fontSize: fontSizes.sm, color: colors.textMuted, fontStyle: 'italic' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: `1px solid ${colors.warmGray}` },
  selectedCount: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: 500 },
  generateButton: { ...commonStyles.buttonBase, ...commonStyles.buttonPrimary }
}
