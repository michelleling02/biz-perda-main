import React from 'react';
import { ActivityIndicator, View } from 'react-native';

// This is the dedicated entry point of your app.
export default function Index() {
  // It shows a loading indicator while the AuthProvider in the root layout
  // determines the user's authentication state and redirects them.
  // This prevents the login screen from flashing for an already-logged-in user.
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#58508D" />
    </View>
  );
}
