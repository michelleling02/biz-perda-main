// app/login.tsx (or wherever your LoginScreen is located)

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
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    if (session) {
      handleRoleRedirect(session.user.id);
    }
  }, [session]);

  const handleRoleRedirect = async (userId: string) => {
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

    const roleName = (userRoleData.roles as any).role_name;
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
    setIsLoading(false);
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setIsLoading(true);

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('status')
        .eq('email', username)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw new Error("Could not verify user status. " + profileError.message);
      }

      if (profile && profile.status === 'Suspended') {
        throw new Error('Your account is suspended. Please contact support.');
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
      });

      if (authError) {
        throw authError;
      }

    } catch (error: any) {
      setIsLoading(false);
      Alert.alert('Login Failed', error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#E53E3E" />

      <LinearGradient
        colors={['#E53E3E', '#3B82F6']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Image source={require('../../assets/images/perdaventures-logo.png')} style={styles.logo} />
          <Text style={styles.headerTitle}>Biz@Perda</Text>
          <Text style={styles.headerSubtitle}>Pulau Pinang Food Directory</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Welcome Back</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your email address"
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
              colors={['#E53E3E', '#3B82F6']}
              style={styles.loginButtonGradient}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* --- SIGN UP LINK ADDED HERE --- */}
          <TouchableOpacity
            style={styles.signupLinkContainer}
            onPress={() => router.push('/signup')}
          >
            <Text style={styles.signupLinkText}>
              Don't have an account? <Text style={styles.signupLinkTextBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
          {/* --- END OF SIGN UP LINK --- */}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 28,
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
    padding: 24,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    // marginBottom is removed from here and added to the signup link container
    shadowColor: '#E53E3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  // --- NEW STYLES ADDED HERE ---
  signupLinkContainer: {
    alignItems: 'center',
    marginTop: 8, // A little space after the login button
    marginBottom: 32, // Space before the credentials box
  },
  signupLinkText: {
    fontSize: 16,
    color: '#6B7280',
  },
  signupLinkTextBold: {
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  // --- END OF NEW STYLES ---
  credentialsInfo: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  credentialsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  credentialsText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
    lineHeight: 20,
  },
});
