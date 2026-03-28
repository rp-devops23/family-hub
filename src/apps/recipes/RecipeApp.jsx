import { RecipeProvider } from './context/RecipeContext'
import Layout from './components/Layout'

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

export default function RecipeApp({ onHome }) {
  return (
    <RecipeProvider>
      <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#F5F7FA', fontFamily: FONT, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '600px', minHeight: '100vh', backgroundColor: '#F5F7FA', position: 'relative' }}>
          <Layout onHome={onHome} />
        </div>
      </div>
    </RecipeProvider>
  )
}
