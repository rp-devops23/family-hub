import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

// ============================================================================
// SUBCATEGORY FORM - Modal for add/edit subcategories
// ============================================================================

export default function SubcategoryForm({ subcategory, categoryId, onClose, onSave }) {
  const { t, language, categories, addSubcategory, updateSubcategory } = useApp();

  const isEditing = !!subcategory;

  // Form state
  const [nameFr, setNameFr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Initialize form when editing
  useEffect(() => {
    if (subcategory) {
      setNameFr(subcategory.name_fr || '');
      setNameEn(subcategory.name_en || '');
      setSelectedCategoryId(subcategory.category_id || '');
    } else if (categoryId) {
      setSelectedCategoryId(categoryId);
    }
  }, [subcategory, categoryId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!nameFr.trim() && !nameEn.trim()) {
      setError(t('Nom requis (FR ou EN)', 'Name required (FR or EN)'));
      return;
    }
    if (!selectedCategoryId) {
      setError(t('Catégorie requise', 'Category required'));
      return;
    }

    setSaving(true);

    const data = {
      name_fr: nameFr.trim() || nameEn.trim(),
      name_en: nameEn.trim() || nameFr.trim(),
      category_id: selectedCategoryId,
      is_default: false,
      sort_order: subcategory?.sort_order || 99,
    };

    let result;
    if (isEditing) {
      result = await updateSubcategory(subcategory.id, data);
    } else {
      result = await addSubcategory(data);
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
              ? t('Modifier la sous-catégorie', 'Edit Subcategory')
              : t('Nouvelle sous-catégorie', 'New Subcategory')}
          </h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Category selector */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Catégorie parente', 'Parent Category')} *</label>
            <select
              value={selectedCategoryId}
              onChange={e => setSelectedCategoryId(e.target.value)}
              style={styles.select}
            >
              <option value="">{t('Choisir...', 'Select...')}</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {language === 'fr' ? cat.name_fr : cat.name_en}
                </option>
              ))}
            </select>
          </div>

          {/* Name FR */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Nom (Français)', 'Name (French)')} *</label>
            <input
              type="text"
              value={nameFr}
              onChange={e => setNameFr(e.target.value)}
              placeholder={t('Ex: Courses', 'Ex: Courses')}
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
              placeholder={t('Ex: Groceries', 'Ex: Groceries')}
              style={styles.input}
            />
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
  select: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #E1E8ED',
    borderRadius: '10px',
    fontSize: '15px',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
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