import { useState } from 'react';
import { useApp } from './context/AppContext';
import Header from './components/common/Header';
import Navigation from './components/common/Navigation';
import SettingsPage from './pages/SettingsPage';
import HomePage from './pages/HomePage';
import TransactionsPage from './pages/TransactionsPage';
import BudgetsPage from './pages/BudgetsPage';
import InsightsPage from './pages/InsightsPage';
import RecurringPage from './pages/RecurringPage';
import DashboardPage from './pages/DashboardPage';

export default function FinanceApp({ onHome }) {
  const { setupLoading, dataLoading, t } = useApp();
  const [activeTab, setActiveTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);

  if (setupLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingCard}>
          <span style={styles.loadingIcon}>⚙️</span>
          <p style={styles.loadingText}>{t('Configuration du compte...', 'Setting up account...')}</p>
        </div>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingCard}>
          <span style={styles.loadingIcon}>📊</span>
          <p style={styles.loadingText}>{t('Chargement des données...', 'Loading data...')}</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'home': return <HomePage />;
      case 'transactions': return <TransactionsPage />;
      case 'recurring': return <RecurringPage />;
      case 'budgets': return <BudgetsPage />;
      case 'dashboard': return <DashboardPage />;
      case 'insights': return <InsightsPage />;
      default: return <HomePage />;
    }
  };

  return (
    <div style={styles.app}>
      <div style={styles.appContainer}>
        <Header onSettingsClick={() => setShowSettings(true)} onHomeClick={onHome} />
        <main style={styles.main}>{renderPage()}</main>
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {showSettings && (
        <div style={styles.settingsOverlay}>
          <div style={styles.settingsModal}>
            <button onClick={() => setShowSettings(false)} style={styles.settingsClose}>
              ✕ {t('Fermer', 'Close')}
            </button>
            <SettingsPage />
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  app: {
    width: '100%', minHeight: '100vh', backgroundColor: '#F5F7FA',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex', justifyContent: 'center',
  },
  appContainer: {
    width: '100%', maxWidth: '600px', minHeight: '100vh',
    backgroundColor: '#F5F7FA', position: 'relative',
  },
  main: { width: '100%', minHeight: 'calc(100vh - 60px - 70px)' },
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
  settingsOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, overflowY: 'auto' },
  settingsModal: { minHeight: '100%', backgroundColor: '#F5F7FA' },
  settingsClose: {
    position: 'sticky', top: 0, display: 'flex', alignItems: 'center', gap: '8px',
    width: '100%', padding: '16px', backgroundColor: 'white', border: 'none',
    borderBottom: '1px solid #E1E8ED', fontSize: '15px', fontWeight: '500',
    color: '#636E72', cursor: 'pointer', zIndex: 10,
  },
};
