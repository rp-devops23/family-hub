import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';

// ============================================================================
// GOOGLE CONNECT PAGE — Connect / disconnect Google account
// ============================================================================

export default function GoogleConnectPage({ onBack }) {
  const { t } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | connected | disconnected
  const [googleEmail, setGoogleEmail] = useState(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setStatus('loading');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setStatus('disconnected'); return; }

    const { data } = await supabase
      .from('google_tokens')
      .select('email')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (data) {
      setGoogleEmail(data.email);
      setStatus('connected');
    } else {
      setStatus('disconnected');
    }
  }

  async function handleConnect() {
    setWorking(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError('Not logged in'); setWorking(false); return; }

    const { data, error: fnErr } = await supabase.functions.invoke('google-auth-url', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (fnErr || data?.error) {
      setError(data?.error ?? fnErr?.message ?? 'Unknown error');
      setWorking(false);
      return;
    }

    // Redirect browser to Google OAuth
    window.location.href = data.url;
  }

  async function handleDisconnect() {
    if (!window.confirm(t('Déconnecter ton compte Google ?', 'Disconnect your Google account?'))) return;
    setWorking(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setWorking(false); return; }

    const { error: dbErr } = await supabase
      .from('google_tokens')
      .delete()
      .eq('user_id', session.user.id);

    if (dbErr) {
      setError(dbErr.message);
    } else {
      setGoogleEmail(null);
      setStatus('disconnected');
    }
    setWorking(false);
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>←</button>
        <h2 style={styles.title}>{t('Compte Google', 'Google Account')}</h2>
        <div style={{ width: 36 }} />
      </div>

      <div style={styles.card}>
        <div style={styles.googleIcon}>
          <svg viewBox="0 0 48 48" width="48" height="48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
        </div>

        {status === 'loading' && (
          <p style={styles.info}>{t('Chargement…', 'Loading…')}</p>
        )}

        {status === 'connected' && (
          <>
            <div style={styles.connectedBadge}>
              <span style={styles.checkmark}>✓</span>
              <span>{t('Connecté', 'Connected')}</span>
            </div>
            {googleEmail && <p style={styles.email}>{googleEmail}</p>}
            <p style={styles.info}>
              {t(
                "L'agent IA a accès à ton agenda Google et tes emails récents pour mieux t'aider.",
                "The AI agent has access to your Google Calendar and recent emails to assist you better."
              )}
            </p>
            <div style={styles.scopeList}>
              <div style={styles.scopeItem}>📅 {t('Google Calendar (lecture seule)', 'Google Calendar (read-only)')}</div>
              <div style={styles.scopeItem}>📧 {t('Gmail (lecture seule)', 'Gmail (read-only)')}</div>
            </div>
            <button onClick={handleConnect} disabled={working} style={styles.switchBtn}>
              {working ? t('Redirection…', 'Redirecting…') : t('Changer de compte Google', 'Switch Google account')}
            </button>
            <button onClick={handleDisconnect} disabled={working} style={styles.disconnectBtn}>
              {working ? t('Déconnexion…', 'Disconnecting…') : t('Déconnecter', 'Disconnect')}
            </button>
          </>
        )}

        {status === 'disconnected' && (
          <>
            <p style={styles.info}>
              {t(
                "Connecte ton compte Google pour que l'agent IA puisse accéder à ton agenda et tes emails.",
                "Connect your Google account so the AI agent can access your calendar and emails."
              )}
            </p>
            <div style={styles.scopeList}>
              <div style={styles.scopeItem}>📅 {t('Google Calendar (lecture seule)', 'Google Calendar (read-only)')}</div>
              <div style={styles.scopeItem}>📧 {t('Gmail (lecture seule)', 'Gmail (read-only)')}</div>
            </div>
            <button onClick={handleConnect} disabled={working} style={styles.connectBtn}>
              {working ? t('Redirection…', 'Redirecting…') : t('Connecter Google', 'Connect Google')}
            </button>
          </>
        )}

        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    minHeight: '100vh',
    backgroundColor: '#F5F3FF',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    backgroundColor: 'white',
    borderBottom: '1px solid #E9D5FF',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  backBtn: {
    width: 36, height: 36,
    border: '1px solid #E9D5FF',
    borderRadius: '8px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: {
    margin: 0,
    fontSize: '17px',
    fontWeight: '700',
    color: '#2D3436',
  },
  card: {
    margin: '24px 16px',
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px 24px',
    boxShadow: '0 2px 12px rgba(124,58,237,0.08)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    textAlign: 'center',
  },
  googleIcon: {
    marginBottom: '8px',
  },
  connectedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#F0FFF4',
    color: '#2D5A3D',
    fontWeight: '600',
    fontSize: '15px',
    padding: '8px 16px',
    borderRadius: '20px',
  },
  checkmark: {
    color: '#38A169',
    fontWeight: '700',
  },
  email: {
    margin: 0,
    fontSize: '14px',
    color: '#636E72',
  },
  info: {
    margin: 0,
    fontSize: '14px',
    color: '#636E72',
    lineHeight: '1.5',
    maxWidth: '280px',
  },
  scopeList: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: '#F8F7FF',
    borderRadius: '10px',
    padding: '12px 16px',
  },
  scopeItem: {
    fontSize: '13px',
    color: '#4A5568',
    textAlign: 'left',
  },
  connectBtn: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#7C3AED',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  switchBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: 'white',
    color: '#7C3AED',
    border: '1px solid #E9D5FF',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  disconnectBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: 'white',
    color: '#E53E3E',
    border: '1px solid #FED7D7',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  error: {
    color: '#E53E3E',
    fontSize: '13px',
    margin: 0,
  },
};
