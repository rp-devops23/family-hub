import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './apps/finance/context/AppContext';
import LoginPage from './apps/finance/pages/LoginPage';
import FinanceApp from './apps/finance/FinanceApp';
import RecipeApp from './apps/recipes/RecipeApp';
import AgentApp from './apps/agent/AgentApp';
import CorveesApp from './apps/corvees/CorveesApp';
import TravauxApp from './apps/travaux/TravauxApp';
import ShoppingApp from './apps/shopping/ShoppingApp';
import HolidayApp from './apps/holiday/HolidayApp';
import PortalPage from './portal/PortalPage';
import { isAppId, pushRecentApp } from './portal/apps';
import GoogleCallbackPage from './apps/agent/components/GoogleCallbackPage';
import './App.css';

// L'application ouverte est reflétée dans l'URL (#/recettes…) : le bouton retour du
// téléphone ramène à l'accueil au lieu de quitter, et un rechargement garde l'app.
function appFromHash() {
  const id = window.location.hash.replace(/^#\/?/, '');
  return isAppId(id) ? id : null;
}

function AppInner() {
  const { user, authLoading } = useAuth();
  const [activeApp, setActiveApp] = useState(appFromHash);

  useEffect(() => {
    const onPop = () => setActiveApp(appFromHash());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openApp = (id) => {
    pushRecentApp(id);
    window.history.pushState({ app: id }, '', `#/${id}`);
    setActiveApp(id);
  };

  const goHome = () => {
    if (window.history.state?.app) {
      window.history.back(); // dépile l'entrée ajoutée par openApp
    } else {
      window.history.replaceState(null, '', window.location.pathname);
      setActiveApp(null);
    }
  };

  if (authLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingCard}>
          <span style={styles.loadingIcon}>🏠</span>
          <p style={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  // Handle Google OAuth callback redirect
  if (window.location.pathname === '/auth/google/callback') {
    return <GoogleCallbackPage onDone={() => {
      window.history.replaceState({}, '', '/');
      openApp('agent');
    }} />;
  }

  if (activeApp === 'finance') {
    return (
      <AppProvider>
        <FinanceApp onHome={goHome} />
      </AppProvider>
    );
  }

  if (activeApp === 'recipes') {
    return <RecipeApp onHome={goHome} />;
  }

  if (activeApp === 'agent') {
    return <AgentApp onHome={goHome} />;
  }

  if (activeApp === 'corvees') {
    return <CorveesApp onHome={goHome} />;
  }

  if (activeApp === 'travaux') {
    return <TravauxApp onHome={goHome} />;
  }

  if (activeApp === 'shopping') {
    return <ShoppingApp onHome={goHome} />;
  }

  if (activeApp === 'holiday') {
    return <HolidayApp onHome={goHome} />;
  }

  return <PortalPage onSelectApp={openApp} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

const styles = {
  loadingContainer: {
    width: '100%', minHeight: '100vh', backgroundColor: '#F5F7FA',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loadingCard: {
    backgroundColor: 'white', borderRadius: '16px', padding: '40px',
    textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  loadingIcon: { fontSize: '48px', display: 'block', marginBottom: '16px' },
  loadingText: { color: '#636E72', fontSize: '16px', margin: 0 },
};
