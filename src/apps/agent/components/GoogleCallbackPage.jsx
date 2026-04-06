import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

// ============================================================================
// GOOGLE CALLBACK PAGE — Handles OAuth redirect from Google
// Shown at /auth/google/callback?success=true&email=xxx  OR  ?error=xxx
// ============================================================================

export default function GoogleCallbackPage({ onDone }) {
  const { t } = useAuth();
  const [state, setState] = useState('loading'); // loading | success | error
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    const emailParam = params.get('email');

    if (success === 'true') {
      setEmail(emailParam ?? '');
      setState('success');
      // Auto-navigate back after 2.5s
      setTimeout(() => onDone(), 2500);
    } else if (error) {
      setErrorMsg(error);
      setState('error');
    } else {
      // No params — probably navigated here directly
      onDone();
    }
  }, []);

  if (state === 'loading') {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
        <p style={styles.msg}>{t('Connexion en cours…', 'Connecting…')}</p>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div style={styles.center}>
        <div style={styles.iconCircle}>✓</div>
        <p style={styles.title}>{t('Google connecté !', 'Google connected!')}</p>
        {email && <p style={styles.email}>{email}</p>}
        <p style={styles.msg}>{t('Redirection…', 'Redirecting…')}</p>
      </div>
    );
  }

  return (
    <div style={styles.center}>
      <div style={{ ...styles.iconCircle, backgroundColor: '#FFF5F5', color: '#E53E3E' }}>✗</div>
      <p style={styles.title}>{t('Connexion échouée', 'Connection failed')}</p>
      <p style={styles.error}>{errorMsg}</p>
      <button onClick={onDone} style={styles.btn}>
        {t('Retour', 'Back')}
      </button>
    </div>
  );
}

const styles = {
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#F5F3FF',
    gap: '16px',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    textAlign: 'center',
  },
  spinner: {
    width: 48, height: 48,
    border: '4px solid #E9D5FF',
    borderTop: '4px solid #7C3AED',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  iconCircle: {
    width: 64, height: 64,
    borderRadius: '50%',
    backgroundColor: '#F0FFF4',
    color: '#38A169',
    fontSize: '28px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: '#2D3436',
  },
  email: {
    margin: 0,
    fontSize: '14px',
    color: '#636E72',
  },
  msg: {
    margin: 0,
    fontSize: '14px',
    color: '#636E72',
  },
  error: {
    margin: 0,
    fontSize: '13px',
    color: '#E53E3E',
    maxWidth: '300px',
  },
  btn: {
    padding: '12px 24px',
    backgroundColor: '#7C3AED',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
