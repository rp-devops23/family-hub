import { useState } from 'react'
import { useApp } from '../context/RecipeContext'
import { colors, fonts, fontSizes, spacing, borderRadius, commonStyles } from '../lib/theme'

export default function IngredientSelector({ selectedIngredients, onChange }) {
  const { t, getName, ingredients, createIngredient } = useApp()
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newNameFr, setNewNameFr] = useState('')
  const [newNameEn, setNewNameEn] = useState('')
  const [creating, setCreating] = useState(false)

  const selectedIds = selectedIngredients.map(si => si.ingredient_id)
  const availableIngredients = ingredients
    .filter(ing => !selectedIds.includes(ing.id))
    .filter(ing =>
      ing.name_fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ing.name_en.toLowerCase().includes(searchQuery.toLowerCase())
    )

  const handleAddIngredient = (ingredient) => {
    onChange([...selectedIngredients, { ingredient_id: ingredient.id, ingredient, quantity: '', unit: '' }])
    setSearchQuery(''); setShowDropdown(false)
  }

  const handleRemoveIngredient = (ingredientId) => onChange(selectedIngredients.filter(si => si.ingredient_id !== ingredientId))

  const handleUpdateIngredient = (ingredientId, field, value) =>
    onChange(selectedIngredients.map(si => si.ingredient_id === ingredientId ? { ...si, [field]: value } : si))

  const handleCreateIngredient = async () => {
    if (!newNameFr.trim() || !newNameEn.trim()) return
    setCreating(true)
    try {
      const newIngredient = await createIngredient({ name_fr: newNameFr.trim(), name_en: newNameEn.trim() })
      handleAddIngredient(newIngredient)
      setNewNameFr(''); setNewNameEn(''); setShowNewForm(false)
    } catch (error) { console.error('Failed to create ingredient:', error) }
    finally { setCreating(false) }
  }

  return (
    <div style={styles.container}>
      <label style={commonStyles.label}>{t('recipe.ingredients')}</label>
      {selectedIngredients.length > 0 && (
        <div style={styles.selectedList}>
          {selectedIngredients.map(si => (
            <div key={si.ingredient_id} style={styles.selectedItem}>
              <div style={styles.ingredientRow}>
                <span style={styles.ingredientName}>{getName(si.ingredient)}</span>
                <button type="button" onClick={() => handleRemoveIngredient(si.ingredient_id)} style={styles.removeButton}>✕</button>
              </div>
              <div style={styles.quantityRow}>
                <input type="text" value={si.quantity} onChange={(e) => handleUpdateIngredient(si.ingredient_id, 'quantity', e.target.value)} placeholder={t('recipe.ingredients.quantity')} style={styles.quantityInput} />
                <input type="text" value={si.unit} onChange={(e) => handleUpdateIngredient(si.ingredient_id, 'unit', e.target.value)} placeholder={t('recipe.ingredients.unit')} style={styles.unitInput} />
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={styles.addSection}>
        {!showNewForm ? (
          <>
            <div style={styles.searchContainer}>
              <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true) }} onFocus={() => setShowDropdown(true)} placeholder={t('recipe.ingredients.select')} style={styles.searchInput} />
              {showDropdown && (
                <div style={styles.dropdown}>
                  {availableIngredients.length > 0 ? (
                    availableIngredients.slice(0, 10).map(ing => (
                      <button key={ing.id} type="button" onClick={() => handleAddIngredient(ing)} style={styles.dropdownItem}>{getName(ing)}</button>
                    ))
                  ) : (
                    <div style={styles.noResults}>{searchQuery ? t('recipe.ingredients.empty') : t('recipe.ingredients.select')}</div>
                  )}
                  <button type="button" onClick={() => { setShowNewForm(true); setShowDropdown(false); setNewNameFr(searchQuery); setNewNameEn('') }} style={styles.newIngredientButton}>
                    + {t('recipe.ingredients.new')}
                  </button>
                </div>
              )}
            </div>
            {showDropdown && <div style={styles.overlay} onClick={() => setShowDropdown(false)} />}
          </>
        ) : (
          <div style={styles.newForm}>
            <div style={styles.newFormHeader}>
              <span style={styles.newFormTitle}>{t('recipe.ingredients.new')}</span>
              <button type="button" onClick={() => setShowNewForm(false)} style={styles.cancelNewButton}>✕</button>
            </div>
            <input type="text" value={newNameFr} onChange={(e) => setNewNameFr(e.target.value)} placeholder={t('manage.nameFr')} style={styles.newInput} autoFocus />
            <input type="text" value={newNameEn} onChange={(e) => setNewNameEn(e.target.value)} placeholder={t('manage.nameEn')} style={styles.newInput} />
            <button type="button" onClick={handleCreateIngredient} disabled={creating || !newNameFr.trim() || !newNameEn.trim()} style={{ ...styles.createButton, opacity: (creating || !newNameFr.trim() || !newNameEn.trim()) ? 0.6 : 1 }}>
              {creating ? t('common.loading') : t('manage.add')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { display: 'flex', flexDirection: 'column' },
  selectedList: { display: 'flex', flexDirection: 'column', gap: spacing.sm, marginBottom: spacing.sm },
  selectedItem: { backgroundColor: colors.cream, borderRadius: borderRadius.md, padding: spacing.sm },
  ingredientRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  ingredientName: { fontSize: fontSizes.sm, fontWeight: 600, color: colors.textPrimary },
  removeButton: { width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', backgroundColor: colors.warmGray, color: colors.textMuted, borderRadius: borderRadius.full, cursor: 'pointer', fontSize: fontSizes.xs },
  quantityRow: { display: 'flex', gap: spacing.sm },
  quantityInput: { ...commonStyles.input, flex: 1, padding: spacing.xs, fontSize: fontSizes.sm },
  unitInput: { ...commonStyles.input, width: '100px', padding: spacing.xs, fontSize: fontSizes.sm },
  addSection: { position: 'relative' },
  searchContainer: { position: 'relative' },
  searchInput: { ...commonStyles.input, padding: spacing.sm, fontSize: fontSizes.sm },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: colors.white, border: `1px solid ${colors.warmGray}`, borderRadius: borderRadius.md, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, maxHeight: '250px', overflowY: 'auto' },
  dropdownItem: { width: '100%', padding: spacing.sm, textAlign: 'left', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textPrimary, borderBottom: `1px solid ${colors.warmGray}` },
  noResults: { padding: spacing.sm, textAlign: 'center', color: colors.textMuted, fontSize: fontSizes.sm },
  newIngredientButton: { width: '100%', padding: spacing.sm, textAlign: 'left', border: 'none', backgroundColor: colors.forest + '10', cursor: 'pointer', fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.forest, fontWeight: 600 },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 },
  newForm: { backgroundColor: colors.cream, borderRadius: borderRadius.md, padding: spacing.md },
  newFormHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  newFormTitle: { fontSize: fontSizes.sm, fontWeight: 600, color: colors.textPrimary },
  cancelNewButton: { width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', backgroundColor: colors.warmGray, color: colors.textMuted, borderRadius: borderRadius.full, cursor: 'pointer', fontSize: fontSizes.xs },
  newInput: { ...commonStyles.input, padding: spacing.sm, fontSize: fontSizes.sm, marginBottom: spacing.sm },
  createButton: { ...commonStyles.buttonBase, ...commonStyles.buttonPrimary, width: '100%', padding: spacing.sm }
}
