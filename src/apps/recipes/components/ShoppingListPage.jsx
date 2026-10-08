import { useState, useMemo } from 'react'
import { useApp } from '../context/RecipeContext'
import { colors, fonts, fontSizes, borderRadius, shadows } from '../lib/theme'
import ShoppingListGenerator from './ShoppingListGenerator'
import CategoryManager from './CategoryManager'

const FONT = fonts.body
const UNCATEGORIZED = '__none__'

function getItemName(item, language) {
  if (item.ingredient) {
    return language === 'fr'
      ? item.ingredient.name_fr || item.ingredient.name_en
      : item.ingredient.name_en || item.ingredient.name_fr
  }
  return item.name || item.custom_name || '?'
}

// Ligne d'article : la quantité et l'unité ne sont enregistrées qu'à la fin de la saisie
function ItemRow({ item, name, emoji, categoryId, categories, getCategoryName, onToggle, onDelete, onUpdate, t }) {
  const [quantity, setQuantity] = useState(item.quantity || '')
  const [unit, setUnit] = useState(item.unit || '')

  // Resynchronise si la valeur change ailleurs (ex. génération depuis le calendrier)
  const [seenQuantity, setSeenQuantity] = useState(item.quantity)
  const [seenUnit, setSeenUnit] = useState(item.unit)
  if (seenQuantity !== item.quantity) { setSeenQuantity(item.quantity); setQuantity(item.quantity || '') }
  if (seenUnit !== item.unit) { setSeenUnit(item.unit); setUnit(item.unit || '') }

  const commit = (field, value) => {
    const next = value.trim() || null
    if (next !== (item[field] || null)) onUpdate(item.id, { [field]: next })
  }
  const onEnter = (e) => { if (e.key === 'Enter') e.currentTarget.blur() }

  return (
    <div style={styles.item}>
      <button
        type="button" onClick={() => onToggle(item)}
        style={styles.checkButton} aria-label={name} aria-pressed={false}
      />
      <span style={styles.itemEmoji}>{emoji}</span>
      <div style={styles.itemMain}>
        <span style={styles.itemName}>{name}</span>
        <div style={styles.qtyRow}>
          <input
            type="text" inputMode="decimal" value={quantity}
            onChange={e => setQuantity(e.target.value)}
            onBlur={() => commit('quantity', quantity)} onKeyDown={onEnter}
            placeholder={t('shopping.quantity')} style={styles.qtyInput}
          />
          <input
            type="text" value={unit}
            onChange={e => setUnit(e.target.value)}
            onBlur={() => commit('unit', unit)} onKeyDown={onEnter}
            placeholder={t('shopping.unit')} style={styles.unitInput}
          />
        </div>
      </div>
      {categories.length > 0 && (
        <label style={styles.categoryPicker} title={t('shopping.categoryOf')}>
          <span aria-hidden="true">{categories.find(c => c.id === categoryId)?.icon || '🏷️'}</span>
          <select
            value={categoryId === UNCATEGORIZED ? '' : categoryId}
            onChange={e => onUpdate(item.id, { category_id: e.target.value || null })}
            style={styles.categorySelect} aria-label={t('shopping.categoryOf')}
          >
            <option value="">{t('shopping.uncategorized')}</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {getCategoryName(c)}</option>)}
          </select>
        </label>
      )}
      <button type="button" onClick={() => onDelete(item.id)} style={styles.deleteBtn} aria-label={t('manage.delete')}>✕</button>
    </div>
  )
}

export default function ShoppingListPage() {
  const {
    t, language, getName, shoppingItems, shoppingCategories, ingredients,
    createShoppingItem, updateShoppingItem, deleteShoppingItem,
    deleteCheckedShoppingItems, deleteAllShoppingItems
  } = useApp()

  const [showGenerator, setShowGenerator] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState(() => new Set())

  const ingredientById = useMemo(() => new Map(ingredients.map(i => [i.id, i])), [ingredients])

  const uncheckedItems = shoppingItems.filter(item => !item.checked)
  const checkedItems = shoppingItems.filter(item => item.checked)
  const total = shoppingItems.length
  const progress = total ? Math.round((checkedItems.length / total) * 100) : 0

  // Rayon effectif : celui de l'article, sinon celui de son ingrédient (toujours lu à jour dans le contexte)
  const categoryOf = (item) => {
    const id = item.category_id || ingredientById.get(item.ingredient_id)?.category_id
    return shoppingCategories.some(c => c.id === id) ? id : UNCATEGORIZED
  }

  const emojiOf = (item) => ingredientById.get(item.ingredient_id)?.icon || '🛒'

  // Groupes dans l'ordre des rayons choisi par l'utilisateur, « Sans rayon » en dernier
  const groups = useMemo(() => {
    const byCategory = new Map()
    for (const item of uncheckedItems) {
      const key = categoryOf(item)
      if (!byCategory.has(key)) byCategory.set(key, [])
      byCategory.get(key).push(item)
    }
    const ordered = shoppingCategories
      .filter(c => byCategory.has(c.id))
      .map(c => ({ id: c.id, icon: c.icon || '🛒', title: getName(c), items: byCategory.get(c.id) }))
    if (byCategory.has(UNCATEGORIZED)) {
      ordered.push({ id: UNCATEGORIZED, icon: '🏷️', title: t('shopping.uncategorized'), items: byCategory.get(UNCATEGORIZED) })
    }
    return ordered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shoppingItems, shoppingCategories, ingredientById, language])

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const used = new Set(uncheckedItems.map(item => item.ingredient_id).filter(Boolean))
    return ingredients
      .filter(i => !used.has(i.id))
      .map(i => ({ id: i.id, name: getName(i), icon: i.icon }))
      .filter(i => i.name.toLowerCase().includes(q))
      .slice(0, 6)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, ingredients, shoppingItems, language])

  const safely = async (action, label) => {
    try { return await action() } catch (error) { console.error(label, error) }
  }

  const addIngredient = (suggestion) => safely(async () => {
    await createShoppingItem({ ingredient_id: suggestion.id, name: suggestion.name, quantity: null, unit: null })
    setQuery('')
  }, 'Add ingredient error:')

  const addCustom = () => {
    const name = query.trim()
    if (!name) return
    return safely(async () => {
      await createShoppingItem({ name, quantity: null, unit: null })
      setQuery('')
    }, 'Add item error:')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const exact = suggestions.find(s => s.name.toLowerCase() === query.trim().toLowerCase())
    if (exact) addIngredient(exact)
    else addCustom()
  }

  const toggleCollapsed = (id) => setCollapsed(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const handleToggle = (item) => safely(() => updateShoppingItem(item.id, { checked: !item.checked }), 'Update error:')
  const handleUpdate = (id, updates) => safely(() => updateShoppingItem(id, updates), 'Update error:')
  const handleDelete = (id) => safely(() => deleteShoppingItem(id), 'Delete error:')

  const handleClearChecked = () => {
    if (window.confirm(t('shopping.clearCheckedConfirm'))) safely(deleteCheckedShoppingItems, 'Clear checked error:')
  }
  const handleClearAll = () => {
    if (window.confirm(t('shopping.clearAllConfirm'))) safely(deleteAllShoppingItems, 'Clear all error:')
  }

  return (
    <div style={styles.container}>
      {/* Titre + progression */}
      <div style={styles.titleRow}>
        <div>
          <h1 style={styles.title}>{t('shopping.title')}</h1>
          <p style={styles.subtitle}>
            {total === 0 ? t('shopping.subtitle') : t('shopping.toBuyCount', { count: uncheckedItems.length })}
          </p>
        </div>
        <button onClick={() => setShowCategories(true)} style={styles.orderButton} title={t('shopping.manageCategories')}>
          <span aria-hidden="true">⇅</span> {t('shopping.manageCategories')}
        </button>
      </div>

      {total > 0 && (
        <div style={styles.progressTrack} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ ...styles.progressBar, width: `${progress}%` }} />
        </div>
      )}

      {/* Ajout unifié */}
      <form onSubmit={handleSubmit} style={styles.addForm}>
        <div style={styles.addBar}>
          <span style={styles.addIcon} aria-hidden="true">＋</span>
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder={t('shopping.searchPlaceholder')} style={styles.addInput}
            aria-label={t('shopping.addTitle')} enterKeyHint="done"
          />
          {query.trim() && <button type="submit" style={styles.addButton}>{t('common.add')}</button>}
        </div>
        {query.trim() && (
          <div style={styles.suggestions}>
            {suggestions.map(s => (
              <button key={s.id} type="button" onClick={() => addIngredient(s)} style={styles.suggestionItem}>
                <span style={styles.suggestionEmoji}>{s.icon || '🥕'}</span> {s.name}
              </button>
            ))}
            <button type="button" onClick={addCustom} style={{ ...styles.suggestionItem, color: colors.forest, fontWeight: 600 }}>
              <span style={styles.suggestionEmoji}>✏️</span> {t('shopping.customItem').replace('...', '')} « {query.trim()} »
            </button>
          </div>
        )}
      </form>

      <button onClick={() => setShowGenerator(true)} style={styles.generatorButton}>
        <span style={styles.generatorEmoji}>📅</span>
        <span>{t('shopping.generateFromMeals')}</span>
        <span style={styles.generatorArrow}>›</span>
      </button>

      {total === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyEmoji}>🛒</div>
          <p style={styles.emptyText}>{t('shopping.empty')}</p>
        </div>
      ) : (
        <>
          {/* À acheter, par rayon */}
          {groups.map(group => {
            const isCollapsed = collapsed.has(group.id)
            return (
              <section key={group.id} style={styles.group}>
                <button
                  type="button" onClick={() => toggleCollapsed(group.id)}
                  style={styles.groupHeader} aria-expanded={!isCollapsed}
                >
                  <span style={styles.groupIcon}>{group.icon}</span>
                  <span style={styles.groupTitle}>{group.title}</span>
                  <span style={styles.groupCount}>{group.items.length}</span>
                  <span style={{ ...styles.chevron, transform: isCollapsed ? 'rotate(-90deg)' : 'none' }}>⌄</span>
                </button>
                {!isCollapsed && (
                  <div style={styles.list}>
                    {group.items.map(item => (
                      <ItemRow
                        key={item.id} item={item} t={t}
                        name={getItemName(item, language)} emoji={emojiOf(item)}
                        categoryId={group.id} categories={shoppingCategories}
                        getCategoryName={getName}
                        onToggle={handleToggle} onDelete={handleDelete} onUpdate={handleUpdate}
                      />
                    ))}
                  </div>
                )}
              </section>
            )
          })}

          {/* Dans le panier */}
          {checkedItems.length > 0 && (
            <section style={styles.group}>
              <div style={styles.cartHeader}>
                <span style={styles.cartTitle}>🧺 {t('shopping.inCart')} ({checkedItems.length})</span>
                <button onClick={handleClearChecked} style={styles.clearBtn}>{t('shopping.clearChecked')}</button>
              </div>
              <div style={styles.list}>
                {checkedItems.map(item => (
                  <div key={item.id} style={styles.itemChecked}>
                    <button
                      type="button" onClick={() => handleToggle(item)}
                      style={{ ...styles.checkButton, ...styles.checkButtonOn }} aria-pressed={true}
                      aria-label={getItemName(item, language)}
                    >✓</button>
                    <span style={styles.itemNameChecked}>{getItemName(item, language)}</span>
                    <button type="button" onClick={() => handleDelete(item.id)} style={styles.deleteBtn} aria-label={t('manage.delete')}>✕</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <button onClick={handleClearAll} style={styles.clearAllBtn}>{t('shopping.clearAll')}</button>
        </>
      )}

      {showGenerator && <ShoppingListGenerator onClose={() => setShowGenerator(false)} onGenerated={() => {}} />}
      {showCategories && <CategoryManager onClose={() => setShowCategories(false)} />}
    </div>
  )
}

const styles = {
  container: { padding: '20px 16px 100px', fontFamily: FONT, maxWidth: '640px', margin: '0 auto' },

  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' },
  title: { margin: 0, fontSize: fontSizes['2xl'], fontWeight: 700, color: colors.textPrimary, fontFamily: fonts.heading },
  subtitle: { margin: '2px 0 0', fontSize: fontSizes.sm, color: colors.textSecondary },
  orderButton: {
    flexShrink: 0, padding: '8px 12px', border: `1px solid ${colors.warmGray}`, borderRadius: borderRadius.lg,
    backgroundColor: colors.white, color: colors.textSecondary, fontSize: fontSizes.sm, fontWeight: 600,
    fontFamily: FONT, cursor: 'pointer'
  },

  progressTrack: { height: '6px', borderRadius: borderRadius.full, backgroundColor: colors.warmGray, overflow: 'hidden', marginBottom: '16px' },
  progressBar: { height: '100%', backgroundColor: colors.forestLight, borderRadius: borderRadius.full, transition: 'width 0.3s ease' },

  addForm: { position: 'relative', marginBottom: '10px' },
  addBar: {
    display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: colors.white,
    borderRadius: borderRadius.xl, padding: '6px 6px 6px 14px', boxShadow: shadows.sm,
    border: `1px solid ${colors.warmGray}`
  },
  addIcon: { fontSize: '18px', color: colors.forest, fontWeight: 700 },
  addInput: { flex: 1, minWidth: 0, border: 'none', outline: 'none', fontSize: fontSizes.md, padding: '8px 0', backgroundColor: 'transparent', fontFamily: FONT, color: colors.textPrimary },
  addButton: {
    padding: '9px 16px', backgroundColor: colors.forest, color: colors.white, border: 'none',
    borderRadius: borderRadius.lg, cursor: 'pointer', fontFamily: FONT, fontWeight: 600, fontSize: fontSizes.sm
  },
  suggestions: {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
    backgroundColor: colors.white, borderRadius: borderRadius.xl, boxShadow: shadows.lg,
    overflow: 'hidden', border: `1px solid ${colors.warmGray}`
  },
  suggestionItem: {
    width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px',
    backgroundColor: colors.white, border: 'none', borderBottom: `1px solid ${colors.cream}`,
    textAlign: 'left', cursor: 'pointer', fontSize: fontSizes.md, fontFamily: FONT, color: colors.textPrimary
  },
  suggestionEmoji: { fontSize: '18px', width: '24px', textAlign: 'center' },

  generatorButton: {
    width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px',
    backgroundColor: colors.accentLight, border: `1px solid ${colors.accent}33`, borderRadius: borderRadius.xl,
    cursor: 'pointer', fontFamily: FONT, fontSize: fontSizes.sm, fontWeight: 600, color: colors.textPrimary,
    textAlign: 'left', marginBottom: '20px'
  },
  generatorEmoji: { fontSize: '18px' },
  generatorArrow: { marginLeft: 'auto', fontSize: '20px', color: colors.textMuted },

  empty: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: '48px 20px', textAlign: 'center', boxShadow: shadows.sm },
  emptyEmoji: { fontSize: '44px', marginBottom: '8px' },
  emptyText: { fontSize: fontSizes.lg, color: colors.textSecondary, margin: 0 },

  group: { marginBottom: '18px' },
  groupHeader: {
    width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 4px',
    marginBottom: '6px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, textAlign: 'left'
  },
  groupIcon: { fontSize: '20px' },
  groupTitle: { fontSize: fontSizes.sm, fontWeight: 700, color: colors.textPrimary, textTransform: 'uppercase', letterSpacing: '0.5px' },
  groupCount: {
    fontSize: fontSizes.xs, fontWeight: 700, color: colors.forest, backgroundColor: colors.forest + '1A',
    borderRadius: borderRadius.full, padding: '1px 8px'
  },
  chevron: { marginLeft: 'auto', fontSize: '18px', color: colors.textMuted, transition: 'transform 0.2s' },

  list: { display: 'flex', flexDirection: 'column', gap: '6px' },
  item: {
    display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: colors.white,
    borderRadius: borderRadius.xl, padding: '10px 10px 10px 12px', boxShadow: shadows.sm
  },
  itemChecked: {
    display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: colors.cream,
    borderRadius: borderRadius.xl, padding: '8px 10px 8px 12px'
  },
  checkButton: {
    width: '28px', height: '28px', flexShrink: 0, borderRadius: borderRadius.full,
    border: `2px solid ${colors.warmGrayDark}`, backgroundColor: colors.white, cursor: 'pointer',
    padding: 0, color: colors.white, fontSize: '15px', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  checkButtonOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  itemEmoji: { fontSize: '22px', flexShrink: 0 },
  itemMain: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' },
  itemName: { fontSize: fontSizes.md, fontWeight: 600, color: colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' },
  itemNameChecked: { flex: 1, fontSize: fontSizes.md, color: colors.textMuted, textDecoration: 'line-through' },
  qtyRow: { display: 'flex', gap: '6px' },
  qtyInput: { width: '56px', padding: '4px 8px', fontSize: fontSizes.sm, border: `1px solid ${colors.warmGray}`, borderRadius: borderRadius.sm, fontFamily: FONT, outline: 'none', backgroundColor: colors.cream },
  unitInput: { width: '64px', padding: '4px 8px', fontSize: fontSizes.sm, border: `1px solid ${colors.warmGray}`, borderRadius: borderRadius.sm, fontFamily: FONT, outline: 'none', backgroundColor: colors.cream },

  categoryPicker: {
    position: 'relative', width: '34px', height: '34px', flexShrink: 0, display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: '17px', backgroundColor: colors.cream,
    borderRadius: borderRadius.full, cursor: 'pointer'
  },
  categorySelect: { position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', fontSize: '16px' },
  deleteBtn: {
    width: '30px', height: '30px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', backgroundColor: 'transparent', borderRadius: borderRadius.full, cursor: 'pointer',
    fontSize: fontSizes.sm, color: colors.textMuted
  },

  cartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  cartTitle: { fontSize: fontSizes.sm, fontWeight: 700, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' },
  clearBtn: { padding: '5px 12px', backgroundColor: 'transparent', border: `1px solid ${colors.warmGray}`, borderRadius: borderRadius.md, fontSize: fontSizes.xs, color: colors.textSecondary, cursor: 'pointer', fontFamily: FONT },
  clearAllBtn: {
    width: '100%', padding: '12px', backgroundColor: 'transparent', border: `1px dashed ${colors.warmGrayDark}`,
    borderRadius: borderRadius.xl, color: colors.textMuted, fontSize: fontSizes.sm, fontFamily: FONT, cursor: 'pointer', marginTop: '8px'
  }
}
