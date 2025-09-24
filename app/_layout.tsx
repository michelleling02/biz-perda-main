// FILE: app/_layout.tsx

import React, { useEffect, useState } from 'react'; // Import useState
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-get-random-values';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { getMyUserRole } from '@/lib/user'; // Import the function to get the user's role

const InitialLayout = () => {
  const { session, isInitialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // --- THIS IS THE FIX ---
  // This new useEffect hook correctly handles role-based redirection.
  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (session) {
      // User is logged in. Check their role.
      getMyUserRole().then(roleId => {
        if (roleId === 2) { // Owner
          // If they are an owner but not in the owner section, redirect them.
          if (segments[0] !== '(owner)') {
            router.replace('/(owner)');
          }
        } else if (roleId === 3) { // Admin
          // If they are an admin but not in the admin section, redirect them.
          if (segments[0] !== '(admin)') {
            router.replace('/(admin)');
          }
        } else { // Customer (or any other role)
          // If they are a customer but not in the customer section, redirect them.
          if (segments[0] !== '(customer)') {
            router.replace('/(customer)');
          }
        }
      });
    } else {
      // User is not logged in.
      // If they are not in the auth group, send them to the login screen.
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    }
  }, [session, isInitialized, segments]);
  // -----------------------

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#58508D" />
      </View>
    );
  }

  // The Stack navigator remains the same.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(customer)" />
      <Stack.Screen name="(owner)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
};

// The RootLayout component remains the same.
export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <InitialLayout />
        <StatusBar style="auto" />
      </NotificationProvider>
    </AuthProvider>
  );
}
