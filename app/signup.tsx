import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { UserPlus, ArrowLeft, User, Store, Phone, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
// --- FIX: Import FileSystem, just like in edit-profile.tsx ---
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base-64';
import { useSignUp, useAuth } from '@clerk/clerk-expo';
import { createClient } from '@supabase/supabase-js';

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { getToken } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedRole, setSelectedRole] = useState<'Customer' | 'Owner'>('Customer');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  // We no longer need a separate base64 state, we will generate it on demand.
  const [isLoading, setIsLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions!');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      // We don't need to request base64 from the picker anymore.
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const onSignUpPress = async () => {
    if (!isLoaded) return;
    if (!name || !email || !password) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }
    setIsLoading(true);
    try {
      await signUp.create({
        emailAddress: email,
        password: password,
        unsafeMetadata: {
          role: selectedRole,
          fullName: name,
          phoneNumber: phoneNumber,
        },
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      Alert.alert('Sign Up Error', err.errors?.[0]?.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;
    setIsLoading(true);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });

      if (completeSignUp.status !== 'complete') {
        Alert.alert('Verification Error', 'The code you entered is incorrect. Please try again.');
        setIsLoading(false);
        return;
      }

      await setActive({ session: completeSignUp.createdSessionId });

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error("Failed to retrieve Supabase token after sign-up.");
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase config missing");

      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });

      let publicPhotoUrl: string | null = null;
      if (avatarUri) {
        try {
          // --- THIS IS THE FIX: Use the same logic as edit-profile.tsx ---
          const base64 = await FileSystem.readAsStringAsync(avatarUri, { encoding: 'base64' });
          const filePath = `${completeSignUp.createdUserId}/${new Date().getTime()}.png`;
          const { data, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, decode(base64), { contentType: 'image/png' });
          // --- END OF FIX ---

          if (uploadError) throw uploadError;
          
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path);
          publicPhotoUrl = urlData.publicUrl;
        } catch (uploadError: any) {
          Alert.alert("Upload Failed", "Your account was created, but we couldn't upload your profile picture.");
        }
      }

      const { error: rpcError } = await supabase.rpc('create_profile_for_user', {
        avatar_url: publicPhotoUrl,
      });

      if (rpcError) {
        Alert.alert("Profile Sync Failed", `Your account was created, but we couldn't save your profile details. Reason: ${rpcError.message}`);
      }

      const roleId = selectedRole === 'Customer' ? 1 : 2;
      const { error: roleError } = await supabase.from('userroles').insert({
        user_id: completeSignUp.createdUserId,
        role_id: roleId,
      });

      if (roleError) {
        Alert.alert("Role Assignment Failed", `Your account was created, but we couldn't assign your role. Please contact support. Reason: ${roleError.message}`);
      }
      
      router.replace('/(customer)');

    } catch (err: any) {
      Alert.alert('Verification Error', err.errors?.[0]?.message || err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['#58508D', '#FF6361']}
        style={styles.headerGradient}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.header}>
          <UserPlus size={40} color="#ffffff" />
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>Join the Biz@Perda community</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          {!pendingVerification ? (
            <>
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
                    <User size={20} color={selectedRole === 'Customer' ? '#58508D' : '#64748b'} />
                    <Text style={[styles.roleButtonText, selectedRole === 'Customer' && styles.roleButtonTextSelected]}>Customer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.roleButton, selectedRole === 'Owner' && styles.roleButtonSelected]} onPress={() => setSelectedRole('Owner')}>
                    <Store size={20} color={selectedRole === 'Owner' ? '#58508D' : '#64748b'} />
                    <Text style={[styles.roleButtonText, selectedRole === 'Owner' && styles.roleButtonTextSelected]}>Shop Owner</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.inputContainer}><Text style={styles.inputLabel}>Full Name *</Text><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter your full name" autoCapitalize="words" /></View>
              <View style={styles.inputContainer}><Text style={styles.inputLabel}>Email *</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" autoCapitalize="none" /></View>
              <View style={styles.inputContainer}><Text style={styles.inputLabel}>Phone Number</Text><View style={styles.phoneInputWrapper}><Phone size={20} color="#94a3b8" style={styles.phoneInputIcon} /><TextInput style={styles.phoneInput} value={phoneNumber} onChangeText={setPhoneNumber} placeholder="e.g., 0123456789" keyboardType="phone-pad" /></View></View>
              <View style={styles.inputContainer}><Text style={styles.inputLabel}>Password *</Text><TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Create a strong password" secureTextEntry /></View>
              <TouchableOpacity style={[styles.actionButton, isLoading && styles.actionButtonDisabled]} onPress={onSignUpPress} disabled={isLoading}>
                <LinearGradient colors={['#58508D', '#FF6361']} style={styles.actionButtonGradient}>
                  {isLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.actionButtonText}>Continue</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.infoText}>We've sent a verification code to your email.</Text>
              <TextInput value={code} placeholder="Verification Code" onChangeText={setCode} style={styles.input} keyboardType="numeric" />
              <TouchableOpacity style={[styles.actionButton, isLoading && styles.actionButtonDisabled]} onPress={onVerifyPress} disabled={isLoading}>
                <LinearGradient colors={['#58508D', '#FF6361']} style={styles.actionButtonGradient}>
                  {isLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.actionButtonText}>Verify and Sign Up</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  headerGradient: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40 },
  backButton: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, zIndex: 1, padding: 8 },
  header: { alignItems: 'center', paddingHorizontal: 20 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginTop: 10 },
  headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 5 },
  content: { flex: 1 },
  formContainer: { padding: 20 },
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 16, fontWeight: '500', color: '#2F4858', marginBottom: 12 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#1E293B' },
  actionButton: { borderRadius: 12, overflow: 'hidden', marginTop: 10 },
  actionButtonGradient: { paddingVertical: 16, alignItems: 'center' },
  actionButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  actionButtonDisabled: { opacity: 0.7 },
  roleSelector: { flexDirection: 'row', gap: 10 },
  roleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, gap: 8 },
  roleButtonSelected: { backgroundColor: '#F3E8FF', borderColor: '#58508D' },
  roleButtonText: { fontSize: 16, color: '#64748b', fontWeight: '600' },
  roleButtonTextSelected: { color: '#58508D' },
  phoneInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16 },
  phoneInputIcon: { marginRight: 10 },
  phoneInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#1E293B' },
  avatarContainer: { alignItems: 'center', marginBottom: 30 },
  avatarTouchable: { position: 'relative' },
  avatarImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#FFFFFF' },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#58508D', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 2, borderColor: '#FFFFFF' },
  avatarEditText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  infoText: { textAlign: 'center', marginBottom: 20, fontSize: 18, color: '#2F4858' },
});
