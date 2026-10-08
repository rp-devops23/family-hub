import { useState } from 'react'
import { useApp } from '../context/RecipeContext'
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, commonStyles } from '../lib/theme'

import EmojiPicker from './EmojiPicker'

// Emoji proposé par défaut à la création (les ingrédients n'en ont pas par défaut)
const DEFAULT_ICONS = { tag: '🏷️', base: '🍚', ingredient: '' }

export default function TagBaseManager({ type, onClose }) {
  const { 
    t, getName, language,
    tags, bases, ingredients, recipes, shoppingCategories,
    createTag, updateTag, deleteTag,
    createBase, updateBase, deleteBase,
    createIngredient, updateIngredient, deleteIngredient
  } = useApp()

  const isTag = type === 'tag'
  const isBase = type === 'base'
  const isIngredient = type === 'ingredient'

  const items = isTag ? tags : isBase ? bases : ingredients
  const title = isTag 
    ? t('manage.tags.title') 
    : isBase 
      ? t('manage.bases.title') 
      : t('manage.ingredients.title')

  const [editingItem, setEditingItem] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [nameFr, setNameFr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [icon, setIcon] = useState(DEFAULT_ICONS[type])
  const [categoryId, setCategoryId] = useState('')

  const categoryById = new Map(shoppingCategories.map(c => [c.id, c]))

  // Count recipes using an item
  const getUsageCount = (itemId) => {
    if (isTag) {
      return recipes.filter(r => 
        r.recipe_tags?.some(rt => rt.tag_id === itemId)
      ).length
    } else if (isBase) {
      return recipes.filter(r => r.base_id === itemId).length
    } else {
      return recipes.filter(r => 
        r.recipe_ingredients?.some(ri => ri.ingredient_id === itemId)
      ).length
    }
  }

  // Open form for new item
  const handleAdd = () => {
    setEditingItem(null)
    setNameFr('')
    setNameEn('')
    setIcon(DEFAULT_ICONS[type])
    setCategoryId('')
    setShowForm(true)
  }

  // Open form for editing
  const handleEdit = (item) => {
    setEditingItem(item)
    setNameFr(item.name_fr)
    setNameEn(item.name_en)
    setIcon(item.icon ?? DEFAULT_ICONS[type])
    setCategoryId(item.category_id || '')
    setShowForm(true)
  }

  // Close form
  const handleCancel = () => {
    setShowForm(false)
    setEditingItem(null)
  }

  // Save item
  const handleSave = async () => {
    if (!nameFr.trim() || !nameEn.trim()) return

    setSaving(true)
    try {
      const data = {
        name_fr: nameFr.trim(),
        name_en: nameEn.trim(),
        // La colonne icon des tags est NOT NULL : on retombe sur l'emoji par défaut
        icon: icon || (isTag ? DEFAULT_ICONS.tag : null),
        ...(isIngredient && { category_id: categoryId || null })
      }

      if (editingItem) {
        if (isTag) {
          await updateTag(editingItem.id, data)
        } else if (isBase) {
          await updateBase(editingItem.id, data)
        } else {
          await updateIngredient(editingItem.id, data)
        }
      } else {
        if (isTag) {
          await createTag(data)
        } else if (isBase) {
          await createBase(data)
        } else {
          await createIngredient(data)
        }
      }
      handleCancel()
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  // Delete item
  const handleDelete = async (item) => {
    const usageCount = getUsageCount(item.id)
    const message = usageCount > 0
      ? `${t('manage.deleteConfirm')} ${t('manage.inUse', { count: usageCount })}`
      : t('manage.deleteConfirm')

    if (!window.confirm(message)) return

    try {
      if (isTag) {
        await deleteTag(item.id)
      } else if (isBase) {
        await deleteBase(item.id)
      } else {
        await deleteIngredient(item.id)
      }
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Item list */}
          {!showForm && (
            <>
              <div style={styles.list}>
                {items.map(item => {
                  const usageCount = getUsageCount(item.id)
                  return (
                    <div key={item.id} style={styles.item}>
                      <div style={styles.itemInfo}>
                        <span style={styles.itemIcon}>{item.icon || (isIngredient ? '🥕' : DEFAULT_ICONS[type])}</span>
                        {isIngredient && categoryById.get(item.category_id) && (
                          <span style={styles.categoryChip} title={getName(categoryById.get(item.category_id))}>
                            {categoryById.get(item.category_id).icon}
                          </span>
                        )}
                        <div style={styles.itemNames}>
                          <span style={styles.itemName}>{getName(item)}</span>
                          {usageCount > 0 && (
                            <span style={styles.itemUsage}>
                              {t('manage.inUse', { count: usageCount })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={styles.itemActions}>
                        <button
                          onClick={() => handleEdit(item)}
                          style={styles.editButton}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          style={styles.deleteButton}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <button onClick={handleAdd} style={styles.addButton}>
                + {t('manage.add')}
              </button>
            </>
          )}

          {/* Form */}
          {showForm && (
            <div style={styles.form}>
              {/* Icon picker */}
              <div style={styles.field}>
                <label style={commonStyles.label}>{t('manage.icon')}</label>
                <EmojiPicker value={icon} onChange={setIcon} placeholder={t('manage.emojiPlaceholder')} />
              </div>

              {/* Name FR */}
              <div style={styles.field}>
                <label style={commonStyles.label}>{t('manage.nameFr')}</label>
                <input
                  type="text"
                  value={nameFr}
                  onChange={(e) => setNameFr(e.target.value)}
                  style={styles.input}
                  placeholder="Ex: Végétarien"
                  autoFocus
                />
              </div>

              {/* Name EN */}
              <div style={styles.field}>
                <label style={commonStyles.label}>{t('manage.nameEn')}</label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  style={styles.input}
                  placeholder="Ex: Vegetarian"
                />
              </div>

              {/* Aisle (ingredients only) */}
              {isIngredient && (
                <div style={styles.field}>
                  <label style={commonStyles.label}>{t('manage.category')}</label>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={styles.input}>
                    <option value="">{t('manage.category.none')}</option>
                    {shoppingCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {getName(c)}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Form actions */}
              <div style={styles.formActions}>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  style={styles.cancelButton}
                >
                  {t('manage.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !nameFr.trim() || !nameEn.trim()}
                  style={{
                    ...styles.saveButton,
                    opacity: (saving || !nameFr.trim() || !nameEn.trim()) ? 0.6 : 1
                  }}
                >
                  {saving ? t('common.loading') : t('manage.save')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// STYLES
// ============================================

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    zIndex: 1000
  },

  modal: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: '440px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: shadows.lg
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottom: `1px solid ${colors.warmGray}`
  },

  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    color: colors.forest,
    margin: 0
  },

  closeButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    backgroundColor: colors.warmGray,
    borderRadius: borderRadius.full,
    cursor: 'pointer',
    fontSize: fontSizes.md,
    color: colors.textSecondary
  },

  content: {
    padding: spacing.md,
    overflowY: 'auto',
    flex: 1
  },

  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    marginBottom: spacing.md
  },

  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.cream,
    borderRadius: borderRadius.md
  },

  itemInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1
  },

  itemIcon: {
    fontSize: '22px'
  },

  categoryChip: {
    fontSize: fontSizes.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    padding: '2px 6px'
  },

  itemNames: {
    display: 'flex',
    flexDirection: 'column'
  },

  itemName: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    fontWeight: 500
  },

  itemUsage: {
    fontSize: fontSizes.xs,
    color: colors.textMuted
  },

  itemActions: {
    display: 'flex',
    gap: spacing.xs
  },

  editButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: fontSizes.sm,
    borderRadius: borderRadius.md
  },

  deleteButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: fontSizes.sm,
    borderRadius: borderRadius.md
  },

  addButton: {
    ...commonStyles.buttonBase,
    ...commonStyles.buttonPrimary,
    width: '100%'
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md
  },

  field: {
    display: 'flex',
    flexDirection: 'column'
  },

  input: {
    ...commonStyles.input,
    padding: spacing.sm
  },

  formActions: {
    display: 'flex',
    gap: spacing.sm,
    marginTop: spacing.sm
  },

  cancelButton: {
    ...commonStyles.buttonBase,
    ...commonStyles.buttonSecondary,
    flex: 1
  },

  saveButton: {
    ...commonStyles.buttonBase,
    ...commonStyles.buttonPrimary,
    flex: 1
  }
}
