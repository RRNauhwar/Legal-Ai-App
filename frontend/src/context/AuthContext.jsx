import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseEnabled } from '../utils/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    if (!isSupabaseEnabled) {
      // No Supabase configured — auto guest mode
      const saved = localStorage.getItem('ns_guest');
      if (saved) {
        const guestObj = JSON.parse(saved);
        setUser(guestObj);
        setIsGuest(true);
        localStorage.setItem('ns_user_id', guestObj.id);
        localStorage.setItem('ns_user_name', guestObj.user_metadata?.display_name || 'Guest');
      }
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        localStorage.setItem('ns_user_id', u.id);
        localStorage.setItem('ns_user_name', u.user_metadata?.display_name || u.email?.split('@')[0] || 'User');
        localStorage.setItem('ns_access_token', session.access_token || '');
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        localStorage.setItem('ns_user_id', u.id);
        localStorage.setItem('ns_user_name', u.user_metadata?.display_name || u.email?.split('@')[0] || 'User');
        localStorage.setItem('ns_access_token', session.access_token || '');
      } else {
        localStorage.removeItem('ns_user_id');
        localStorage.removeItem('ns_user_name');
        localStorage.removeItem('ns_access_token');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email, password, displayName) {
    if (!isSupabaseEnabled) return guestLogin(displayName || email.split('@')[0]);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: displayName } }
    });
    if (error) throw error;
  }

  async function signIn(email, password) {
    if (!isSupabaseEnabled) return guestLogin(email.split('@')[0]);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signInWithGoogle() {
    if (!isSupabaseEnabled) return guestLogin('Google User');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) throw error;
  }

  async function signOut() {
    localStorage.removeItem('ns_user_id');
    localStorage.removeItem('ns_user_name');
    localStorage.removeItem('ns_access_token');
    if (isGuest) {
      localStorage.removeItem('ns_guest');
      setUser(null);
      setIsGuest(false);
      return;
    }
    if (isSupabaseEnabled) await supabase.auth.signOut();
    setUser(null);
  }

  function guestLogin(name = 'Guest') {
    const guest = {
      id: `guest_${Date.now()}`,
      email: '',
      user_metadata: { display_name: name }
    };
    localStorage.setItem('ns_guest', JSON.stringify(guest));
    localStorage.setItem('ns_user_id', guest.id);
    localStorage.setItem('ns_user_name', name);
    setUser(guest);
    setIsGuest(true);
  }

  function continueAsGuest() { guestLogin('Guest User'); }

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';

  return (
    <AuthContext.Provider value={{ user, loading, isGuest, isSupabaseEnabled, displayName, signUp, signIn, signInWithGoogle, signOut, continueAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
