import { useAuth } from '../context/AuthContext';

// ============================================================================
// PORTAL PAGE - Family hub home screen
// ============================================================================

const APPS = [
  {
    id: 'finance',
    icon: '💰',
    titleFr: 'Finances',
    titleEn: 'Finance',
    descFr: 'Budgets, transactions & insights',
    descEn: 'Budgets, transactions & insights',
    color: '#00A3E0',
    bg: '#EBF8FF',
  },
  {
    id: 'recipes',
    icon: '🍽️',
    titleFr: 'Recettes',
    titleEn: 'Recipes',
    descFr: 'Recettes, planning & courses',
    descEn: 'Recipes, meal planning & shopping',
    color: '#2D5A3D',
    bg: '#F0FFF4',
  },
  {
    id: 'agent',
    icon: '🤖',
    titleFr: 'Agent IA',
    titleEn: 'AI Agent',
    descFr: 'Assistant famille intelligent',
    descEn: 'Smart family assistant',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
];

export default function PortalPage({ onSelectApp }) {
  const { signOut, language, toggleLanguage, t } = useAuth();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🏠</span>
          <span style={styles.logoText}>{t('Espace Famille', 'Family Hub')}</span>
        </div>
        <div style={styles.headerActions}>
          <button onClick={toggleLanguage} style={styles.langBtn}>
            {language === 'fr' ? 'EN 🇬🇧' : 'FR 🇫🇷'}
          </button>
          <button onClick={signOut} style={styles.signOutBtn} title={t('Se déconnecter', 'Sign out')}>
            🚪
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <p style={styles.subtitle}>{t('Choisissez une application', 'Choose an app')}</p>

        <div style={styles.grid}>
          {APPS.map(app => (
            <button
              key={app.id}
              onClick={() => onSelectApp(app.id)}
              style={{ ...styles.card, borderTop: `4px solid ${app.color}`, background: app.bg }}
            >
              <span style={styles.appIcon}>{app.icon}</span>
              <span style={{ ...styles.appTitle, color: app.color }}>
                {language === 'fr' ? app.titleFr : app.titleEn}
              </span>
              <span style={styles.appDesc}>
                {language === 'fr' ? app.descFr : app.descEn}
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    minHeight: '100vh',
    backgroundColor: '#F5F7FA',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    maxWidth: '600px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: 'white',
    borderBottom: '1px solid #E1E8ED',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoIcon: {
    fontSize: '24px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#2D3436',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  langBtn: {
    padding: '6px 12px',
    border: '1px solid #E1E8ED',
    borderRadius: '6px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '13px',
  },
  signOutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    border: '1px solid #E1E8ED',
    borderRadius: '6px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '16px',
  },
  main: {
    width: '100%',
    maxWidth: '600px',
    padding: '32px 16px',
  },
  subtitle: {
    textAlign: 'center',
    color: '#636E72',
    fontSize: '15px',
    marginBottom: '24px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '16px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    padding: '28px 16px',
    borderRadius: '16px',
    border: 'none',
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  appIcon: {
    fontSize: '40px',
  },
  appTitle: {
    fontSize: '17px',
    fontWeight: '700',
  },
  appDesc: {
    fontSize: '12px',
    color: '#636E72',
    textAlign: 'center',
    lineHeight: '1.4',
  },
};
