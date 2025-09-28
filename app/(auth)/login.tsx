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

    try {
      // --- THIS IS THE FIX ---
      // Step 1: Check the user's profile status BEFORE attempting to log in.
      // We select from 'profiles' based on the email provided.
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('status')
        .eq('email', username) // Use the email from the login form
        .single();

      // If there was an error fetching the profile (other than it not existing), stop.
      if (profileError && profileError.code !== 'PGRST116') {
        throw new Error("Could not verify user status. " + profileError.message);
      }

      // Step 2: If a profile was found and the status is 'Suspended', block the login.
      if (profile && profile.status === 'Suspended') {
        throw new Error('Your account is suspended. Please contact support.');
      }
      // --- END OF FIX ---

      // Step 3: If the user is not suspended, proceed with the actual login.
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
      });

      if (authError) {
        throw authError; // Let the catch block handle the error message
      }

      // On success, the useEffect will handle the redirect automatically.

    } catch (error: any) {
      // A single catch block now handles all errors gracefully.
      setIsLoading(false);
      Alert.alert('Login Failed', error.message);
    }
    // No need for a finally block if we handle setIsLoading in the catch.
  };

  // The JSX for your component is unchanged.
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
    marginBottom: 32,
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
