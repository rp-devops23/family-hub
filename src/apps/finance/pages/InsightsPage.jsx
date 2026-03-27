import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { useApp } from '../context/AppContext';

// ============================================================================
// INSIGHTS PAGE - Analytics with Yearly and Monthly views
// ============================================================================

const COLORS = ['#00A3E0', '#003D5B', '#E67E22', '#00B894', '#9B59B6', '#E74C3C', '#F39C12', '#1ABC9C', '#3498DB', '#2ECC71'];
const YEAR_COLORS = ['#00A3E0', '#003D5B', '#E67E22', '#00B894', '#9B59B6'];

export default function InsightsPage() {
  const { 
    t, language, transactions, categories, subcategories, accounts, formatAmount 
  } = useApp();
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  // ============================================================================
  // STATE
  // ============================================================================
  const [viewMode, setViewMode] = useState('yearly'); // 'yearly' or 'monthly'
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Settings
  const [yearsToCompare, setYearsToCompare] = useState(2);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [chartType, setChartType] = useState('bar');

  // Month names
  const monthNames = language === 'fr'
    ? ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const monthNamesShort = language === 'fr'
    ? ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // ============================================================================
  // AVAILABLE YEARS
  // ============================================================================
  const availableYears = useMemo(() => {
    const years = new Set();
    transactions.forEach(tx => {
      years.add(new Date(tx.date).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // ============================================================================
  // FILTERED TRANSACTIONS (by account/category filters)
  // ============================================================================
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (selectedAccount !== 'all' && tx.account_id !== selectedAccount) return false;
      if (selectedCategory !== 'all') {
        const sub = subcategories.find(s => s.id === tx.subcategory_id);
        if (!sub || sub.category_id !== selectedCategory) return false;
      }
      return true;
    });
  }, [transactions, selectedAccount, selectedCategory, subcategories]);

  // ============================================================================
  // CURRENT PERIOD TRANSACTIONS
  // ============================================================================
  const periodTransactions = useMemo(() => {
    return filteredTransactions.filter(tx => {
      const d = new Date(tx.date);
      if (viewMode === 'monthly') {
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      }
      return d.getFullYear() === selectedYear;
    });
  }, [filteredTransactions, viewMode, selectedYear, selectedMonth]);

  // ============================================================================
  // KPI DATA
  // ============================================================================
  const kpiData = useMemo(() => {
    const currentTotal = periodTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    
    // Get previous period for comparison
    let prevTransactions;
    if (viewMode === 'monthly') {
      // Same month, previous year
      prevTransactions = filteredTransactions.filter(tx => {
        const d = new Date(tx.date);
        return d.getFullYear() === selectedYear - 1 && d.getMonth() === selectedMonth;
      });
    } else {
      // Previous year
      prevTransactions = filteredTransactions.filter(tx => {
        const d = new Date(tx.date);
        return d.getFullYear() === selectedYear - 1;
      });
    }
    
    const prevTotal = prevTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const diff = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;
    
    // Average
    let avg = 0;
    if (viewMode === 'monthly') {
      const daysWithData = new Set(periodTransactions.map(tx => new Date(tx.date).getDate())).size;
      avg = daysWithData > 0 ? currentTotal / daysWithData : 0;
    } else {
      const monthsWithData = new Set(periodTransactions.map(tx => new Date(tx.date).getMonth())).size;
      avg = monthsWithData > 0 ? currentTotal / monthsWithData : 0;
    }

    return {
      total: currentTotal,
      diff,
      avg,
      txCount: periodTransactions.length,
      prevLabel: viewMode === 'monthly' 
        ? `${monthNamesShort[selectedMonth]} ${selectedYear - 1}`
        : String(selectedYear - 1),
    };
  }, [periodTransactions, filteredTransactions, viewMode, selectedYear, selectedMonth, monthNamesShort]);

  // ============================================================================
  // CATEGORY BREAKDOWN (for current period)
  // ============================================================================
  const categoryData = useMemo(() => {
    const totals = {};
    periodTransactions.forEach(tx => {
      const sub = subcategories.find(s => s.id === tx.subcategory_id);
      if (sub) {
        const cat = categories.find(c => c.id === sub.category_id);
        if (cat) {
          if (!totals[cat.id]) {
            totals[cat.id] = {
              id: cat.id,
              name: language === 'fr' ? cat.name_fr : cat.name_en,
              color: cat.color,
              total: 0,
              count: 0,
            };
          }
          totals[cat.id].total += tx.amount;
          totals[cat.id].count += 1;
        }
      }
    });
    return Object.values(totals).sort((a, b) => b.total - a.total);
  }, [periodTransactions, categories, subcategories, language]);

  // Pie data (top 6 + others)
  const pieData = useMemo(() => {
    const top6 = categoryData.slice(0, 6);
    const others = categoryData.slice(6);
    const othersTotal = others.reduce((sum, c) => sum + c.total, 0);
    if (othersTotal > 0) {
      top6.push({ id: 'others', name: t('Autres', 'Others'), color: '#BDC3C7', total: othersTotal });
    }
    return top6;
  }, [categoryData, t]);

  // ============================================================================
  // TOP MERCHANTS (for current period)
  // ============================================================================
  const merchantData = useMemo(() => {
    const totals = {};
    periodTransactions.forEach(tx => {
      const key = tx.description.toLowerCase().trim();
      if (!totals[key]) {
        totals[key] = { name: tx.description, total: 0, count: 0 };
      }
      totals[key].total += tx.amount;
      totals[key].count += 1;
    });
    return Object.values(totals).sort((a, b) => b.total - a.total).slice(0, 15);
  }, [periodTransactions]);

  // ============================================================================
  // YEARLY VIEW: Monthly comparison across years
  // ============================================================================
  const yearlyChartData = useMemo(() => {
    if (viewMode !== 'yearly') return { data: [], years: [] };
    
    const years = [];
    for (let i = 0; i < yearsToCompare; i++) {
      years.push(selectedYear - i);
    }

    const data = monthNamesShort.map((name, monthIndex) => {
      const point = { name };
      years.forEach(year => {
        const monthTotal = filteredTransactions
          .filter(tx => {
            const d = new Date(tx.date);
            return d.getFullYear() === year && d.getMonth() === monthIndex;
          })
          .reduce((sum, tx) => sum + tx.amount, 0);
        point[year] = Math.round(monthTotal);
      });
      return point;
    });

    return { data, years };
  }, [viewMode, filteredTransactions, selectedYear, yearsToCompare, monthNamesShort]);

  // ============================================================================
  // MONTHLY VIEW: Same month comparison across years
  // ============================================================================
  const monthlyChartData = useMemo(() => {
    if (viewMode !== 'monthly') return { data: [], years: [] };

    const years = [];
    for (let i = 0; i < yearsToCompare; i++) {
      if (availableYears.includes(selectedYear - i)) {
        years.push(selectedYear - i);
      }
    }

    // Get category totals for each year
    const categoryTotals = {};
    
    years.forEach(year => {
      const yearMonthTx = filteredTransactions.filter(tx => {
        const d = new Date(tx.date);
        return d.getFullYear() === year && d.getMonth() === selectedMonth;
      });

      yearMonthTx.forEach(tx => {
        const sub = subcategories.find(s => s.id === tx.subcategory_id);
        if (sub) {
          const cat = categories.find(c => c.id === sub.category_id);
          if (cat) {
            const catName = language === 'fr' ? cat.name_fr : cat.name_en;
            if (!categoryTotals[catName]) {
              categoryTotals[catName] = { name: catName, color: cat.color };
            }
            categoryTotals[catName][year] = (categoryTotals[catName][year] || 0) + tx.amount;
          }
        }
      });
    });

    // Convert to array and sort by current year total
    const data = Object.values(categoryTotals)
      .map(cat => {
        years.forEach(y => { cat[y] = Math.round(cat[y] || 0); });
        return cat;
      })
      .sort((a, b) => (b[selectedYear] || 0) - (a[selectedYear] || 0))
      .slice(0, 8); // Top 8 categories

    return { data, years };
  }, [viewMode, filteredTransactions, selectedYear, selectedMonth, yearsToCompare, availableYears, categories, subcategories, language]);

  // ============================================================================
  // MONTHLY VIEW: Total comparison bar chart
  // ============================================================================
  const monthlyTotalComparison = useMemo(() => {
    if (viewMode !== 'monthly') return [];

    const data = [];
    for (let i = yearsToCompare - 1; i >= 0; i--) {
      const year = selectedYear - i;
      if (!availableYears.includes(year)) continue;
      
      const total = filteredTransactions
        .filter(tx => {
          const d = new Date(tx.date);
          return d.getFullYear() === year && d.getMonth() === selectedMonth;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      data.push({
        name: String(year),
        total: Math.round(total),
        fill: YEAR_COLORS[yearsToCompare - 1 - i] || COLORS[i % COLORS.length],
      });
    }
    return data;
  }, [viewMode, filteredTransactions, selectedYear, selectedMonth, yearsToCompare, availableYears]);

  // ============================================================================
  // NAVIGATION HELPERS
  // ============================================================================
  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const canGoNext = !(selectedYear >= currentYear && selectedMonth >= currentMonth);

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h1 style={styles.title}>{t('Analyses', 'Insights')}</h1>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          style={{
            ...styles.settingsBtn,
            backgroundColor: showSettings ? '#00A3E0' : 'white',
            color: showSettings ? 'white' : '#2D3436',
          }}
        >
          ⚙️
        </button>
      </div>

      {/* View Mode Toggle */}
      <div style={styles.viewModeToggle}>
        <button
          onClick={() => setViewMode('yearly')}
          style={{
            ...styles.viewModeBtn,
            ...(viewMode === 'yearly' ? styles.viewModeBtnActive : {}),
          }}
        >
          📅 {t('Annuel', 'Yearly')}
        </button>
        <button
          onClick={() => setViewMode('monthly')}
          style={{
            ...styles.viewModeBtn,
            ...(viewMode === 'monthly' ? styles.viewModeBtnActive : {}),
          }}
        >
          📆 {t('Mensuel', 'Monthly')}
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div style={styles.settingsPanel}>
          <h3 style={styles.settingsTitle}>{t('Options', 'Options')}</h3>
          
          <div style={styles.settingRow}>
            <span style={styles.settingLabel}>
              {viewMode === 'yearly' 
                ? t('Années à comparer', 'Years to compare')
                : t('Années à comparer (même mois)', 'Years to compare (same month)')
              }
            </span>
            <div style={styles.chipGroup}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setYearsToCompare(n)}
                  style={{
                    ...styles.chip,
                    ...(yearsToCompare === n ? styles.chipActive : {}),
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.settingRow}>
            <span style={styles.settingLabel}>{t('Type de graphique', 'Chart type')}</span>
            <div style={styles.chipGroup}>
              <button
                onClick={() => setChartType('bar')}
                style={{ ...styles.chip, ...(chartType === 'bar' ? styles.chipActive : {}) }}
              >
                📊 {t('Barres', 'Bar')}
              </button>
              <button
                onClick={() => setChartType('line')}
                style={{ ...styles.chip, ...(chartType === 'line' ? styles.chipActive : {}) }}
              >
                📈 {t('Lignes', 'Line')}
              </button>
            </div>
          </div>

          <div style={styles.settingRow}>
            <span style={styles.settingLabel}>{t('Compte', 'Account')}</span>
            <select
              value={selectedAccount}
              onChange={e => setSelectedAccount(e.target.value)}
              style={styles.select}
            >
              <option value="all">{t('Tous', 'All')}</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Period Selector */}
      <div style={styles.periodSelector}>
        {viewMode === 'monthly' && (
          <div style={styles.monthSelector}>
            <button onClick={goToPrevMonth} style={styles.navBtn}>◀</button>
            <span style={styles.monthText}>{monthNames[selectedMonth]}</span>
            <button 
              onClick={goToNextMonth} 
              style={{ ...styles.navBtn, opacity: canGoNext ? 1 : 0.3 }}
              disabled={!canGoNext}
            >
              ▶
            </button>
          </div>
        )}
        <div style={styles.yearSelector}>
          <button 
            onClick={() => setSelectedYear(y => y - 1)} 
            style={styles.navBtn}
            disabled={!availableYears.includes(selectedYear - 1)}
          >
            ◀
          </button>
          <span style={styles.yearText}>{selectedYear}</span>
          <button 
            onClick={() => setSelectedYear(y => y + 1)} 
            style={{ ...styles.navBtn, opacity: selectedYear >= currentYear ? 0.3 : 1 }}
            disabled={selectedYear >= currentYear}
          >
            ▶
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button 
          onClick={() => setActiveTab('overview')}
          style={{ ...styles.tab, ...(activeTab === 'overview' ? styles.tabActive : {}) }}
        >
          📊 {t('Aperçu', 'Overview')}
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          style={{ ...styles.tab, ...(activeTab === 'categories' ? styles.tabActive : {}) }}
        >
          🏷️ {t('Catégories', 'Categories')}
        </button>
        <button 
          onClick={() => setActiveTab('merchants')}
          style={{ ...styles.tab, ...(activeTab === 'merchants' ? styles.tabActive : {}) }}
        >
          🏪 {t('Bénéficiaires', 'Merchants')}
        </button>
      </div>

      {/* ================================================================== */}
      {/* OVERVIEW TAB */}
      {/* ================================================================== */}
      {activeTab === 'overview' && (
        <>
          {/* KPIs */}
          <div style={styles.kpiGrid}>
            <div style={styles.kpiCard}>
              <span style={styles.kpiIcon}>💰</span>
              <div>
                <span style={styles.kpiLabel}>
                  {viewMode === 'monthly' ? monthNames[selectedMonth] : selectedYear}
                </span>
                <span style={styles.kpiValue}>{formatAmount(kpiData.total)}</span>
              </div>
            </div>
            
            <div style={styles.kpiCard}>
              <span style={styles.kpiIcon}>{kpiData.diff <= 0 ? '📉' : '📈'}</span>
              <div>
                <span style={styles.kpiLabel}>vs {kpiData.prevLabel}</span>
                <span style={{
                  ...styles.kpiValue,
                  color: kpiData.diff <= 0 ? '#00B894' : '#E74C3C',
                  fontSize: '16px',
                }}>
                  {kpiData.diff > 0 ? '+' : ''}{kpiData.diff.toFixed(0)}%
                </span>
              </div>
            </div>

            <div style={styles.kpiCard}>
              <span style={styles.kpiIcon}>📅</span>
              <div>
                <span style={styles.kpiLabel}>
                  {viewMode === 'monthly' ? t('Moy/jour', 'Avg/day') : t('Moy/mois', 'Avg/month')}
                </span>
                <span style={styles.kpiValue}>{formatAmount(kpiData.avg)}</span>
              </div>
            </div>

            <div style={styles.kpiCard}>
              <span style={styles.kpiIcon}>🧾</span>
              <div>
                <span style={styles.kpiLabel}>{t('Transactions', 'Transactions')}</span>
                <span style={styles.kpiValue}>{kpiData.txCount}</span>
              </div>
            </div>
          </div>

          {/* YEARLY: Monthly comparison chart */}
          {viewMode === 'yearly' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>
                📊 {t('Comparaison mensuelle', 'Monthly comparison')}
                <span style={styles.sectionSubtitle}>({yearsToCompare} {t('ans', 'years')})</span>
              </h2>
              <div style={styles.chartCard}>
                {yearlyChartData.data.length === 0 ? (
                  <p style={styles.emptyText}>{t('Aucune donnée', 'No data')}</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      {chartType === 'bar' ? (
                        <BarChart data={yearlyChartData.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                          <Tooltip formatter={(value) => formatAmount(value)} />
                          {yearlyChartData.years.map((year, i) => (
                            <Bar key={year} dataKey={year} fill={YEAR_COLORS[i]} radius={[2, 2, 0, 0]} />
                          ))}
                        </BarChart>
                      ) : (
                        <LineChart data={yearlyChartData.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                          <Tooltip formatter={(value) => formatAmount(value)} />
                          {yearlyChartData.years.map((year, i) => (
                            <Line key={year} type="monotone" dataKey={year} stroke={YEAR_COLORS[i]} strokeWidth={2} dot={{ r: 3 }} />
                          ))}
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                    <div style={styles.legend}>
                      {yearlyChartData.years.map((year, i) => (
                        <span key={year} style={styles.legendItem}>
                          <span style={{ ...styles.legendDot, backgroundColor: YEAR_COLORS[i] }} />
                          {year}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* MONTHLY: Same month total comparison */}
          {viewMode === 'monthly' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>
                📊 {monthNames[selectedMonth]} - {t('Comparaison', 'Comparison')}
                <span style={styles.sectionSubtitle}>({yearsToCompare} {t('ans', 'years')})</span>
              </h2>
              <div style={styles.chartCard}>
                {monthlyTotalComparison.length === 0 ? (
                  <p style={styles.emptyText}>{t('Aucune donnée', 'No data')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={monthlyTotalComparison} layout="vertical" margin={{ top: 10, right: 60, left: 10, bottom: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={50} />
                      <Tooltip formatter={(value) => formatAmount(value)} />
                      <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                        {monthlyTotalComparison.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

          {/* MONTHLY: Category comparison across years */}
          {viewMode === 'monthly' && monthlyChartData.data.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>
                🏷️ {t('Catégories', 'Categories')} - {monthNames[selectedMonth]}
              </h2>
              <div style={styles.chartCard}>
                <ResponsiveContainer width="100%" height={Math.max(200, monthlyChartData.data.length * 35)}>
                  <BarChart data={monthlyChartData.data} layout="vertical" margin={{ top: 10, right: 10, left: 80, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
                    <Tooltip formatter={(value) => formatAmount(value)} />
                    {monthlyChartData.years.map((year, i) => (
                      <Bar key={year} dataKey={year} fill={YEAR_COLORS[i]} radius={[0, 2, 2, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                <div style={styles.legend}>
                  {monthlyChartData.years.map((year, i) => (
                    <span key={year} style={styles.legendItem}>
                      <span style={{ ...styles.legendDot, backgroundColor: YEAR_COLORS[i] }} />
                      {year}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================================================================== */}
      {/* CATEGORIES TAB */}
      {/* ================================================================== */}
      {activeTab === 'categories' && (
        <>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              🥧 {t('Répartition', 'Breakdown')} - {viewMode === 'monthly' ? monthNames[selectedMonth] : selectedYear}
            </h2>
            <div style={styles.chartCard}>
              {pieData.length === 0 ? (
                <p style={styles.emptyText}>{t('Aucune donnée', 'No data')}</p>
              ) : (
                <div style={styles.pieContainer}>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatAmount(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={styles.pieLegend}>
                    {pieData.map((cat, i) => (
                      <div key={i} style={styles.pieLegendItem}>
                        <span style={{ ...styles.pieLegendDot, backgroundColor: cat.color || COLORS[i % COLORS.length] }} />
                        <span style={styles.pieLegendName}>{cat.name}</span>
                        <span style={styles.pieLegendValue}>{formatAmount(cat.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🏆 {t('Classement', 'Ranking')}</h2>
            <div style={styles.rankingList}>
              {categoryData.length === 0 ? (
                <p style={styles.emptyText}>{t('Aucune donnée', 'No data')}</p>
              ) : (
                categoryData.map((cat, index) => {
                  const percent = kpiData.total > 0 ? (cat.total / kpiData.total * 100).toFixed(1) : 0;
                  const maxTotal = categoryData[0]?.total || 1;
                  const widthPercent = (cat.total / maxTotal) * 100;
                  
                  return (
                    <div key={cat.id} style={styles.rankingRow}>
                      <span style={styles.rankNumber}>#{index + 1}</span>
                      <span style={{ ...styles.rankDot, backgroundColor: cat.color || COLORS[index % COLORS.length] }} />
                      <div style={styles.rankInfo}>
                        <span style={styles.rankName}>{cat.name}</span>
                        <div style={styles.rankBarContainer}>
                          <div style={{ ...styles.rankBar, width: `${widthPercent}%`, backgroundColor: cat.color || COLORS[index % COLORS.length] }} />
                        </div>
                      </div>
                      <div style={styles.rankRight}>
                        <span style={styles.rankAmount}>{formatAmount(cat.total)}</span>
                        <span style={styles.rankPercent}>{percent}%</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* ================================================================== */}
      {/* MERCHANTS TAB */}
      {/* ================================================================== */}
      {activeTab === 'merchants' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            🏪 Top {t('Bénéficiaires', 'Merchants')} - {viewMode === 'monthly' ? monthNames[selectedMonth] : selectedYear}
          </h2>
          <div style={styles.merchantList}>
            {merchantData.length === 0 ? (
              <p style={styles.emptyText}>{t('Aucune donnée', 'No data')}</p>
            ) : (
              merchantData.map((merchant, index) => {
                const maxTotal = merchantData[0]?.total || 1;
                const widthPercent = (merchant.total / maxTotal) * 100;
                
                return (
                  <div key={index} style={styles.merchantRow}>
                    <span style={styles.merchantRank}>#{index + 1}</span>
                    <div style={styles.merchantInfo}>
                      <span style={styles.merchantName}>{merchant.name}</span>
                      <div style={styles.merchantBarContainer}>
                        <div style={{ ...styles.merchantBar, width: `${widthPercent}%` }} />
                      </div>
                      <span style={styles.merchantCount}>{merchant.count} tx</span>
                    </div>
                    <span style={styles.merchantAmount}>{formatAmount(merchant.total)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = {
  container: {
    padding: '20px 16px 100px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#2D3436',
    margin: 0,
  },
  settingsBtn: {
    width: '40px',
    height: '40px',
    border: '1px solid #E1E8ED',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeToggle: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    justifyContent: 'center',
  },
  viewModeBtn: {
    flex: 1,
    maxWidth: '140px',
    padding: '10px 16px',
    border: '1px solid #E1E8ED',
    borderRadius: '10px',
    backgroundColor: 'white',
    fontSize: '13px',
    color: '#636E72',
    cursor: 'pointer',
  },
  viewModeBtnActive: {
    backgroundColor: '#00A3E0',
    borderColor: '#00A3E0',
    color: 'white',
  },
  settingsPanel: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  settingsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2D3436',
    marginTop: 0,
    marginBottom: '12px',
  },
  settingRow: {
    marginBottom: '12px',
  },
  settingLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#636E72',
    marginBottom: '6px',
  },
  chipGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  chip: {
    padding: '6px 12px',
    border: '1px solid #E1E8ED',
    borderRadius: '16px',
    backgroundColor: 'white',
    fontSize: '12px',
    color: '#636E72',
    cursor: 'pointer',
  },
  chipActive: {
    backgroundColor: '#00A3E0',
    borderColor: '#00A3E0',
    color: 'white',
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #E1E8ED',
    borderRadius: '8px',
    fontSize: '13px',
    backgroundColor: 'white',
  },
  periodSelector: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  monthSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  yearSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  navBtn: {
    width: '36px',
    height: '36px',
    border: '1px solid #E1E8ED',
    borderRadius: '8px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#2D3436',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#00A3E0',
    minWidth: '110px',
    textAlign: 'center',
  },
  yearText: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#2D3436',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    overflowX: 'auto',
  },
  tab: {
    padding: '10px 16px',
    border: '1px solid #E1E8ED',
    borderRadius: '20px',
    backgroundColor: 'white',
    fontSize: '13px',
    color: '#636E72',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    backgroundColor: '#00A3E0',
    borderColor: '#00A3E0',
    color: 'white',
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
    gap: '10px',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '14px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  kpiIcon: {
    fontSize: '22px',
  },
  kpiLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#636E72',
    marginBottom: '2px',
  },
  kpiValue: {
    display: 'block',
    fontSize: '16px',
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
  sectionSubtitle: {
    fontSize: '12px',
    fontWeight: '400',
    color: '#636E72',
    marginLeft: '8px',
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginTop: '12px',
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: '#636E72',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '3px',
  },
  pieContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  pieLegend: {
    width: '100%',
    marginTop: '12px',
  },
  pieLegendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 0',
    borderBottom: '1px solid #F0F0F0',
  },
  pieLegendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '3px',
    flexShrink: 0,
  },
  pieLegendName: {
    flex: 1,
    fontSize: '13px',
    color: '#2D3436',
  },
  pieLegendValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#2D3436',
  },
  rankingList: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  rankingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 16px',
    borderBottom: '1px solid #F0F0F0',
  },
  rankNumber: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#00A3E0',
    width: '28px',
  },
  rankDot: {
    width: '10px',
    height: '10px',
    borderRadius: '3px',
    flexShrink: 0,
  },
  rankInfo: {
    flex: 1,
    minWidth: 0,
  },
  rankName: {
    display: 'block',
    fontSize: '14px',
    color: '#2D3436',
    marginBottom: '4px',
  },
  rankBarContainer: {
    height: '6px',
    backgroundColor: '#F0F0F0',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  rankBar: {
    height: '100%',
    borderRadius: '3px',
  },
  rankRight: {
    textAlign: 'right',
    flexShrink: 0,
  },
  rankAmount: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#2D3436',
  },
  rankPercent: {
    display: 'block',
    fontSize: '11px',
    color: '#636E72',
  },
  merchantList: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  merchantRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderBottom: '1px solid #F0F0F0',
  },
  merchantRank: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#00A3E0',
    width: '28px',
  },
  merchantInfo: {
    flex: 1,
    minWidth: 0,
  },
  merchantName: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#2D3436',
    marginBottom: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  merchantBarContainer: {
    height: '6px',
    backgroundColor: '#F0F0F0',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '4px',
  },
  merchantBar: {
    height: '100%',
    borderRadius: '3px',
    backgroundColor: '#00A3E0',
  },
  merchantCount: {
    fontSize: '11px',
    color: '#636E72',
  },
  merchantAmount: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2D3436',
    flexShrink: 0,
  },
  emptyText: {
    color: '#636E72',
    textAlign: 'center',
    padding: '20px',
    fontStyle: 'italic',
  },
};