// app/(owner)/edit-profile.tsx

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { useSession, useUser } from '@clerk/clerk-expo';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export default function EditProfileScreen() {
  const { session } = useSession();
  const { user } = useUser();

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newImage, setNewImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // Effect 1: Create the session-aware Supabase client
  React.useEffect(() => {
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

  // Fetch current profile data when the screen loads
  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        if (!supabase || !user) {
          setIsLoading(false);
          return;
        }
        setIsLoading(true);

        const { data, error } = await supabase
          .from('profiles')
          .select('name, profile_photo_url')
          .eq('id', user.id)
          .single();

        if (error) {
          Alert.alert('Error', 'Failed to load profile data.');
          console.error(error);
        } else if (data) {
          setFullName(data.name || '');
          setProfilePhotoUrl(data.profile_photo_url);
        }
        setIsLoading(false);
      };
      loadProfile();
    }, [supabase, user])
  );

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const photo = result.assets[0];
      setNewImage(photo); // Store the full image asset
      setProfilePhotoUrl(photo.uri); // Show preview immediately
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      let publicUrl = profilePhotoUrl;

      // If a new image was picked, upload it
      if (newImage) {
        const fileExt = newImage.uri.split('.').pop();
        const fileName = `${user.id}_${new Date().getTime()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        // Use base64 upload method like in signup
        const base64 = await FileSystem.readAsStringAsync(newImage.uri, { encoding: 'base64' });
        const arrayBuffer = decode(base64);

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, arrayBuffer, { 
            contentType: newImage.type ? `${newImage.type}/${fileExt}` : `image/${fileExt}`,
            upsert: true 
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        publicUrl = data.publicUrl;
      }

      // Update the profiles table with the new name and photo URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ name: fullName, profile_photo_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      Alert.alert('Success', 'Profile updated successfully!');
      router.back(); // Go back to the profile screen

    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert('Error', error.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#f97316" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>
      <View style={styles.content}>
        <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
          {profilePhotoUrl ? (
            <Image source={{ uri: profilePhotoUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User size={48} color="#64748b" />
            </View>
          )}
          <View style={styles.cameraIcon}>
            <Camera size={20} color="#ffffff" />
          </View>
        </TouchableOpacity>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Enter your full name"
        />

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleUpdateProfile}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  content: { padding: 20 },
  avatarContainer: { alignSelf: 'center', marginBottom: 30, position: 'relative' },
  avatarImage: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#f97316', padding: 8, borderRadius: 16, borderWidth: 2, borderColor: '#ffffff' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#DC2626', padding: 8, borderRadius: 16, borderWidth: 2, borderColor: '#ffffff' },
  label: { fontSize: 16, fontWeight: '500', color: '#334155', marginBottom: 8 },
  input: { backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 20 },
  saveButton: { backgroundColor: '#f97316', padding: 16, borderRadius: 8, alignItems: 'center' },
  saveButton: { backgroundColor: '#DC2626', padding: 16, borderRadius: 8, alignItems: 'center' },
  saveButtonDisabled: { backgroundColor: '#fdba74' },
  saveButtonDisabled: { backgroundColor: '#FCA5A5' },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});
