import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import MonthPicker from '../components/common/MonthPicker';
import TransactionForm from '../components/transactions/TransactionForm';

// ============================================================================
// TRANSACTIONS PAGE - Full transaction management
// ============================================================================

const MONTH_NAMES_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const MONTH_NAMES_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function TransactionsPage() {
  const {
    t, language, transactions, categories, subcategories, accounts,
    formatAmount, formatDate, deleteTransaction,
    getSubcategory, getCategoryForSubcategory, getAccount
  } = useApp();

  const [viewMode, setViewMode] = useState('year'); // 'year' | 'month'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterAccounts, setFilterAccounts] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'expense' | 'income'

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      if (viewMode === 'month') {
        if (txDate.getMonth() !== selectedMonth || txDate.getFullYear() !== selectedYear) return false;
      } else {
        if (txDate.getFullYear() !== selectedYear) return false;
      }
      if (searchQuery && !tx.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterCategories.length > 0) {
        const sub = getSubcategory(tx.subcategory_id);
        if (!sub || !filterCategories.includes(sub.category_id)) return false;
      }
      if (filterAccounts.length > 0 && !filterAccounts.includes(tx.account_id)) return false;
      if (filterType !== 'all' && (tx.type || 'expense') !== filterType) return false;
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, viewMode, selectedMonth, selectedYear, searchQuery, filterCategories, filterAccounts, filterType]);

  // Group by month for year view
  const groupedByMonth = useMemo(() => {
    if (viewMode !== 'year') return null;
    const groups = {};
    filteredTransactions.forEach(tx => {
      const key = new Date(tx.date).getMonth();
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([month, txs]) => ({ month: Number(month), txs }));
  }, [filteredTransactions, viewMode]);

  // Summary: income, expenses, balance — respects account filter
  const summary = useMemo(() => {
    const periodTx = transactions.filter(tx => {
      const d = new Date(tx.date);
      if (viewMode === 'month') {
        if (d.getMonth() !== selectedMonth || d.getFullYear() !== selectedYear) return false;
      } else {
        if (d.getFullYear() !== selectedYear) return false;
      }
      if (filterAccounts.length > 0 && !filterAccounts.includes(tx.account_id)) return false;
      return true;
    });
    const income = periodTx.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
    const expenses = periodTx.filter(tx => (tx.type || 'expense') === 'expense').reduce((s, tx) => s + tx.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [transactions, viewMode, selectedMonth, selectedYear, filterAccounts]);

  const activeFilterCount = filterCategories.length + (filterType !== 'all' ? 1 : 0);

  const toggleAccountFilter = (accId) => {
    setFilterAccounts(prev => prev.includes(accId) ? prev.filter(id => id !== accId) : [...prev, accId]);
  };
  const toggleCategoryFilter = (catId) => {
    setFilterCategories(prev => prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]);
  };
  const clearFilters = () => { setFilterCategories([]); setFilterType('all'); };

  const monthNames = language === 'fr' ? MONTH_NAMES_FR : MONTH_NAMES_EN;
  const currentYear = new Date().getFullYear();

  return (
    <div style={styles.container}>
      {/* View mode toggle + navigator */}
      <div style={styles.navRow}>
        {viewMode === 'month' ? (
          <div style={{ flex: 1 }}>
            <MonthPicker
              month={selectedMonth}
              year={selectedYear}
              onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y); }}
            />
          </div>
        ) : (
          <div style={styles.yearNav}>
            <button onClick={() => setSelectedYear(y => y - 1)} style={styles.yearNavBtn}>◀</button>
            <span style={styles.yearDisplay}>{selectedYear}</span>
            <button onClick={() => setSelectedYear(y => y + 1)} style={styles.yearNavBtn}>▶</button>
            {selectedYear !== currentYear && (
              <button onClick={() => setSelectedYear(currentYear)} style={styles.thisYearBtn}>
                {t('Cette année', 'This year')}
              </button>
            )}
          </div>
        )}
        <div style={styles.modeToggle}>
          <button
            onClick={() => setViewMode('month')}
            style={{ ...styles.modeBtn, ...(viewMode === 'month' ? styles.modeBtnActive : {}) }}
          >
            {t('Mois', 'Month')}
          </button>
          <button
            onClick={() => setViewMode('year')}
            style={{ ...styles.modeBtn, ...(viewMode === 'year' ? styles.modeBtnActive : {}) }}
          >
            {t('Année', 'Year')}
          </button>
        </div>
      </div>

      {/* Account filter buttons — always visible */}
      {accounts.length > 1 && (
        <div style={styles.accountRow}>
          <button
            onClick={() => setFilterAccounts([])}
            style={{ ...styles.accountChip, ...(filterAccounts.length === 0 ? styles.accountChipAll : {}) }}
          >
            {t('Tous', 'All')}
          </button>
          {accounts.map(acc => (
            <button
              key={acc.id}
              onClick={() => toggleAccountFilter(acc.id)}
              style={{
                ...styles.accountChip,
                ...(filterAccounts.includes(acc.id)
                  ? { backgroundColor: acc.color || '#00A3E0', color: 'white', borderColor: acc.color || '#00A3E0' }
                  : {}),
              }}
            >
              {acc.name}
            </button>
          ))}
        </div>
      )}

      {/* Balance summary */}
      {summary.income > 0 && (
        <div style={styles.balanceRow}>
          <div style={styles.balanceItem}>
            <span style={styles.balanceLabel}>{t('Revenus', 'Income')}</span>
            <span style={{ ...styles.balanceValue, color: '#27AE60' }}>+{formatAmount(summary.income)}</span>
          </div>
          <div style={styles.balanceDivider} />
          <div style={styles.balanceItem}>
            <span style={styles.balanceLabel}>{t('Dépenses', 'Expenses')}</span>
            <span style={{ ...styles.balanceValue, color: '#E74C3C' }}>-{formatAmount(summary.expenses)}</span>
          </div>
          <div style={styles.balanceDivider} />
          <div style={styles.balanceItem}>
            <span style={styles.balanceLabel}>{t('Balance', 'Balance')}</span>
            <span style={{ ...styles.balanceValue, color: summary.balance >= 0 ? '#27AE60' : '#E74C3C', fontWeight: '700' }}>
              {summary.balance >= 0 ? '+' : ''}{formatAmount(summary.balance)}
            </span>
          </div>
        </div>
      )}

      {/* Search & Filter bar */}
      <div style={styles.searchRow}>
        <div style={styles.searchBar}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder={t('Rechercher...', 'Search...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={styles.clearBtn}>✕</button>
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

      {/* Filter panel */}
      {showFilters && (
        <div style={styles.filterPanel}>
          <div style={styles.filterHeader}>
            <span style={styles.filterTitle}>{t('Filtres', 'Filters')}</span>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} style={styles.clearFiltersBtn}>{t('Effacer', 'Clear')}</button>
            )}
          </div>

          {/* Type filter */}
          <div style={styles.filterSection}>
            <span style={styles.filterLabel}>{t('Type', 'Type')}</span>
            <div style={styles.filterChips}>
              {[
                { value: 'all', fr: 'Tous', en: 'All' },
                { value: 'expense', fr: 'Dépenses', en: 'Expenses' },
                { value: 'income', fr: 'Revenus', en: 'Income' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterType(opt.value)}
                  style={{
                    ...styles.chip,
                    backgroundColor: filterType === opt.value ? '#00A3E0' : '#F5F7FA',
                    color: filterType === opt.value ? 'white' : '#2D3436',
                  }}
                >
                  {language === 'fr' ? opt.fr : opt.en}
                </button>
              ))}
            </div>
          </div>

          {/* Category filter */}
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
        </div>
      )}

      {/* Count + filtered total */}
      <div style={styles.summaryBar}>
        <span style={styles.summaryCount}>
          {filteredTransactions.length} {t('transactions', 'transactions')}
        </span>
        <span style={styles.summaryTotal}>
          {formatAmount(filteredTransactions.reduce((s, tx) => s + (tx.type === 'income' ? tx.amount : -tx.amount), 0))}
        </span>
      </div>

      {/* Transaction list */}
      <div style={styles.list}>
        {filteredTransactions.length === 0 ? (
          <div style={styles.empty}><p>{t('Aucune transaction', 'No transactions')}</p></div>
        ) : viewMode === 'year' ? (
          groupedByMonth.map(({ month, txs }) => {
            const monthIncome = txs.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
            const monthExpenses = txs.filter(tx => (tx.type || 'expense') === 'expense').reduce((s, tx) => s + tx.amount, 0);
            const monthBalance = monthIncome - monthExpenses;
            return (
              <div key={month}>
                <div style={styles.monthGroupHeader}>
                  <span style={styles.monthGroupName}>{monthNames[month]} {selectedYear}</span>
                  <span style={{ ...styles.monthGroupBalance, color: monthBalance >= 0 ? '#27AE60' : '#E74C3C' }}>
                    {monthBalance >= 0 ? '+' : ''}{formatAmount(monthBalance)}
                  </span>
                </div>
                {txs.map(tx => <TxRow key={tx.id} tx={tx} language={language} t={t} getSubcategory={getSubcategory} getCategoryForSubcategory={getCategoryForSubcategory} getAccount={getAccount} formatAmount={formatAmount} formatDate={formatDate} onEdit={() => { setEditingTransaction(tx); setShowForm(true); }} onDelete={() => setConfirmDelete(tx.id)} />)}
              </div>
            );
          })
        ) : (
          filteredTransactions.map(tx => (
            <TxRow key={tx.id} tx={tx} language={language} t={t} getSubcategory={getSubcategory} getCategoryForSubcategory={getCategoryForSubcategory} getAccount={getAccount} formatAmount={formatAmount} formatDate={formatDate} onEdit={() => { setEditingTransaction(tx); setShowForm(true); }} onDelete={() => setConfirmDelete(tx.id)} />
          ))
        )}
      </div>

      <button onClick={() => setShowForm(true)} style={styles.addBtn}>
        <span style={{ fontSize: '24px', lineHeight: 1 }}>+</span>
      </button>

      {showForm && (
        <TransactionForm
          transaction={editingTransaction}
          onClose={() => { setShowForm(false); setEditingTransaction(null); }}
          onSave={() => {}}
        />
      )}

      {confirmDelete && (
        <div style={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div style={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <p style={styles.confirmText}>{t('Supprimer cette transaction ?', 'Delete this transaction?')}</p>
            <div style={styles.confirmButtons}>
              <button onClick={() => setConfirmDelete(null)} style={styles.confirmCancel}>{t('Annuler', 'Cancel')}</button>
              <button onClick={async () => { await deleteTransaction(confirmDelete); setConfirmDelete(null); }} style={styles.confirmDelete}>{t('Supprimer', 'Delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TxRow({ tx, language, t, getSubcategory, getCategoryForSubcategory, getAccount, formatAmount, formatDate, onEdit, onDelete }) {
  const subcategory = getSubcategory(tx.subcategory_id);
  const category = getCategoryForSubcategory(tx.subcategory_id);
  const account = getAccount(tx.account_id);
  const isIncome = tx.type === 'income';
  return (
    <div style={styles.row}>
      <div style={{ ...styles.colorBar, backgroundColor: isIncome ? '#27AE60' : (category?.color || '#BDC3C7') }} />
      <div style={styles.rowContent}>
        <div style={styles.rowMain}>
          <div style={styles.rowLeft}>
            <div style={styles.description}>{tx.description}</div>
            <div style={styles.meta}>
              {isIncome ? `💰 ${t('Revenu', 'Income')}` : (language === 'fr' ? subcategory?.name_fr : subcategory?.name_en)}
              {account && ` • ${account.name}`}
            </div>
          </div>
          <div style={styles.rowRight}>
            <div style={{ ...styles.amount, color: isIncome ? '#27AE60' : '#2D3436' }}>
              {isIncome ? '+' : '-'}{formatAmount(tx.amount)}
            </div>
            <div style={styles.date}>{formatDate(tx.date)}</div>
          </div>
        </div>
        <div style={styles.rowActions}>
          <button onClick={onEdit} style={styles.actionBtn}>✏️</button>
          <button onClick={onDelete} style={styles.actionBtn}>🗑️</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '20px 16px 100px' },

  accountRow: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '4px',
    marginBottom: '12px',
    scrollbarWidth: 'none',
  },
  accountChip: {
    flexShrink: 0,
    padding: '6px 14px',
    border: '1px solid #E1E8ED',
    borderRadius: '20px',
    backgroundColor: 'white',
    fontSize: '13px',
    fontWeight: '500',
    color: '#2D3436',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  accountChipAll: {
    backgroundColor: '#2D3436',
    color: 'white',
    borderColor: '#2D3436',
  },

  balanceRow: {
    display: 'flex',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '14px 16px',
    marginBottom: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  balanceItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  balanceDivider: {
    width: '1px',
    backgroundColor: '#F0F0F0',
    margin: '0 4px',
  },
  balanceLabel: { fontSize: '11px', color: '#636E72' },
  balanceValue: { fontSize: '14px', fontWeight: '600' },

  searchRow: { display: 'flex', gap: '10px', marginBottom: '12px' },
  searchBar: {
    flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
    backgroundColor: 'white', borderRadius: '10px', padding: '10px 14px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  searchIcon: { fontSize: '16px' },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: '15px', backgroundColor: 'transparent' },
  clearBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', backgroundColor: '#F5F7FA', borderRadius: '50%',
    width: '24px', height: '24px', cursor: 'pointer', color: '#636E72', fontSize: '12px',
  },
  filterBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '44px', height: '44px', border: '1px solid #E1E8ED',
    borderRadius: '10px', backgroundColor: 'white', cursor: 'pointer', position: 'relative',
  },
  filterBadge: {
    position: 'absolute', top: '-4px', right: '-4px',
    backgroundColor: '#00A3E0', color: 'white', fontSize: '10px', fontWeight: '600',
    width: '18px', height: '18px', borderRadius: '9px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  filterPanel: {
    backgroundColor: 'white', borderRadius: '12px', padding: '16px',
    marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  filterHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  filterTitle: { fontWeight: '600', color: '#2D3436' },
  clearFiltersBtn: { border: 'none', backgroundColor: 'transparent', color: '#00A3E0', fontSize: '13px', cursor: 'pointer' },
  filterSection: { marginBottom: '12px' },
  filterLabel: { display: 'block', fontSize: '12px', color: '#636E72', marginBottom: '8px' },
  filterChips: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  chip: { padding: '6px 12px', border: 'none', borderRadius: '16px', fontSize: '13px', cursor: 'pointer' },

  summaryBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', backgroundColor: 'white', borderRadius: '10px',
    marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  summaryCount: { fontSize: '14px', color: '#636E72' },
  summaryTotal: { fontSize: '16px', fontWeight: '700', color: '#2D3436' },

  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  row: { display: 'flex', backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  colorBar: { width: '4px', flexShrink: 0 },
  rowContent: { flex: 1, padding: '12px 14px' },
  rowMain: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  rowLeft: { flex: 1, minWidth: 0 },
  description: { fontWeight: '500', color: '#2D3436', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  meta: { fontSize: '12px', color: '#636E72', marginTop: '2px' },
  rowRight: { textAlign: 'right', flexShrink: 0, marginLeft: '12px' },
  amount: { fontWeight: '600' },
  date: { fontSize: '12px', color: '#636E72', marginTop: '2px' },
  rowActions: { display: 'flex', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F0F0F0' },
  actionBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '32px', height: '32px', border: '1px solid #E1E8ED',
    borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer', fontSize: '14px',
  },
  empty: { backgroundColor: 'white', borderRadius: '12px', padding: '40px 20px', textAlign: 'center', color: '#636E72' },
  addBtn: {
    position: 'fixed', bottom: '90px', right: 'max(20px, calc(50% - 280px))',
    width: '56px', height: '56px', borderRadius: '28px',
    backgroundColor: '#00A3E0', color: 'white', border: 'none',
    boxShadow: '0 4px 12px rgba(0,163,224,0.4)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '300',
  },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200 },
  confirmModal: { backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '280px', textAlign: 'center' },
  confirmText: { fontSize: '16px', color: '#2D3436', marginBottom: '20px' },
  confirmButtons: { display: 'flex', gap: '12px' },
  confirmCancel: { flex: 1, padding: '12px', border: '1px solid #E1E8ED', backgroundColor: 'white', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', color: '#636E72' },
  confirmDelete: { flex: 1, padding: '12px', border: 'none', backgroundColor: '#E74C3C', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', color: 'white' },

  navRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '16px', gap: '12px',
  },
  yearNav: {
    display: 'flex', alignItems: 'center', gap: '8px',
    backgroundColor: 'white', borderRadius: '10px', padding: '8px 12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  yearNavBtn: {
    width: '32px', height: '32px', border: 'none', backgroundColor: '#F5F7FA',
    borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#2D3436',
  },
  yearDisplay: { fontWeight: '600', color: '#2D3436', fontSize: '15px', minWidth: '48px', textAlign: 'center' },
  thisYearBtn: {
    padding: '6px 12px', border: '1px solid #00A3E0', backgroundColor: 'transparent',
    color: '#00A3E0', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
  },
  modeToggle: {
    display: 'flex', backgroundColor: '#F5F7FA', borderRadius: '8px', padding: '3px', gap: '2px', flexShrink: 0,
  },
  modeBtn: {
    padding: '6px 14px', border: 'none', borderRadius: '6px', fontSize: '13px',
    fontWeight: '500', cursor: 'pointer', backgroundColor: 'transparent', color: '#636E72',
  },
  modeBtnActive: { backgroundColor: 'white', color: '#00A3E0', fontWeight: '600', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },

  monthGroupHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 4px 6px', marginTop: '8px',
  },
  monthGroupName: { fontSize: '13px', fontWeight: '700', color: '#636E72', textTransform: 'capitalize' },
  monthGroupBalance: { fontSize: '13px', fontWeight: '600' },
};
