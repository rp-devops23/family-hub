import { useState } from 'react'
import { useApp } from '../context/RecipeContext'
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, commonStyles } from '../lib/theme'

// Common emoji picker options
const EMOJI_OPTIONS = ['🏷️', '⚡', '👶', '🥬', '🌱', '🍖', '🐟', '🌶️', '❤️', '⭐', '🔥', '🧀', '🥗', '🍝', '🍜', '🥘', '🍰', '🎉']

export default function TagBaseManager({ type, onClose }) {
  const {
    t, getName, language,
    tags, bases, ingredients, recipes,
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
  const [icon, setIcon] = useState('🏷️')

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
    setIcon('🏷️')
    setShowForm(true)
  }

  // Open form for editing
  const handleEdit = (item) => {
    setEditingItem(item)
    setNameFr(item.name_fr)
    setNameEn(item.name_en)
    if (isTag) {
      setIcon(item.icon)
    }
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
        ...(isTag && { icon })
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
                        {isTag && <span style={styles.itemIcon}>{item.icon}</span>}
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
              {/* Icon picker (tags only) */}
              {isTag && (
                <div style={styles.field}>
                  <label style={commonStyles.label}>{t('manage.icon')}</label>
                  <div style={styles.emojiPicker}>
                    {EMOJI_OPTIONS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIcon(emoji)}
                        style={{
                          ...styles.emojiButton,
                          backgroundColor: icon === emoji ? colors.forest + '18' : 'transparent',
                          borderColor: icon === emoji ? colors.forest : 'transparent'
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: spacing.md, zIndex: 1000
  },

  modal: {
    backgroundColor: colors.white, borderRadius: '20px',
    width: '100%', maxWidth: '400px', maxHeight: '80vh',
    display: 'flex', flexDirection: 'column', boxShadow: shadows.lg
  },

  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: `1px solid ${colors.warmGray}`
  },

  title: {
    fontFamily: fonts.heading, fontSize: fontSizes.xl,
    color: colors.forest, margin: 0, fontWeight: 700
  },

  closeButton: {
    width: '34px', height: '34px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', backgroundColor: colors.background, borderRadius: '10px',
    cursor: 'pointer', fontSize: fontSizes.md, color: colors.textSecondary,
    transition: 'all 0.2s ease'
  },

  content: { padding: '16px 20px', overflowY: 'auto', flex: 1 },

  list: {
    display: 'flex', flexDirection: 'column',
    gap: spacing.sm, marginBottom: spacing.md
  },

  item: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 12px', backgroundColor: colors.background,
    borderRadius: '12px'
  },

  itemInfo: { display: 'flex', alignItems: 'center', gap: '10px', flex: 1 },
  itemIcon: { fontSize: fontSizes.lg },
  itemNames: { display: 'flex', flexDirection: 'column' },
  itemName: { fontSize: fontSizes.md, color: colors.textPrimary, fontWeight: 500 },
  itemUsage: { fontSize: fontSizes.xs, color: colors.textMuted },

  itemActions: { display: 'flex', gap: spacing.xs },

  editButton: {
    width: '34px', height: '34px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
    fontSize: fontSizes.sm, borderRadius: '10px', transition: 'all 0.2s ease'
  },

  deleteButton: {
    width: '34px', height: '34px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
    fontSize: fontSizes.sm, borderRadius: '10px', transition: 'all 0.2s ease'
  },

  addButton: { ...commonStyles.buttonBase, ...commonStyles.buttonPrimary, width: '100%' },

  form: { display: 'flex', flexDirection: 'column', gap: spacing.md },
  field: { display: 'flex', flexDirection: 'column' },
  input: { ...commonStyles.input, padding: '10px 14px' },

  emojiPicker: { display: 'flex', flexWrap: 'wrap', gap: spacing.xs },

  emojiButton: {
    width: '42px', height: '42px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '2px solid transparent', borderRadius: '10px',
    cursor: 'pointer', fontSize: fontSizes.lg, backgroundColor: 'transparent',
    transition: 'all 0.2s ease'
  },

  formActions: { display: 'flex', gap: spacing.sm, marginTop: spacing.sm },
  cancelButton: { ...commonStyles.buttonBase, ...commonStyles.buttonSecondary, flex: 1 },
  saveButton: { ...commonStyles.buttonBase, ...commonStyles.buttonPrimary, flex: 1 }
}
