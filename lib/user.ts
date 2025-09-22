import { createClient, SupabaseClient } from '@supabase/supabase-js';

// This function takes an authenticated Supabase client and a user ID,
// and returns the role_id from the userroles table.
export const getUserRole = async (supabase: SupabaseClient, userId: string): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('userroles')
      .select('role_id')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If the user has no role entry, it's not a fatal error, just return null.
      if (error.code === 'PGRST116') {
        console.warn(`No role found for user ${userId}`);
        return null;
      }
      // For other errors, log them.
      console.error('Error fetching user role:', error);
      return null;
    }

    return data?.role_id || null;

  } catch (e) {
    console.error('Exception in getUserRole:', e);
    return null;
  }
};
