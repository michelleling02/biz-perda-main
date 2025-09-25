import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Heart, Search, Grid3x3, Utensils, Coffee, Cake, Tag, User } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Link, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase'; // Use the global Supabase client
import { useAuth } from '../../contexts/AuthContext'; // Use our own AuthContext

// Type definitions remain the same
type Shop = {
  shop_id: number; name: string; description: string; address: string; main_photo_path: string | null;
};
type Item = { id: number; name: string; };

export default function CustomerHomeScreen() {
  // Use our own AuthContext to get the user session
  const { session } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [shops, setShops] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Item[]>([]);
  const [tags, setTags] = useState<Item[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [selectedTagId, setSelectedTagId] = useState<number | 'all'>('all');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Guest');

  // Simplified data fetching logic
  const fetchData = useCallback(async () => {
    if (!session?.user) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      // Fetch everything in parallel for speed
      const [profileRes, shopsRes, categoriesRes, tagsRes] = await Promise.all([
        supabase.from('profiles').select('name, profile_photo_url').eq('id', session.user.id).single(),
        supabase.from('public_shops_with_photos').select('*'),
        supabase.from('categories').select('category_id, name'),
        supabase.from('tags').select('tag_id, tag_name')
      ]);

      if (profileRes.error && profileRes.error.code !== 'PGRST116') throw profileRes.error;
      if (shopsRes.error) throw shopsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (tagsRes.error) throw tagsRes.error;

      // Set user name
      setUserName(profileRes.data?.name || 'New User');

      // Set profile photo
      if (profileRes.data?.profile_photo_url) {
        const { data: urlData } = await supabase.storage.from('avatars').createSignedUrl(profileRes.data.profile_photo_url, 3600);
        setProfilePhotoUrl(urlData?.signedUrl || null);
      }

      // Process and set shops with signed URLs
      const shopsWithUrls = await Promise.all(
        (shopsRes.data || []).map(async (shop: Shop) => {
          let displayUrl = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
          
          // The view gives us the correct path in the 'main_photo_path' column.
          if (shop.main_photo_path ) {
            const { data: urlData } = await supabase.storage
              .from('shop-images')
              .createSignedUrl(shop.main_photo_path, 3600); // Get a temporary URL for display
            
            if (urlData) {
              displayUrl = urlData.signedUrl;
            }
          }
          
          // Return the shop object with the final, displayable URL.
          return { ...shop, display_photo_url: displayUrl };
        })
      );

      setShops(shopsWithUrls);

      // Set categories and tags
      setCategories((categoriesRes.data || []).map(c => ({ id: c.category_id, name: c.name })));
      setTags((tagsRes.data || []).map(t => ({ id: t.tag_id, name: t.tag_name })));

    } catch (error: any) {
      Alert.alert("Error", "Could not load data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // useFocusEffect to refetch data when the screen is focused
  useFocusEffect(useCallback(() => {
    fetchData();
  }, [fetchData]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  };

  // Filtering logic remains largely the same, but simplified
  const fetchFilteredShops = async (catId: number | 'all' = 'all', tagId: number | 'all' = 'all') => {
    setIsLoading(true);
    try {
      // Call the new RPC function
      const { data, error } = await supabase.rpc('search_shops_by_link', {
        p_category_id: catId === 'all' ? null : catId,
        p_tag_id: tagId === 'all' ? null : tagId,
      });

      if (error) throw error;

      // The rest of the function is the same
      const shopsWithUrls = await Promise.all(
        (data || []).map(async (shop: Shop) => {
          let displayUrl = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
          if (shop.main_photo_path ) {
            const { data: urlData } = await supabase.storage.from('shop-images').createSignedUrl(shop.main_photo_path, 3600);
            if (urlData) displayUrl = urlData.signedUrl;
          }
          return { ...shop, display_photo_url: displayUrl };
        })
      );
      setShops(shopsWithUrls);
    } catch (error: any) {
      Alert.alert("Filter Error", "Could not apply filters: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCategory = (id: number | 'all') => { setSelectedCategoryId(id); fetchFilteredShops(id, selectedTagId); };
  const handleSelectTag = (id: number | 'all') => { setSelectedTagId(id); fetchFilteredShops(selectedCategoryId, id); };
  const openDetails = (shop: any) => router.push({ pathname: '/(customer)/restaurant-details', params: { restaurantId: shop.shop_id } });
  const getIconForCategory = (name: string) => { const n = name.toLowerCase(); if (n.includes('kafe')) return Coffee; if (n.includes('bakery')) return Cake; if (n.includes('restoran')) return Utensils; return Tag; };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F7F7'}}>
        <ActivityIndicator size="large" color="#58508D" />
        <Text style={{marginTop: 10, color: '#64748b'}}>Loading Restaurants...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#E53E3E', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
                <View style={styles.logo}><Grid3x3 size={24} color="#1F2937" /></View>
                <View>
                    <Text style={styles.headerTitle}>Welcome, {userName}!</Text>
                    <Text style={styles.headerSubtitle}>Discover & save Penang shops</Text>
                </View>
            </View>
            <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/(customer)/favorites')}><Heart size={20} color="#1F2937" /></TouchableOpacity>
                <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/(customer)/profile')}>
                  <View style={styles.profileIcon}>
                    {profilePhotoUrl ? (
                      <Image source={{ uri: profilePhotoUrl }} style={styles.profileImage} />
                    ) : (
                      <User size={20} color="#1F2937" />
                    )}
                  </View>
                </TouchableOpacity>
            </View>
        </View>
      </LinearGradient>
      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false}>
        <View style={styles.searchContainer}><Link href="/(customer)/search" asChild><TouchableOpacity style={styles.searchInputContainer}><Search size={20} color="#6B7280" /><Text style={styles.searchInputPlaceholder}>Search shops in Penang...</Text></TouchableOpacity></Link></View>
        <View style={styles.filtersSection}><Text style={styles.filterTitle}>Categories</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}><FilterButton id="all" name="All" isSelected={selectedCategoryId === 'all'} onSelect={() => handleSelectCategory('all')} icon={Grid3x3} />{categories.map(c => (<FilterButton key={`cat-${c.id}`} id={c.id} name={c.name} isSelected={selectedCategoryId === c.id} onSelect={() => handleSelectCategory(c.id)} icon={getIconForCategory(c.name)} />))}</ScrollView></View>
        <View style={styles.filtersSection}><Text style={styles.filterTitle}>Tags</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}><FilterButton id="all" name="All" isSelected={selectedTagId === 'all'} onSelect={() => handleSelectTag('all')} icon={Tag} />{tags.map(t => (<FilterButton key={`tag-${t.id}`} id={t.id} name={t.name} isSelected={selectedTagId === t.id} onSelect={() => handleSelectTag(t.id)} />))}</ScrollView></View>
        {isLoading && !refreshing ? <ActivityIndicator size="large" color="#E53E3E" style={{ marginTop: 40 }} /> : <View style={styles.shopsContainer}>{shops.length > 0 ? shops.map(shop => <ShopCard key={shop.shop_id} shop={shop} openDetails={openDetails} />) : <Text style={styles.emptyText}>No restaurants found for the selected filters.</Text>}</View>}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper components (FilterButton, ShopCard) and styles are unchanged.
// ... (paste the same FilterButton, ShopCard, and styles from your previous file here)
const FilterButton = ({ id, name, isSelected, onSelect, icon: Icon }: any) => (<TouchableOpacity style={[styles.filterButton, isSelected && styles.filterButtonSelected]} onPress={onSelect}>{Icon && <Icon size={20} color={isSelected ? '#FFFFFF' : '#E53E3E'} />}<Text style={[styles.filterButtonText, isSelected && styles.filterButtonTextSelected]}>{name}</Text></TouchableOpacity>);
const ShopCard = ({ shop, openDetails }: any) => (
  <TouchableOpacity style={styles.shopCard} onPress={() => openDetails(shop)}>
    <View style={styles.shopImageContainer}>
      {/* Use the correct property that holds the full, signed URL */}
      <Image source={{ uri: shop.display_photo_url }} style={styles.shopImage} />
    </View>
    <View style={styles.shopInfo}>
      <Text style={styles.shopName}>{shop.name}</Text>
      <Text style={styles.shopDescription} numberOfLines={2}>{shop.description}</Text>
      <View style={styles.shopMeta}>
        <View style={styles.ratingContainer}>
          <MapPin size={14} color="#6B7280" />
          <Text style={styles.distance}>{shop.address || 'Location not set'}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.detailsButton} onPress={() => openDetails(shop)}>
        <Text style={styles.detailsButtonText}>View Details</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F7F7' },
    header: { paddingHorizontal: 20, paddingVertical: 24 },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    logo: { width: 44, height: 44, backgroundColor: '#FFFFFF', borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    headerTitle: { fontSize: 19, fontWeight: 'bold', color: '#FFFFFF' },
    headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
    headerActions: { flexDirection: 'row', gap: 8 },
    headerButton: { width: 44, height: 44, backgroundColor: '#FFFFFF', borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    profileIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    profileImage: { width: '100%', height: '100%' },
    content: { flex: 1 },
    searchContainer: { paddingHorizontal: 20, paddingTop: 24 },
    searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 14, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 },
    searchInputPlaceholder: { flex: 1, fontSize: 16, color: '#6B7280' },
    filtersSection: { paddingLeft: 20, marginVertical: 24 },
    filterTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
    filterButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 18, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3, marginRight: 12 },
    filterButtonSelected: { backgroundColor: '#E53E3E', borderColor: '#E53E3E', shadowColor: '#E53E3E', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
    filterButtonText: { fontSize: 14, color: '#374151', fontWeight: '600' },
    filterButtonTextSelected: { color: '#FFFFFF', fontWeight: '600' },
    shopsContainer: { paddingHorizontal: 20, gap: 20 },
    shopCard: { backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8, overflow: 'hidden' },
    shopImageContainer: { position: 'relative' },
    shopImage: { width: '100%', height: 220, backgroundColor: '#F3F4F6' },
    shopInfo: { padding: 24 },
    shopName: { fontSize: 21, fontWeight: 'bold', color: '#1F2937', marginBottom: 10 },
    shopDescription: { fontSize: 15, color: '#6B7280', lineHeight: 22, marginBottom: 16 },
    shopMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    distance: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
    detailsButton: { backgroundColor: '#E53E3E', borderRadius: 16, paddingVertical: 14, alignItems: 'center', shadowColor: '#E53E3E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    detailsButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
    bottomSpacing: { height: 20 },
    emptyText: { textAlign: 'center', color: '#6B7280', marginTop: 40, fontSize: 16, fontStyle: 'italic' },
});
