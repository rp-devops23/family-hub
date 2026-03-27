import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import BudgetForm from '../components/budgets/BudgetForm';

// ============================================================================
// BUDGETS PAGE - Full budget management with progress tracking
// ============================================================================

export default function BudgetsPage() {
  const { 
    t, language, budgets, transactions, categories, subcategories,
    formatAmount, deleteBudget 
  } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Get current month/year for calculations
  const today = new Date();
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();

  // This month's transactions
  const thisMonthTx = useMemo(() => {
    return transactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });
  }, [transactions, thisMonth, thisYear]);

  // This year's transactions
  const thisYearTx = useMemo(() => {
    return transactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getFullYear() === thisYear;
    });
  }, [transactions, thisYear]);

  // Calculate spending for each budget
  const budgetsWithSpending = useMemo(() => {
    return budgets.map(budget => {
      // Determine which transactions to use based on period
      const relevantTx = budget.period === 'yearly' ? thisYearTx : thisMonthTx;
      
      // Get linked category/subcategory IDs
      const budgetCatIds = budget.budget_categories?.map(bc => bc.category_id) || [];
      const budgetSubIds = budget.budget_subcategories?.map(bs => bs.subcategory_id) || [];
      
      // Calculate spent amount
      let spent = 0;
      relevantTx.forEach(tx => {
        const sub = subcategories.find(s => s.id === tx.subcategory_id);
        if (sub) {
          // Check if transaction's category or subcategory is linked to this budget
          if (budgetCatIds.includes(sub.category_id) || budgetSubIds.includes(tx.subcategory_id)) {
            spent += tx.amount;
          }
        }
      });

      const percentage = budget.amount_limit > 0 
        ? (spent / budget.amount_limit) * 100 
        : 0;
      
      const remaining = budget.amount_limit - spent;

      // Get linked category names for display
      const linkedCategories = categories
        .filter(c => budgetCatIds.includes(c.id))
        .map(c => language === 'fr' ? c.name_fr : c.name_en);
      
      const linkedSubcategories = subcategories
        .filter(s => budgetSubIds.includes(s.id))
        .map(s => language === 'fr' ? s.name_fr : s.name_en);

      return {
        ...budget,
        spent,
        percentage,
        remaining,
        linkedCategories,
        linkedSubcategories,
        isOver: percentage >= 100,
        isWarning: percentage >= 80 && percentage < 100,
      };
    });
  }, [budgets, thisMonthTx, thisYearTx, categories, subcategories, language]);

  // Separate active and inactive budgets
  const activeBudgets = budgetsWithSpending.filter(b => b.is_active);
  const inactiveBudgets = budgetsWithSpending.filter(b => !b.is_active);

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    await deleteBudget(id);
    setConfirmDelete(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingBudget(null);
  };

  const getStatusColor = (budget) => {
    if (budget.isOver) return '#E74C3C';
    if (budget.isWarning) return '#F39C12';
    return '#00B894';
  };

  const getStatusEmoji = (budget) => {
    if (budget.isOver) return '🚨';
    if (budget.isWarning) return '⚠️';
    return '✅';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Budgets</h1>
        <button onClick={() => setShowForm(true)} style={styles.addBtnHeader}>
          + {t('Nouveau', 'New')}
        </button>
      </div>

      {/* Summary */}
      {activeBudgets.length > 0 && (
        <div style={styles.summary}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryValue}>{activeBudgets.length}</span>
            <span style={styles.summaryLabel}>{t('Budgets actifs', 'Active budgets')}</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryValue}>
              {activeBudgets.filter(b => b.isOver).length}
            </span>
            <span style={styles.summaryLabel}>{t('Dépassés', 'Over budget')}</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryValue}>
              {activeBudgets.filter(b => b.isWarning).length}
            </span>
            <span style={styles.summaryLabel}>{t('En alerte', 'Warning')}</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {activeBudgets.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>🐷</span>
          <p style={styles.emptyText}>
            {t('Aucun budget créé', 'No budgets created')}
          </p>
          <p style={styles.emptySubtext}>
            {t('Créez votre premier budget pour suivre vos dépenses', 
               'Create your first budget to track your spending')}
          </p>
          <button onClick={() => setShowForm(true)} style={styles.createBtn}>
            + {t('Créer un budget', 'Create budget')}
          </button>
        </div>
      )}

      {/* Budget list */}
      {activeBudgets.length > 0 && (
        <div style={styles.list}>
          {activeBudgets.map(budget => (
            <div key={budget.id} style={styles.card}>
              {/* Card Header */}
              <div style={styles.cardHeader}>
                <div style={styles.cardLeft}>
                  <span style={{
                    ...styles.cardIcon,
                    backgroundColor: budget.color || '#00A3E0'
                  }}>
                    {budget.icon || '💰'}
                  </span>
                  <div>
                    <div style={styles.cardName}>{budget.name}</div>
                    <div style={styles.cardPeriod}>
                      {budget.period === 'monthly' 
                        ? t('Mensuel', 'Monthly') 
                        : t('Annuel', 'Yearly')}
                    </div>
                  </div>
                </div>
                <span style={styles.statusEmoji}>{getStatusEmoji(budget)}</span>
              </div>

              {/* Progress */}
              <div style={styles.progressSection}>
                <div style={styles.progressBar}>
                  <div style={{
                    ...styles.progressFill,
                    width: `${Math.min(budget.percentage, 100)}%`,
                    backgroundColor: getStatusColor(budget),
                  }} />
                </div>
                <div style={styles.progressInfo}>
                  <span style={styles.spentText}>
                    {formatAmount(budget.spent)} {t('dépensé', 'spent')}
                  </span>
                  <span style={{
                    ...styles.percentText,
                    color: getStatusColor(budget)
                  }}>
                    {budget.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Limit & Remaining */}
              <div style={styles.limitRow}>
                <div>
                  <span style={styles.limitLabel}>{t('Limite', 'Limit')}</span>
                  <span style={styles.limitValue}>{formatAmount(budget.amount_limit)}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={styles.limitLabel}>{t('Restant', 'Remaining')}</span>
                  <span style={{
                    ...styles.limitValue,
                    color: budget.remaining < 0 ? '#E74C3C' : '#00B894'
                  }}>
                    {formatAmount(budget.remaining)}
                  </span>
                </div>
              </div>

              {/* Categories */}
              <div style={styles.categoriesSection}>
                <span style={styles.categoriesLabel}>{t('Catégories:', 'Categories:')}</span>
                <div style={styles.categoryTags}>
                  {budget.linkedCategories.map(name => (
                    <span key={name} style={styles.categoryTag}>{name}</span>
                  ))}
                  {budget.linkedSubcategories.map(name => (
                    <span key={name} style={{...styles.categoryTag, backgroundColor: '#F0F0F0'}}>
                      {name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={styles.cardActions}>
                <button 
                  onClick={() => handleEdit(budget)} 
                  style={styles.actionBtn}
                >
                  ✏️ {t('Modifier', 'Edit')}
                </button>
                <button 
                  onClick={() => setConfirmDelete(budget.id)} 
                  style={{...styles.actionBtn, color: '#E74C3C'}}
                >
                  🗑️ {t('Supprimer', 'Delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add button (floating) */}
      <button onClick={() => setShowForm(true)} style={styles.addBtn}>
        <span style={{ fontSize: '24px', lineHeight: 1 }}>+</span>
      </button>

      {/* Budget Form Modal */}
      {showForm && (
        <BudgetForm
          budget={editingBudget}
          onClose={handleCloseForm}
          onSave={() => {}}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div style={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div style={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <p style={styles.confirmText}>
              {t('Supprimer ce budget ?', 'Delete this budget?')}
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#2D3436',
    margin: 0,
  },
  addBtnHeader: {
    padding: '8px 16px',
    backgroundColor: '#00A3E0',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  summary: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  summaryItem: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  summaryValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: '700',
    color: '#2D3436',
  },
  summaryLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#636E72',
    marginTop: '4px',
  },
  empty: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px 20px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: '8px',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#636E72',
    marginBottom: '20px',
  },
  createBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#00A3E0',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  cardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  cardIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
  },
  cardName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2D3436',
  },
  cardPeriod: {
    fontSize: '12px',
    color: '#636E72',
    marginTop: '2px',
  },
  statusEmoji: {
    fontSize: '20px',
  },
  progressSection: {
    marginBottom: '16px',
  },
  progressBar: {
    height: '10px',
    backgroundColor: '#E1E8ED',
    borderRadius: '5px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    borderRadius: '5px',
    transition: 'width 0.3s',
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spentText: {
    fontSize: '13px',
    color: '#636E72',
  },
  percentText: {
    fontSize: '14px',
    fontWeight: '600',
  },
  limitRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderTop: '1px solid #F0F0F0',
    borderBottom: '1px solid #F0F0F0',
    marginBottom: '12px',
  },
  limitLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#636E72',
    marginBottom: '2px',
  },
  limitValue: {
    display: 'block',
    fontSize: '15px',
    fontWeight: '600',
    color: '#2D3436',
  },
  categoriesSection: {
    marginBottom: '12px',
  },
  categoriesLabel: {
    fontSize: '12px',
    color: '#636E72',
    display: 'block',
    marginBottom: '6px',
  },
  categoryTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  categoryTag: {
    padding: '4px 10px',
    backgroundColor: '#E8F7FC',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#00A3E0',
  },
  cardActions: {
    display: 'flex',
    gap: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #F0F0F0',
  },
  actionBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px',
    border: '1px solid #E1E8ED',
    borderRadius: '8px',
    backgroundColor: 'white',
    fontSize: '13px',
    color: '#636E72',
    cursor: 'pointer',
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