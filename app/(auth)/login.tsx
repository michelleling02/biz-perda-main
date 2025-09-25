        <ActivityIndicator size="large" color="#3B82F6" style={{ flex: 1 }} />
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StatusBar } from 'expo-status-bar';

export default function AuthLayout() {
  return (
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="light" backgroundColor="#E53E3E" />
    </>
  );
}
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  headerGradient: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 60 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 220, height: 90 },
  header: { alignItems: 'center', paddingHorizontal: 32 },
  headerTitle: { fontSize: 36, fontWeight: 'bold', color: '#ffffff', marginTop: 20 },
  headerSubtitle: { fontSize: 18, color: 'rgba(255,255,255,0.95)', marginTop: 12 },
  content: { flex: 1 },
  formContainer: { padding: 32 },
  inputContainer: { marginBottom: 32 },
  inputLabel: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    borderWidth: 2, 
    borderColor: '#F1F5F9', 
    borderRadius: 20, 
    paddingHorizontal: 20, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    elevation: 4 
  },
  inputIcon: { marginRight: 16 },
  input: { flex: 1, height: 60, fontSize: 18, color: '#1F2937' },
  eyeIcon: { padding: 8 },
  actionButton: { 
    borderRadius: 20, 
    overflow: 'hidden', 
    marginTop: 32, 
    shadowColor: '#E53E3E', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 16, 
    elevation: 10 
  },
  actionButtonGradient: { paddingVertical: 22, alignItems: 'center' },
  actionButtonText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', letterSpacing: 0.5 },
  actionButtonDisabled: { opacity: 0.7 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 40 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { marginHorizontal: 20, fontSize: 16, color: '#64748B', fontWeight: '500' },
  signUpButton: { alignItems: 'center', paddingVertical: 20 },
  signUpButtonText: { fontSize: 18, color: '#64748B' },
  signUpButtonTextBold: { fontWeight: 'bold', color: '#E53E3E' },