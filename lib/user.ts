// lib/user.ts
import { supabase } from './supabase';

/**
 * Fetches the role_id for the currently authenticated user.
 * This function calls the PostgreSQL function `get_my_role_id()`,
 * which securely determines the user's ID from the session.
 *
 * @returns {Promise<number | null>} A promise that resolves to the user's role_id or null if not found or an error occurs.
 */
export const getMyUserRole = async (): Promise<number | null> => {
  try {
    // Corrected to call the existing and correct RPC function.
    const { data, error } = await supabase.rpc('get_my_role_id');

    if (error) {
      console.error('Error fetching user role:', error.message);
      return null;
    }

    return data;

  } catch (e) {
    console.error('Exception in getMyUserRole:', e);
    return null;
  }
};
