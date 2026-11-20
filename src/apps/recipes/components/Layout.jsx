import { useState } from 'react'
import { useApp } from '../context/RecipeContext'
import RecipesPage from './RecipesPage'
import CalendarPage from './CalendarPage'
import ShoppingListPage from './ShoppingListPage'
import SettingsPage from './SettingsPage'
import MealStatsPage from './MealStatsPage'
import PricesPage from './PricesPage'
import { colors, primaryRgb } from '../lib/theme'

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

const SECTION = {
  recipes: { tab: 'recipes', fr: 'Recettes', en: 'Recipes', icon: '🍳' },
  calendar: { tab: 'calendar', fr: 'Repas', en: 'Meals', icon: '📅' },
  groceries: { tab: 'shopping', fr: 'Courses', en: 'Groceries', icon: '🛒' },
}

// Chaque section est une application à part entière ; seule la section « recettes » a des réglages
// (ingrédients, catégories, étiquettes) et elle propose un accès direct aux deux autres.
export default function Layout({ section = 'recipes', onHome }) {
  const { language, signOut, currentTab, setCurrentTab, t } = useApp()
  const info = SECTION[section] ?? SECTION.recipes
  const inSettings = section === 'recipes' && currentTab === 'settings'
  const [showStats, setShowStats] = useState(false)
  const inStats = section === 'calendar' && showStats
  const [showPrices, setShowPrices] = useState(false)
  const inPrices = section === 'recipes' && showPrices && !inSettings

  const renderPage = () => {
    if (inSettings) return <SettingsPage onHome={onHome} />
    if (inStats) return <MealStatsPage />
    if (inPrices) return <PricesPage />
    switch (info.tab) {
      case 'calendar': return <CalendarPage />
      case 'shopping': return <ShoppingListPage />
      default: return <RecipesPage />
    }
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>
          {onHome && (
            <button onClick={onHome} style={styles.homeBtn} title={language === 'fr' ? 'Accueil' : 'Home'}>
              🏠
            </button>
          )}
          <span style={{ fontSize: '21px' }}>{info.icon}</span>
          <span style={styles.logoText}>{inStats ? 'Stats' : inPrices ? (language === 'fr' ? 'Prix' : 'Prices') : (language === 'fr' ? info.fr : info.en)}</span>
        </div>

        <div style={styles.actions}>
          {section === 'calendar' && (
            <button onClick={() => setShowStats(v => !v)} style={{ ...styles.actionBtn, ...(inStats ? styles.actionBtnActive : {}) }} title={language === 'fr' ? 'Statistiques' : 'Statistics'} aria-label={language === 'fr' ? 'Statistiques' : 'Statistics'}>
              📊
            </button>
          )}
          {section === 'recipes' && (
            <button onClick={() => { setShowPrices(v => !v); if (currentTab === 'settings') setCurrentTab('recipes') }} style={{ ...styles.actionBtn, ...(inPrices ? styles.actionBtnActive : {}) }} title={language === 'fr' ? 'Prix des ingrédients' : 'Ingredient prices'} aria-label={language === 'fr' ? 'Prix des ingrédients' : 'Ingredient prices'}>
              💶
            </button>
          )}
          {section === 'recipes' && (
            <button onClick={() => setCurrentTab(inSettings ? 'recipes' : 'settings')} style={{ ...styles.actionBtn, ...(inSettings ? styles.actionBtnActive : {}) }} title={t('nav.settings')}>
              ⚙️
            </button>
          )}
          <button onClick={signOut} style={styles.actionBtn} title={language === 'fr' ? 'Se déconnecter' : 'Sign out'}>
            🚪
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <div key={`${section}-${currentTab}`} className="rc-page">
          {renderPage()}
        </div>
      </main>

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
    backgroundColor: 'rgba(255,255,255,0.78)',
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
  logoText: {
    fontSize: '21px', fontWeight: 800, fontFamily: FONT, letterSpacing: '-0.4px',
    backgroundImage: `linear-gradient(135deg, ${colors.forest}, ${colors.terracotta})`,
    WebkitBackgroundClip: 'text', backgroundClip: 'text',
    WebkitTextFillColor: 'transparent', color: colors.forest
  },
  actions: { display: 'flex', alignItems: 'center', gap: '6px' },
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
  main: { flex: 1 },
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
    boxShadow: `0 8px 28px rgba(${primaryRgb},0.14), 0 0 0 1px rgba(${primaryRgb},0.06)`,
    padding: '6px 4px',
  },
  tab: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '2px', padding: '8px 12px',
    border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
    borderRadius: '14px', transition: 'all 0.25s ease'
  },
  tabActive: { backgroundColor: colors.forest + '1A' },
  icon: { fontSize: '20px', position: 'relative', transition: 'all 0.25s ease' },
  badge: {
    position: 'absolute', top: '-5px', right: '-10px',
    backgroundColor: colors.error, color: 'white',
    fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '10px',
    minWidth: '16px', textAlign: 'center'
  },
  label: { fontSize: '11px', transition: 'all 0.2s ease', letterSpacing: '0.1px' }
}
