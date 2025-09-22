// app/(owner)/edit-shop.tsx

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Check,
  Tag,
  ChevronRight,
  Type,
  BookText,
  MapPin,
  Phone,
  Clock,
  Plus,
  X,
} from 'lucide-react-native';
import { decode } from 'base64-arraybuffer';

// --- TYPES ---
type Shop = {
  shop_id: number;
  name: string;
  description: string;
  address: string;
  phone_number: string;
  operating_hours: string;
};

type ShopPhoto = {
  photo_id: number;
  photo_url: string; // This is the path in the bucket
  signed_url: string; // This is the temporary public URL
};

export default function EditShopScreen() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form fields state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [operatingHours, setOperatingHours] = useState('');

  // State for photos
  const [photos, setPhotos] = useState<ShopPhoto[]>([]);

  useFocusEffect(
    useCallback(() => {
      const fetchShopData = async () => {
        if (!shopId) {
          Alert.alert('Error', 'No shop ID provided.');
          router.back();
          return;
        }
        setIsLoading(true);
        try {
          const [shopDetailsRes, shopPhotosRes] = await Promise.all([
            supabase.from('shops').select('shop_id, name, description, address, phone_number, operating_hours').eq('shop_id', shopId).single(),
            supabase.from('shopphotos').select('photo_id, photo_url').eq('shop_id', shopId),
          ]);

          if (shopDetailsRes.error) throw shopDetailsRes.error;
          if (shopPhotosRes.error) throw shopPhotosRes.error;

          const data = shopDetailsRes.data;
          setShop(data);
          setName(data.name || '');
          setDescription(data.description || '');
          setAddress(data.address || '');
          setPhoneNumber(data.phone_number || '');
          setOperatingHours(data.operating_hours || '');

          const photoPaths = shopPhotosRes.data || [];
          const signedPhotos = await Promise.all(
            photoPaths.map(async (photo) => {
              const { data: signedUrlData } = await supabase.storage
                .from('shop-images')
                .createSignedUrl(photo.photo_url, 3600);
              return {
                photo_id: photo.photo_id,
                photo_url: photo.photo_url,
                signed_url: signedUrlData?.signedUrl || 'https://placehold.co/400x400?text=Error',
              };
            } )
          );
          setPhotos(signedPhotos);

        } catch (error: any) {
          Alert.alert('Error', 'Failed to load shop data: ' + error.message);
        } finally {
          setIsLoading(false);
        }
      };

      fetchShopData();
    }, [shopId])
  );

  const handleSaveChanges = async () => {
    if (!shop) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('shops')
        .update({
          name,
          description,
          address,
          phone_number: phoneNumber,
          operating_hours: operatingHours,
        })
        .eq('shop_id', shop.shop_id);

      if (error) throw error;

      Alert.alert('Success', 'Shop details have been updated.');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save changes: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPhoto = async () => {
    if (!shop) return;
    setIsUploading(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled) {
        setIsUploading(false);
        return;
      }

      const asset = result.assets[0];
      const fileExt = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const filePath = `${shop.shop_id}/${new Date().getTime()}.${fileExt}`;
      const base64 = asset.base64;

      if (!base64) throw new Error('Could not read image file.');

      const { error: uploadError } = await supabase.storage
        .from('shop-images')
        .upload(filePath, decode(base64), { contentType: `image/${fileExt}` });

      if (uploadError) throw uploadError;

      const { data: newPhotoRecord, error: insertError } = await supabase
        .from('shopphotos')
        .insert({
          shop_id: shop.shop_id,
          photo_url: filePath,
          uploader_user_id: (await supabase.auth.getUser()).data.user?.id,
          status: 'Approved',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const { data: signedUrlData } = await supabase.storage.from('shop-images').createSignedUrl(filePath, 3600);
      const newPhoto: ShopPhoto = {
        photo_id: newPhotoRecord.photo_id,
        photo_url: filePath,
        signed_url: signedUrlData?.signedUrl || '',
      };
      setPhotos(prev => [...prev, newPhoto]);

    } catch (error: any) {
      Alert.alert('Upload Failed', error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = (photo: ShopPhoto) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error: storageError } = await supabase.storage
                .from('shop-images')
                .remove([photo.photo_url]);
              
              if (storageError) throw storageError;

              const { error: dbError } = await supabase
                .from('shopphotos')
                .delete()
                .eq('photo_id', photo.photo_id);

              if (dbError) throw dbError;

              setPhotos(prev => prev.filter(p => p.photo_id !== photo.photo_id));
              Alert.alert('Success', 'Photo has been deleted.');

            } catch (error: any) {
              Alert.alert('Delete Failed', error.message);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Shop</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photo Gallery</Text>
          <View style={styles.photoGrid}>
            {photos.map(photo => (
              <View key={photo.photo_id} style={styles.photoContainer}>
                <Image source={{ uri: photo.signed_url }} style={styles.photo} />
                <TouchableOpacity style={styles.deleteButton} onPress={() => handleRemovePhoto(photo)}>
                  <X size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhoto} disabled={isUploading}>
              {isUploading ? <ActivityIndicator color="#4f46e5" /> : <Plus size={24} color="#4f46e5" />}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Shop Name</Text>
          <View style={styles.inputContainer}>
            <Type size={20} color="#94a3b8" />
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g., Kopi Kenangan" />
          </View>

          <Text style={styles.label}>Description</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <BookText size={20} color="#94a3b8" style={{ marginTop: 12 }} />
            <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Tell customers about your shop..." multiline />
          </View>

          <Text style={styles.label}>Address</Text>
          <View style={styles.inputContainer}>
            <MapPin size={20} color="#94a3b8" />
            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="e.g., 123 Jalan Biz, Georgetown" />
          </View>

          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputContainer}>
            <Phone size={20} color="#94a3b8" />
            <TextInput style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} placeholder="e.g., 012-3456789" keyboardType="phone-pad" />
          </View>

          <Text style={styles.label}>Operating Hours</Text>
          <View style={styles.inputContainer}>
            <Clock size={20} color="#94a3b8" />
            <TextInput style={styles.input} value={operatingHours} onChangeText={setOperatingHours} placeholder="e.g., 9:00 AM - 10:00 PM" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push({ pathname: '/(owner)/edit-shop-tags', params: { shopId: shop?.shop_id } })}
          >
            <Tag size={20} color="#4f46e5" />
            <Text style={styles.menuItemText}>Manage Categories & Tags</Text>
            <ChevronRight size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Check size={20} color="#ffffff" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b', marginLeft: 16 },
  content: { flex: 1 },
  section: {
    marginTop: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoContainer: {
    width: 100,
    height: 100,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  deleteButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#eef2ff',
    borderWidth: 2,
    borderColor: '#c7d2fe',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: { paddingHorizontal: 20, paddingTop: 12 },
  label: { fontSize: 16, fontWeight: '500', color: '#334155', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 50,
    paddingLeft: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingTop: 4,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuItemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
