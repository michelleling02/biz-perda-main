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
      <StatusBar style="light" backgroundColor="#E53E3E" translucent={false} />
    </>
  );
}
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 32, paddingVertical: 36, flexDirection: 'row', alignItems: 'center' },
  backButton: { 
    backgroundColor: 'rgba(255,255,255,0.25)', 
    borderRadius: 16, 
    padding: 16, 
    marginRight: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  content: { flex: 1, padding: 36 },
  avatarContainer: { alignSelf: 'center', marginBottom: 48, position: 'relative' },
  avatarImage: { 
    width: 140, 
    height: 140, 
    borderRadius: 70, 
    borderWidth: 5, 
    borderColor: '#FFFFFF', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 16, 
    elevation: 10 
  },
  avatarPlaceholder: { 
    width: 140, 
    height: 140, 
    borderRadius: 70, 
    backgroundColor: '#F8FAFC', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 5, 
    borderColor: '#FFFFFF', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 16, 
    elevation: 10 
  },
  cameraIcon: { 
    position: 'absolute', 
    bottom: 0, 
    right: 0, 
    backgroundColor: '#E53E3E', 
    padding: 12, 
    borderRadius: 24, 
    borderWidth: 4, 
    borderColor: '#FFFFFF',
    shadowColor: '#E53E3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  form: { flex: 1 },
  label: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  input: { 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 24, 
    paddingVertical: 20, 
    borderRadius: 20, 
    fontSize: 18, 
    borderWidth: 2, 
    borderColor: '#F1F5F9', 
    marginBottom: 40, 
    color: '#1F2937', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    elevation: 4 
  },
  saveButton: { 
    borderRadius: 20, 
    overflow: 'hidden', 
    shadowColor: '#E53E3E', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 16, 
    elevation: 10 
  },
  saveButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 22, gap: 16 },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },