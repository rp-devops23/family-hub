import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

// ============================================================================
// CATEGORY FORM - Modal for add/edit categories
// ============================================================================

const CATEGORY_COLORS = [
  '#003D5B', '#00A3E0', '#E67E22', '#00B894', '#9B59B6', 
  '#E74C3C', '#F39C12', '#1ABC9C', '#3498DB', '#E91E63',
  '#8E44AD', '#27AE60', '#34495E', '#95A5A6', '#BDC3C7'
];

const CATEGORY_ICONS = [
  '🏠', '🛒', '🚗', '📺', '🛍️', '👨‍👩‍👧', '💰', '🎁', 
  '❤️', '⚽', '🎮', '👕', '✈️', '🌱', '📬', '📄', '❓'
];

export default function CategoryForm({ category, onClose, onSave }) {
  const { t, addCategory, updateCategory } = useApp();

  const isEditing = !!category;

  // Form state
  const [nameFr, setNameFr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [icon, setIcon] = useState(CATEGORY_ICONS[0]);
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Initialize form when editing
  useEffect(() => {
    if (category) {
      setNameFr(category.name_fr || '');
      setNameEn(category.name_en || '');
      setIcon(category.icon || CATEGORY_ICONS[0]);
      setColor(category.color || CATEGORY_COLORS[0]);
    }
  }, [category]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!nameFr.trim() && !nameEn.trim()) {
      setError(t('Nom requis (FR ou EN)', 'Name required (FR or EN)'));
      return;
    }

    setSaving(true);

    const data = {
      name_fr: nameFr.trim() || nameEn.trim(),
      name_en: nameEn.trim() || nameFr.trim(),
      icon,
      color,
      is_default: false,
      sort_order: category?.sort_order || 99,
    };

    let result;
    if (isEditing) {
      result = await updateCategory(category.id, data);
    } else {
      result = await addCategory(data);
    }

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
    } else {
      onSave?.();
      onClose();
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            {isEditing 
              ? t('Modifier la catégorie', 'Edit Category')
              : t('Nouvelle catégorie', 'New Category')}
          </h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Name FR */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Nom (Français)', 'Name (French)')} *</label>
            <input
              type="text"
              value={nameFr}
              onChange={e => setNameFr(e.target.value)}
              placeholder={t('Ex: Alimentation', 'Ex: Alimentation')}
              style={styles.input}
            />
          </div>

          {/* Name EN */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Nom (Anglais)', 'Name (English)')} *</label>
            <input
              type="text"
              value={nameEn}
              onChange={e => setNameEn(e.target.value)}
              placeholder={t('Ex: Food', 'Ex: Food')}
              style={styles.input}
            />
          </div>

          {/* Icon */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Icône', 'Icon')}</label>
            <div style={styles.iconGrid}>
              {CATEGORY_ICONS.map(ico => (
                <button
                  key={ico}
                  type="button"
                  onClick={() => setIcon(ico)}
                  style={{
                    ...styles.iconBtn,
                    backgroundColor: icon === ico ? '#E8F7FC' : '#F5F7FA',
                    border: icon === ico ? '2px solid #00A3E0' : '2px solid transparent',
                  }}
                >
                  {ico}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Couleur', 'Color')}</label>
            <div style={styles.colorGrid}>
              {CATEGORY_COLORS.map(col => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setColor(col)}
                  style={{
                    ...styles.colorBtn,
                    backgroundColor: col,
                    border: color === col ? '3px solid #2D3436' : '3px solid transparent',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div style={styles.preview}>
            <span style={styles.previewLabel}>{t('Aperçu:', 'Preview:')}</span>
            <div style={{...styles.previewChip, backgroundColor: color}}>
              <span>{icon}</span>
              <span>{nameFr || nameEn || '...'}</span>
            </div>
          </div>

          {/* Error */}
          {error && <p style={styles.error}>{error}</p>}

          {/* Buttons */}
          <div style={styles.buttons}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              {t('Annuler', 'Cancel')}
            </button>
            <button type="submit" style={styles.saveBtn} disabled={saving}>
              {saving 
                ? '...' 
                : isEditing 
                  ? t('Enregistrer', 'Save')
                  : t('Créer', 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 200,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '20px 20px 0 0',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 20px 0',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#2D3436',
  },
  closeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    border: 'none',
    backgroundColor: '#F5F7FA',
    borderRadius: '18px',
    cursor: 'pointer',
    color: '#636E72',
    fontSize: '16px',
  },
  form: {
    padding: '20px',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#636E72',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #E1E8ED',
    borderRadius: '10px',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  iconGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  iconBtn: {
    width: '40px',
    height: '40px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  colorBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  preview: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#F5F7FA',
    borderRadius: '10px',
    marginBottom: '16px',
  },
  previewLabel: {
    fontSize: '13px',
    color: '#636E72',
  },
  previewChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
  },
  error: {
    color: '#E74C3C',
    fontSize: '13px',
    marginBottom: '16px',
    padding: '10px',
    backgroundColor: '#FFF5F5',
    borderRadius: '8px',
  },
  buttons: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  cancelBtn: {
    flex: 1,
    padding: '14px',
    border: '1px solid #E1E8ED',
    backgroundColor: 'white',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    color: '#636E72',
  },
  saveBtn: {
    flex: 1,
    padding: '14px',
    border: 'none',
    backgroundColor: '#00A3E0',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    color: 'white',
  },
};