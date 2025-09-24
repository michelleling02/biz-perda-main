// FILE: app/(auth)/login.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChefHat } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { session } = useAuth();

  // --- THIS IS THE CORRECT AND FINAL FIX ---
  // This single useEffect handles redirection safely after the component has mounted.
  useEffect(() => {
    // If a session object exists (meaning the user is already logged in),
    // call the function to redirect them to the correct part of the app.
    if (session) {
      handleRoleRedirect(session.user.id);
    }
  }, [session]); // This effect runs only when the session object changes.
  // -----------------------------------------

  const handleRoleRedirect = async (userId: string) => {
    // This function is safe to call from a useEffect.
    const { data: userRoleData, error: roleError } = await supabase
      .from('userroles')
      .select('*, roles(role_name)')
      .eq('user_id', userId)
      .single();

    if (roleError || !userRoleData) {
      Alert.alert('Error', 'Could not determine user role. Please log in again.');
      await supabase.auth.signOut();
      setIsLoading(false);
      return;
    }

    const roleName = userRoleData.roles.role_name;
    switch (roleName) {
      case 'Customer':
        router.replace('/(customer)');
        break;
      case 'Owner':
        router.replace('/(owner)');
        break;
      case 'Admin':
        router.replace('/(admin)');
        break;
      default:
        Alert.alert('Error', 'Unknown user role.');
        await supabase.auth.signOut();
        break;
    }
    // It's good practice to stop loading here, although the screen will be replaced.
    setIsLoading(false);
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setIsLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (authError) {
      setIsLoading(false);
      Alert.alert('Login Failed', authError.message);
      return;
    }

    // After a successful login, the onAuthStateChange listener in our root layout
    // will update the 'session' object. This will automatically trigger the
    // useEffect hook above, which then calls handleRoleRedirect. This is the
    // standard and safe React pattern.
  };

  // The JSX for your component is unchanged.
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0891b2" />
      
      <LinearGradient
        colors={['#58508D', '#FF6361']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <ChefHat size={40} color="#ffffff" />
          <Text style={styles.headerTitle}>Biz@Perda</Text>
          <Text style={styles.headerSubtitle}>Pulau Pinang Food Directory</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Welcome Back!</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              placeholderTextColor="#94a3b8"
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#58508D', '#FF6361']}
              style={styles.loginButtonGradient}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.credentialsInfo}>
            <Text style={styles.credentialsTitle}>Test Credentials:</Text>
            <Text style={styles.credentialsText}>
              Email: abdulqayyum.anuar6@gmail.com
            </Text>
             <Text style={styles.credentialsText}>
              Password: [the password you set]
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Styles are unchanged
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2F4858',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2F4858',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#9B9B9B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2F4858',
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 30,
  },
  loginButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  credentialsInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#9B9B9B',
  },
  credentialsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2F4858',
    marginBottom: 8,
  },
  credentialsText: {
    fontSize: 12,
    color: '#9B9B9B',
    marginBottom: 4,
    lineHeight: 18,
  },
});
