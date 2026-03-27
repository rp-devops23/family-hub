import { useMemo } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { useApp } from '../context/AppContext';

// ============================================================================
// HOME PAGE - Dashboard with KPIs, charts, recent transactions
// ============================================================================

const CHART_COLORS = ['#00A3E0', '#003D5B', '#E67E22', '#00B894', '#9B59B6', '#E74C3C', '#F39C12', '#1ABC9C'];

export default function HomePage() {
  const { 
    t, language, transactions, categories, subcategories, budgets,
    formatAmount, formatDate, getSubcategory, getCategoryForSubcategory, getAccount
  } = useApp();

  const today = new Date();
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  // This month's transactions
  const thisMonthTx = useMemo(() => {
    return transactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });
  }, [transactions, thisMonth, thisYear]);

  // Last month's transactions
  const lastMonthTx = useMemo(() => {
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
    return transactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    });
  }, [transactions, thisMonth, thisYear]);

  // KPI values
  const thisMonthTotal = thisMonthTx.reduce((sum, tx) => sum + tx.amount, 0);
  const lastMonthTotal = lastMonthTx.reduce((sum, tx) => sum + tx.amount, 0);
  const monthDiff = lastMonthTotal > 0 
    ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 
    : 0;

  // Average transaction
  const avgTransaction = thisMonthTx.length > 0 
    ? thisMonthTotal / thisMonthTx.length 
    : 0;

  // ============================================================================
  // SPENDING TREND (last 6 months)
  // ============================================================================
  const trendData = useMemo(() => {
    const months = [];
    const monthNames = language === 'fr'
      ? ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const month = d.getMonth();
      const year = d.getFullYear();
      
      const total = transactions
        .filter(tx => {
          const txDate = new Date(tx.date);
          return txDate.getMonth() === month && txDate.getFullYear() === year;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);

      months.push({
        name: monthNames[month],
        total: Math.round(total),
      });
    }
    return months;
  }, [transactions, thisMonth, thisYear, language]);

  // ============================================================================
  // CATEGORY BREAKDOWN (this month)
  // ============================================================================
  const categoryData = useMemo(() => {
    const totals = {};

    thisMonthTx.forEach(tx => {
      const sub = subcategories.find(s => s.id === tx.subcategory_id);
      if (sub) {
        const cat = categories.find(c => c.id === sub.category_id);
        if (cat) {
          const key = cat.id;
          if (!totals[key]) {
            totals[key] = {
              id: cat.id,
              name: language === 'fr' ? cat.name_fr : cat.name_en,
              color: cat.color,
              total: 0,
            };
          }
          totals[key].total += tx.amount;
        }
      }
    });

    return Object.values(totals)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [thisMonthTx, categories, subcategories, language]);

  // ============================================================================
  // RECENT TRANSACTIONS
  // ============================================================================
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [transactions]);

  // ============================================================================
  // BUDGET ALERTS
  // ============================================================================
  const budgetAlerts = useMemo(() => {
    const alerts = [];
    
    budgets.forEach(budget => {
      if (!budget.is_active) return;
      
      // Get category IDs for this budget
      const budgetCatIds = budget.budget_categories?.map(bc => bc.category_id) || [];
      const budgetSubIds = budget.budget_subcategories?.map(bs => bs.subcategory_id) || [];
      
      // Calculate spent amount
      let spent = 0;
      thisMonthTx.forEach(tx => {
        const sub = subcategories.find(s => s.id === tx.subcategory_id);
        if (sub) {
          if (budgetCatIds.includes(sub.category_id) || budgetSubIds.includes(tx.subcategory_id)) {
            spent += tx.amount;
          }
        }
      });

      const percentage = (spent / budget.amount_limit) * 100;
      
      if (percentage >= 80) {
        alerts.push({
          id: budget.id,
          name: budget.name,
          spent,
          limit: budget.amount_limit,
          percentage,
          color: budget.color,
          isOver: percentage >= 100,
        });
      }
    });

    return alerts;
  }, [budgets, thisMonthTx, subcategories]);

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div style={styles.container}>
      {/* Greeting */}
      <div style={styles.greeting}>
        <h1 style={styles.greetingText}>
          {getGreeting(language)} 👋
        </h1>
        <p style={styles.greetingSubtext}>
          {t('Voici votre résumé financier', 'Here\'s your financial summary')}
        </p>
      </div>

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <span style={styles.kpiIcon}>💸</span>
          <div>
            <span style={styles.kpiLabel}>{t('Ce mois', 'This month')}</span>
            <span style={styles.kpiValue}>{formatAmount(thisMonthTotal)}</span>
          </div>
        </div>
        
        <div style={styles.kpiCard}>
          <span style={styles.kpiIcon}>{monthDiff <= 0 ? '📉' : '📈'}</span>
          <div>
            <span style={styles.kpiLabel}>{t('vs mois dernier', 'vs last month')}</span>
            <span style={{
              ...styles.kpiValue,
              color: monthDiff <= 0 ? '#00B894' : '#E74C3C',
              fontSize: '18px',
            }}>
              {monthDiff > 0 ? '+' : ''}{monthDiff.toFixed(0)}%
            </span>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <span style={styles.kpiIcon}>🧾</span>
          <div>
            <span style={styles.kpiLabel}>{t('Transactions', 'Transactions')}</span>
            <span style={styles.kpiValue}>{thisMonthTx.length}</span>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <span style={styles.kpiIcon}>📊</span>
          <div>
            <span style={styles.kpiLabel}>{t('Moyenne', 'Average')}</span>
            <span style={styles.kpiValue}>{formatAmount(avgTransaction)}</span>
          </div>
        </div>
      </div>

      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>⚠️ {t('Alertes budget', 'Budget alerts')}</h2>
          <div style={styles.alertsList}>
            {budgetAlerts.map(alert => (
              <div key={alert.id} style={{
                ...styles.alertCard,
                borderLeftColor: alert.isOver ? '#E74C3C' : '#F39C12',
              }}>
                <div style={styles.alertHeader}>
                  <span style={styles.alertName}>{alert.name}</span>
                  <span style={{
                    ...styles.alertBadge,
                    backgroundColor: alert.isOver ? '#FDEAEA' : '#FFF8E6',
                    color: alert.isOver ? '#E74C3C' : '#F39C12',
                  }}>
                    {alert.percentage.toFixed(0)}%
                  </span>
                </div>
                <div style={styles.alertProgress}>
                  <div style={{
                    ...styles.alertProgressFill,
                    width: `${Math.min(alert.percentage, 100)}%`,
                    backgroundColor: alert.isOver ? '#E74C3C' : '#F39C12',
                  }} />
                </div>
                <span style={styles.alertText}>
                  {formatAmount(alert.spent)} / {formatAmount(alert.limit)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spending Trend */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📈 {t('Tendance des dépenses', 'Spending trend')}</h2>
        <div style={styles.chartCard}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00A3E0" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00A3E0" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 11, fill: '#636E72' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 11, fill: '#636E72' }}
                tickFormatter={v => `${(v/1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value) => [`€${value}`, t('Total', 'Total')]}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#00A3E0" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorTotal)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🏷️ {t('Par catégorie', 'By category')}</h2>
        <div style={styles.chartCard}>
          {categoryData.length === 0 ? (
            <p style={styles.emptyText}>{t('Aucune dépense ce mois', 'No spending this month')}</p>
          ) : (
            <>
              <div style={styles.categoryBars}>
                {categoryData.map((cat, index) => {
                  const maxTotal = categoryData[0]?.total || 1;
                  const widthPercent = (cat.total / maxTotal) * 100;
                  
                  return (
                    <div key={cat.id} style={styles.categoryRow}>
                      <div style={styles.categoryInfo}>
                        <span style={{ ...styles.categoryDot, backgroundColor: cat.color }} />
                        <span style={styles.categoryName}>{cat.name}</span>
                      </div>
                      <div style={styles.categoryBarContainer}>
                        <div style={{
                          ...styles.categoryBar,
                          width: `${widthPercent}%`,
                          backgroundColor: cat.color,
                        }} />
                      </div>
                      <span style={styles.categoryAmount}>{formatAmount(cat.total)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🕐 {t('Transactions récentes', 'Recent transactions')}</h2>
        <div style={styles.recentList}>
          {recentTransactions.length === 0 ? (
            <p style={styles.emptyText}>{t('Aucune transaction', 'No transactions')}</p>
          ) : (
            recentTransactions.map(tx => {
              const category = getCategoryForSubcategory(tx.subcategory_id);
              const subcategory = getSubcategory(tx.subcategory_id);
              
              return (
                <div key={tx.id} style={styles.recentRow}>
                  <div style={{
                    ...styles.recentDot,
                    backgroundColor: category?.color || '#BDC3C7'
                  }} />
                  <div style={styles.recentInfo}>
                    <span style={styles.recentDesc}>{tx.description}</span>
                    <span style={styles.recentMeta}>
                      {language === 'fr' ? subcategory?.name_fr : subcategory?.name_en}
                    </span>
                  </div>
                  <div style={styles.recentRight}>
                    <span style={styles.recentAmount}>{formatAmount(tx.amount)}</span>
                    <span style={styles.recentDate}>{formatDate(tx.date)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function for greeting
function getGreeting(language) {
  const hour = new Date().getHours();
  if (language === 'fr') {
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  } else {
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }
}

const styles = {
  container: {
    padding: '20px 16px 100px',
  },
  greeting: {
    marginBottom: '20px',
  },
  greetingText: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#2D3436',
    margin: 0,
  },
  greetingSubtext: {
    fontSize: '14px',
    color: '#636E72',
    marginTop: '4px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '24px',
  },
  kpiCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  kpiIcon: {
    fontSize: '24px',
  },
  kpiLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#636E72',
    marginBottom: '2px',
  },
  kpiValue: {
    display: 'block',
    fontSize: '18px',
    fontWeight: '700',
    color: '#2D3436',
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
  chartCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  alertsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  alertCard: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '14px',
    borderLeft: '4px solid',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  alertHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  alertName: {
    fontWeight: '600',
    color: '#2D3436',
    fontSize: '14px',
  },
  alertBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '600',
  },
  alertProgress: {
    height: '6px',
    backgroundColor: '#E1E8ED',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  alertProgressFill: {
    height: '100%',
    borderRadius: '3px',
  },
  alertText: {
    fontSize: '12px',
    color: '#636E72',
  },
  categoryBars: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  categoryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  categoryInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100px',
    flexShrink: 0,
  },
  categoryDot: {
    width: '10px',
    height: '10px',
    borderRadius: '3px',
  },
  categoryName: {
    fontSize: '13px',
    color: '#2D3436',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  categoryBarContainer: {
    flex: 1,
    height: '8px',
    backgroundColor: '#F0F0F0',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  categoryBar: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s',
  },
  categoryAmount: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#2D3436',
    width: '70px',
    textAlign: 'right',
    flexShrink: 0,
  },
  recentList: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  recentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderBottom: '1px solid #F0F0F0',
  },
  recentDot: {
    width: '8px',
    height: '8px',
    borderRadius: '2px',
    flexShrink: 0,
  },
  recentInfo: {
    flex: 1,
    minWidth: 0,
  },
  recentDesc: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#2D3436',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  recentMeta: {
    display: 'block',
    fontSize: '12px',
    color: '#636E72',
    marginTop: '2px',
  },
  recentRight: {
    textAlign: 'right',
    flexShrink: 0,
  },
  recentAmount: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#2D3436',
  },
  recentDate: {
    display: 'block',
    fontSize: '11px',
    color: '#636E72',
    marginTop: '2px',
  },
  emptyText: {
    color: '#636E72',
    textAlign: 'center',
    padding: '20px',
    fontStyle: 'italic',
  },
};