import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';

// ============================================================================
// TRANSACTION FORM - Modal for add/edit
// ============================================================================

export default function TransactionForm({ transaction, onClose, onSave }) {
  const { 
    t, language, accounts, categories, subcategories, transactions,
    addTransaction, updateTransaction 
  } = useApp();

  const isEditing = !!transaction;

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

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Initialize form when editing
  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description || '');
      setAmount(String(transaction.amount || ''));
      setDate(transaction.date || '');
      setAccountId(transaction.account_id || '');
      setSubcategoryId(transaction.subcategory_id || '');
      setNotes(transaction.notes || '');
      
      // Find category from subcategory
      const sub = subcategories.find(s => s.id === transaction.subcategory_id);
      if (sub) {
        setCategoryId(sub.category_id);
      }
    } else {
      // Defaults for new transaction
      setDate(new Date().toISOString().split('T')[0]);
      if (accounts.length > 0) {
        const defaultAcc = accounts.find(a => a.is_default) || accounts[0];
        setAccountId(defaultAcc.id);
      }
    }
  }, [transaction, accounts, subcategories]);

  // Get subcategories for selected category
  const filteredSubcategories = subcategories
    .filter(s => s.category_id === categoryId)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Reset subcategory when category changes
  useEffect(() => {
    if (categoryId && !filteredSubcategories.find(s => s.id === subcategoryId)) {
      setSubcategoryId(filteredSubcategories[0]?.id || '');
    }
  }, [categoryId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!description.trim()) {
      setError(t('Description requise', 'Description required'));
      return;
    }
    if (!amount || isNaN(parseFloat(amount))) {
      setError(t('Montant invalide', 'Invalid amount'));
      return;
    }
    if (!date) {
      setError(t('Date requise', 'Date required'));
      return;
    }
    if (!subcategoryId) {
      setError(t('Catégorie requise', 'Category required'));
      return;
    }

    setSaving(true);

    const data = {
      description: description.trim(),
      amount: Math.abs(parseFloat(amount)),
      date,
      account_id: accountId || null,
      subcategory_id: subcategoryId,
      notes: notes.trim() || null,
    };

    let result;
    if (isEditing) {
      result = await updateTransaction(transaction.id, data);
    } else {
      result = await addTransaction(data);
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
              ? t('Modifier la transaction', 'Edit Transaction')
              : t('Nouvelle transaction', 'New Transaction')}
          </h2>
          <button onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
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
              placeholder={t('Ex: Colruyt, Netflix...', 'Ex: Groceries, Netflix...')}
              style={styles.input}
              list="beneficiaries-list"
              autoComplete="off"
            />
            <datalist id="beneficiaries-list">
              {uniqueBeneficiaries.map((name, idx) => (
                <option key={idx} value={name} />
              ))}
            </datalist>
          </div>

          {/* Amount & Date row */}
          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
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
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Date *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          {/* Account */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Compte', 'Account')}</label>
            <select
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              style={styles.select}
            >
              <option value="">{t('Aucun', 'None')}</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.bank})
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Catégorie', 'Category')} *</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
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
          {categoryId && (
            <div style={styles.field}>
              <label style={styles.label}>{t('Sous-catégorie', 'Subcategory')} *</label>
              <select
                value={subcategoryId}
                onChange={e => setSubcategoryId(e.target.value)}
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
          )}

          {/* Description (was Notes) */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Description', 'Description')}</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('Description optionnelle...', 'Optional description...')}
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
                  : t('Ajouter', 'Add')}
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