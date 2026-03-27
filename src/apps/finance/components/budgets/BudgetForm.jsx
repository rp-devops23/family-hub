import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

// ============================================================================
// BUDGET FORM - Modal for add/edit budgets
// ============================================================================

const BUDGET_COLORS = [
  '#00A3E0', '#003D5B', '#E67E22', '#00B894', '#9B59B6', 
  '#E74C3C', '#F39C12', '#1ABC9C', '#3498DB', '#E91E63'
];

const BUDGET_ICONS = [
  '🛒', '🏠', '🚗', '🎮', '👕', '🍔', '✈️', '💊', '🎁', '📱', '💰', '🐷'
];

export default function BudgetForm({ budget, onClose, onSave }) {
  const { 
    t, language, categories, subcategories,
    addBudget, updateBudget 
  } = useApp();

  const isEditing = !!budget;

  // Form state
  const [name, setName] = useState('');
  const [amountLimit, setAmountLimit] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [color, setColor] = useState(BUDGET_COLORS[0]);
  const [icon, setIcon] = useState(BUDGET_ICONS[0]);
  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Initialize form when editing
  useEffect(() => {
    if (budget) {
      setName(budget.name || '');
      setAmountLimit(String(budget.amount_limit || ''));
      setPeriod(budget.period || 'monthly');
      setColor(budget.color || BUDGET_COLORS[0]);
      setIcon(budget.icon || BUDGET_ICONS[0]);
      setDescription(budget.description || '');
      
      // Get linked categories/subcategories
      const catIds = budget.budget_categories?.map(bc => bc.category_id) || [];
      const subIds = budget.budget_subcategories?.map(bs => bs.subcategory_id) || [];
      setSelectedCategories(catIds);
      setSelectedSubcategories(subIds);
    }
  }, [budget]);

  const toggleCategory = (catId) => {
    setSelectedCategories(prev => 
      prev.includes(catId)
        ? prev.filter(id => id !== catId)
        : [...prev, catId]
    );
    // Remove subcategories of this category if category is selected
    if (!selectedCategories.includes(catId)) {
      const subIds = subcategories
        .filter(s => s.category_id === catId)
        .map(s => s.id);
      setSelectedSubcategories(prev => prev.filter(id => !subIds.includes(id)));
    }
  };

  const toggleSubcategory = (subId) => {
    setSelectedSubcategories(prev =>
      prev.includes(subId)
        ? prev.filter(id => id !== subId)
        : [...prev, subId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim()) {
      setError(t('Nom requis', 'Name required'));
      return;
    }
    if (!amountLimit || isNaN(parseFloat(amountLimit)) || parseFloat(amountLimit) <= 0) {
      setError(t('Montant invalide', 'Invalid amount'));
      return;
    }
    if (selectedCategories.length === 0 && selectedSubcategories.length === 0) {
      setError(t('Sélectionnez au moins une catégorie', 'Select at least one category'));
      return;
    }

    setSaving(true);

    const data = {
      name: name.trim(),
      amount_limit: parseFloat(amountLimit),
      period,
      color,
      icon,
      description: description.trim() || null,
      is_active: true,
    };

    let result;
    if (isEditing) {
      result = await updateBudget(budget.id, data, selectedCategories, selectedSubcategories);
    } else {
      result = await addBudget(data, selectedCategories, selectedSubcategories);
    }

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
    } else {
      onSave?.();
      onClose();
    }
  };

  // Group subcategories by category for display
  const getCategorySubcategories = (catId) => {
    return subcategories
      .filter(s => s.category_id === catId)
      .sort((a, b) => a.sort_order - b.sort_order);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            {isEditing 
              ? t('Modifier le budget', 'Edit Budget')
              : t('Nouveau budget', 'New Budget')}
          </h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Name */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Nom', 'Name')} *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('Ex: Courses, Loisirs...', 'Ex: Groceries, Entertainment...')}
              style={styles.input}
            />
          </div>

          {/* Amount & Period */}
          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>{t('Limite', 'Limit')} (€) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amountLimit}
                onChange={e => setAmountLimit(e.target.value)}
                placeholder="500"
                style={styles.input}
              />
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>{t('Période', 'Period')}</label>
              <select
                value={period}
                onChange={e => setPeriod(e.target.value)}
                style={styles.select}
              >
                <option value="monthly">{t('Mensuel', 'Monthly')}</option>
                <option value="yearly">{t('Annuel', 'Yearly')}</option>
              </select>
            </div>
          </div>

          {/* Icon & Color */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Icône', 'Icon')}</label>
            <div style={styles.iconGrid}>
              {BUDGET_ICONS.map(ico => (
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

          <div style={styles.field}>
            <label style={styles.label}>{t('Couleur', 'Color')}</label>
            <div style={styles.colorGrid}>
              {BUDGET_COLORS.map(col => (
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

          {/* Categories */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Catégories à suivre', 'Categories to track')} *</label>
            <p style={styles.hint}>
              {t('Sélectionnez des catégories entières ou des sous-catégories spécifiques', 
                 'Select entire categories or specific subcategories')}
            </p>
            
            <div style={styles.categoryList}>
              {categories.map(cat => {
                const isSelected = selectedCategories.includes(cat.id);
                const subs = getCategorySubcategories(cat.id);
                
                return (
                  <div key={cat.id} style={styles.categoryItem}>
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      style={{
                        ...styles.categoryBtn,
                        backgroundColor: isSelected ? cat.color : '#F5F7FA',
                        color: isSelected ? 'white' : '#2D3436',
                      }}
                    >
                      <span style={{
                        ...styles.categoryDot,
                        backgroundColor: isSelected ? 'white' : cat.color,
                      }} />
                      {language === 'fr' ? cat.name_fr : cat.name_en}
                      {isSelected && ' ✓'}
                    </button>
                    
                    {/* Show subcategories if category not fully selected */}
                    {!isSelected && subs.length > 0 && (
                      <div style={styles.subcategoryList}>
                        {subs.map(sub => {
                          const subSelected = selectedSubcategories.includes(sub.id);
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => toggleSubcategory(sub.id)}
                              style={{
                                ...styles.subcategoryBtn,
                                backgroundColor: subSelected ? cat.color : 'white',
                                color: subSelected ? 'white' : '#636E72',
                                borderColor: subSelected ? cat.color : '#E1E8ED',
                              }}
                            >
                              {language === 'fr' ? sub.name_fr : sub.name_en}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Description', 'Description')}</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('Notes optionnelles...', 'Optional notes...')}
              style={styles.textarea}
              rows={2}
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
  row: {
    display: 'flex',
    gap: '12px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#636E72',
    marginBottom: '6px',
  },
  hint: {
    fontSize: '12px',
    color: '#636E72',
    marginBottom: '10px',
    fontStyle: 'italic',
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
  textarea: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #E1E8ED',
    borderRadius: '10px',
    fontSize: '15px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
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
  categoryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '250px',
    overflowY: 'auto',
  },
  categoryItem: {
    marginBottom: '4px',
  },
  categoryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px 14px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    textAlign: 'left',
  },
  categoryDot: {
    width: '10px',
    height: '10px',
    borderRadius: '3px',
  },
  subcategoryList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '6px',
    marginLeft: '18px',
  },
  subcategoryBtn: {
    padding: '6px 12px',
    border: '1px solid',
    borderRadius: '16px',
    fontSize: '12px',
    cursor: 'pointer',
    backgroundColor: 'white',
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