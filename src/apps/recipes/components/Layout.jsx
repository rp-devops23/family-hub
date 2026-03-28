import { useApp } from '../context/RecipeContext'
import RecipesPage from './RecipesPage'
import CalendarPage from './CalendarPage'
import ShoppingListPage from './ShoppingListPage'
import SettingsPage from './SettingsPage'

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

export default function Layout({ onHome }) {
  const { t, language, toggleLanguage, signOut, currentTab, setCurrentTab, shoppingItems } = useApp()

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
  ]

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>
          {onHome && (
            <button onClick={onHome} style={styles.homeBtn} title={language === 'fr' ? 'Accueil' : 'Home'}>
              🏠
            </button>
          )}
          <span style={styles.logoIcon}>🍽️</span>
          <span style={styles.logoText}>{language === 'fr' ? 'Mes Recettes' : 'My Recipes'}</span>
        </div>

        <div style={styles.actions}>
          <button onClick={toggleLanguage} style={styles.langBtn}>
            {language === 'fr' ? 'EN 🇬🇧' : 'FR 🇫🇷'}
          </button>
          <button onClick={() => setCurrentTab('settings')} style={{ ...styles.actionBtn, ...(currentTab === 'settings' ? styles.actionBtnActive : {}) }} title={t('nav.settings')}>
            ⚙️
          </button>
          <button onClick={signOut} style={styles.actionBtn} title={language === 'fr' ? 'Se déconnecter' : 'Sign out'}>
            🚪
          </button>
        </div>
      </header>

      <main style={styles.main}>
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
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', backgroundColor: 'white',
    borderBottom: '1px solid #E1E8ED',
    position: 'sticky', top: 0, zIndex: 200,
    boxSizing: 'border-box'
  },
  logo: { display: 'flex', alignItems: 'center', gap: '8px' },
  homeBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '32px', height: '32px',
    border: '1px solid #E1E8ED', borderRadius: '8px',
    background: 'white', fontSize: '16px', cursor: 'pointer', padding: 0
  },
  logoIcon: { fontSize: '24px' },
  logoText: { fontSize: '20px', fontWeight: 700, color: '#2D3436', fontFamily: FONT },
  actions: { display: 'flex', alignItems: 'center', gap: '8px' },
  langBtn: {
    padding: '6px 12px', border: '1px solid #E1E8ED', borderRadius: '6px',
    background: 'white', cursor: 'pointer', fontSize: '13px', fontFamily: FONT
  },
  actionBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '36px', height: '36px',
    border: '1px solid #E1E8ED', borderRadius: '8px',
    background: 'white', cursor: 'pointer', fontSize: '18px'
  },
  actionBtnActive: {
    backgroundColor: '#F0F9FF', borderColor: '#00A3E0'
  },
  main: { flex: 1, paddingBottom: '80px', overflowY: 'auto' },
  nav: {
    position: 'fixed', bottom: 0,
    left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '600px',
    backgroundColor: 'white', borderTop: '1px solid #E1E8ED',
    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
    padding: '8px 0 max(8px, env(safe-area-inset-bottom))', zIndex: 100
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
