import { useState, useEffect } from 'react'
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

export default function ShoppingListPage() {
  const { t, language, shoppingItems, createShoppingItem, updateShoppingItem, deleteShoppingItem, recipes } = useApp()

  const [showGenerator, setShowGenerator] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [customInput, setCustomInput] = useState('')

  const uncheckedItems = shoppingItems.filter(item => !item.checked)
  const checkedItems = shoppingItems.filter(item => item.checked)

  const getAvailableIngredients = () => {
    const used = new Set(uncheckedItems.map(item => item.ingredient_id).filter(Boolean))
    return recipes
      .flatMap(r => r.recipe_ingredients || [])
      .map(ri => ({
        id: ri.ingredient_id,
        name: language === 'fr'
          ? ri.ingredient?.name_fr || ri.ingredient?.name_en
          : ri.ingredient?.name_en || ri.ingredient?.name_fr
      }))
      .filter(ing => ing.id && ing.name && !used.has(ing.id))
      .filter((ing, idx, arr) => arr.findIndex(i => i.id === ing.id) === idx)
  }

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      setSuggestions(
        getAvailableIngredients()
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
      await createShoppingItem({ name: input, quantity: null, unit: null })
      setCustomInput('')
    } catch (error) { console.error('Add item error:', error) }
  }

  const handleAddIngredient = async (suggestion) => {
    try {
      await createShoppingItem({ ingredient_id: suggestion.id, name: suggestion.name, quantity: null, unit: null })
      setSearchQuery('')
      setShowSuggestions(false)
    } catch (error) { console.error('Add ingredient error:', error) }
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

  return (
    <div style={styles.container}>

      {/* Add item row */}
      <div style={styles.addRow}>
        <div style={styles.searchBar}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('shopping.searchPlaceholder')}
            style={styles.searchInput}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={styles.suggestions}>
              {suggestions.map(sugg => (
                <button key={sugg.id} onClick={() => handleAddIngredient(sugg)} style={styles.suggestionItem}>
                  + {sugg.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={styles.customRow}>
        <input
          type="text"
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleAddCustomItem()}
          placeholder={t('shopping.customItemPlaceholder')}
          style={styles.customInput}
        />
        <button onClick={handleAddCustomItem} style={styles.addButton}>
          {t('common.add')}
        </button>
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
          {/* Unchecked items */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionTitle}>{t('shopping.items')} ({uncheckedItems.length})</span>
            </div>
            <div style={styles.list}>
              {uncheckedItems.map(item => (
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
              ))}
            </div>
          </div>

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
    boxShadow: shadows.sm, border: '1px solid rgba(0,0,0,0.04)'
  },
  searchIcon: { fontSize: '16px', opacity: 0.6 },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: '15px', backgroundColor: 'transparent', fontFamily: FONT, color: colors.textPrimary },
  suggestions: {
    position: 'absolute', top: '100%', left: 0, right: 0,
    backgroundColor: 'white', borderRadius: '0 0 14px 14px',
    boxShadow: shadows.md, zIndex: 10, maxHeight: '150px', overflowY: 'auto'
  },
  suggestionItem: {
    width: '100%', padding: '12px 16px', backgroundColor: 'white', border: 'none',
    borderBottom: '1px solid ' + colors.background, textAlign: 'left', cursor: 'pointer',
    fontSize: '14px', fontFamily: FONT, color: colors.textSecondary, transition: 'background-color 0.15s ease'
  },
  customRow: { display: 'flex', gap: '8px', marginBottom: '8px' },
  customInput: {
    flex: 1, padding: '12px 16px', fontSize: '15px', fontFamily: FONT,
    border: '1px solid rgba(0,0,0,0.04)', borderRadius: '14px', backgroundColor: 'white',
    boxShadow: shadows.sm, outline: 'none', color: colors.textPrimary
  },
  addButton: {
    padding: '12px 20px', backgroundColor: colors.forest, color: 'white',
    border: 'none', borderRadius: '14px', cursor: 'pointer', fontFamily: FONT,
    fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', transition: 'all 0.2s ease'
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
