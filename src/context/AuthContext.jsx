import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// ============================================================================
// AUTH CONTEXT - Shared auth for all family hub apps
// ============================================================================

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [language, setLanguage] = useState('fr');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const t = (fr, en) => language === 'fr' ? fr : en;
  const toggleLanguage = () => setLanguage(prev => prev === 'fr' ? 'en' : 'fr');

  return (
    <AuthContext.Provider value={{ user, authLoading, signIn, signUp, signOut, language, toggleLanguage, t }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
