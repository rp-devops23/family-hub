import { useState } from 'react';
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
import GoogleCallbackPage from './apps/agent/components/GoogleCallbackPage';
import './App.css';

function AppInner() {
  const { user, authLoading } = useAuth();
  const [activeApp, setActiveApp] = useState(null);

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
      setActiveApp('agent');
    }} />;
  }

  if (activeApp === 'finance') {
    return (
      <AppProvider>
        <FinanceApp onHome={() => setActiveApp(null)} />
      </AppProvider>
    );
  }

  if (activeApp === 'recipes') {
    return <RecipeApp onHome={() => setActiveApp(null)} />;
  }

  if (activeApp === 'agent') {
    return <AgentApp onHome={() => setActiveApp(null)} />;
  }

  if (activeApp === 'corvees') {
    return <CorveesApp onHome={() => setActiveApp(null)} />;
  }

  if (activeApp === 'travaux') {
    return <TravauxApp onHome={() => setActiveApp(null)} />;
  }

  if (activeApp === 'shopping') {
    return <ShoppingApp onHome={() => setActiveApp(null)} />;
  }

  if (activeApp === 'holiday') {
    return <HolidayApp onHome={() => setActiveApp(null)} />;
  }

  return <PortalPage onSelectApp={setActiveApp} />;
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
