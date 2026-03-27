import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';

// ============================================================================
// IMPORT PAGE - CSV/Excel import wizard
// ============================================================================

export default function ImportPage({ onClose }) {
  const { 
    t, language, user, accounts, categories, subcategories,
    formatAmount, fetchAllData
  } = useApp();

  // Wizard state
  const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Preview, 4: Importing
  const [file, setFile] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({
    date: '',
    description: '',
    amount: '',
    category: '',
    account: '',
    notes: '',
  });
  const [parsedTransactions, setParsedTransactions] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);

  // ============================================================================
  // FILE PARSING
  // ============================================================================
  
  const handleFileSelect = useCallback(async (selectedFile) => {
    setFile(selectedFile);
    
    const extension = selectedFile.name.split('.').pop().toLowerCase();
    let data = [];

    try {
      if (extension === 'csv') {
        data = await parseCSV(selectedFile);
      } else if (['xlsx', 'xls'].includes(extension)) {
        data = await parseExcel(selectedFile);
      }

      if (data.length > 0) {
        setRawData(data);
        setColumns(Object.keys(data[0]));
        autoDetectMapping(Object.keys(data[0]));
        setStep(2);
      }
    } catch (err) {
      alert(t('Erreur lors de la lecture du fichier', 'Error reading file'));
    }
  }, [t]);

  const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (err) => reject(err),
      });
    });
  };

  const parseExcel = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target.result, { type: 'binary' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(sheet);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  };

  // ============================================================================
  // AUTO-DETECT COLUMN MAPPING
  // ============================================================================
  
  const autoDetectMapping = (cols) => {
    const newMapping = { date: '', description: '', amount: '', category: '', account: '', notes: '' };
    
    const patterns = {
      date: /^(date|datum|jour|day)$/i,
      description: /^(description|desc|libellé|libelle|merchant|commerce|nom)$/i,
      amount: /^(amount|montant|somme|total|prix|price|valeur)$/i,
      category: /^(category|catégorie|categorie|cat)$/i,
      account: /^(account|compte|bank|banque)$/i,
      notes: /^(notes|note|comment|commentaire|memo)$/i,
    };

    cols.forEach(col => {
      Object.entries(patterns).forEach(([field, regex]) => {
        if (regex.test(col) && !newMapping[field]) {
          newMapping[field] = col;
        }
      });
    });

    setMapping(newMapping);
  };

  // ============================================================================
  // PARSE & VALIDATE TRANSACTIONS
  // ============================================================================
  
  const processTransactions = () => {
    const transactions = [];
    const validationErrors = [];

    rawData.forEach((row, index) => {
      const rowNum = index + 2; // +2 for header and 1-based index
      
      // Get mapped values
      const dateRaw = mapping.date ? row[mapping.date] : '';
      const description = mapping.description ? String(row[mapping.description] || '').trim() : '';
      const amountRaw = mapping.amount ? row[mapping.amount] : '';
      const categoryRaw = mapping.category ? String(row[mapping.category] || '').trim() : '';
      const accountRaw = mapping.account ? String(row[mapping.account] || '').trim() : '';
      const notes = mapping.notes ? String(row[mapping.notes] || '').trim() : '';

      // Parse date
      const date = parseDate(dateRaw);
      if (!date) {
        validationErrors.push({ row: rowNum, field: 'date', message: t('Date invalide', 'Invalid date'), value: dateRaw });
      }

      // Validate description
      if (!description) {
        validationErrors.push({ row: rowNum, field: 'description', message: t('Description manquante', 'Missing description'), value: '' });
      }

      // Parse amount
      const amount = parseAmount(amountRaw);
      if (amount === null || amount === 0) {
        validationErrors.push({ row: rowNum, field: 'amount', message: t('Montant invalide', 'Invalid amount'), value: amountRaw });
      }

      // Match category
      const subcategory = matchSubcategory(categoryRaw);
      
      // Match account
      const account = matchAccount(accountRaw);

      // Only add if we have required fields
      if (date && description && amount !== null && amount !== 0) {
        transactions.push({
          date,
          description,
          amount: Math.abs(amount), // Store as positive
          subcategory_id: subcategory?.id || null,
          account_id: account?.id || null,
          notes: notes || null,
          _original: row,
          _categoryName: categoryRaw,
          _accountName: accountRaw,
        });
      }
    });

    setParsedTransactions(transactions);
    setErrors(validationErrors);
    setStep(3);
  };

  const parseDate = (value) => {
    if (!value) return null;
    
    const str = String(value).trim();
    
    // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const euroMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (euroMatch) {
      let [, day, month, year] = euroMatch;
      if (year.length === 2) year = '20' + year;
      if (parseInt(day) <= 31 && parseInt(month) <= 12) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    // Try YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return str;
    }

    // Try Excel serial date number
    if (!isNaN(value) && value > 30000 && value < 60000) {
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }

    // Fallback
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    return null;
  };

  const parseAmount = (value) => {
    if (value === null || value === undefined || value === '') return null;
    
    let str = String(value).trim();
    
    // Handle European format: 1.234,56 or 1 234,56
    if (str.includes(',')) {
      // Remove spaces and dots used as thousands separator
      str = str.replace(/[\s\.]/g, '');
      // Replace comma with dot for decimal
      str = str.replace(',', '.');
    }
    
    // Remove currency symbols and spaces
    str = str.replace(/[€$£\s]/g, '');
    
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  };

  const matchSubcategory = (name) => {
    if (!name) return null;
    const lower = name.toLowerCase();
    
    // Try exact match on subcategory
    let match = subcategories.find(s => 
      s.name_fr.toLowerCase() === lower || 
      s.name_en.toLowerCase() === lower
    );
    if (match) return match;

    // Try partial match
    match = subcategories.find(s => 
      s.name_fr.toLowerCase().includes(lower) || 
      s.name_en.toLowerCase().includes(lower) ||
      lower.includes(s.name_fr.toLowerCase()) ||
      lower.includes(s.name_en.toLowerCase())
    );
    if (match) return match;

    // Try matching category name and use first subcategory
    const category = categories.find(c =>
      c.name_fr.toLowerCase() === lower ||
      c.name_en.toLowerCase() === lower ||
      c.name_fr.toLowerCase().includes(lower) ||
      c.name_en.toLowerCase().includes(lower)
    );
    if (category) {
      return subcategories.find(s => s.category_id === category.id);
    }

    return null;
  };

  const matchAccount = (name) => {
    if (!name) return accounts.find(a => a.is_default) || accounts[0];
    const lower = name.toLowerCase();
    
    return accounts.find(a => 
      a.name.toLowerCase().includes(lower) ||
      lower.includes(a.name.toLowerCase()) ||
      (a.bank && a.bank.toLowerCase().includes(lower))
    ) || accounts.find(a => a.is_default) || accounts[0];
  };

  // ============================================================================
  // IMPORT TRANSACTIONS
  // ============================================================================
  
  const handleImport = async () => {
    setImporting(true);
    setStep(4);
    
    const { supabase } = await import('../../../lib/supabase');
    
    const batchSize = 50;
    let imported = 0;
    const total = parsedTransactions.length;

    for (let i = 0; i < total; i += batchSize) {
      const batch = parsedTransactions.slice(i, i + batchSize).map(tx => ({
        user_id: user.id,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        subcategory_id: tx.subcategory_id,
        account_id: tx.account_id,
        notes: tx.notes,
      }));

      const { error } = await supabase.from('transactions').insert(batch);
      
      if (!error) {
        imported += batch.length;
      }
      
      setImportProgress(Math.round((i + batch.length) / total * 100));
    }

    setImportResult({ imported, total });
    setImporting(false);
    
    // Refresh data
    await fetchAllData();
  };

  // ============================================================================
  // DRAG & DROP
  // ============================================================================
  
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>📥 {t('Importer des transactions', 'Import Transactions')}</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Progress steps */}
        <div style={styles.steps}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{
              ...styles.step,
              backgroundColor: step >= s ? '#00A3E0' : '#E1E8ED',
              color: step >= s ? 'white' : '#636E72',
            }}>
              {s}
            </div>
          ))}
        </div>

        <div style={styles.content}>
          {/* Step 1: Upload */}
          {step === 1 && (
            <div 
              style={styles.dropzone}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById('fileInput').click()}
            >
              <input
                id="fileInput"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                style={{ display: 'none' }}
              />
              <span style={styles.dropzoneIcon}>📂</span>
              <p style={styles.dropzoneText}>
                {t('Glissez un fichier CSV ou Excel ici', 'Drag a CSV or Excel file here')}
              </p>
              <p style={styles.dropzoneSubtext}>
                {t('ou cliquez pour parcourir', 'or click to browse')}
              </p>
              <p style={styles.dropzoneFormats}>.csv, .xlsx, .xls</p>
            </div>
          )}

          {/* Step 2: Map columns */}
          {step === 2 && (
            <div style={styles.mapSection}>
              <p style={styles.mapInfo}>
                📄 {file?.name} • {rawData.length} {t('lignes', 'rows')}
              </p>
              
              <div style={styles.mapGrid}>
                {[
                  { key: 'date', label: t('Date', 'Date'), required: true },
                  { key: 'description', label: t('Description', 'Description'), required: true },
                  { key: 'amount', label: t('Montant', 'Amount'), required: true },
                  { key: 'category', label: t('Catégorie', 'Category'), required: false },
                  { key: 'account', label: t('Compte', 'Account'), required: false },
                  { key: 'notes', label: t('Notes', 'Notes'), required: false },
                ].map(field => (
                  <div key={field.key} style={styles.mapRow}>
                    <label style={styles.mapLabel}>
                      {field.label} {field.required && <span style={styles.required}>*</span>}
                    </label>
                    <select
                      value={mapping[field.key]}
                      onChange={(e) => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                      style={styles.mapSelect}
                    >
                      <option value="">{t('-- Sélectionner --', '-- Select --')}</option>
                      {columns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div style={styles.mapButtons}>
                <button onClick={() => setStep(1)} style={styles.backBtn}>
                  ← {t('Retour', 'Back')}
                </button>
                <button 
                  onClick={processTransactions} 
                  style={styles.nextBtn}
                  disabled={!mapping.date || !mapping.description || !mapping.amount}
                >
                  {t('Continuer', 'Continue')} →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <div style={styles.previewSection}>
              <div style={styles.previewStats}>
                <div style={styles.statBox}>
                  <span style={styles.statValue}>{parsedTransactions.length}</span>
                  <span style={styles.statLabel}>{t('Prêtes', 'Ready')}</span>
                </div>
                <div style={{...styles.statBox, borderColor: errors.length > 0 ? '#E74C3C' : '#E1E8ED'}}>
                  <span style={{...styles.statValue, color: errors.length > 0 ? '#E74C3C' : '#00B894'}}>
                    {errors.length}
                  </span>
                  <span style={styles.statLabel}>{t('Erreurs', 'Errors')}</span>
                </div>
              </div>

              {/* Preview table */}
              <div style={styles.previewTable}>
                <div style={styles.tableHeader}>
                  <span style={styles.tableCol}>{t('Date', 'Date')}</span>
                  <span style={{...styles.tableCol, flex: 2}}>{t('Description', 'Description')}</span>
                  <span style={styles.tableCol}>{t('Montant', 'Amount')}</span>
                  <span style={styles.tableCol}>{t('Catégorie', 'Category')}</span>
                </div>
                <div style={styles.tableBody}>
                  {parsedTransactions.slice(0, 10).map((tx, i) => (
                    <div key={i} style={styles.tableRow}>
                      <span style={styles.tableCol}>{tx.date}</span>
                      <span style={{...styles.tableCol, flex: 2}}>{tx.description}</span>
                      <span style={styles.tableCol}>{formatAmount(tx.amount)}</span>
                      <span style={{
                        ...styles.tableCol,
                        color: tx.subcategory_id ? '#00B894' : '#F39C12'
                      }}>
                        {tx.subcategory_id ? '✓' : '?'} {tx._categoryName || '-'}
                      </span>
                    </div>
                  ))}
                  {parsedTransactions.length > 10 && (
                    <div style={styles.tableMore}>
                      + {parsedTransactions.length - 10} {t('autres...', 'more...')}
                    </div>
                  )}
                </div>
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div style={styles.errorBox}>
                  <p style={styles.errorTitle}>⚠️ {errors.length} {t('erreurs trouvées', 'errors found')}</p>
                  <div style={styles.errorList}>
                    {errors.slice(0, 5).map((err, i) => (
                      <p key={i} style={styles.errorItem}>
                        {t('Ligne', 'Row')} {err.row}: {err.message} ({err.value})
                      </p>
                    ))}
                    {errors.length > 5 && (
                      <p style={styles.errorItem}>+ {errors.length - 5} {t('autres...', 'more...')}</p>
                    )}
                  </div>
                </div>
              )}

              <div style={styles.mapButtons}>
                <button onClick={() => setStep(2)} style={styles.backBtn}>
                  ← {t('Retour', 'Back')}
                </button>
                <button 
                  onClick={handleImport} 
                  style={styles.importBtn}
                  disabled={parsedTransactions.length === 0}
                >
                  {t('Importer', 'Import')} {parsedTransactions.length} transactions
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Importing / Complete */}
          {step === 4 && (
            <div style={styles.importingSection}>
              {importing ? (
                <>
                  <span style={styles.importingIcon}>⏳</span>
                  <p style={styles.importingText}>{t('Importation en cours...', 'Importing...')}</p>
                  <div style={styles.progressBar}>
                    <div style={{...styles.progressFill, width: `${importProgress}%`}} />
                  </div>
                  <p style={styles.progressText}>{importProgress}%</p>
                </>
              ) : importResult ? (
                <>
                  <span style={styles.importingIcon}>✅</span>
                  <p style={styles.importingText}>
                    {t('Importation terminée !', 'Import complete!')}
                  </p>
                  <p style={styles.resultText}>
                    {importResult.imported} / {importResult.total} {t('transactions importées', 'transactions imported')}
                  </p>
                  <button onClick={onClose} style={styles.doneBtn}>
                    {t('Terminer', 'Done')}
                  </button>
                </>
              ) : null}
            </div>
          )}
        </div>
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
    alignItems: 'center',
    zIndex: 300,
    padding: '20px',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #E1E8ED',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#2D3436',
  },
  closeBtn: {
    width: '36px',
    height: '36px',
    border: 'none',
    backgroundColor: '#F5F7FA',
    borderRadius: '18px',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#636E72',
  },
  steps: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    padding: '16px',
    borderBottom: '1px solid #E1E8ED',
  },
  step: {
    width: '28px',
    height: '28px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '600',
  },
  content: {
    padding: '20px',
  },
  dropzone: {
    border: '2px dashed #E1E8ED',
    borderRadius: '12px',
    padding: '40px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  dropzoneIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  dropzoneText: {
    fontSize: '16px',
    color: '#2D3436',
    marginBottom: '8px',
  },
  dropzoneSubtext: {
    fontSize: '14px',
    color: '#636E72',
    marginBottom: '12px',
  },
  dropzoneFormats: {
    fontSize: '12px',
    color: '#BDC3C7',
  },
  mapSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  mapInfo: {
    fontSize: '14px',
    color: '#636E72',
    margin: 0,
  },
  mapGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  mapRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  mapLabel: {
    width: '120px',
    fontSize: '14px',
    color: '#2D3436',
    flexShrink: 0,
  },
  required: {
    color: '#E74C3C',
  },
  mapSelect: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #E1E8ED',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  mapButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  backBtn: {
    padding: '12px 20px',
    border: '1px solid #E1E8ED',
    backgroundColor: 'white',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#636E72',
  },
  nextBtn: {
    flex: 1,
    padding: '12px 20px',
    border: 'none',
    backgroundColor: '#00A3E0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    color: 'white',
  },
  previewSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  previewStats: {
    display: 'flex',
    gap: '12px',
  },
  statBox: {
    flex: 1,
    padding: '16px',
    border: '1px solid #E1E8ED',
    borderRadius: '10px',
    textAlign: 'center',
  },
  statValue: {
    display: 'block',
    fontSize: '28px',
    fontWeight: '700',
    color: '#2D3436',
  },
  statLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#636E72',
    marginTop: '4px',
  },
  previewTable: {
    border: '1px solid #E1E8ED',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    backgroundColor: '#F5F7FA',
    padding: '10px 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#636E72',
  },
  tableBody: {
    maxHeight: '200px',
    overflowY: 'auto',
  },
  tableRow: {
    display: 'flex',
    padding: '10px 12px',
    borderBottom: '1px solid #F0F0F0',
    fontSize: '13px',
  },
  tableCol: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    paddingRight: '8px',
  },
  tableMore: {
    padding: '10px 12px',
    fontSize: '12px',
    color: '#636E72',
    fontStyle: 'italic',
  },
  errorBox: {
    backgroundColor: '#FFF5F5',
    border: '1px solid #E74C3C',
    borderRadius: '10px',
    padding: '12px',
  },
  errorTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#E74C3C',
  },
  errorList: {
    fontSize: '12px',
    color: '#636E72',
  },
  errorItem: {
    margin: '4px 0',
  },
  importBtn: {
    flex: 1,
    padding: '12px 20px',
    border: 'none',
    backgroundColor: '#00B894',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    color: 'white',
  },
  importingSection: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  importingIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  importingText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: '20px',
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#E1E8ED',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00A3E0',
    transition: 'width 0.3s',
  },
  progressText: {
    fontSize: '14px',
    color: '#636E72',
  },
  resultText: {
    fontSize: '14px',
    color: '#636E72',
    marginBottom: '20px',
  },
  doneBtn: {
    padding: '12px 32px',
    border: 'none',
    backgroundColor: '#00A3E0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    color: 'white',
  },
};