import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import RecurringForm from '../components/recurring/RecurringForm';

// ============================================================================
// RECURRING PAGE - Manage recurring transactions
// ============================================================================

export default function RecurringPage() {
  const { 
    t, language, recurringTemplates, transactions, categories, subcategories, accounts,
    formatAmount, formatDate, deleteRecurringTemplate, addTransaction, updateRecurringTemplate,
    getSubcategory, getCategoryForSubcategory, getAccount
  } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [generatingId, setGeneratingId] = useState(null);
  const [decliningId, setDecliningId] = useState(null);

  // ============================================================================
  // HELPER: Generate occurrence dates for a template
  // ============================================================================
  
  // Helper to parse "YYYY-MM-DD" as local date (not UTC)
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const generateOccurrences = (template, startFrom, endDate) => {
    const occurrences = [];
    let current = new Date(startFrom.getFullYear(), startFrom.getMonth(), 1);

    // Get start month for trimestrial/yearly (parse safely)
    const templateStartDate = parseLocalDate(template.start_date);
    const templateStartMonth = templateStartDate ? templateStartDate.getMonth() : 0;

    while (current <= endDate) {
      const year = current.getFullYear();
      const month = current.getMonth();
      let expectedDate = null;

      if (template.frequency === 'monthly') {
        const day = template.day_of_month === 99
          ? new Date(year, month + 1, 0).getDate()
          : Math.min(template.day_of_month || 1, new Date(year, month + 1, 0).getDate());
        expectedDate = new Date(year, month, day);
      } else if (template.frequency === 'trimestrial') {
        const monthsDiff = (month - templateStartMonth + 12) % 12;
        if (monthsDiff % 3 === 0) {
          const day = template.day_of_month === 99
            ? new Date(year, month + 1, 0).getDate()
            : Math.min(template.day_of_month || 1, new Date(year, month + 1, 0).getDate());
          expectedDate = new Date(year, month, day);
        }
      } else if (template.frequency === 'yearly') {
        if (month === templateStartMonth) {
          const day = Math.min(template.day_of_month || 1, new Date(year, month + 1, 0).getDate());
          expectedDate = new Date(year, month, day);
        }
      }

      if (expectedDate && expectedDate >= startFrom && expectedDate <= endDate) {
        occurrences.push(expectedDate);
      }

      // Move to next month
      current.setMonth(current.getMonth() + 1);
    }

    return occurrences;
  };

  // ============================================================================
  // CALCULATE PENDING TRANSACTIONS (ALL MONTHS)
  // ============================================================================
  
  const pendingTransactions = useMemo(() => {
    const pending = [];
    const today = new Date();
    // Include occurrences up to end of current month (not just today)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    recurringTemplates.forEach(template => {
      if (!template.is_active) return;

      // Start from start_date or last_skipped_date (whichever is later)
      let startFrom = parseLocalDate(template.start_date) || new Date(2020, 0, 1);
      
      if (template.last_skipped_date) {
        const skippedDate = parseLocalDate(template.last_skipped_date);
        if (skippedDate && skippedDate >= startFrom) {
          // Start from month AFTER the skipped date
          startFrom = new Date(skippedDate.getFullYear(), skippedDate.getMonth() + 1, 1);
        }
      }

      // Check if end date has passed
      const endDate = parseLocalDate(template.end_date);
      if (endDate && endDate < today) return;

      // Generate all expected occurrences from startFrom to end of current month
      const occurrences = generateOccurrences(template, startFrom, endOfMonth);

      // Filter out occurrences that have matching transactions
      occurrences.forEach(expectedDate => {
        const expectedMonth = expectedDate.getMonth();
        const expectedYear = expectedDate.getFullYear();
        
        const exists = transactions.some(tx => {
          // Parse date string as local date to avoid timezone issues
          // tx.date is "YYYY-MM-DD" format
          const [year, month] = tx.date.split('-').map(Number);
          const txMonth = month - 1; // JS months are 0-indexed
          const txYear = year;
          
          return (
            tx.description === template.description &&
            Math.abs(tx.amount - template.amount) < 0.01 &&
            txMonth === expectedMonth &&
            txYear === expectedYear
          );
        });

        if (!exists) {
          // Format date as YYYY-MM-DD in local time (not UTC)
          const y = expectedDate.getFullYear();
          const m = String(expectedDate.getMonth() + 1).padStart(2, '0');
          const d = String(expectedDate.getDate()).padStart(2, '0');
          const dateStr = `${y}-${m}-${d}`;
          
          pending.push({
            ...template,
            expectedDate: dateStr,
            _occurrenceKey: `${template.id}-${dateStr}`,
          });
        }
      });
    });

    // Sort by date (oldest first)
    return pending.sort((a, b) => new Date(a.expectedDate) - new Date(b.expectedDate));
  }, [recurringTemplates, transactions]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    await deleteRecurringTemplate(id);
    setConfirmDelete(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  const handleGenerateTransaction = async (template) => {
    setGeneratingId(template._occurrenceKey || template.id);
    
    await addTransaction({
      description: template.description,
      amount: template.amount,
      date: template.expectedDate,
      subcategory_id: template.subcategory_id,
      account_id: template.account_id,
      notes: template.notes,
    });

    setGeneratingId(null);
  };

  const handleDecline = async (template) => {
    setDecliningId(template._occurrenceKey || template.id);
    
    // Update last_skipped_date to skip this and all previous occurrences
    await updateRecurringTemplate(template.id, {
      last_skipped_date: template.expectedDate,
    });

    setDecliningId(null);
  };

  const getFrequencyLabel = (freq) => {
    const labels = {
      monthly: t('Mensuel', 'Monthly'),
      weekly: t('Hebdomadaire', 'Weekly'),
      yearly: t('Annuel', 'Yearly'),
      biweekly: t('Bimensuel', 'Bi-weekly'),
      trimestrial: t('Trimestriel', 'Quarterly'),
    };
    return labels[freq] || freq;
  };

  const monthNames = language === 'fr'
    ? ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const getDayLabel = (template) => {
    const dayPart = template.day_of_month === 99 
      ? t('Dernier jour', 'Last day')
      : `${t('Le', 'Day')} ${template.day_of_month}`;

    if (template.frequency === 'yearly' && template.start_date) {
      const month = new Date(template.start_date).getMonth();
      return `${dayPart} ${monthNames[month]}`;
    }
    
    if (template.frequency === 'trimestrial' && template.start_date) {
      const startMonth = new Date(template.start_date).getMonth();
      const months = [0, 3, 6, 9].map(offset => monthNames[(startMonth + offset) % 12]);
      return `${dayPart} (${months.join(', ')})`;
    }

    if (template.frequency === 'monthly') {
      return dayPart;
    }

    // Weekly/biweekly
    const weekDays = language === 'fr' 
      ? ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
      : ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return weekDays[template.day_of_week] || '';
  };

  // Separate active and inactive templates
  const activeTemplates = recurringTemplates.filter(t => t.is_active);
  const inactiveTemplates = recurringTemplates.filter(t => !t.is_active);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🔄 {t('Récurrences', 'Recurring')}</h1>
        <button onClick={() => setShowForm(true)} style={styles.addBtnHeader}>
          + {t('Nouveau', 'New')}
        </button>
      </div>

      {/* Pending Transactions */}
      {pendingTransactions.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            ⏳ {t('En attente', 'Pending')} ({pendingTransactions.length})
          </h2>
          <div style={styles.pendingList}>
            {pendingTransactions.map(template => {
              const category = getCategoryForSubcategory(template.subcategory_id);
              const subcategory = getSubcategory(template.subcategory_id);
              const occKey = template._occurrenceKey;
              
              return (
                <div key={occKey} style={styles.pendingCard}>
                  <div style={styles.pendingLeft}>
                    <div style={{
                      ...styles.pendingDot,
                      backgroundColor: category?.color || '#00A3E0'
                    }} />
                    <div>
                      <span style={styles.pendingDesc}>{template.description}</span>
                      <span style={styles.pendingMeta}>
                        {language === 'fr' ? subcategory?.name_fr : subcategory?.name_en}
                        {' • '}
                        {formatDate(template.expectedDate)}
                      </span>
                    </div>
                  </div>
                  <div style={styles.pendingRight}>
                    <span style={styles.pendingAmount}>{formatAmount(template.amount)}</span>
                    <button
                      onClick={() => handleDecline(template)}
                      style={styles.declineBtn}
                      disabled={decliningId === occKey}
                      title={t('Ignorer', 'Skip')}
                    >
                      {decliningId === occKey ? '...' : '✕'}
                    </button>
                    <button
                      onClick={() => handleGenerateTransaction(template)}
                      style={styles.generateBtn}
                      disabled={generatingId === occKey}
                      title={t('Accepter', 'Accept')}
                    >
                      {generatingId === occKey ? '...' : '✓'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Templates */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          ✅ {t('Actives', 'Active')} ({activeTemplates.length})
        </h2>
        
        {activeTemplates.length === 0 ? (
          <div style={styles.empty}>
            <span style={styles.emptyIcon}>🔄</span>
            <p style={styles.emptyText}>
              {t('Aucune récurrence créée', 'No recurring transactions')}
            </p>
            <p style={styles.emptySubtext}>
              {t('Créez des modèles pour vos factures mensuelles', 
                 'Create templates for your monthly bills')}
            </p>
            <button onClick={() => setShowForm(true)} style={styles.createBtn}>
              + {t('Créer une récurrence', 'Create recurring')}
            </button>
          </div>
        ) : (
          <div style={styles.list}>
            {activeTemplates.map(template => {
              const category = getCategoryForSubcategory(template.subcategory_id);
              const subcategory = getSubcategory(template.subcategory_id);
              const account = getAccount(template.account_id);
              
              return (
                <div key={template.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div style={styles.cardLeft}>
                      <div style={{
                        ...styles.cardIcon,
                        backgroundColor: category?.color || '#00A3E0'
                      }}>
                        🔄
                      </div>
                      <div>
                        <span style={styles.cardName}>{template.description}</span>
                        <span style={styles.cardMeta}>
                          {language === 'fr' ? subcategory?.name_fr : subcategory?.name_en}
                          {account && ` • ${account.name}`}
                        </span>
                      </div>
                    </div>
                    <span style={styles.cardAmount}>{formatAmount(template.amount)}</span>
                  </div>
                  
                  <div style={styles.cardDetails}>
                    <span style={styles.detailChip}>
                      📅 {getFrequencyLabel(template.frequency)}
                    </span>
                    <span style={styles.detailChip}>
                      {getDayLabel(template)}
                    </span>
                    {template.end_date && (
                      <span style={styles.detailChip}>
                        → {formatDate(template.end_date)}
                      </span>
                    )}
                  </div>

                  <div style={styles.cardActions}>
                    <button 
                      onClick={() => handleEdit(template)}
                      style={styles.actionBtn}
                    >
                      ✎ {t('Modifier', 'Edit')}
                    </button>
                    <button 
                      onClick={() => setConfirmDelete(template)}
                      style={{...styles.actionBtn, color: '#E74C3C'}}
                    >
                      ✕ {t('Supprimer', 'Delete')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inactive Templates */}
      {inactiveTemplates.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            ⏸️ {t('Inactives', 'Inactive')} ({inactiveTemplates.length})
          </h2>
          <div style={styles.list}>
            {inactiveTemplates.map(template => (
              <div key={template.id} style={{...styles.card, opacity: 0.6}}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardLeft}>
                    <span style={styles.cardName}>{template.description}</span>
                  </div>
                  <span style={styles.cardAmount}>{formatAmount(template.amount)}</span>
                </div>
                <div style={styles.cardActions}>
                  <button 
                    onClick={() => handleEdit(template)}
                    style={styles.actionBtn}
                  >
                    ✎ {t('Modifier', 'Edit')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add button (floating) */}
      <button onClick={() => setShowForm(true)} style={styles.addBtn}>
        <span style={{ fontSize: '24px', lineHeight: 1 }}>+</span>
      </button>

      {/* Recurring Form Modal */}
      {showForm && (
        <RecurringForm
          template={editingTemplate}
          onClose={handleCloseForm}
          onSave={() => {}}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div style={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div style={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <p style={styles.confirmText}>
              {t('Supprimer', 'Delete')} "{confirmDelete.description}"?
            </p>
            <div style={styles.confirmButtons}>
              <button 
                onClick={() => setConfirmDelete(null)} 
                style={styles.confirmCancel}
              >
                {t('Annuler', 'Cancel')}
              </button>
              <button 
                onClick={() => handleDelete(confirmDelete.id)} 
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
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: '12px',
  },
  pendingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  pendingCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF8E6',
    borderRadius: '12px',
    padding: '14px 16px',
    borderLeft: '4px solid #F39C12',
  },
  pendingLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  pendingDot: {
    width: '10px',
    height: '10px',
    borderRadius: '3px',
  },
  pendingDesc: {
    display: 'block',
    fontSize: '15px',
    fontWeight: '500',
    color: '#2D3436',
  },
  pendingMeta: {
    display: 'block',
    fontSize: '12px',
    color: '#636E72',
    marginTop: '2px',
  },
  pendingRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  pendingAmount: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#2D3436',
  },
  generateBtn: {
    width: '36px',
    height: '36px',
    border: 'none',
    borderRadius: '18px',
    backgroundColor: '#00B894',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    width: '36px',
    height: '36px',
    border: '1px solid #E1E8ED',
    borderRadius: '18px',
    backgroundColor: 'white',
    color: '#636E72',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: '12px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  cardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  cardIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  cardName: {
    display: 'block',
    fontSize: '16px',
    fontWeight: '600',
    color: '#2D3436',
  },
  cardMeta: {
    display: 'block',
    fontSize: '12px',
    color: '#636E72',
    marginTop: '2px',
  },
  cardAmount: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#2D3436',
  },
  cardDetails: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px',
  },
  detailChip: {
    padding: '4px 10px',
    backgroundColor: '#F5F7FA',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#636E72',
  },
  cardActions: {
    display: 'flex',
    gap: '10px',
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
    right: 'max(20px, calc(50% - 280px))', // Contained within 600px max-width
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