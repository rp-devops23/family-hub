import { useState } from 'react'
import { useApp } from '../context/RecipeContext'
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, commonStyles } from '../lib/theme'
import { DEFAULT_SHOPPING_CATEGORIES } from '../lib/emojis'
import EmojiPicker from './EmojiPicker'

// Gestion des rayons de la liste de courses : ajout, édition, suppression et ordre d'affichage
export default function CategoryManager({ onClose }) {
  const {
    t, getName, ingredients, shoppingCategories,
    createShoppingCategory, updateShoppingCategory, deleteShoppingCategory,
    reorderShoppingCategories, seedDefaultShoppingCategories
  } = useApp()

  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [nameFr, setNameFr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [icon, setIcon] = useState('🛒')

  const usageCount = (categoryId) => ingredients.filter(i => i.category_id === categoryId).length

  const run = async (action) => {
    setError('')
    try { await action() }
    catch (e) {
      console.error('Category error:', e)
      setError(t('categories.error'))
    }
  }

  const openForm = (category) => {
    setEditing(category)
    setNameFr(category?.name_fr || '')
    setNameEn(category?.name_en || '')
    setIcon(category?.icon || '🛒')
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setEditing(null) }

  const handleSave = async () => {
    if (!nameFr.trim()) return
    setSaving(true)
    await run(async () => {
      const data = { name_fr: nameFr.trim(), name_en: (nameEn || nameFr).trim(), icon: icon || '🛒' }
      if (editing) await updateShoppingCategory(editing.id, data)
      else await createShoppingCategory(data)
      closeForm()
    })
    setSaving(false)
  }

  const handleDelete = (category) => {
    const count = usageCount(category.id)
    const message = count > 0
      ? `${t('categories.deleteConfirm')} ${t('categories.inUse', { count })}`
      : t('categories.deleteConfirm')
    if (!window.confirm(message)) return
    run(() => deleteShoppingCategory(category.id))
  }

  const move = (index, delta) => {
    const ids = shoppingCategories.map(c => c.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    run(() => reorderShoppingCategories(ids))
  }

  const handleSeed = () => run(() => seedDefaultShoppingCategories(DEFAULT_SHOPPING_CATEGORIES))

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>{t('categories.title')}</h2>
          <button onClick={onClose} style={styles.closeButton} aria-label={t('manage.cancel')}>✕</button>
        </div>

        <div style={styles.content}>
          {error && <div style={styles.error}>{error}</div>}

          {!showForm && (
            <>
              <p style={styles.hint}>{t('categories.hint')}</p>

              {shoppingCategories.length === 0 ? (
                <div style={styles.empty}>
                  <div style={styles.emptyEmoji}>🛒</div>
                  <p style={styles.emptyText}>{t('categories.empty')}</p>
                  <button onClick={handleSeed} style={styles.primaryButton}>{t('categories.seed')}</button>
                </div>
              ) : (
                <div style={styles.list}>
                  {shoppingCategories.map((category, index) => (
                    <div key={category.id} style={styles.item}>
                      <span style={styles.rank}>{index + 1}</span>
                      <span style={styles.itemIcon}>{category.icon || '🛒'}</span>
                      <div style={styles.itemNames}>
                        <span style={styles.itemName}>{getName(category)}</span>
                        <span style={styles.itemUsage}>{t('categories.ingredientCount', { count: usageCount(category.id) })}</span>
                      </div>
                      <div style={styles.itemActions}>
                        <button
                          onClick={() => move(index, -1)} disabled={index === 0}
                          style={{ ...styles.iconBtn, opacity: index === 0 ? 0.25 : 1 }}
                          aria-label={t('categories.moveUp')} title={t('categories.moveUp')}
                        >▲</button>
                        <button
                          onClick={() => move(index, 1)} disabled={index === shoppingCategories.length - 1}
                          style={{ ...styles.iconBtn, opacity: index === shoppingCategories.length - 1 ? 0.25 : 1 }}
                          aria-label={t('categories.moveDown')} title={t('categories.moveDown')}
                        >▼</button>
                        <button onClick={() => openForm(category)} style={styles.iconBtn} aria-label={t('manage.edit')}>✏️</button>
                        <button onClick={() => handleDelete(category)} style={styles.iconBtn} aria-label={t('manage.delete')}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {shoppingCategories.length > 0 && (
                <button onClick={() => openForm(null)} style={styles.primaryButton}>+ {t('categories.add')}</button>
              )}
            </>
          )}

          {showForm && (
            <div style={styles.form}>
              <div style={styles.field}>
                <label style={commonStyles.label}>{t('manage.icon')}</label>
                <EmojiPicker value={icon} onChange={setIcon} placeholder={t('categories.emojiPlaceholder')} />
              </div>
              <div style={styles.field}>
                <label style={commonStyles.label}>{t('manage.nameFr')}</label>
                <input
                  type="text" value={nameFr} onChange={e => setNameFr(e.target.value)}
                  style={styles.input} placeholder="Ex: Fruits & légumes" autoFocus
                />
              </div>
              <div style={styles.field}>
                <label style={commonStyles.label}>{t('manage.nameEn')}</label>
                <input
                  type="text" value={nameEn} onChange={e => setNameEn(e.target.value)}
                  style={styles.input} placeholder="Ex: Produce"
                />
              </div>
              <div style={styles.formActions}>
                <button onClick={closeForm} disabled={saving} style={styles.secondaryButton}>{t('manage.cancel')}</button>
                <button
                  onClick={handleSave} disabled={saving || !nameFr.trim()}
                  style={{ ...styles.primaryButton, flex: 1, opacity: (saving || !nameFr.trim()) ? 0.6 : 1 }}
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
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: spacing.md, zIndex: 1000
  },
  modal: {
    backgroundColor: colors.white, borderRadius: borderRadius.xl, width: '100%',
    maxWidth: '440px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: shadows.lg
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md, borderBottom: `1px solid ${colors.warmGray}`
  },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.forest, margin: 0 },
  closeButton: {
    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', backgroundColor: colors.warmGray, borderRadius: borderRadius.full,
    cursor: 'pointer', fontSize: fontSizes.md, color: colors.textSecondary
  },
  content: { padding: spacing.md, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: spacing.md },
  hint: { margin: 0, fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 1.4 },
  error: {
    padding: '8px 12px', backgroundColor: colors.errorLight, color: colors.error,
    borderRadius: borderRadius.md, fontSize: fontSizes.sm
  },
  empty: { textAlign: 'center', padding: `${spacing.lg} ${spacing.md}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.sm },
  emptyEmoji: { fontSize: '40px' },
  emptyText: { margin: 0, color: colors.textSecondary, fontSize: fontSizes.md },
  list: { display: 'flex', flexDirection: 'column', gap: '6px' },
  item: {
    display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 8px 8px 12px',
    backgroundColor: colors.cream, borderRadius: borderRadius.lg
  },
  rank: {
    width: '22px', height: '22px', flexShrink: 0, borderRadius: borderRadius.full,
    backgroundColor: colors.forest + '1F', color: colors.forest, fontSize: fontSizes.xs,
    fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  itemIcon: { fontSize: '22px', flexShrink: 0 },
  itemNames: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 },
  itemName: { fontSize: fontSizes.md, color: colors.textPrimary, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  itemUsage: { fontSize: fontSizes.xs, color: colors.textMuted },
  itemActions: { display: 'flex', gap: '2px', flexShrink: 0 },
  iconBtn: {
    width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
    fontSize: fontSizes.sm, color: colors.textSecondary, borderRadius: borderRadius.md
  },
  form: { display: 'flex', flexDirection: 'column', gap: spacing.md },
  field: { display: 'flex', flexDirection: 'column' },
  input: { ...commonStyles.input, padding: spacing.sm },
  formActions: { display: 'flex', gap: spacing.sm },
  primaryButton: { ...commonStyles.buttonBase, ...commonStyles.buttonPrimary, width: '100%' },
  secondaryButton: { ...commonStyles.buttonBase, ...commonStyles.buttonSecondary, flex: 1 }
}
