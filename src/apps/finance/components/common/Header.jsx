import { useApp } from '../../context/AppContext';

// ============================================================================
// HEADER - Top bar with logo, language toggle, sign out
// ============================================================================

export default function Header({ onSettingsClick, onHomeClick }) {
  const { user, language, toggleLanguage, signOut, t } = useApp();

  return (
    <header style={styles.header}>
      <div style={styles.logo}>
        {onHomeClick && (
          <button onClick={onHomeClick} style={styles.homeBtn} title={t('Accueil', 'Home')}>
            🏠
          </button>
        )}
        <span style={styles.logoIcon}>💰</span>
        <span style={styles.logoText}>MyFinance</span>
      </div>

      <div style={styles.actions}>
        <button onClick={toggleLanguage} style={styles.langBtn}>
          {language === 'fr' ? 'EN 🇬🇧' : 'FR 🇫🇷'}
        </button>

        <button onClick={onSettingsClick} style={styles.actionBtn} title={t('Paramètres', 'Settings')}>
          ⚙️
        </button>

        <button onClick={signOut} style={styles.signOutBtn} title={t('Se déconnecter', 'Sign out')}>
          🚪
        </button>
      </div>
    </header>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: 'white',
    borderBottom: '1px solid #E1E8ED',
    position: 'sticky',
    top: 0,
    zIndex: 50,
    width: '100%',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  homeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    border: '1px solid #E1E8ED',
    borderRadius: '8px',
    background: 'white',
    fontSize: '16px',
    cursor: 'pointer',
    padding: 0,
  },
  logoIcon: {
    fontSize: '24px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#2D3436',
  },
  actions: {
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
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    border: '1px solid #E1E8ED',
    borderRadius: '8px',
    background: 'white',
    fontSize: '18px',
    cursor: 'pointer',
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
    color: '#636E72',
  },
};