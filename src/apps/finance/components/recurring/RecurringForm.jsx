import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';

// ============================================================================
// RECURRING FORM - Modal for add/edit recurring transaction templates
// ============================================================================

const FREQUENCY_OPTIONS = [
  { value: 'monthly', labelFr: 'Mensuel', labelEn: 'Monthly' },
  { value: 'weekly', labelFr: 'Hebdomadaire', labelEn: 'Weekly' },
  { value: 'biweekly', labelFr: 'Bimensuel', labelEn: 'Bi-weekly' },
  { value: 'trimestrial', labelFr: 'Trimestriel', labelEn: 'Quarterly' },
  { value: 'yearly', labelFr: 'Annuel', labelEn: 'Yearly' },
];

export default function RecurringForm({ template, onClose, onSave }) {
  const { 
    t, language, accounts, categories, subcategories, transactions,
    addRecurringTemplate, updateRecurringTemplate
  } = useApp();

  const isEditing = !!template;

  // Get unique beneficiaries from existing transactions for autocomplete
  const uniqueBeneficiaries = useMemo(() => {
    const beneficiaries = new Set();
    transactions.forEach(tx => {
      if (tx.description && tx.description.trim()) {
        beneficiaries.add(tx.description.trim());
      }
    });
    return Array.from(beneficiaries).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [transactions]);

  // Month names for selectors
  const monthNames = language === 'fr'
    ? ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [dayOfWeek, setDayOfWeek] = useState('1'); // 1 = Monday
  const [selectedMonth, setSelectedMonth] = useState('0'); // 0 = January
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Get subcategories for selected category
  const filteredSubcategories = selectedCategory
    ? subcategories.filter(s => s.category_id === selectedCategory)
    : subcategories;

  // Calculate trimestrial months based on selected starting month
  const trimestrialMonths = useMemo(() => {
    const startMonth = parseInt(selectedMonth);
    return [0, 3, 6, 9].map(offset => monthNames[(startMonth + offset) % 12]);
  }, [selectedMonth, monthNames]);

  // Initialize form when editing
  useEffect(() => {
    if (template) {
      setDescription(template.description || '');
      setAmount(String(template.amount || ''));
      setFrequency(template.frequency || 'monthly');
      setDayOfMonth(String(template.day_of_month || '1'));
      setDayOfWeek(String(template.day_of_week || '1'));
      setSelectedSubcategory(template.subcategory_id || '');
      setSelectedAccount(template.account_id || '');
      setStartDate(template.start_date || '');
      setEndDate(template.end_date || '');
      setNotes(template.notes || '');
      setIsActive(template.is_active !== false);

      // Extract month from start_date for yearly/trimestrial
      if (template.start_date) {
        const month = new Date(template.start_date).getMonth();
        setSelectedMonth(String(month));
      }

      // Set category from subcategory
      if (template.subcategory_id) {
        const sub = subcategories.find(s => s.id === template.subcategory_id);
        if (sub) setSelectedCategory(sub.category_id);
      }
    } else {
      // Defaults for new template
      const today = new Date().toISOString().split('T')[0];
      setSelectedMonth(String(new Date().getMonth()));
      setStartDate(today);
      const defaultAccount = accounts.find(a => a.is_default) || accounts[0];
      if (defaultAccount) setSelectedAccount(defaultAccount.id);
    }
  }, [template, accounts, subcategories]);

  // Handle category change
  const handleCategoryChange = (catId) => {
    setSelectedCategory(catId);
    setSelectedSubcategory('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!description.trim()) {
      setError(t('Bénéficiaire requis', 'Beneficiary required'));
      return;
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError(t('Montant invalide', 'Invalid amount'));
      return;
    }
    if (!selectedSubcategory) {
      setError(t('Sous-catégorie requise', 'Subcategory required'));
      return;
    }

    setSaving(true);

    // Construct start_date for yearly/trimestrial based on selected month
    // Use PREVIOUS year so current year's occurrence will be detected
    let computedStartDate = startDate || null;
    if (frequency === 'yearly' || frequency === 'trimestrial') {
      const year = new Date().getFullYear() - 1; // Previous year
      const month = parseInt(selectedMonth);
      const day = Math.min(parseInt(dayOfMonth) || 1, new Date(year, month + 1, 0).getDate());
      computedStartDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    const data = {
      description: description.trim(),
      amount: parseFloat(amount),
      frequency,
      day_of_month: frequency === 'monthly' || frequency === 'trimestrial' || frequency === 'yearly' ? parseInt(dayOfMonth) : null,
      day_of_week: frequency === 'weekly' || frequency === 'biweekly' ? parseInt(dayOfWeek) : null,
      subcategory_id: selectedSubcategory,
      account_id: selectedAccount || null,
      start_date: computedStartDate,
      end_date: endDate || null,
      notes: notes.trim() || null,
      is_active: isActive,
    };

    let result;
    if (isEditing) {
      result = await updateRecurringTemplate(template.id, data);
    } else {
      result = await addRecurringTemplate(data);
    }

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
    } else {
      onSave?.();
      onClose();
    }
  };

  const weekDays = language === 'fr' 
    ? ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            {isEditing 
              ? t('Modifier récurrence', 'Edit Recurring')
              : t('Nouvelle récurrence', 'New Recurring')}
          </h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Bénéficiaire (was Description) */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Bénéficiaire', 'Beneficiary')} *</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('Ex: Loyer, Netflix, Électricité...', 'Ex: Rent, Netflix, Electricity...')}
              style={styles.input}
              list="recurring-beneficiaries-list"
              autoComplete="off"
            />
            <datalist id="recurring-beneficiaries-list">
              {uniqueBeneficiaries.map((name, idx) => (
                <option key={idx} value={name} />
              ))}
            </datalist>
          </div>

          {/* Amount */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Montant', 'Amount')} (€) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              style={styles.input}
            />
          </div>

          {/* Frequency */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Fréquence', 'Frequency')}</label>
            <select
              value={frequency}
              onChange={e => setFrequency(e.target.value)}
              style={styles.select}
            >
              {FREQUENCY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {language === 'fr' ? opt.labelFr : opt.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* Day of month (for monthly/trimestrial/yearly) */}
          {(frequency === 'monthly' || frequency === 'trimestrial' || frequency === 'yearly') && (
            <div style={styles.field}>
              <label style={styles.label}>{t('Jour du mois', 'Day of month')}</label>
              <select
                value={dayOfMonth}
                onChange={e => setDayOfMonth(e.target.value)}
                style={styles.select}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
                <option value="99">{t('Dernier jour', 'Last day')}</option>
              </select>
            </div>
          )}

          {/* Month selector for yearly */}
          {frequency === 'yearly' && (
            <div style={styles.field}>
              <label style={styles.label}>{t('Mois', 'Month')}</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                style={styles.select}
              >
                {monthNames.map((month, idx) => (
                  <option key={idx} value={idx}>{month}</option>
                ))}
              </select>
            </div>
          )}

          {/* Month selector for trimestrial (starting month) */}
          {frequency === 'trimestrial' && (
            <div style={styles.field}>
              <label style={styles.label}>{t('Mois de départ', 'Starting month')}</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                style={styles.select}
              >
                {monthNames.map((month, idx) => (
                  <option key={idx} value={idx}>{month}</option>
                ))}
              </select>
              <p style={styles.hint}>
                {t('Sera facturé en:', 'Will be billed in:')} {trimestrialMonths.join(', ')}
              </p>
            </div>
          )}

          {/* Day of week (for weekly/biweekly) */}
          {(frequency === 'weekly' || frequency === 'biweekly') && (
            <div style={styles.field}>
              <label style={styles.label}>{t('Jour de la semaine', 'Day of week')}</label>
              <select
                value={dayOfWeek}
                onChange={e => setDayOfWeek(e.target.value)}
                style={styles.select}
              >
                {weekDays.map((day, i) => (
                  <option key={i + 1} value={i + 1}>{day}</option>
                ))}
              </select>
            </div>
          )}

          {/* Category */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Catégorie', 'Category')} *</label>
            <select
              value={selectedCategory}
              onChange={e => handleCategoryChange(e.target.value)}
              style={styles.select}
            >
              <option value="">{t('Choisir...', 'Select...')}</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {language === 'fr' ? cat.name_fr : cat.name_en}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Sous-catégorie', 'Subcategory')} *</label>
            <select
              value={selectedSubcategory}
              onChange={e => setSelectedSubcategory(e.target.value)}
              style={styles.select}
            >
              <option value="">{t('Choisir...', 'Select...')}</option>
              {filteredSubcategories.map(sub => (
                <option key={sub.id} value={sub.id}>
                  {language === 'fr' ? sub.name_fr : sub.name_en}
                </option>
              ))}
            </select>
          </div>

          {/* Account */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Compte', 'Account')}</label>
            <select
              value={selectedAccount}
              onChange={e => setSelectedAccount(e.target.value)}
              style={styles.select}
            >
              <option value="">{t('Aucun', 'None')}</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          {/* Date range - show start date only for monthly/weekly */}
          {(frequency === 'monthly' || frequency === 'weekly' || frequency === 'biweekly') && (
            <div style={styles.row}>
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>{t('Début', 'Start')}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>{t('Fin (optionnel)', 'End (optional)')}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>
          )}

          {/* Only end date for yearly/trimestrial */}
          {(frequency === 'yearly' || frequency === 'trimestrial') && (
            <div style={styles.field}>
              <label style={styles.label}>{t('Date de fin (optionnel)', 'End date (optional)')}</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={styles.input}
              />
            </div>
          )}

          {/* Description (was Notes) */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Description', 'Description')}</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('Description optionnelle...', 'Optional description...')}
              style={styles.input}
            />
          </div>

          {/* Active toggle */}
          <div style={styles.checkboxField}>
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              style={styles.checkbox}
            />
            <label htmlFor="isActive" style={styles.checkboxLabel}>
              {t('Actif', 'Active')}
            </label>
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
  hint: {
    fontSize: '12px',
    color: '#636E72',
    marginTop: '6px',
    fontStyle: 'italic',
  },
  checkboxField: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '14px',
    color: '#2D3436',
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