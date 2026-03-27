import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import MonthPicker from '../components/common/MonthPicker';
import TransactionForm from '../components/transactions/TransactionForm';

// ============================================================================
// TRANSACTIONS PAGE - Full transaction management
// ============================================================================

export default function TransactionsPage() {
  const { 
    t, language, transactions, categories, subcategories, accounts,
    formatAmount, formatDate, deleteTransaction,
    getSubcategory, getCategoryForSubcategory, getAccount 
  } = useApp();
  
  // State
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  // Filters
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterAccounts, setFilterAccounts] = useState([]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Date filter
      const txDate = new Date(tx.date);
      if (txDate.getMonth() !== selectedMonth || txDate.getFullYear() !== selectedYear) {
        return false;
      }

      // Search filter
      if (searchQuery && !tx.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Category filter
      if (filterCategories.length > 0) {
        const sub = getSubcategory(tx.subcategory_id);
        if (!sub || !filterCategories.includes(sub.category_id)) {
          return false;
        }
      }

      // Account filter
      if (filterAccounts.length > 0 && !filterAccounts.includes(tx.account_id)) {
        return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, selectedMonth, selectedYear, searchQuery, filterCategories, filterAccounts]);

  // Calculate total
  const totalAmount = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Active filter count
  const activeFilterCount = filterCategories.length + filterAccounts.length;

  const handleMonthChange = (month, year) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const handleEdit = (tx) => {
    setEditingTransaction(tx);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    await deleteTransaction(id);
    setConfirmDelete(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTransaction(null);
  };

  const toggleCategoryFilter = (catId) => {
    setFilterCategories(prev => 
      prev.includes(catId) 
        ? prev.filter(id => id !== catId)
        : [...prev, catId]
    );
  };

  const toggleAccountFilter = (accId) => {
    setFilterAccounts(prev => 
      prev.includes(accId) 
        ? prev.filter(id => id !== accId)
        : [...prev, accId]
    );
  };

  const clearFilters = () => {
    setFilterCategories([]);
    setFilterAccounts([]);
  };

  return (
    <div style={styles.container}>
      {/* Month Picker */}
      <MonthPicker 
        month={selectedMonth} 
        year={selectedYear} 
        onChange={handleMonthChange}
      />

      {/* Search & Filter Bar */}
      <div style={styles.searchRow}>
        <div style={styles.searchBar}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder={t('Rechercher...', 'Search...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={styles.clearBtn}>
              ✕
            </button>
          )}
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)} 
          style={{
            ...styles.filterBtn,
            backgroundColor: activeFilterCount > 0 ? '#E8F7FC' : 'white',
            borderColor: activeFilterCount > 0 ? '#00A3E0' : '#E1E8ED',
          }}
        >
          <span style={{ fontSize: '16px' }}>⚙️</span>
          {activeFilterCount > 0 && (
            <span style={styles.filterBadge}>{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div style={styles.filterPanel}>
          <div style={styles.filterHeader}>
            <span style={styles.filterTitle}>{t('Filtres', 'Filters')}</span>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} style={styles.clearFiltersBtn}>
                {t('Effacer', 'Clear')}
              </button>
            )}
          </div>

          {/* Category filters */}
          <div style={styles.filterSection}>
            <span style={styles.filterLabel}>{t('Catégories', 'Categories')}</span>
            <div style={styles.filterChips}>
              {categories.slice(0, 8).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategoryFilter(cat.id)}
                  style={{
                    ...styles.chip,
                    backgroundColor: filterCategories.includes(cat.id) ? cat.color : '#F5F7FA',
                    color: filterCategories.includes(cat.id) ? 'white' : '#2D3436',
                  }}
                >
                  {language === 'fr' ? cat.name_fr : cat.name_en}
                </button>
              ))}
            </div>
          </div>

          {/* Account filters */}
          <div style={styles.filterSection}>
            <span style={styles.filterLabel}>{t('Comptes', 'Accounts')}</span>
            <div style={styles.filterChips}>
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => toggleAccountFilter(acc.id)}
                  style={{
                    ...styles.chip,
                    backgroundColor: filterAccounts.includes(acc.id) ? acc.color : '#F5F7FA',
                    color: filterAccounts.includes(acc.id) ? 'white' : '#2D3436',
                  }}
                >
                  {acc.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div style={styles.summary}>
        <span style={styles.summaryCount}>
          {filteredTransactions.length} {t('transactions', 'transactions')}
        </span>
        <span style={styles.summaryTotal}>{formatAmount(totalAmount)}</span>
      </div>

      {/* Transaction list */}
      <div style={styles.list}>
        {filteredTransactions.length === 0 ? (
          <div style={styles.empty}>
            <p>{t('Aucune transaction', 'No transactions')}</p>
          </div>
        ) : (
          filteredTransactions.map(tx => {
            const subcategory = getSubcategory(tx.subcategory_id);
            const category = getCategoryForSubcategory(tx.subcategory_id);
            const account = getAccount(tx.account_id);
            
            return (
              <div key={tx.id} style={styles.row}>
                <div 
                  style={{
                    ...styles.colorBar,
                    backgroundColor: category?.color || '#BDC3C7'
                  }}
                />
                <div style={styles.rowContent}>
                  <div style={styles.rowMain}>
                    <div style={styles.rowLeft}>
                      <div style={styles.description}>{tx.description}</div>
                      <div style={styles.meta}>
                        {language === 'fr' ? subcategory?.name_fr : subcategory?.name_en}
                        {account && ` • ${account.name}`}
                      </div>
                    </div>
                    <div style={styles.rowRight}>
                      <div style={styles.amount}>{formatAmount(tx.amount)}</div>
                      <div style={styles.date}>{formatDate(tx.date)}</div>
                    </div>
                  </div>
                  <div style={styles.rowActions}>
                    <button 
                      onClick={() => handleEdit(tx)} 
                      style={styles.actionBtn}
                      title={t('Modifier', 'Edit')}
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => setConfirmDelete(tx.id)} 
                      style={styles.actionBtn}
                      title={t('Supprimer', 'Delete')}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add button */}
      <button 
        onClick={() => setShowForm(true)} 
        style={styles.addBtn}
      >
        <span style={{ fontSize: '24px', lineHeight: 1 }}>+</span>
      </button>

      {/* Transaction Form Modal */}
      {showForm && (
        <TransactionForm
          transaction={editingTransaction}
          onClose={handleCloseForm}
          onSave={() => {}}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div style={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div style={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <p style={styles.confirmText}>
              {t('Supprimer cette transaction ?', 'Delete this transaction?')}
            </p>
            <div style={styles.confirmButtons}>
              <button 
                onClick={() => setConfirmDelete(null)} 
                style={styles.confirmCancel}
              >
                {t('Annuler', 'Cancel')}
              </button>
              <button 
                onClick={() => handleDelete(confirmDelete)} 
                style={styles.confirmDelete}
              >
                {t('Supprimer', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px 16px 100px',
  },
  searchRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '12px',
  },
  searchBar: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '10px 14px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  searchIcon: {
    fontSize: '16px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '15px',
    backgroundColor: 'transparent',
  },
  clearBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    backgroundColor: '#F5F7FA',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    cursor: 'pointer',
    color: '#636E72',
    fontSize: '12px',
  },
  filterBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px',
    border: '1px solid #E1E8ED',
    borderRadius: '10px',
    backgroundColor: 'white',
    cursor: 'pointer',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    backgroundColor: '#00A3E0',
    color: 'white',
    fontSize: '10px',
    fontWeight: '600',
    width: '18px',
    height: '18px',
    borderRadius: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPanel: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  filterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  filterTitle: {
    fontWeight: '600',
    color: '#2D3436',
  },
  clearFiltersBtn: {
    border: 'none',
    backgroundColor: 'transparent',
    color: '#00A3E0',
    fontSize: '13px',
    cursor: 'pointer',
  },
  filterSection: {
    marginBottom: '12px',
  },
  filterLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#636E72',
    marginBottom: '8px',
  },
  filterChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  chip: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '16px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  summary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: 'white',
    borderRadius: '10px',
    marginBottom: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  summaryCount: {
    fontSize: '14px',
    color: '#636E72',
  },
  summaryTotal: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#2D3436',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  row: {
    display: 'flex',
    backgroundColor: 'white',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  colorBar: {
    width: '4px',
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
    padding: '12px 14px',
  },
  rowMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rowLeft: {
    flex: 1,
    minWidth: 0,
  },
  description: {
    fontWeight: '500',
    color: '#2D3436',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  meta: {
    fontSize: '12px',
    color: '#636E72',
    marginTop: '2px',
  },
  rowRight: {
    textAlign: 'right',
    flexShrink: 0,
    marginLeft: '12px',
  },
  amount: {
    fontWeight: '600',
    color: '#2D3436',
  },
  date: {
    fontSize: '12px',
    color: '#636E72',
    marginTop: '2px',
  },
  rowActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: '1px solid #F0F0F0',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    border: '1px solid #E1E8ED',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
  },
  empty: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px 20px',
    textAlign: 'center',
    color: '#636E72',
  },
  addBtn: {
    position: 'fixed',
    bottom: '90px',
    right: 'max(20px, calc(50% - 280px))',
    width: '56px',
    height: '56px',
    borderRadius: '28px',
    backgroundColor: '#00A3E0',
    color: 'white',
    border: 'none',
    boxShadow: '0 4px 12px rgba(0,163,224,0.4)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: '300',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  confirmModal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    width: '280px',
    textAlign: 'center',
  },
  confirmText: {
    fontSize: '16px',
    color: '#2D3436',
    marginBottom: '20px',
  },
  confirmButtons: {
    display: 'flex',
    gap: '12px',
  },
  confirmCancel: {
    flex: 1,
    padding: '12px',
    border: '1px solid #E1E8ED',
    backgroundColor: 'white',
    borderRadius: '10px',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#636E72',
  },
  confirmDelete: {
    flex: 1,
    padding: '12px',
    border: 'none',
    backgroundColor: '#E74C3C',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    color: 'white',
  },
};