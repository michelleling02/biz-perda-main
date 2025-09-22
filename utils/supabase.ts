// utils/supabase.ts

import { createClient as sbCreateClient } from '@supabase/supabase-js'; // Renamed to avoid conflict
import { useAuth } from '@clerk/clerk-expo';
import { useEffect, useMemo, useState } from 'react';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// --- NEW EXPORT ---
// Export a function to create a client on demand with a given token.
export const createClerkSupabaseClient = (token: string) => {
  return sbCreateClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
};

// This hook is still useful for all other parts of the app that are already logged in.
export const useSupabaseClient = () => {
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const fetchedToken = await getToken({ template: 'supabase' });
      setToken(fetchedToken);
    };
    fetchToken();
  }, [getToken]);

  return useMemo(() => {
    if (token) {
      return createClerkSupabaseClient(token);
    }
    return null;
  }, [token]);
};
