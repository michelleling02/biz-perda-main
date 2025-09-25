import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// This is the dedicated entry point of your app.
export default function Index() {
  // It shows a loading indicator while the AuthProvider in the root layout
  // determines the user's authentication state and redirects them.
  // This prevents the login screen from flashing for an already-logged-in user.
  return (
    <LinearGradient 
      colors={['#E53E3E', '#3B82F6']} 
      style={styles.container}
    >
      <ActivityIndicator size="large" color="#FFFFFF" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
