import { useApp } from '../../context/AppContext';

// ============================================================================
// NAVIGATION - Bottom tab bar
// ============================================================================

export default function Navigation({ activeTab, onTabChange }) {
  const { t } = useApp();

  const tabs = [
    { id: 'home', icon: '🏠', labelFr: 'Accueil', labelEn: 'Home' },
    { id: 'transactions', icon: '💳', labelFr: 'Transactions', labelEn: 'Transactions' },
    { id: 'recurring', icon: '🔄', labelFr: 'Récurrences', labelEn: 'Recurring' },
    { id: 'budgets', icon: '🐷', labelFr: 'Budgets', labelEn: 'Budgets' },
    { id: 'insights', icon: '📊', labelFr: 'Analyses', labelEn: 'Insights' },
  ];

  return (
    <nav style={styles.nav}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              ...styles.tab,
              ...(isActive ? styles.tabActive : {})
            }}
          >
            <span style={{
              ...styles.icon,
              opacity: isActive ? 1 : 0.6,
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
            }}>
              {tab.icon}
            </span>
            <span style={{
              ...styles.label,
              color: isActive ? '#00A3E0' : '#636E72',
              fontWeight: isActive ? '600' : '400'
            }}>
              {t(tab.labelFr, tab.labelEn)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

const styles = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '600px',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'white',
    borderTop: '1px solid #E1E8ED',
    padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
    zIndex: 100,
  },
  tab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'background-color 0.2s',
  },
  tabActive: {
    backgroundColor: '#F0F9FF',
  },
  icon: {
    fontSize: '20px',
    transition: 'all 0.2s',
  },
  label: {
    fontSize: '11px',
    transition: 'color 0.2s',
  },
};