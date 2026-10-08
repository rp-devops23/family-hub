import { useState, useEffect, useRef, useMemo } from 'react'
import { useApp } from '../context/RecipeContext'
import { colors, shadows } from '../lib/theme'
import ShoppingListGenerator from './ShoppingListGenerator'

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

function getItemName(item, language) {
  if (item.ingredient) {
    return language === 'fr'
      ? item.ingredient.name_fr || item.ingredient.name_en
      : item.ingredient.name_en || item.ingredient.name_fr
  }
  return item.name || item.custom_name || '?'
}

function getItemCategoryId(item, ingredients) {
  if (item.ingredient_id) {
    // Use the ingredient's category from the full ingredients list (has category join)
    const fullIngredient = ingredients.find(i => i.id === item.ingredient_id)
    return fullIngredient?.category_id || null
  }
  return null
}

export default function ShoppingListPage() {
  const { t, language, getName, shoppingItems, ingredients, ingredientCategories, createShoppingItem, createIngredient, updateShoppingItem, deleteShoppingItem } = useApp()

  const [showGenerator, setShowGenerator] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [adding, setAdding] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)

  const uncheckedItems = shoppingItems.filter(item => !item.checked)
  const checkedItems = shoppingItems.filter(item => item.checked)

  // Group unchecked items by category
  const groupedItems = useMemo(() => {
    if (ingredientCategories.length === 0) {
      return [{ category: null, items: uncheckedItems }]
    }

    const groups = new Map()
    // Initialize groups in sort_order
    for (const cat of ingredientCategories) {
      groups.set(cat.id, { category: cat, items: [] })
    }
    groups.set(null, { category: null, items: [] }) // uncategorized last

    for (const item of uncheckedItems) {
      const catId = getItemCategoryId(item, ingredients)
      const group = groups.get(catId) || groups.get(null)
      group.items.push(item)
    }

    // Return only non-empty groups
    return Array.from(groups.values()).filter(g => g.items.length > 0)
  }, [uncheckedItems, ingredientCategories, ingredients])

  // Search all user ingredients, not just recipe ones
  useEffect(() => {
    const query = inputValue.trim().toLowerCase()
    if (!query) {
      setSuggestions([])
      setShowSuggestions(false)
      setHighlightedIndex(-1)
      return
    }
    const alreadyInList = new Set(shoppingItems.filter(i => !i.checked).map(i => i.ingredient_id).filter(Boolean))
    const matches = ingredients
      .filter(ing => {
        const nameFr = (ing.name_fr || '').toLowerCase()
        const nameEn = (ing.name_en || '').toLowerCase()
        return (nameFr.includes(query) || nameEn.includes(query)) && !alreadyInList.has(ing.id)
      })
      .map(ing => {
        const cat = ing.category_id ? ingredientCategories.find(c => c.id === ing.category_id) : null
        return {
          id: ing.id,
          name: language === 'fr' ? ing.name_fr || ing.name_en : ing.name_en || ing.name_fr,
          categoryLabel: cat ? `${cat.icon || ''} ${getName(cat)}`.trim() : null,
          existing: true
        }
      })
      .slice(0, 6)
    const exactMatch = matches.some(m => m.name.toLowerCase() === query)
    setSuggestions(matches)
    setShowSuggestions(true)
    setHighlightedIndex(exactMatch ? matches.findIndex(m => m.name.toLowerCase() === query) : -1)
  }, [inputValue, ingredients, shoppingItems, language, ingredientCategories, getName])

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAddExistingIngredient = async (ingredient) => {
    try {
      setAdding(true)
      await createShoppingItem({ ingredient_id: ingredient.id, name: ingredient.name, quantity: null, unit: null })
      setInputValue('')
      setShowSuggestions(false)
    } catch (error) { console.error('Add ingredient error:', error) }
    finally { setAdding(false) }
  }

  const handleAddNewIngredient = async () => {
    const name = inputValue.trim()
    if (!name || adding) return
    try {
      setAdding(true)
      const newIngredient = await createIngredient({
        name_fr: name,
        name_en: name,
        category_id: selectedCategoryId || null
      })
      await createShoppingItem({ ingredient_id: newIngredient.id, name, quantity: null, unit: null })
      setInputValue('')
      setShowSuggestions(false)
      setSelectedCategoryId('')
    } catch (error) { console.error('Add new ingredient error:', error) }
    finally { setAdding(false) }
  }

  const handleKeyDown = (e) => {
    if (!showSuggestions) {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddNewIngredient()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => prev < suggestions.length ? prev + 1 : 0)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : suggestions.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleAddExistingIngredient(suggestions[highlightedIndex])
      } else {
        handleAddNewIngredient()
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const handleToggleItem = async (item) => {
    try { await updateShoppingItem(item.id, { checked: !item.checked }) }
    catch (error) { console.error('Update error:', error) }
  }

  const handleUpdateQuantity = async (itemId, quantity) => {
    try { await updateShoppingItem(itemId, { quantity: quantity || null }) }
    catch (error) { console.error('Update quantity error:', error) }
  }

  const handleUpdateUnit = async (itemId, unit) => {
    try { await updateShoppingItem(itemId, { unit: unit || null }) }
    catch (error) { console.error('Update unit error:', error) }
  }

  const handleDeleteItem = async (itemId) => {
    try { await deleteShoppingItem(itemId) }
    catch (error) { console.error('Delete error:', error) }
  }

  const handleClearChecked = async () => {
    if (!window.confirm(t('shopping.clearCheckedConfirm'))) return
    try { for (const item of checkedItems) await deleteShoppingItem(item.id) }
    catch (error) { console.error('Clear checked error:', error) }
  }

  const handleClearAll = async () => {
    if (!window.confirm(t('shopping.clearAllConfirm'))) return
    try { for (const item of shoppingItems) await deleteShoppingItem(item.id) }
    catch (error) { console.error('Clear all error:', error) }
  }

  const showCreateOption = inputValue.trim() && !suggestions.some(s => s.name.toLowerCase() === inputValue.trim().toLowerCase())

  const renderItem = (item) => (
    <div key={item.id} style={styles.item}>
      <input type="checkbox" checked={false} onChange={() => handleToggleItem(item)} style={styles.checkbox} />
      <div style={styles.itemContent}>
        <span style={styles.itemName}>{getItemName(item, language)}</span>
      </div>
      <div style={styles.qtyRow}>
        <input
          type="text"
          value={item.quantity || ''}
          onChange={e => handleUpdateQuantity(item.id, e.target.value)}
          placeholder={t('shopping.quantity')}
          style={styles.qtyInput}
        />
        <input
          type="text"
          value={item.unit || ''}
          onChange={e => handleUpdateUnit(item.id, e.target.value)}
          placeholder={t('shopping.unit')}
          style={styles.unitInput}
        />
      </div>
      <button onClick={() => handleDeleteItem(item.id)} style={styles.deleteBtn}>✕</button>
    </div>
  )

  return (
    <div style={styles.container}>

      {/* Unified search + add bar */}
      <div style={styles.addRow}>
        <div style={styles.searchBar}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue.trim() && setShowSuggestions(true)}
            placeholder={t('shopping.unifiedPlaceholder')}
            style={styles.searchInput}
            disabled={adding}
          />
          {inputValue.trim() && (
            <button
              onClick={() => { setInputValue(''); setShowSuggestions(false) }}
              style={styles.clearInputBtn}
            >✕</button>
          )}
          {showSuggestions && (suggestions.length > 0 || showCreateOption) && (
            <div ref={suggestionsRef} style={styles.suggestions}>
              {suggestions.map((sugg, idx) => (
                <button
                  key={sugg.id}
                  onClick={() => handleAddExistingIngredient(sugg)}
                  style={{
                    ...styles.suggestionItem,
                    backgroundColor: highlightedIndex === idx ? colors.background : 'white'
                  }}
                >
                  <span style={styles.suggestionPlus}>+</span>
                  <span style={styles.suggestionText}>
                    {sugg.name}
                    {sugg.categoryLabel && <span style={styles.suggestionCategory}>{sugg.categoryLabel}</span>}
                  </span>
                </button>
              ))}
              {showCreateOption && (
                <div style={styles.createNewSection}>
                  <button
                    onClick={handleAddNewIngredient}
                    style={{
                      ...styles.suggestionItem,
                      ...styles.createNewItem,
                      backgroundColor: highlightedIndex === suggestions.length ? colors.background : 'white'
                    }}
                  >
                    <span style={styles.createNewIcon}>✦</span> {t('shopping.createNew')} « {inputValue.trim()} »
                  </button>
                  {ingredientCategories.length > 0 && (
                    <select
                      value={selectedCategoryId}
                      onChange={e => setSelectedCategoryId(e.target.value)}
                      style={styles.categorySelectorInline}
                      onClick={e => e.stopPropagation()}
                    >
                      <option value="">{t('shopping.selectCategory')}</option>
                      {ingredientCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {getName(cat)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <button onClick={() => setShowGenerator(true)} style={styles.generatorButton}>
        📅 {t('shopping.generateFromMeals')}
      </button>

      {shoppingItems.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>{t('shopping.empty')}</p>
        </div>
      ) : (
        <>
          {/* Unchecked items grouped by category */}
          {groupedItems.map(({ category, items }) => (
            <div key={category?.id || 'uncategorized'} style={styles.section}>
              <div style={styles.categoryHeader}>
                <span style={styles.categoryTitle}>
                  {category
                    ? `${category.icon || ''} ${getName(category)}`.trim()
                    : t('shopping.uncategorized')
                  }
                </span>
                <span style={styles.categoryCount}>{items.length}</span>
              </div>
              <div style={styles.list}>
                {items.map(renderItem)}
              </div>
            </div>
          ))}

          {/* Checked items */}
          {checkedItems.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>{t('shopping.inCart')} ({checkedItems.length})</span>
                <button onClick={handleClearChecked} style={styles.clearBtn}>✕ {t('shopping.clearChecked')}</button>
              </div>
              <div style={styles.list}>
                {checkedItems.map(item => (
                  <div key={item.id} style={styles.itemChecked}>
                    <input type="checkbox" checked={true} onChange={() => handleToggleItem(item)} style={styles.checkbox} />
                    <span style={styles.itemNameChecked}>{getItemName(item, language)}</span>
                    <button onClick={() => handleDeleteItem(item.id)} style={styles.deleteBtn}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleClearAll} style={styles.clearAllBtn}>
            {t('shopping.clearAll')}
          </button>
        </>
      )}

      {showGenerator && (
        <ShoppingListGenerator onClose={() => setShowGenerator(false)} onGenerated={() => {}} />
      )}
    </div>
  )
}

const styles = {
  container: { padding: '16px 16px 100px', fontFamily: FONT },
  addRow: { position: 'relative', marginBottom: '8px' },
  searchBar: {
    display: 'flex', alignItems: 'center', gap: '10px',
    backgroundColor: 'white', borderRadius: '14px', padding: '12px 16px',
    boxShadow: shadows.sm, border: '1px solid rgba(0,0,0,0.04)', position: 'relative'
  },
  searchIcon: { fontSize: '16px', opacity: 0.6 },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: '15px', backgroundColor: 'transparent', fontFamily: FONT, color: colors.textPrimary },
  clearInputBtn: {
    border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px',
    color: colors.textMuted, padding: '4px 6px', borderRadius: '50%'
  },
  suggestions: {
    position: 'absolute', top: '100%', left: 0, right: 0,
    backgroundColor: 'white', borderRadius: '0 0 14px 14px',
    boxShadow: shadows.md, zIndex: 10, maxHeight: '280px', overflowY: 'auto',
    borderTop: '1px solid ' + colors.warmGray
  },
  suggestionItem: {
    width: '100%', padding: '12px 16px', backgroundColor: 'white', border: 'none',
    borderBottom: '1px solid ' + colors.background, textAlign: 'left', cursor: 'pointer',
    fontSize: '14px', fontFamily: FONT, color: colors.textSecondary, transition: 'background-color 0.15s ease',
    display: 'flex', alignItems: 'center', gap: '8px'
  },
  suggestionPlus: { color: colors.forest, fontWeight: 700, fontSize: '16px', flexShrink: 0 },
  suggestionText: { display: 'flex', flexDirection: 'column', gap: '2px' },
  suggestionCategory: { fontSize: '11px', color: colors.textMuted, display: 'block' },
  createNewSection: {
    borderTop: '1px solid ' + colors.warmGray
  },
  createNewItem: {
    color: colors.forest, fontWeight: 600, borderBottom: 'none'
  },
  createNewIcon: { fontSize: '14px' },
  categorySelectorInline: {
    width: '100%', padding: '8px 16px', border: 'none',
    borderTop: '1px solid ' + colors.background, backgroundColor: 'white',
    fontFamily: FONT, fontSize: '13px', color: colors.textSecondary,
    cursor: 'pointer', outline: 'none', borderRadius: '0 0 14px 14px',
    appearance: 'auto'
  },
  generatorButton: {
    width: '100%', padding: '12px 16px', backgroundColor: 'white',
    border: '1px solid rgba(0,0,0,0.04)', borderRadius: '14px', boxShadow: shadows.sm,
    cursor: 'pointer', fontFamily: FONT, fontSize: '14px', color: colors.textSecondary,
    textAlign: 'left', marginBottom: '20px', transition: 'all 0.2s ease', fontWeight: 500
  },
  empty: { backgroundColor: 'white', borderRadius: '16px', padding: '48px 20px', textAlign: 'center', boxShadow: shadows.sm },
  emptyText: { fontSize: '15px', color: colors.textMuted, margin: 0 },
  section: { marginBottom: '16px' },
  categoryHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '8px', padding: '6px 12px',
    backgroundColor: colors.forest + '0C', borderRadius: '10px'
  },
  categoryTitle: { fontSize: '13px', fontWeight: 700, color: colors.forest, letterSpacing: '0.3px' },
  categoryCount: {
    fontSize: '12px', fontWeight: 600, color: colors.forest,
    backgroundColor: colors.forest + '18', borderRadius: '10px',
    padding: '2px 8px', minWidth: '22px', textAlign: 'center'
  },
  sectionHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid ' + colors.warmGray
  },
  sectionTitle: { fontSize: '12px', fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px' },
  clearBtn: { padding: '5px 12px', backgroundColor: 'transparent', border: `1.5px solid ${colors.warmGray}`, borderRadius: '8px', fontSize: '12px', color: colors.textSecondary, cursor: 'pointer', fontFamily: FONT, transition: 'all 0.2s ease' },
  list: { display: 'flex', flexDirection: 'column', gap: '6px' },
  item: {
    display: 'flex', alignItems: 'center', gap: '10px',
    backgroundColor: 'white', borderRadius: '14px', padding: '12px 16px',
    boxShadow: shadows.sm, border: '1px solid rgba(0,0,0,0.04)'
  },
  itemChecked: {
    display: 'flex', alignItems: 'center', gap: '10px',
    backgroundColor: colors.background, borderRadius: '14px', padding: '10px 16px'
  },
  checkbox: { width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0, accentColor: colors.forest, borderRadius: '6px' },
  itemContent: { flex: 1 },
  itemName: { fontSize: '15px', fontWeight: 500, color: colors.textPrimary },
  itemNameChecked: { flex: 1, fontSize: '14px', color: colors.textMuted, textDecoration: 'line-through' },
  qtyRow: { display: 'flex', gap: '6px' },
  qtyInput: { width: '55px', padding: '6px 8px', fontSize: '13px', border: `1.5px solid ${colors.warmGray}`, borderRadius: '8px', fontFamily: FONT, outline: 'none' },
  unitInput: { width: '60px', padding: '6px 8px', fontSize: '13px', border: `1.5px solid ${colors.warmGray}`, borderRadius: '8px', fontFamily: FONT, outline: 'none' },
  deleteBtn: { width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', backgroundColor: colors.background, borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: colors.textMuted, flexShrink: 0, transition: 'all 0.2s ease' },
  clearAllBtn: {
    width: '100%', padding: '12px', backgroundColor: 'transparent',
    border: `1.5px dashed ${colors.warmGrayDark}`, borderRadius: '14px', color: colors.textMuted,
    fontSize: '13px', fontFamily: FONT, cursor: 'pointer', marginTop: '8px',
    transition: 'all 0.2s ease', fontWeight: 500
  }
}
