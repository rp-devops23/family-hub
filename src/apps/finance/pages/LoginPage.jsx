import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

// ============================================================================
// LOGIN PAGE
// ============================================================================

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      setMessage('Error: ' + error.message);
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    setMessage('');
    setLoading(true);
    
    const { error } = await signUp(email, password);
    
    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('✅ Account created! You can now sign in.');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoSection}>
          <span style={styles.logoIcon}>💰</span>
          <h1 style={styles.title}>MyFinance</h1>
          <p style={styles.subtitle}>Gérez vos finances personnelles</p>
        </div>

        <form onSubmit={handleSignIn} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Mot de passe (min 6 caractères)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
            minLength={6}
            disabled={loading}
          />
          
          <div style={styles.buttonGroup}>
            <button 
              type="submit" 
              style={styles.buttonPrimary}
              disabled={loading}
            >
              {loading ? '...' : 'Se connecter'}
            </button>
            <button 
              type="button" 
              onClick={handleSignUp} 
              style={styles.buttonSecondary}
              disabled={loading}
            >
              Créer un compte
            </button>
          </div>
        </form>

        {message && (
          <p style={{
            ...styles.message,
            color: message.startsWith('Error') ? '#E74C3C' : '#00B894'
          }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F5F7FA',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '40px 32px',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logoIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    color: '#2D3436',
    fontWeight: '700',
  },
  subtitle: {
    color: '#636E72',
    marginTop: '8px',
    fontSize: '14px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  input: {
    padding: '14px 16px',
    border: '1px solid #E1E8ED',
    borderRadius: '10px',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '8px',
  },
  buttonPrimary: {
    padding: '14px',
    backgroundColor: '#00A3E0',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  buttonSecondary: {
    padding: '14px',
    backgroundColor: 'white',
    color: '#2D3436',
    border: '1px solid #E1E8ED',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  message: {
    marginTop: '20px',
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#F5F7FA',
    textAlign: 'center',
    fontSize: '14px',
  },
};