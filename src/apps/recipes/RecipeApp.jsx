import { RecipeProvider } from './context/RecipeContext'
import Layout from './components/Layout'
import { colors } from './lib/theme'
import './lib/recipes.css'

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

// section : 'recipes' | 'calendar' | 'groceries' — trois applications du portail, une seule couche de données
export default function RecipeApp({ section = 'recipes', onHome, initialTab }) {
  return (
    <RecipeProvider initialTab={section === 'groceries' ? 'shopping' : section}>
      <div className="recipes-app" style={{ width: '100%', minHeight: '100vh', backgroundColor: colors.background, fontFamily: FONT, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '600px', minHeight: '100vh', backgroundColor: colors.background, position: 'relative' }}>
          <Layout section={section} onHome={onHome} showSettings={initialTab === 'settings'} />
        </div>
      </div>
    </RecipeProvider>
  )
}
