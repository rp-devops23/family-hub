import { RecipeProvider } from './context/RecipeContext'
import Layout from './components/Layout'

export default function RecipeApp({ onHome }) {
  return (
    <RecipeProvider>
      <Layout onHome={onHome} />
    </RecipeProvider>
  )
}
