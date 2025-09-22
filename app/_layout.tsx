import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-expo';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { View, ActivityIndicator } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { getUserRole } from '../lib/user'; // <-- IMPORT THE NEW HELPER

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

const tokenCache = {
  async getToken(key: string) { try { return SecureStore.getItemAsync(key); } catch (err) { return null; } },
  async saveToken(key: string, value: string) { try { return SecureStore.setItemAsync(key, value); } catch (err) { return; } },
};

const InitialLayout = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inApp = segments[0] === '(customer)' || segments[0] === '(owner)';

    if (isSignedIn) {
      // User is signed in. We need to determine their role and location.
      const checkRoleAndRedirect = async () => {
        if (!user) return;

        // --- THIS IS THE DEFINITIVE FIX ---
        // 1. Get the Supabase token from Clerk.
        const token = await getToken({ template: 'supabase' });
        if (!token) {
          console.error("Could not get Supabase token. Defaulting to customer.");
          router.replace('/(customer)');
          return;
        }

        // 2. Create a temporary, authenticated Supabase client.
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

        // 3. Call our new helper to get the role_id from the database.
        const roleId = await getUserRole(supabase, user.id);

        // 4. Redirect based on the authoritative role_id from the database.
        if (roleId === 2) { // 2 = Owner
          if (segments[0] !== '(owner)') {
            router.replace('/(owner)');
          }
        } else { // 1 = Customer or null
          if (segments[0] !== '(customer)') {
            router.replace('/(customer)');
          }
        }
        // --- END OF FIX ---
      };

      checkRoleAndRedirect();

    } else if (!isSignedIn && inApp) {
      // User is not signed in but is in a protected group. Kick them out.
      router.replace('/');
    }
  }, [isLoaded, isSignedIn, user, segments]); // Depend on user object

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#58508D" />
      </View>
    );
  }

  return <Slot />;
};

const RootLayoutNav = () => {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY!} tokenCache={tokenCache}>
      <InitialLayout />
    </ClerkProvider>
  );
};

export default RootLayoutNav;
