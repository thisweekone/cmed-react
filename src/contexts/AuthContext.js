import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Session inicial:', session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Erro ao obter sessão:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async ({ email, password }) => {
    try {
      console.log('Tentando login com email:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      });
      
      if (error) throw error;
      
      console.log('Login bem sucedido:', data);
      return data;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      console.error('Erro no logout:', error);
      throw error;
    }
  };

  const value = {
    signIn,
    signOut,
    user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
