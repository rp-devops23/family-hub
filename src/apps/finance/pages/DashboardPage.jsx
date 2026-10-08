import { useState, useMemo } from 'react';
import {
  ComposedChart, BarChart, Bar, Area, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Treemap, ReferenceLine,
} from 'recharts';
import { useApp } from '../context/AppContext';

// ============================================================================
// DASHBOARD PAGE — Santé financière & aperçu patrimonial
// ============================================================================

const FONT    = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const GREEN   = '#00B894';
const RED     = '#E74C3C';
const BLUE    = '#00A3E0';
const ORANGE  = '#E67E22';
const PURPLE  = '#9B59B6';
const NEUTRAL_COLORS = ['#00A3E0','#003D5B','#E67E22','#9B59B6','#1ABC9C','#F39C12','#3498DB','#E74C3C','#2ECC71','#E91E63','#FF9800','#607D8B','#795548','#00BCD4','#8BC34A'];

function fmtEur(n, compact = false) {
  if (n == null) return '—';
  if (compact && Math.abs(n) >= 1000) {
    return new Intl.NumberFormat('fr-BE', {
      style: 'currency', currency: 'EUR', maximumFractionDigits: 0, notation: 'compact',
    }).format(n);
  }
  return new Intl.NumberFormat('fr-BE', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(n);
}

function fmtMonthLabel(yyyyMM) {
  const [y, m] = yyyyMM.split('-');
  return new Date(+y, +m - 1, 1).toLocaleDateString('fr-BE', { month: 'short', year: '2-digit' });
}

function savingsColor(rate) {
  if (rate >= 20) return GREEN;
  if (rate >= 10) return ORANGE;
  return RED;
}

function pctChange(cur, prev) {
  if (!prev) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

function monthKey(date) { return date.slice(0, 7); }

function shiftMonth(yyyyMM, delta) {
  const [y, m] = yyyyMM.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DashboardPage() {
  const { transactions, categories, subcategories, accounts, t, language } = useApp();

  const now        = new Date();
  const todayMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // ── core state ─────────────────────────────────────────────────────────────
  const [selectedMonth,     setSelectedMonth]     = useState(todayMonth);
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [showSettings,      setShowSettings]       = useState(false);

  // ── settings ───────────────────────────────────────────────────────────────
  const [chartMonths,    setChartMonths]    = useState(12);      // 3 | 6 | 12 | 24
  const [chartType,      setChartType]      = useState('area');  // 'area' | 'bar'
  const [metricType,     setMetricType]     = useState('both');  // 'both' | 'expenses' | 'income' | 'balance'
  const [filterCategory, setFilterCategory] = useState('all');   // category id or 'all'
  const [breakdownView,  setBreakdownView]  = useState('category'); // 'category' | 'subcategory' | 'beneficiary'

  // ── filtered transactions (account + optional category) ───────────────────
  const txs = useMemo(() => {
    return transactions.filter(tx => {
      if (selectedAccountId !== 'all' && tx.account_id !== selectedAccountId) return false;
      if (filterCategory !== 'all') {
        const sub = subcategories.find(s => s.id === tx.subcategory_id);
        if (!sub || sub.category_id !== filterCategory) return false;
      }
      return true;
    });
  }, [transactions, selectedAccountId, filterCategory, subcategories]);

  // ── metrics for a given month ──────────────────────────────────────────────
  function monthMetrics(month) {
    const slice    = txs.filter(tx => monthKey(tx.date) === month);
    const income   = slice.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
    const expenses = slice.filter(tx => (tx.type || 'expense') === 'expense').reduce((s, tx) => s + tx.amount, 0);
    const net      = income - expenses;
    const rate     = income > 0 ? (net / income) * 100 : 0;
    return { income, expenses, net, rate };
  }

  const current  = useMemo(() => monthMetrics(selectedMonth),              [txs, selectedMonth]);
  const previous = useMemo(() => monthMetrics(shiftMonth(selectedMonth, -1)), [txs, selectedMonth]);

  // ── chart series (variable months) ────────────────────────────────────────
  const series = useMemo(() => {
    return Array.from({ length: chartMonths }, (_, i) => {
      const month = shiftMonth(selectedMonth, -(chartMonths - 1 - i));
      const { income, expenses, net, rate } = monthMetrics(month);
      return {
        month,
        label: fmtMonthLabel(month),
        income,
        expenses,
        net,
        rate: income > 0 ? Math.round(rate * 10) / 10 : null,
      };
    });
  }, [txs, selectedMonth, chartMonths]);

  // ── breakdown: category ───────────────────────────────────────────────────
  const expenseSlice = useMemo(() =>
    txs.filter(tx => monthKey(tx.date) === selectedMonth && (tx.type || 'expense') === 'expense'),
    [txs, selectedMonth]);

  const catBreakdown = useMemo(() => {
    const map = {};
    expenseSlice.forEach(tx => {
      const sub = subcategories.find(s => s.id === tx.subcategory_id);
      if (!sub) return;
      const cat = categories.find(c => c.id === sub.category_id);
      if (!cat) return;
      if (!map[cat.id]) map[cat.id] = { name: t(cat.name_fr, cat.name_en), color: cat.color || BLUE, amount: 0, count: 0 };
      map[cat.id].amount += tx.amount;
      map[cat.id].count  += 1;
    });
    return Object.values(map).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);
  }, [expenseSlice, categories, subcategories]);

  // ── breakdown: subcategory ────────────────────────────────────────────────
  const subBreakdown = useMemo(() => {
    const map = {};
    expenseSlice.forEach(tx => {
      const sub = subcategories.find(s => s.id === tx.subcategory_id);
      if (!sub) return;
      const cat = categories.find(c => c.id === sub.category_id);
      if (!map[sub.id]) map[sub.id] = {
        name: language === 'fr' ? sub.name_fr : sub.name_en,
        color: cat?.color || BLUE,
        amount: 0,
        count: 0,
      };
      map[sub.id].amount += tx.amount;
      map[sub.id].count  += 1;
    });
    return Object.values(map).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);
  }, [expenseSlice, subcategories, categories, language]);

  // ── breakdown: beneficiary ────────────────────────────────────────────────
  const benBreakdown = useMemo(() => {
    const map = {};
    expenseSlice.forEach(tx => {
      const key = tx.description || '—';
      if (!map[key]) map[key] = { name: key, amount: 0, count: 0 };
      map[key].amount += tx.amount;
      map[key].count  += 1;
    });
    return Object.values(map)
      .filter(c => c.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 20)
      .map((c, i) => ({ ...c, color: NEUTRAL_COLORS[i % NEUTRAL_COLORS.length] }));
  }, [expenseSlice]);

  // active breakdown data
  const activeBreakdown =
    breakdownView === 'subcategory' ? subBreakdown :
    breakdownView === 'beneficiary' ? benBreakdown :
    catBreakdown;

  const totalBreakdown = activeBreakdown.reduce((s, c) => s + c.amount, 0);

  // ── month navigation ───────────────────────────────────────────────────────
  const isCurrentMonth = selectedMonth === todayMonth;
  function prevMonth() { setSelectedMonth(m => shiftMonth(m, -1)); }
  function nextMonth()  { if (!isCurrentMonth) setSelectedMonth(m => shiftMonth(m, +1)); }

  const sColor = savingsColor(current.rate);

  // ── chart helper: which data keys to show ─────────────────────────────────
  function chartLabel(key) {
    if (key === 'income')   return t('Revenus', 'Income');
    if (key === 'expenses') return t('Dépenses', 'Expenses');
    return t('Solde net', 'Net balance');
  }

  return (
    <div style={s.page}>

      {/* ── Top bar: account chips + settings ─────────────────── */}
      <div style={s.topBar}>
        <div style={s.accountChips}>
          <AccountChip label={t('Tous', 'All')} active={selectedAccountId === 'all'}
            color={BLUE} onClick={() => setSelectedAccountId('all')} />
          {accounts.map(a => (
            <AccountChip key={a.id} label={a.name} active={selectedAccountId === a.id}
              color={a.color || BLUE} onClick={() => setSelectedAccountId(a.id)} />
          ))}
        </div>
        <button onClick={() => setShowSettings(v => !v)} style={s.settingsBtn} title={t('Paramètres', 'Settings')}>
          ⚙️
        </button>
      </div>

      {/* ── Settings panel ────────────────────────────────────── */}
      {showSettings && (
        <div style={s.settingsPanel}>
          {/* Metric type */}
          <div style={s.settingRow}>
            <span style={s.settingLabel}>{t('Afficher', 'Show')}</span>
            <ToggleGroup
              options={[
                { value: 'both',     label: t('Revenus+Dépenses', 'Inc+Exp') },
                { value: 'expenses', label: t('Dépenses', 'Expenses') },
                { value: 'income',   label: t('Revenus', 'Income') },
                { value: 'balance',  label: t('Solde', 'Balance') },
              ]}
              value={metricType} onChange={setMetricType}
            />
          </div>
          {/* Period */}
          <div style={s.settingRow}>
            <span style={s.settingLabel}>{t('Période', 'Period')}</span>
            <ToggleGroup
              options={[
                { value: 3, label: '3M' }, { value: 6, label: '6M' },
                { value: 12, label: '12M' }, { value: 24, label: '24M' },
              ]}
              value={chartMonths} onChange={setChartMonths}
            />
          </div>
          {/* Chart type */}
          <div style={s.settingRow}>
            <span style={s.settingLabel}>{t('Graphique', 'Chart')}</span>
            <ToggleGroup
              options={[{ value: 'area', label: '〜 Area' }, { value: 'bar', label: '▐ Barres' }]}
              value={chartType} onChange={setChartType}
            />
          </div>
          {/* Category filter */}
          <div style={s.settingRow}>
            <span style={s.settingLabel}>{t('Catégorie', 'Category')}</span>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={s.select}>
              <option value="all">{t('Toutes', 'All')}</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{t(c.name_fr, c.name_en)}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Month navigation ──────────────────────────────────── */}
      <div style={s.monthNav}>
        <button onClick={prevMonth} style={s.navBtn}>‹</button>
        <span style={s.monthLabel}>
          {new Date(+selectedMonth.split('-')[0], +selectedMonth.split('-')[1] - 1, 1)
            .toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={nextMonth} style={{ ...s.navBtn, opacity: isCurrentMonth ? 0.25 : 1 }} disabled={isCurrentMonth}>›</button>
      </div>

      {/* ── KPI row ───────────────────────────────────────────── */}
      <div style={s.kpiRow}>
        <KpiCard icon="💰" label={t('Revenus', 'Income')}   value={current.income}   prev={previous.income}   color={GREEN} />
        <KpiCard icon="💸" label={t('Dépenses', 'Expenses')} value={current.expenses} prev={previous.expenses} color={RED}   invertTrend />
        <KpiCard icon="🏦" label={t('Épargne', 'Savings')}   value={current.net}      prev={previous.net}      color={current.net >= 0 ? GREEN : RED} />
      </div>

      {/* ── Savings rate gauge ────────────────────────────────── */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>{t("Taux d'épargne ce mois", 'Savings Rate This Month')}</h3>
        <div style={s.gaugeRow}>
          <SavingsGauge rate={current.rate} color={sColor} />
          <div style={s.gaugeSide}>
            <div style={{ ...s.badge, backgroundColor: sColor + '20', color: sColor }}>
              {current.rate >= 20 ? t('Excellent', 'Excellent')
                : current.rate >= 10 ? t('Satisfaisant', 'Satisfactory')
                : current.rate > 0  ? t('À améliorer', 'Needs work')
                : t('Déficit', 'Deficit')}
            </div>
            {current.income > 0 && (
              <div style={s.gaugeSub}>
                {fmtEur(current.net)} {t('épargnés sur', 'saved from')} {fmtEur(current.income)}
              </div>
            )}
            {previous.income > 0 && (
              <div style={s.gaugeSub}>
                {t('Mois précédent :', 'Last month:')} <strong>{Math.round(previous.rate)}%</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Cash flow chart ───────────────────────────────────── */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>
          {t('Flux de trésorerie', 'Cash Flow')} ({chartMonths}{t(' mois', 'M')})
        </h3>
        <CashFlowChart data={series} chartType={chartType} metricType={metricType} t={t} />
        <div style={s.legend}>
          {(metricType === 'both' || metricType === 'income')   && <LegendItem color={GREEN} label={t('Revenus', 'Income')} />}
          {(metricType === 'both' || metricType === 'expenses') && <LegendItem color={RED}   label={t('Dépenses', 'Expenses')} />}
          {(metricType === 'both' || metricType === 'balance')  && <LegendItem color={BLUE}  label={t('Solde', 'Balance')} line={chartType === 'area'} />}
        </div>
      </div>

      {/* ── Savings rate evolution ────────────────────────────── */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>{t("Évolution du taux d'épargne", 'Savings Rate Evolution')}</h3>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={series} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#636E72' }} />
            <YAxis tick={{ fontSize: 10, fill: '#636E72' }} tickFormatter={v => `${v}%`} domain={['auto', 'auto']} />
            <Tooltip
              formatter={(v) => [v != null ? `${v.toFixed(1)}%` : '—', t("Taux d'épargne", 'Savings rate')]}
              contentStyle={{ fontSize: 12 }} labelStyle={{ fontSize: 12, fontWeight: 600 }}
            />
            <ReferenceLine y={20} stroke={GREEN}  strokeDasharray="4 4"
              label={{ value: '20%', position: 'insideTopRight', fontSize: 9, fill: GREEN }} />
            <ReferenceLine y={10} stroke={ORANGE} strokeDasharray="4 4"
              label={{ value: '10%', position: 'insideTopRight', fontSize: 9, fill: ORANGE }} />
            <ReferenceLine y={0}  stroke={RED}    strokeDasharray="2 4" />
            <Line type="monotone" dataKey="rate" stroke={BLUE} strokeWidth={2}
              dot={{ r: 3, fill: BLUE, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
        <div style={s.legend}>
          <LegendItem color={GREEN}  label="≥ 20% — excellent" />
          <LegendItem color={ORANGE} label="10–20% — correct" />
          <LegendItem color={RED}    label="< 10% — attention" />
        </div>
      </div>

      {/* ── Breakdown ────────────────────────────────────────── */}
      {activeBreakdown.length > 0 && (
        <div style={s.card}>
          {/* Header with toggle */}
          <div style={s.breakdownHeader}>
            <h3 style={{ ...s.cardTitle, margin: 0 }}>{t('Dépenses', 'Expenses')}</h3>
            <div style={s.breakdownToggle}>
              {[
                { value: 'category',    label: t('Catégories', 'Categories') },
                { value: 'subcategory', label: t('Sous-catégories', 'Subcategories') },
                { value: 'beneficiary', label: t('Bénéficiaires', 'Beneficiaries') },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setBreakdownView(opt.value)}
                  style={{
                    ...s.toggleBtn,
                    ...(breakdownView === opt.value ? s.toggleBtnActive : {}),
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Treemap (not for beneficiary — too many items) */}
          {breakdownView !== 'beneficiary' && (
            <div style={{ marginTop: 14 }}>
              <ResponsiveContainer width="100%" height={200}>
                <Treemap
                  data={activeBreakdown.slice(0, 12).map(c => ({ name: c.name, size: Math.round(c.amount), color: c.color }))}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  content={(props) => <TreemapCell {...props} />}
                />
              </ResponsiveContainer>
            </div>
          )}

          {/* Ranked list */}
          <div style={{ ...s.catList, marginTop: breakdownView === 'beneficiary' ? 14 : 12 }}>
            {activeBreakdown.map((item, i) => {
              const pct = totalBreakdown > 0 ? Math.round((item.amount / totalBreakdown) * 100) : 0;
              return (
                <div key={i} style={s.catRow}>
                  <div style={s.catLeft}>
                    <div style={{ ...s.dot, backgroundColor: item.color }} />
                    <span style={s.catName} title={item.name}>{item.name}</span>
                    {item.count > 0 && (
                      <span style={s.countBadge}>×{item.count}</span>
                    )}
                  </div>
                  <div style={s.catRight}>
                    <div style={{ ...s.catBar, width: '70px' }}>
                      <div style={{ ...s.catBarFill, width: `${pct}%`, backgroundColor: item.color }} />
                    </div>
                    <span style={s.catPct}>{pct}%</span>
                    <span style={s.catAmt}>{fmtEur(item.amount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

// ============================================================================
// CASH FLOW CHART
// ============================================================================

function CashFlowChart({ data, chartType, metricType, t }) {
  const showIncome   = metricType === 'both' || metricType === 'income';
  const showExpenses = metricType === 'both' || metricType === 'expenses';
  const showBalance  = metricType === 'both' || metricType === 'balance';

  const tooltipFormatter = (val, key) => [fmtEur(val), key === 'income' ? t('Revenus','Income') : key === 'expenses' ? t('Dépenses','Expenses') : t('Solde net','Net balance')];

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -18, bottom: 0 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#636E72' }} />
          <YAxis tick={{ fontSize: 10, fill: '#636E72' }} tickFormatter={v => fmtEur(v, true)} />
          <Tooltip formatter={tooltipFormatter} contentStyle={{ fontSize: 12 }} labelStyle={{ fontSize: 12, fontWeight: 600 }} />
          {showIncome   && <Bar dataKey="income"   fill={GREEN} radius={[3,3,0,0]} name="income" />}
          {showExpenses && <Bar dataKey="expenses" fill={RED}   radius={[3,3,0,0]} name="expenses" />}
          {showBalance  && <Bar dataKey="net"      fill={BLUE}  radius={[3,3,0,0]} name="net" />}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={190}>
      <ComposedChart data={data} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="gIncome"   x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={GREEN} stopOpacity={0.25} />
            <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gExpenses" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={RED}   stopOpacity={0.25} />
            <stop offset="95%" stopColor={RED}   stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gBalance"  x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={BLUE}  stopOpacity={0.2} />
            <stop offset="95%" stopColor={BLUE}  stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#636E72' }} />
        <YAxis tick={{ fontSize: 10, fill: '#636E72' }} tickFormatter={v => fmtEur(v, true)} />
        <Tooltip formatter={tooltipFormatter} contentStyle={{ fontSize: 12 }} labelStyle={{ fontSize: 12, fontWeight: 600 }} />
        {showIncome   && <Area type="monotone" dataKey="income"   stroke={GREEN} strokeWidth={2} fill="url(#gIncome)"   name="income" />}
        {showExpenses && <Area type="monotone" dataKey="expenses" stroke={RED}   strokeWidth={2} fill="url(#gExpenses)" name="expenses" />}
        {showBalance  && (metricType === 'both'
          ? <Line type="monotone" dataKey="net" stroke={BLUE} strokeWidth={2} dot={false} name="net" />
          : <Area type="monotone" dataKey="net" stroke={BLUE} strokeWidth={2} fill="url(#gBalance)" name="net" />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SavingsGauge({ rate, color }) {
  const pct  = Math.min(Math.max(rate, 0), 100);
  const R    = 58;
  const cx   = 75, cy = 68;

  function polar(deg) {
    const rad = ((deg - 180) * Math.PI) / 180;
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) };
  }

  const angle = pct * 1.8;
  const endPt = polar(angle);
  const arc   = angle > 90 ? 1 : 0;

  return (
    <svg width="150" height="88" viewBox="0 0 150 88" style={{ overflow: 'visible' }}>
      <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none" stroke="#E1E8ED" strokeWidth="12" strokeLinecap="round" />
      {pct > 0 && (
        <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 ${arc} 1 ${endPt.x} ${endPt.y}`}
          fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" />
      )}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="24" fontWeight="700" fill={color}>
        {Math.round(rate)}%
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" fontSize="9" fill="#B2BEC3">
        taux d'épargne
      </text>
      <text x={cx - R - 2} y={cy + 18} textAnchor="middle" fontSize="8" fill="#B2BEC3">0%</text>
      <text x={cx + R + 4} y={cy + 18} textAnchor="middle" fontSize="8" fill="#B2BEC3">100%</text>
    </svg>
  );
}

function TreemapCell({ x, y, width, height, name, size, color }) {
  // Guard: Recharts renders a synthetic root node with undefined name/size — skip it
  if (!name || size == null || !Number.isFinite(size)) return null;
  if (!width || !height || width < 20 || height < 15) return null;
  const fmt = new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  return (
    <g>
      <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2}
        rx={5} style={{ fill: color || BLUE, stroke: 'white', strokeWidth: 2, opacity: 0.88 }} />
      {width > 45 && height > 28 && (
        <>
          <text x={x + width / 2} y={y + height / 2 - (height > 45 ? 8 : 4)}
            textAnchor="middle" fill="white" fontSize={Math.min(11, width / 7)} fontWeight="600">
            {name?.length > 13 ? name.slice(0, 11) + '…' : name}
          </text>
          {height > 42 && (
            <text x={x + width / 2} y={y + height / 2 + 10}
              textAnchor="middle" fill="white" fontSize={9} opacity={0.9}>
              {fmt.format(size)}
            </text>
          )}
        </>
      )}
    </g>
  );
}

function KpiCard({ icon, label, value, prev, color, invertTrend }) {
  const change = pctChange(value, prev);
  const up     = change > 0;
  const isGood = change === null ? null : invertTrend ? !up : up;
  return (
    <div style={{ ...s.kpiCard, borderTop: `3px solid ${color}` }}>
      <div style={s.kpiIcon}>{icon}</div>
      <div style={{ ...s.kpiValue, color }}>{fmtEur(value)}</div>
      <div style={s.kpiLabel}>{label}</div>
      {change !== null && (
        <div style={{ ...s.kpiChange, color: isGood ? GREEN : RED }}>
          {up ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

function AccountChip({ label, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: '16px', border: `2px solid ${color}`,
      backgroundColor: active ? color : 'white', color: active ? 'white' : color,
      fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
    }}>
      {label}
    </button>
  );
}

function ToggleGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)} style={{
          padding: '4px 10px', borderRadius: '8px', border: '1px solid #E1E8ED',
          backgroundColor: value === opt.value ? BLUE : 'white',
          color: value === opt.value ? 'white' : '#636E72',
          fontSize: '12px', fontWeight: value === opt.value ? '600' : '400', cursor: 'pointer',
        }}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function LegendItem({ color, label, line }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {line
        ? <div style={{ width: 14, height: 2, backgroundColor: color, borderRadius: 1 }} />
        : <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color }} />}
      <span style={{ fontSize: 10, color: '#636E72' }}>{label}</span>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const s = {
  page: { padding: '16px', paddingBottom: '100px', display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: FONT },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' },
  accountChips: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  settingsBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '4px', flexShrink: 0 },
  settingsPanel: {
    backgroundColor: 'white', borderRadius: '12px', padding: '14px 16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: '12px',
  },
  settingRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' },
  settingLabel: { fontSize: '12px', color: '#636E72', fontWeight: '500', minWidth: '60px' },
  select: {
    fontSize: '12px', padding: '4px 8px', borderRadius: '8px',
    border: '1px solid #E1E8ED', backgroundColor: 'white', color: '#2D3436', outline: 'none',
  },
  monthNav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'white', borderRadius: '12px', padding: '10px 16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  navBtn: { fontSize: '26px', background: 'none', border: 'none', cursor: 'pointer', color: '#2D3436', padding: '0 6px', lineHeight: 1 },
  monthLabel: { fontSize: '16px', fontWeight: '600', color: '#2D3436', textTransform: 'capitalize' },
  kpiRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' },
  kpiCard: { backgroundColor: 'white', borderRadius: '12px', padding: '12px 8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' },
  kpiIcon:   { fontSize: '20px', marginBottom: '4px' },
  kpiValue:  { fontSize: '13px', fontWeight: '700', marginBottom: '2px' },
  kpiLabel:  { fontSize: '10px', color: '#636E72', marginBottom: '4px' },
  kpiChange: { fontSize: '10px', fontWeight: '600' },
  card: { backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardTitle: { margin: '0 0 14px 0', fontSize: '14px', fontWeight: '600', color: '#2D3436' },
  gaugeRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '12px' },
  gaugeSide: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  badge: { padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' },
  gaugeSub: { fontSize: '12px', color: '#636E72', textAlign: 'center', lineHeight: 1.4 },
  legend: { display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '10px', flexWrap: 'wrap' },
  breakdownHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' },
  breakdownToggle: { display: 'flex', gap: '4px' },
  toggleBtn: {
    padding: '4px 8px', borderRadius: '8px', border: '1px solid #E1E8ED',
    backgroundColor: 'white', color: '#636E72', fontSize: '11px', cursor: 'pointer',
  },
  toggleBtnActive: { backgroundColor: BLUE, color: 'white', borderColor: BLUE, fontWeight: '600' },
  catList: { display: 'flex', flexDirection: 'column', gap: '9px' },
  catRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  catLeft: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 },
  dot:     { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 },
  catName: { fontSize: '13px', color: '#2D3436', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  countBadge: { fontSize: '10px', color: '#636E72', backgroundColor: '#F0F0F0', padding: '1px 5px', borderRadius: '8px', flexShrink: 0 },
  catRight: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
  catBar:   { height: '5px', backgroundColor: '#F0F0F0', borderRadius: '3px', overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: '3px', transition: 'width 0.4s ease' },
  catPct:  { fontSize: '11px', color: '#636E72', minWidth: '28px', textAlign: 'right' },
  catAmt:  { fontSize: '12px', fontWeight: '600', color: '#2D3436', minWidth: '70px', textAlign: 'right' },
};
