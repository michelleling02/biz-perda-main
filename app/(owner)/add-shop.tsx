import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ImageIcon, X, Upload, Search } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-url-polyfill/auto';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { router } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import PlacesInput from 'react-native-places-input';
import Constants from 'expo-constants';

type Item = { id: number; name: string; };

// The 'Place' type is now globally available from the types/google-places.d.ts file.

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleApiKey;

export default function AddShopScreen() {
  const [formData, setFormData] = useState({
    name: '', description: '', address: '',
    phone: '', hours: '',
  });
  
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [mainImageUri, setMainImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  const [allCategories, setAllCategories] = useState<Item[]>([]);
  const [allTags, setAllTags] = useState<Item[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set());
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [region, setRegion] = useState({
    latitude: 5.4164,
    longitude: 100.3327,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      Alert.alert("Configuration Error", "Google Maps API key is missing.");
    }
    const fetchInitialData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        const [categoriesRes, tagsRes] = await Promise.all([
          supabase.from('categories').select('category_id, name'),
          supabase.from('tags').select('tag_id, tag_name'),
        ]);
        if (categoriesRes.error) throw categoriesRes.error;
        if (tagsRes.error) throw tagsRes.error;
        const categoriesData = (categoriesRes.data || []).map(c => ({ id: c.category_id, name: c.name }));
        const tagsData = (tagsRes.data || []).map(t => ({ id: t.tag_id, name: t.tag_name }));
        setAllCategories(categoriesData);
        setAllTags(tagsData);
      } catch (error: any) {
        Alert.alert('Error', 'Could not load required data for this form.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', address: '', phone: '', hours: '' });
    setSelectedImages([]);
    setMainImageUri(null);
    setSelectedCategoryIds(new Set());
    setSelectedTagIds(new Set());
    setLocation(null);
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to allow access to your photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newImages = result.assets;
      setSelectedImages(prevImages => [...prevImages, ...newImages]);
      if (!mainImageUri && newImages.length > 0) {
        setMainImageUri(newImages[0].uri);
      }
    }
  };

  const handleToggleCategory = (id: number) => {
    setSelectedCategoryIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleToggleTag = (id: number) => {
    setSelectedTagIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const submitShop = async () => {
    if (!session?.user) {
      Alert.alert('Error', 'You must be logged in to submit a shop.');
      return;
    }
    if (!formData.name || selectedImages.length === 0) {
      Alert.alert('Validation Error', 'Please fill in the shop name and select at least one image.');
      return;
    }
    if (!mainImageUri) {
      Alert.alert('Validation Error', 'Please select a main image for your shop.');
      return;
    }
    if (!location) {
      Alert.alert('Validation Error', 'Please set your shop location on the map.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: newShopId, error: createError } = await supabase.rpc('create_shop_with_links', {
        p_name: formData.name,
        p_description: formData.description,
        p_address: formData.address,
        p_phone_number: formData.phone,
        p_operating_hours: formData.hours,
        p_category_ids: Array.from(selectedCategoryIds),
        p_tag_ids: Array.from(selectedTagIds),
        p_latitude: location.latitude,
        p_longitude: location.longitude,
      }).single();

      if (createError || !newShopId) {
        throw new Error(createError?.message || 'Failed to create shop entry.');
      }

      for (const image of selectedImages) {
        const fileExt = image.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${newShopId}/${fileName}`;

        const base64 = await FileSystem.readAsStringAsync(image.uri, { encoding: 'base64' });
        const arrayBuffer = decode(base64);

        const { error: uploadError } = await supabase.storage
          .from('shop-images')
          .upload(filePath, arrayBuffer, { contentType: image.mimeType ?? `image/${fileExt}` });

        if (uploadError) {
          console.error(`Failed to upload ${fileName}:`, uploadError);
          continue;
        }

        const { error: photoInsertError } = await supabase.from('shopphotos').insert({
            shop_id: newShopId,
            uploader_user_id: session.user.id,
            photo_url: filePath,
            type: image.uri === mainImageUri ? 'Main' : 'Gallery',
            status: 'Approved'
        });

        if (photoInsertError) {
          console.error(`Failed to link photo ${fileName}:`, photoInsertError);
        }
      }

      Alert.alert('Success!', 'Your shop has been submitted for review.', [{ text: 'OK', onPress: () => {
        resetForm();
        router.replace('/(owner)');
      }}]);

    } catch (error: any) {
      console.error("Error submitting shop:", error);
      Alert.alert('Error', 'There was a problem submitting your shop: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#32d74b" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#32d74b', '#30d158']} style={styles.header}>
        <Text style={styles.headerTitle}>Add New Restaurant</Text>
        <Text style={styles.headerSubtitle}>Share your delicious food with the community</Text>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.formContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shop Photos *</Text>
            <Text style={styles.sectionSubtitle}>Select one or more images. Choose one to be the main photo.</Text>

            <View style={styles.imageListContainer}>
              {selectedImages.map((image) => {
                const isMain = image.uri === mainImageUri;
                return (
                  <View key={image.uri} style={[styles.imagePreviewWrapper, isMain && styles.mainImageWrapper]}>
                    <Image source={{ uri: image.uri }} style={styles.previewImage} />
                    
                    {isMain && (
                      <View style={styles.mainTag}>
                        <Text style={styles.mainTagText}>Main</Text>
                      </View>
                    )}

                    <View style={styles.imageActions}>
                      {!isMain && (
                        <TouchableOpacity style={styles.actionButton} onPress={() => setMainImageUri(image.uri)}>
                          <Text style={styles.actionButtonText}>Make Main</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={[styles.actionButton, styles.removeButton]} onPress={() => {
                        setSelectedImages(prev => prev.filter(img => img.uri !== image.uri));
                        if (isMain) {
                          setMainImageUri(null);
                        }
                      }}>
                        <X size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              <ImageIcon size={32} color="#64748b" />
              <Text style={styles.imagePickerText}>Tap to add images</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Shop Name *</Text>
              <TextInput style={styles.input} value={formData.name} onChangeText={(text) => updateField('name', text)} placeholder="Enter your restaurant name" placeholderTextColor="#94a3b8" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput style={[styles.input, styles.textArea]} value={formData.description} onChangeText={(text) => updateField('description', text)} placeholder="Describe your restaurant and signature dishes" placeholderTextColor="#94a3b8" multiline numberOfLines={4} textAlignVertical="top" />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location & Address *</Text>
            <Text style={styles.sectionSubtitle}>Search for the address and fine-tune the pin on the map.</Text>
            
            <TouchableOpacity style={styles.addressInputButton} onPress={() => setIsAddressModalVisible(true)}>
              <Search size={18} color="#64748b" />
              <Text style={[styles.addressInputText, !formData.address && styles.addressInputPlaceholder]}>
                {formData.address || 'Tap to search for an address'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.mapContainer}>
                <MapView
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    region={region}
                    onRegionChangeComplete={setRegion}
                    showsUserLocation={true}
                >
                    {location && (
                      <Marker
                        coordinate={location}
                        draggable
                        onDragEnd={(e) => setLocation(e.nativeEvent.coordinate)}
                        title="Shop Location"
                        description="Drag to adjust"
                      />
                    )}
                </MapView>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <Text style={styles.sectionSubtitle}>Select one or more relevant categories.</Text>
            <View style={styles.itemsContainer}>
              {allCategories.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.item, selectedCategoryIds.has(item.id) && styles.itemSelected]}
                  onPress={() => handleToggleCategory(item.id)}
                >
                  <Text style={[styles.itemText, selectedCategoryIds.has(item.id) && styles.itemTextSelected]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <Text style={styles.sectionSubtitle}>Select tags that describe your shop (e.g., Halal, Vegetarian).</Text>
            <View style={styles.itemsContainer}>
              {allTags.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.item, selectedTagIds.has(item.id) && styles.itemSelected]}
                  onPress={() => handleToggleTag(item.id)}
                >
                  <Text style={[styles.itemText, selectedTagIds.has(item.id) && styles.itemTextSelected]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput style={styles.input} value={formData.phone} onChangeText={(text) => updateField('phone', text)} placeholder="+60123456789" placeholderTextColor="#94a3b8" keyboardType="phone-pad" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Business Hours</Text>
              <TextInput style={styles.input} value={formData.hours} onChangeText={(text) => updateField('hours', text)} placeholder="e.g., Mon-Fri: 9AM-6PM" placeholderTextColor="#94a3b8" />
            </View>
          </View>

          <TouchableOpacity style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} onPress={submitShop} disabled={isSubmitting}>
            <LinearGradient colors={['#32d74b', '#30d158']} style={styles.submitButtonGradient}>
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Upload size={20} color="#ffffff" />
              )}
              <Text style={styles.submitButtonText}>{isSubmitting ? 'Submitting...' : 'Submit for Review'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={isAddressModalVisible}
        animationType="slide"
        onRequestClose={() => setIsAddressModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Search Address</Text>
            <TouchableOpacity onPress={() => setIsAddressModalVisible(false)}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <PlacesInput
              googleApiKey={GOOGLE_MAPS_API_KEY || ''}
              onSelect={place => {
                if (place.result?.geometry?.location) {
                  const coords = {
                    latitude: place.result.geometry.location.lat,
                    longitude: place.result.geometry.location.lng,
                  };
                  setLocation(coords);
                  setRegion({ ...region, ...coords });
                  updateField('address', place.result.formatted_address || '');
                }
                setIsAddressModalVisible(false);
              }}
              queryCountries={['my']}
              placeHolder={"Search for an address or business name"}
              stylesContainer={{
                  flex: 1,
                  padding: 16,
                  backgroundColor: '#f8fafc',
              }}
              stylesInput={{
                  ...styles.input,
                  marginBottom: 16,
              }}
              stylesList={{
                borderColor: '#e2e8f0',
                borderWidth: 1,
                borderRadius: 12,
                backgroundColor: '#ffffff',
              }}
              stylesItem={{
                padding: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9',
              }}
              stylesItemText={{
                color: '#334155',
                fontSize: 15,
              }}
              stylesLoader={{
                marginTop: 20,
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingHorizontal: 20, paddingVertical: 24 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
    headerSubtitle: { fontSize: 14, color: '#d1fae5', marginTop: 4 },
    formContainer: { flex: 1 },
    form: { flex: 1 },
    section: { paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
    sectionSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 16 },
    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
    input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#1e293b' },
    textArea: { height: 100, paddingTop: 14 },
    imagePicker: { width: '100%', height: 120, borderWidth: 2, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', gap: 8, marginTop: 16 },
    imagePickerText: { fontSize: 16, color: '#64748b', fontWeight: '500' },
    submitButton: { marginHorizontal: 20, marginTop: 20, borderRadius: 12, overflow: 'hidden' },
    submitButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
    submitButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
    submitButtonDisabled: { opacity: 0.7 },
    bottomSpacing: { height: 40 },
    imageListContainer: { marginBottom: 16, gap: 12 },
    imagePreviewWrapper: { position: 'relative', width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
    mainImageWrapper: { borderColor: '#32d74b' },
    previewImage: { width: '100%', height: '100%' },
    mainTag: { position: 'absolute', top: 8, left: 8, backgroundColor: '#32d74b', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, zIndex: 1 },
    mainTagText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    imageActions: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', gap: 8 },
    actionButton: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    actionButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    removeButton: { padding: 6, backgroundColor: 'rgba(239, 68, 68, 0.8)' },
    itemsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    item: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 20,
    },
    itemSelected: {
        backgroundColor: '#dcfce7',
        borderColor: '#22c55e',
    },
    itemText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#334155',
    },
    itemTextSelected: {
        color: '#166534',
    },
    mapContainer: {
        height: 250,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        zIndex: 0,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    addressInputButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 16,
      gap: 8,
      zIndex: 2,
    },
    addressInputText: {
      fontSize: 16,
      color: '#1e293b',
      flex: 1,
    },
    addressInputPlaceholder: {
      color: '#94a3b8',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      backgroundColor: '#ffffff',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1e293b',
    },
});
