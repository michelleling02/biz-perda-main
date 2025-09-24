import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null; // Add user to the context type
  isInitialized: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null, // Default user to null
  isInitialized: false,
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null); // Add state for user
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null); // Set user from the initial session
      setIsInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null); // Update user whenever the session changes
    });

    return () => subscription.unsubscribe();
  }, []);

  // Provide session, user, and isInitialized
  return (
    <AuthContext.Provider value={{ session, user, isInitialized }}>
      {children}
    </AuthContext.Provider>
  );
};
