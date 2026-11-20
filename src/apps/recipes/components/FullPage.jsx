import { createPortal } from 'react-dom'

// Affiche son contenu en plein écran, au-dessus de l'en-tête : le portail évite que les animations
// de page (opacité) n'enferment l'écran dans la page qui l'ouvre.
export default function FullPage({ children }) {
  return createPortal(<div className="recipes-app">{children}</div>, document.body)
}
