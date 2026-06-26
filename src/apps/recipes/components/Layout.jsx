import { useApp } from '../context/RecipeContext'
import RecipesPage from './RecipesPage'
import CalendarPage from './CalendarPage'
import ShoppingListPage from './ShoppingListPage'
import SettingsPage from './SettingsPage'
import { colors, shadows } from '../lib/theme'

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
          <span style={styles.logoText}>{language === 'fr' ? 'Recettes' : 'Recipes'}</span>
        </div>

        <div style={styles.actions}>
          <button onClick={toggleLanguage} style={styles.langBtn}>
            {language === 'fr' ? 'EN' : 'FR'}
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
        <div style={styles.navInner}>
          {tabs.map(tab => {
            const isActive = currentTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                style={{ ...styles.tab, ...(isActive ? styles.tabActive : {}) }}
              >
                <span style={{ ...styles.icon, transform: isActive ? 'scale(1.15)' : 'scale(1)' }}>
                  {tab.icon}
                  {tab.badge > 0 && <span style={styles.badge}>{tab.badge > 9 ? '9+' : tab.badge}</span>}
                </span>
                <span style={{ ...styles.label, color: isActive ? colors.forest : colors.textMuted, fontWeight: isActive ? 700 : 500 }}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    backgroundColor: colors.background,
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 16px',
    backgroundColor: 'rgba(255,255,255,0.82)',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    borderBottom: `1px solid ${colors.warmGray}`,
    position: 'sticky', top: 0, zIndex: 200,
    boxSizing: 'border-box'
  },
  logo: { display: 'flex', alignItems: 'center', gap: '10px' },
  homeBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '34px', height: '34px',
    border: `1.5px solid ${colors.warmGray}`, borderRadius: '10px',
    background: 'white', fontSize: '16px', cursor: 'pointer', padding: 0,
    transition: 'all 0.2s ease'
  },
  logoText: { fontSize: '20px', fontWeight: 800, color: colors.textPrimary, fontFamily: FONT, letterSpacing: '-0.3px' },
  actions: { display: 'flex', alignItems: 'center', gap: '6px' },
  langBtn: {
    padding: '6px 14px', border: `1.5px solid ${colors.warmGray}`, borderRadius: '10px',
    background: 'white', cursor: 'pointer', fontSize: '13px', fontFamily: FONT,
    fontWeight: 600, color: colors.textSecondary, transition: 'all 0.2s ease'
  },
  actionBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '36px', height: '36px',
    border: `1.5px solid ${colors.warmGray}`, borderRadius: '10px',
    background: 'white', cursor: 'pointer', fontSize: '17px',
    transition: 'all 0.2s ease'
  },
  actionBtnActive: {
    backgroundColor: colors.accentLight, borderColor: colors.accent
  },
  main: { flex: 1, paddingBottom: '90px', overflowY: 'auto' },
  nav: {
    position: 'fixed', bottom: 0,
    left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '600px',
    padding: '6px 12px max(8px, env(safe-area-inset-bottom))',
    zIndex: 100
  },
  navInner: {
    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
    padding: '6px 4px',
  },
  tab: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '2px', padding: '8px 12px',
    border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
    borderRadius: '14px', transition: 'all 0.25s ease'
  },
  tabActive: { backgroundColor: colors.forest + '0F' },
  icon: { fontSize: '20px', position: 'relative', transition: 'all 0.25s ease' },
  badge: {
    position: 'absolute', top: '-5px', right: '-10px',
    backgroundColor: colors.error, color: 'white',
    fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '10px',
    minWidth: '16px', textAlign: 'center'
  },
  label: { fontSize: '11px', transition: 'all 0.2s ease', letterSpacing: '0.1px' }
}
