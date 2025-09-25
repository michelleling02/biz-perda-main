import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { UserPlus, ArrowLeft, User, Store, Phone, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedRole, setSelectedRole] = useState<'Customer' | 'Owner'>('Customer');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const onSignUpPress = async () => {
    if (!name || !email || !password) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }
    setIsLoading(true);

    // Step 1: Sign up the user with Supabase.
    // We pass role, name, and now phone number in the metadata for our trigger.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          role: selectedRole,
          fullName: name,
          phoneNumber: phoneNumber, // ADDED: Pass phone number in metadata
        },
      },
    });

    if (authError) {
      Alert.alert('Sign Up Error', authError.message);
      setIsLoading(false);
      return;
    }

    if (!authData.user) {
      Alert.alert('Sign Up Error', 'Could not create user. Please try again.');
      setIsLoading(false);
      return;
    }

    // Step 2: If sign-up is successful and an avatar was chosen, upload it.
    if (avatarUri) {
      try {
        const fileExt = avatarUri.split('.').pop()?.toLowerCase() ?? 'png';
        const fileName = `${authData.user.id}_${new Date().getTime()}.${fileExt}`;
        const filePath = `${authData.user.id}/${fileName}`;

        const response = await fetch(avatarUri);
        const blob = await response.blob();

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, blob, {
            contentType: `image/${fileExt}`,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
        
        // Step 3: Update the user's profile with the new avatar URL.
        await supabase
          .from('profiles')
          .update({ profile_photo_url: urlData.publicUrl })
          .eq('id', authData.user.id);

      } catch (uploadError: any) {
        Alert.alert("Upload Failed", "Your account was created, but we couldn't save your profile picture. You can add one later.");
      }
    }

    setIsLoading(false);
    Alert.alert('Account Created', 'Welcome! You will now be taken to the app.');
    // The _layout component will automatically handle the redirect.
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['#E53E3E', '#3B82F6']}
        style={styles.headerGradient}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.header}>
          <UserPlus size={40} color="#ffffff" />
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>Join the Biz@Perda Community</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
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
                    <User size={20} color={selectedRole === 'Customer' ? '#E53E3E' : '#6B7280'} />
                    <Text style={[styles.roleButtonText, selectedRole === 'Customer' && styles.roleButtonTextSelected]}>Customer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.roleButton, selectedRole === 'Owner' && styles.roleButtonSelected]} onPress={() => setSelectedRole('Owner')}>
                    <Store size={20} color={selectedRole === 'Owner' ? '#E53E3E' : '#6B7280'} />
                    <Text style={[styles.roleButtonText, selectedRole === 'Owner' && styles.roleButtonTextSelected]}>Shop Owner</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.inputContainer}><Text style={styles.inputLabel}>Full Name *</Text><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter your full name" autoCapitalize="words" /></View>
              <View style={styles.inputContainer}><Text style={styles.inputLabel}>Email *</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" autoCapitalize="none" /></View>
              <View style={styles.inputContainer}><Text style={styles.inputLabel}>Phone Number</Text><View style={styles.phoneInputWrapper}><Phone size={20} color="#94a3b8" style={styles.phoneInputIcon} /><TextInput style={styles.phoneInput} value={phoneNumber} onChangeText={setPhoneNumber} placeholder="e.g., 0123456789" keyboardType="phone-pad" /></View></View>
              <View style={styles.inputContainer}><Text style={styles.inputLabel}>Password *</Text><TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Create a strong password" secureTextEntry /></View>
              <TouchableOpacity style={[styles.actionButton, isLoading && styles.actionButtonDisabled]} onPress={onSignUpPress} disabled={isLoading}>
                <LinearGradient colors={['#E53E3E', '#3B82F6']} style={styles.actionButtonGradient}>
                  {isLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.actionButtonText}>Sign Up</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerGradient: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40 },
  backButton: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, zIndex: 1, padding: 8 },
  header: { alignItems: 'center', paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginTop: 10 },
  headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 5 },
  content: { flex: 1 },
  formContainer: { padding: 24 },
  inputContainer: { marginBottom: 24 },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: '#1F2937', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  actionButton: { borderRadius: 16, overflow: 'hidden', marginTop: 16, shadowColor: '#E53E3E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  actionButtonGradient: { paddingVertical: 18, alignItems: 'center' },
  actionButtonText: { color: '#ffffff', fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5 },
  actionButtonDisabled: { opacity: 0.7 },
  roleSelector: { flexDirection: 'row', gap: 10 },
  roleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  roleButtonSelected: { backgroundColor: '#FEF2F2', borderColor: '#E53E3E' },
  roleButtonText: { fontSize: 16, color: '#6B7280', fontWeight: '600' },
  roleButtonTextSelected: { color: '#E53E3E' },
  phoneInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, paddingHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  phoneInputIcon: { marginRight: 10 },
  phoneInput: { flex: 1, paddingVertical: 16, fontSize: 16, color: '#1F2937' },
  avatarContainer: { alignItems: 'center', marginBottom: 32 },
  avatarTouchable: { position: 'relative' },
  avatarImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#E53E3E', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 2, borderColor: '#FFFFFF' },
  avatarEditText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
});
