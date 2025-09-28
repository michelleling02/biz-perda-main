// app/signup.tsx

import React, { useState } from 'react';
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
  ActivityIndicator,
  Image,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { User, Store, Phone, Camera, UserPlus, ArrowLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient'; // --- UI FIX --- Import LinearGradient

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedRole, setSelectedRole] = useState<'Customer' | 'Owner'>('Customer');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert('Missing Information', 'Please fill in your Name, Email, and Password.');
      return;
    }
    setIsLoading(true);

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          fullName: name,
          phoneNumber: phoneNumber,
          role: selectedRole,
        },
      },
    });

    if (signUpError) {
      setIsLoading(false);
      Alert.alert('Sign Up Failed', signUpError.message);
      return;
    }

    if (!authData.user) {
      setIsLoading(false);
      Alert.alert('Sign Up Failed', 'Could not create user account.');
      return;
    }

    if (avatarUri) {
      try {
        const fileExt = avatarUri.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${authData.user.id}/${fileName}`;

        const formData = new FormData();
        formData.append('file', {
          uri: avatarUri,
          name: fileName,
          type: `image/${fileExt}`,
        } as any);

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, formData);

        if (uploadError) {
          console.error("Upload Error:", uploadError);
          Alert.alert("Upload Warning", "Your account was created, but we couldn't upload your profile picture.");
        } else {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
          if (urlData.publicUrl) {
            await supabase
              .from('profiles')
              .update({ profile_photo_url: urlData.publicUrl })
              .eq('id', authData.user.id);
          }
        }
      } catch (e) {
        console.error("Avatar processing error:", e);
        Alert.alert("Upload Warning", "Your account was created, but there was an issue processing your profile picture.");
      }
    }

    setIsLoading(false);
    Alert.alert(
      'Account Created!',
      'You can now log in with your new account.',
      [{ text: 'OK', onPress: () => router.push('/login') }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        
        {/* --- UI FIX: Added Gradient Header --- */}
        <LinearGradient
          colors={['#E53E3E', '#3B82F6']}
          style={styles.headerGradient}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.header}>
            <UserPlus size={32} color="#ffffff" />
            <Text style={styles.headerTitle}>Create Account</Text>
            <Text style={styles.headerSubtitle}>Join the Biz@Perda community</Text>
          </View>
        </LinearGradient>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity style={styles.avatarTouchable} onPress={pickImage}>
                {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} /> : <View style={styles.avatarPlaceholder}><Camera size={40} color="#94a3b8" /></View>}
                <View style={styles.avatarEditBadge}><Text style={styles.avatarEditText}>Edit</Text></View>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>I am a...</Text>
              <View style={styles.roleSelector}>
                <TouchableOpacity style={[styles.roleButton, selectedRole === 'Customer' && styles.roleButtonSelected]} onPress={() => setSelectedRole('Customer')}>
                  <User size={20} color={selectedRole === 'Customer' ? '#DC2626' : '#64748b'} />
                  <Text style={[styles.roleButtonText, selectedRole === 'Customer' && styles.roleButtonTextSelected]}>Customer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.roleButton, selectedRole === 'Owner' && styles.roleButtonSelected]} onPress={() => setSelectedRole('Owner')}>
                  <Store size={20} color={selectedRole === 'Owner' ? '#3B82F6' : '#64748b'} />
                  <Text style={[styles.roleButtonText, selectedRole === 'Owner' && styles.roleButtonTextSelected]}>Shop Owner</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}><Text style={styles.inputLabel}>Full Name *</Text><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter your full name" autoCapitalize="words" /></View>
            <View style={styles.inputContainer}><Text style={styles.inputLabel}>Email *</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" autoCapitalize="none" /></View>
            <View style={styles.inputContainer}><Text style={styles.inputLabel}>Phone Number</Text><View style={styles.phoneInputWrapper}><Phone size={20} color="#94a3b8" style={styles.phoneInputIcon} /><TextInput style={styles.phoneInput} value={phoneNumber} onChangeText={setPhoneNumber} placeholder="e.g., 0123456789" keyboardType="phone-pad" /></View></View>
            <View style={styles.inputContainer}><Text style={styles.inputLabel}>Password *</Text><TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Create a strong password" secureTextEntry /></View>
            
            {/* --- UI FIX: Wrapped Button in Gradient --- */}
            <TouchableOpacity style={[styles.actionButton, isLoading && styles.actionButtonDisabled]} onPress={handleSignUp} disabled={isLoading}>
              <LinearGradient
                colors={['#E53E3E', '#3B82F6']}
                style={styles.actionButtonGradient}
              >
                {isLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.actionButtonText}>Create Account</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/login')} style={styles.signInLink}>
              <Text style={styles.signInText}>Already have an account? <Text style={{ fontWeight: 'bold', color: '#3B82F6' }}>Sign In</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- UI FIX: Updated Stylesheet ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 16,
    zIndex: 1,
    padding: 8,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
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
  formContainer: { padding: 24, flex: 1 },
  avatarContainer: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
  avatarTouchable: { position: 'relative' },
  avatarImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#E2E8F0' },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#DC2626', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 2, borderColor: '#FFFFFF' },
  avatarEditText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 16, fontWeight: '500', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#1E293B' },
  roleSelector: { flexDirection: 'row', gap: 10 },
  roleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, gap: 8 },
  roleButtonSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  roleButtonText: { fontSize: 16, color: '#64748b', fontWeight: '600' },
  roleButtonTextSelected: { color: '#1E293B' },
  phoneInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16 },
  phoneInputIcon: { marginRight: 10 },
  phoneInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#1E293B' },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    shadowColor: '#E53E3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  actionButtonText: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' },
  actionButtonDisabled: { opacity: 0.7 },
  signInLink: { marginTop: 24, alignItems: 'center' },
  signInText: { fontSize: 16, color: '#64748B' },
});
