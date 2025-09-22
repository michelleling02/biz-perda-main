import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Camera, Save } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useUser, useSession } from '@clerk/clerk-expo';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export default function EditCustomerProfileScreen() {
  const { user } = useUser();
  const { session } = useSession();

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);
  const [newAvatar, setNewAvatar] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // Effect 1: Create the session-aware Supabase client
  useEffect(() => {
    if (session) {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) return;

      const client = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          fetch: async (url, options = {}) => {
            const token = await session.getToken({ template: 'supabase' });
            const headers = new Headers(options.headers);
            if (token) headers.set('Authorization', `Bearer ${token}`);
            return fetch(url, { ...options, headers });
          },
        },
      });
      setSupabase(client);
    }
  }, [session]);

  // Effect 2: Fetch the current profile data
  useEffect(() => {
    if (supabase && user) {
      const fetchProfile = async () => {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('profiles').select('name, profile_photo_url').eq('id', user.id).single();

          // This handles the case where a profile might not exist yet
          if (error && error.code !== 'PGRST116') throw error;

          if (data) {
            setName(data.name || user.fullName || '');
            setCurrentPhotoUrl(data.profile_photo_url);
          } else {
            // Fallback to Clerk data if no profile exists
            setName(user.fullName || '');
            setCurrentPhotoUrl(user.imageUrl);
          }
        } catch (error: any) {
          Alert.alert('Error', 'Could not fetch your profile data.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchProfile();
    }
  }, [supabase, user]);

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setNewAvatar(result.assets[0]);
    }
  };
  
  const handleUpdateProfile = async () => {
    if (!user || !supabase) return;
    setIsSaving(true);

    try {
      let newPublicUrl = currentPhotoUrl;

      // Step 1: Upload new avatar if one was selected
      if (newAvatar && newAvatar.base64) {
        const fileExt = newAvatar.uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
        const filePath = `${user.id}/${new Date().getTime()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars').upload(filePath, decode(newAvatar.base64), { contentType: `image/${fileExt}`, upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        newPublicUrl = urlData.publicUrl;
      }

      // --- THIS IS THE FIX ---
      // Step 2: Update ONLY the 'profiles' table in Supabase. This is the source of truth.
      const { error: updateError } = await supabase
        .from('profiles').upsert({ 
            id: user.id, 
            name: name, // The name from the input field
            profile_photo_url: newPublicUrl // The new photo URL
        }, { onConflict: 'id' });

      if (updateError) throw updateError;
      
      // Step 3: The failing user.update() call has been completely removed.
      // --- END OF FIX ---

      Alert.alert('Success', 'Your profile has been updated!');
      router.back(); // Go back to the profile screen, which will refetch the updated data.

    } catch (error: any) {
      console.error("Update Profile Error:", JSON.stringify(error, null, 2));
      const errorMessage = error?.message || 'An unexpected error occurred. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#0891b2" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><ArrowLeft size={24} color="#1e293b" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleUpdateProfile} style={styles.saveButton} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#ffffff" /> : <Save size={20} color="#ffffff" />}
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: newAvatar?.uri || currentPhotoUrl || user?.imageUrl || 'https://via.placeholder.com/150' }} style={styles.avatar} />
          <TouchableOpacity style={styles.cameraButton} onPress={handlePickAvatar}><Camera size={20} color="#ffffff" /></TouchableOpacity>
        </View>
        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter your full name" placeholderTextColor="#94a3b8" />
        </View>
      </ScrollView>
    </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  saveButton: {
    backgroundColor: '#0891b2',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  content: { padding: 20 },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e2e8f0',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: '30%',
    backgroundColor: '#DC2626',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  form: { width: '100%' },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
});
