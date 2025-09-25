import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const onSignInPress = async () => {
    if (!email || !password) {
      Alert.alert('Missing Information', 'Please fill in all fields.');
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert('Login Error', error.message);
    }
    setIsLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['#E53E3E', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/images/perdaventures-logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.header}>
          <LogIn size={48} color="#ffffff" />
          <Text style={styles.headerTitle}>Welcome Back</Text>
          <Text style={styles.headerSubtitle}>Sign in to continue to Biz@Perda</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Mail size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                placeholderTextColor="#94a3b8"
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#94a3b8" />
                ) : (
                  <Eye size={20} color="#94a3b8" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
            onPress={onSignInPress}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#E53E3E', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.actionButtonText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.signUpButton}
            onPress={() => router.push('/signup')}
          >
            <Text style={styles.signUpButtonText}>
              Don't have an account? <Text style={styles.signUpButtonTextBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  headerGradient: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 50 },
  logoContainer: { alignItems: 'center', marginBottom: 30 },
  logo: { width: 200, height: 80 },
  header: { alignItems: 'center', paddingHorizontal: 24 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginTop: 16 },
  headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 8 },
  content: { flex: 1 },
  formContainer: { padding: 28 },
  inputContainer: { marginBottom: 28 },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, paddingHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 56, fontSize: 16, color: '#1F2937' },
  eyeIcon: { padding: 4 },
  actionButton: { borderRadius: 16, overflow: 'hidden', marginTop: 20, shadowColor: '#E53E3E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  actionButtonGradient: { paddingVertical: 18, alignItems: 'center' },
  actionButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
  actionButtonDisabled: { opacity: 0.7 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 32 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 16, fontSize: 14, color: '#9CA3AF' },
  signUpButton: { alignItems: 'center', paddingVertical: 16 },
  signUpButtonText: { fontSize: 16, color: '#6B7280' },
  signUpButtonTextBold: { fontWeight: 'bold', color: '#E53E3E' },
});