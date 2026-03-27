import { useApp } from '../context/RecipeContext'
import RecipesPage from './RecipesPage'
import CalendarPage from './CalendarPage'
import ShoppingListPage from './ShoppingListPage'
import SettingsPage from './SettingsPage'

export default function Layout({ onHome }) {
  const { t, currentTab, setCurrentTab, shoppingItems } = useApp()

  const uncheckedCount = shoppingItems.filter(item => !item.checked).length

  const renderPage = () => {
    switch (currentTab) {
      case 'recipes': return <RecipesPage />
      case 'calendar': return <CalendarPage />
      case 'shopping': return <ShoppingListPage />
      case 'settings': return <SettingsPage onHome={onHome} />
      default: return <RecipesPage />
    }
  }

  const tabs = [
    { id: 'recipes', label: t('nav.recipes'), icon: '🍳' },
    { id: 'calendar', label: t('nav.calendar'), icon: '📅' },
    { id: 'shopping', label: t('nav.shopping'), icon: '🛒', badge: uncheckedCount },
    { id: 'settings', label: t('nav.settings'), icon: '⚙️' }
  ]

  return (
    <div style={styles.container}>
      {onHome && (
        <div style={styles.hubBar}>
          <button onClick={onHome} style={styles.hubBtn}>
            ← {t('nav.recipes') === 'Recettes' ? 'Accueil' : 'Home'}
          </button>
        </div>
      )}

      <main style={{ ...styles.main, paddingTop: onHome ? '44px' : '0' }}>
        {renderPage()}
      </main>

      <nav style={styles.nav}>
        {tabs.map(tab => {
          const isActive = currentTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              style={{ ...styles.tab, ...(isActive ? styles.tabActive : {}) }}
            >
              <span style={{ ...styles.icon, opacity: isActive ? 1 : 0.5, transform: isActive ? 'scale(1.1)' : 'scale(1)' }}>
                {tab.icon}
                {tab.badge > 0 && <span style={styles.badge}>{tab.badge > 9 ? '9+' : tab.badge}</span>}
              </span>
              <span style={{ ...styles.label, color: isActive ? '#00A3E0' : '#636E72', fontWeight: isActive ? 600 : 400 }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    backgroundColor: '#F5F7FA',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  hubBar: {
    position: 'fixed', top: 0, left: 0, right: 0, height: '44px',
    backgroundColor: 'white', borderBottom: '1px solid #E1E8ED',
    display: 'flex', alignItems: 'center', paddingLeft: '16px', zIndex: 200
  },
  hubBtn: {
    background: 'none', border: 'none', color: '#00A3E0', fontSize: '14px',
    fontWeight: 600, cursor: 'pointer',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  main: { flex: 1, paddingBottom: '80px', overflowY: 'auto' },
  nav: {
    position: 'fixed', bottom: 0, left: 0, right: 0, height: '70px',
    backgroundColor: 'white', borderTop: '1px solid #E1E8ED',
    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
    paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 100
  },
  tab: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '4px', padding: '8px 12px',
    border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
    borderRadius: '8px', transition: 'background-color 0.2s'
  },
  tabActive: { backgroundColor: '#F0F9FF' },
  icon: { fontSize: '20px', position: 'relative', transition: 'all 0.2s' },
  badge: {
    position: 'absolute', top: '-6px', right: '-10px',
    backgroundColor: '#E74C3C', color: 'white',
    fontSize: '10px', fontWeight: 700, padding: '2px 5px', borderRadius: '10px',
    minWidth: '16px', textAlign: 'center'
  },
  label: { fontSize: '11px', transition: 'color 0.2s' }
}
