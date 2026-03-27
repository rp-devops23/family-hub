import { useState, useEffect } from 'react'
import { useApp } from '../context/RecipeContext'
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, commonStyles } from '../lib/theme'
import ShoppingListGenerator from './ShoppingListGenerator'

export default function ShoppingListPage() {
  const {
    t, language,
    shoppingItems,
    createShoppingItem, updateShoppingItem, deleteShoppingItem,
    recipes
  } = useApp()

  const [showGenerator, setShowGenerator] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [customInput, setCustomInput] = useState('')

  const uncheckedItems = shoppingItems.filter(item => !item.checked)
  const checkedItems = shoppingItems.filter(item => item.checked)

  // Get ingredient names for suggestions
  const getAvailableIngredients = () => {
    const used = new Set(uncheckedItems.map(item => item.ingredient_id).filter(Boolean))
    return recipes
      .flatMap(r => r.recipe_ingredients || [])
      .map(ri => ({ id: ri.ingredient_id, name: ri.name_en }))
      .filter(ing => ing.id && !used.has(ing.id))
      .filter((ing, idx, arr) => arr.findIndex(i => i.id === ing.id) === idx)
  }

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const available = getAvailableIngredients()
      setSuggestions(
        available
          .filter(ing => ing.name.toLowerCase().includes(query))
          .slice(0, 5)
      )
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }, [searchQuery, shoppingItems])

  const handleAddCustomItem = async () => {
    const input = customInput.trim()
    if (!input) return

    try {
      await createShoppingItem({
        name: input,
        quantity: null,
        unit: null
      })
      setCustomInput('')
      // Show brief notification
      showNotification(language === 'fr' ? 'Article ajouté' : 'Item added')
    } catch (error) {
      console.error('Add item error:', error)
    }
  }

  const handleAddIngredient = async (suggestion) => {
    try {
      await createShoppingItem({
        ingredient_id: suggestion.id,
        quantity: null,
        unit: null,
        name: suggestion.name
      })
      setSearchQuery('')
      setShowSuggestions(false)
      showNotification(language === 'fr' ? 'Ingrédient ajouté' : 'Ingredient added')
    } catch (error) {
      console.error('Add ingredient error:', error)
    }
  }

  const showNotification = (message) => {
    // Could implement a toast/notification system here
    console.log(message)
  }

  const handleToggleItem = async (item) => {
    try {
      await updateShoppingItem(item.id, { checked: !item.checked })
    } catch (error) {
      console.error('Update error:', error)
    }
  }

  const handleUpdateQuantity = async (itemId, quantity) => {
    try {
      const item = shoppingItems.find(i => i.id === itemId)
      if (!item) return

      // Parse quantity
      let parsedQty = null
      if (quantity && quantity.trim()) {
        const num = parseFloat(quantity.replace(',', '.'))
        if (!isNaN(num)) {
          parsedQty = num.toString()
        } else {
          parsedQty = quantity
        }
      }

      await updateShoppingItem(itemId, { quantity: parsedQty })
    } catch (error) {
      console.error('Update quantity error:', error)
    }
  }

  const handleUpdateUnit = async (itemId, unit) => {
    try {
      await updateShoppingItem(itemId, { unit: unit || null })
    } catch (error) {
      console.error('Update unit error:', error)
    }
  }

  const handleDeleteItem = async (itemId) => {
    try {
      await deleteShoppingItem(itemId)
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const handleClearChecked = async () => {
    if (!window.confirm(t('shopping.clearCheckedConfirm'))) return
    try {
      for (const item of checkedItems) {
        await deleteShoppingItem(item.id)
      }
    } catch (error) {
      console.error('Clear checked error:', error)
    }
  }

  const handleClearAll = async () => {
    if (!window.confirm(t('shopping.clearAllConfirm'))) return
    try {
      for (const item of shoppingItems) {
        await deleteShoppingItem(item.id)
      }
    } catch (error) {
      console.error('Clear all error:', error)
    }
  }

  const handleGenerateSuccess = (itemsProcessed) => {
    showNotification(
      language === 'fr'
        ? `${itemsProcessed} article(s) ajouté(s)`
        : `${itemsProcessed} item(s) added`
    )
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>{t('shopping.title')}</h1>
        <p style={styles.subtitle}>{t('shopping.subtitle')}</p>
      </header>

      <div style={styles.addSection}>
        <div style={styles.searchBox}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('shopping.searchPlaceholder')}
            style={styles.searchInput}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={styles.suggestions}>
              {suggestions.map(sugg => (
                <button
                  key={sugg.id}
                  onClick={() => handleAddIngredient(sugg)}
                  style={styles.suggestionItem}
                >
                  + {sugg.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={styles.customInput}>
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCustomItem()}
            placeholder={t('shopping.customItemPlaceholder')}
            style={styles.input}
          />
          <button
            onClick={handleAddCustomItem}
            style={styles.addButton}
          >
            {t('common.add')}
          </button>
        </div>

        <button
          onClick={() => setShowGenerator(true)}
          style={styles.generatorButton}
        >
          {t('shopping.generateFromMeals')}
        </button>
      </div>

      {shoppingItems.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyStateText}>{t('shopping.empty')}</p>
          <button
            onClick={() => setShowGenerator(true)}
            style={styles.emptyStateButton}
          >
            {t('shopping.generateFromMeals')}
          </button>
        </div>
      ) : (
        <>
          <div style={styles.itemsSection}>
            <div style={styles.itemsHeader}>
              <span style={styles.itemsTitle}>
                {t('shopping.items')} ({uncheckedItems.length})
              </span>
            </div>

            <div style={styles.itemsList}>
              {uncheckedItems.map(item => (
                <div key={item.id} style={styles.item}>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => handleToggleItem(item)}
                    style={styles.checkbox}
                  />

                  <div style={styles.itemContent}>
                    <span style={styles.itemName}>{item.name}</span>
                  </div>

                  <div style={styles.quantitySection}>
                    <input
                      type="text"
                      value={item.quantity || ''}
                      onChange={(e) => handleUpdateQuantity(item.id, e.target.value)}
                      placeholder={t('shopping.quantity')}
                      style={styles.quantityInput}
                    />
                    <input
                      type="text"
                      value={item.unit || ''}
                      onChange={(e) => handleUpdateUnit(item.id, e.target.value)}
                      placeholder={t('shopping.unit')}
                      style={styles.unitInput}
                    />
                  </div>

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    style={styles.deleteButton}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {checkedItems.length > 0 && (
            <div style={styles.itemsSection}>
              <div style={styles.itemsHeader}>
                <span style={styles.itemsTitle}>
                  {t('shopping.inCart')} ({checkedItems.length})
                </span>
                <button
                  onClick={handleClearChecked}
                  style={styles.clearButton}
                >
                  ✕ {t('shopping.clearChecked')}
                </button>
              </div>

              <div style={styles.itemsList}>
                {checkedItems.map(item => (
                  <div key={item.id} style={styles.itemChecked}>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => handleToggleItem(item)}
                      style={styles.checkbox}
                    />

                    <div style={styles.itemContent}>
                      <span style={styles.itemNameChecked}>{item.name}</span>
                    </div>

                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      style={styles.deleteButton}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleClearAll}
            style={styles.clearAllButton}
          >
            {t('shopping.clearAll')}
          </button>
        </>
      )}

      {showGenerator && (
        <ShoppingListGenerator
          onClose={() => setShowGenerator(false)}
          onGenerated={handleGenerateSuccess}
        />
      )}
    </div>
  )
}

const styles = {
  container: {
    padding: spacing.md
  },
  header: {
    marginBottom: spacing.lg
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['2xl'],
    color: colors.forest,
    margin: 0
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    margin: 0,
    marginTop: spacing.xs
  },
  addSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  searchBox: {
    position: 'relative'
  },
  searchInput: {
    width: '100%',
    padding: spacing.sm,
    fontSize: fontSizes.sm,
    border: `1px solid ${colors.warmGray}`,
    borderRadius: borderRadius.md,
    fontFamily: fonts.body,
    boxSizing: 'border-box'
  },
  suggestions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    border: `1px solid ${colors.warmGray}`,
    borderTop: 'none',
    borderRadius: `0 0 ${borderRadius.md} ${borderRadius.md}`,
    zIndex: 10,
    maxHeight: '150px',
    overflowY: 'auto'
  },
  suggestionItem: {
    width: '100%',
    padding: spacing.sm,
    backgroundColor: colors.white,
    border: 'none',
    borderBottom: `1px solid ${colors.warmGray}`,
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: fontSizes.sm,
    fontFamily: fonts.body,
    color: colors.textSecondary
  },
  customInput: {
    display: 'flex',
    gap: spacing.xs
  },
  input: {
    flex: 1,
    padding: spacing.sm,
    fontSize: fontSizes.sm,
    border: `1px solid ${colors.warmGray}`,
    borderRadius: borderRadius.md,
    fontFamily: fonts.body,
    boxSizing: 'border-box'
  },
  addButton: {
    ...commonStyles.buttonBase,
    ...commonStyles.buttonPrimary,
    padding: `${spacing.sm} ${spacing.md}`
  },
  generatorButton: {
    ...commonStyles.buttonBase,
    ...commonStyles.buttonSecondary,
    padding: spacing.sm
  },
  emptyState: {
    textAlign: 'center',
    padding: spacing.lg,
    backgroundColor: colors.cream,
    borderRadius: borderRadius.lg
  },
  emptyStateText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    margin: 0,
    marginBottom: spacing.sm
  },
  emptyStateButton: {
    ...commonStyles.buttonBase,
    ...commonStyles.buttonPrimary
  },
  itemsSection: {
    marginBottom: spacing.md
  },
  itemsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottom: `1px solid ${colors.warmGray}`,
    marginBottom: spacing.sm
  },
  itemsTitle: {
    fontSize: fontSizes.sm,
    fontWeight: 600,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  clearButton: {
    padding: `4px ${spacing.sm}`,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.warmGray}`,
    borderRadius: borderRadius.md,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    cursor: 'pointer',
    fontFamily: fonts.body
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.warmGray}`
  },
  itemChecked: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.cream,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.warmGray}`
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    flexShrink: 0
  },
  itemContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  itemName: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontWeight: 500
  },
  itemNameChecked: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontWeight: 400,
    textDecoration: 'line-through'
  },
  quantitySection: {
    display: 'flex',
    gap: spacing.xs,
    minWidth: '140px'
  },
  quantityInput: {
    width: '60px',
    padding: `4px ${spacing.xs}`,
    fontSize: fontSizes.xs,
    border: `1px solid ${colors.warmGray}`,
    borderRadius: borderRadius.sm,
    fontFamily: fonts.body,
    boxSizing: 'border-box'
  },
  unitInput: {
    flex: 1,
    padding: `4px ${spacing.xs}`,
    fontSize: fontSizes.xs,
    border: `1px solid ${colors.warmGray}`,
    borderRadius: borderRadius.sm,
    fontFamily: fonts.body,
    boxSizing: 'border-box'
  },
  deleteButton: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: fontSizes.sm,
    cursor: 'pointer',
    color: colors.textMuted,
    flexShrink: 0
  },
  clearAllButton: {
    width: '100%',
    padding: spacing.sm,
    backgroundColor: 'transparent',
    border: `1px dashed ${colors.warmGrayDark}`,
    borderRadius: borderRadius.md,
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontFamily: fonts.body,
    cursor: 'pointer',
    marginTop: spacing.md
  }
}

