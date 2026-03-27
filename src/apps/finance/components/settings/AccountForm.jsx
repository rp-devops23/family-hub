import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

// ============================================================================
// ACCOUNT FORM - Modal for add/edit accounts
// ============================================================================

const ACCOUNT_COLORS = [
  '#00A3E0', '#003D5B', '#E67E22', '#00B894', '#9B59B6', 
  '#E74C3C', '#F39C12', '#1ABC9C', '#3498DB', '#E91E63'
];

export default function AccountForm({ account, onClose, onSave }) {
  const { t, addAccount, updateAccount } = useApp();

  const isEditing = !!account;

  // Form state
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [iban, setIban] = useState('');
  const [color, setColor] = useState(ACCOUNT_COLORS[0]);
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Initialize form when editing
  useEffect(() => {
    if (account) {
      setName(account.name || '');
      setBank(account.bank || '');
      setIban(account.iban || '');
      setColor(account.color || ACCOUNT_COLORS[0]);
      setIsDefault(account.is_default || false);
    }
  }, [account]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim()) {
      setError(t('Nom requis', 'Name required'));
      return;
    }

    setSaving(true);

    const data = {
      name: name.trim(),
      bank: bank.trim() || null,
      iban: iban.trim() || null,
      color,
      is_default: isDefault,
      sort_order: account?.sort_order || 99,
    };

    let result;
    if (isEditing) {
      result = await updateAccount(account.id, data);
    } else {
      result = await addAccount(data);
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
              ? t('Modifier le compte', 'Edit Account')
              : t('Nouveau compte', 'New Account')}
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
              placeholder={t('Ex: Compte courant', 'Ex: Checking account')}
              style={styles.input}
            />
          </div>

          {/* Bank */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Banque', 'Bank')}</label>
            <input
              type="text"
              value={bank}
              onChange={e => setBank(e.target.value)}
              placeholder={t('Ex: CBC, BNP, ING...', 'Ex: CBC, BNP, ING...')}
              style={styles.input}
            />
          </div>

          {/* IBAN */}
          <div style={styles.field}>
            <label style={styles.label}>IBAN</label>
            <input
              type="text"
              value={iban}
              onChange={e => setIban(e.target.value)}
              placeholder="BE00 0000 0000 0000"
              style={styles.input}
            />
          </div>

          {/* Color */}
          <div style={styles.field}>
            <label style={styles.label}>{t('Couleur', 'Color')}</label>
            <div style={styles.colorGrid}>
              {ACCOUNT_COLORS.map(col => (
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

          {/* Default */}
          <div style={styles.checkboxField}>
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              style={styles.checkbox}
            />
            <label htmlFor="isDefault" style={styles.checkboxLabel}>
              {t('Compte par défaut', 'Default account')}
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