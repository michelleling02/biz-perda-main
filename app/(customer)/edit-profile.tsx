import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { User, Camera, ArrowLeft, Save } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export default function EditProfileScreen() {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newImage, setNewImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        if (!user) {
          setIsLoading(false);
          return;
        }
        setIsLoading(true);
        try {
          const { data, error } = await supabase.from('profiles').select('name, profile_photo_url').eq('id', user.id).single();
          
          if (error && error.code !== 'PGRST116') throw error;
          
          if (data) {
            setFullName(data.name || '');
            setProfilePhotoUrl(data.profile_photo_url);
          }
        } catch (err: any) {
          Alert.alert('Error', 'Failed to load profile data.');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      loadProfile();
    }, [user])
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
      setNewImage(photo);
      setProfilePhotoUrl(photo.uri);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      let finalPhotoUrl = profilePhotoUrl;

      if (newImage) {
        const fileExt = newImage.uri.split('.').pop();
        const fileName = `${user.id}_${new Date().getTime()}.${fileExt}`;
        const filePath = `${fileName}`;

        const base64 = await FileSystem.readAsStringAsync(newImage.uri, { encoding: 'base64' });
        const arrayBuffer = decode(base64);

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, arrayBuffer, { 
            contentType: newImage.mimeType ?? `image/${fileExt}`,
            upsert: true 
          });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        finalPhotoUrl = urlData.publicUrl;
      }

      const updates = {
        id: user.id,
        name: fullName,
        updated_at: new Date().toISOString(),
        profile_photo_url: finalPhotoUrl,
      };

      const { error: updateError } = await supabase.from('profiles').upsert(updates);
      if (updateError) throw updateError;

      Alert.alert('Success', 'Profile updated successfully!');
      router.back();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert('Error', error.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#E53E3E', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </LinearGradient>

      <View style={styles.content}>
        <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
          {profilePhotoUrl ? (
            <Image source={{ uri: profilePhotoUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User size={48} color="#9CA3AF" />
            </View>
          )}
          <View style={styles.cameraIcon}>
            <Camera size={20} color="#ffffff" />
          </View>
        </TouchableOpacity>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            placeholderTextColor="#9CA3AF"
          />

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleUpdateProfile}
            disabled={isSaving}
          >
            <LinearGradient
              colors={['#E53E3E', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Save size={20} color="#ffffff" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 24, paddingVertical: 28, flexDirection: 'row', alignItems: 'center' },
  backButton: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 12, marginRight: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  content: { flex: 1, padding: 28 },
  avatarContainer: { alignSelf: 'center', marginBottom: 40, position: 'relative' },
  avatarImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#E53E3E', padding: 10, borderRadius: 20, borderWidth: 3, borderColor: '#FFFFFF' },
  form: { flex: 1 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
  input: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 16, borderRadius: 16, fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 32, color: '#111827', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  saveButton: { borderRadius: 16, overflow: 'hidden', shadowColor: '#E53E3E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  saveButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 12 },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});