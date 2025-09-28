import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Heart, Search, Grid3x3, Utensils, Coffee, Cake, Tag, User, Navigation } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Link, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// Type definitions remain the same
type Shop = {
  shop_id: number; name: string; description: string; address: string; main_photo_path: string | null;
};
type Item = { id: number; name: string; };

export default function CustomerHomeScreen() {
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

  const fetchData = useCallback(async () => {
    if (!session?.user) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const [profileRes, shopsRes, categoriesRes, tagsRes] = await Promise.all([
        supabase.from('profiles').select('name, profile_photo_url').eq('id', session.user.id).single(),
        supabase.rpc('get_all_approved_shops_with_details'),
        supabase.from('categories').select('category_id, name'),
        supabase.from('tags').select('tag_id, tag_name')
      ]);

      if (profileRes.error && profileRes.error.code !== 'PGRST116') throw profileRes.error;
      if (shopsRes.error) throw shopsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (tagsRes.error) throw tagsRes.error;

      setUserName(profileRes.data?.name || 'New User');

      if (profileRes.data?.profile_photo_url) {
        const { data: urlData } = await supabase.storage.from('avatars').createSignedUrl(profileRes.data.profile_photo_url, 3600);
        setProfilePhotoUrl(urlData?.signedUrl || null);
      }

      const shopsWithUrls = await Promise.all(
        (shopsRes.data || []).map(async (shop: any) => {
          let displayUrl = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
          if (shop.main_photo_path  ) {
            const { data: urlData } = await supabase.storage.from('shop-images').createSignedUrl(shop.main_photo_path, 3600);
            if (urlData) displayUrl = urlData.signedUrl;
          }
          return { ...shop, display_photo_url: displayUrl };
        })
      );

      setShops(shopsWithUrls);
      setCategories((categoriesRes.data || []).map(c => ({ id: c.category_id, name: c.name })));
      setTags((tagsRes.data || []).map(t => ({ id: t.tag_id, name: t.tag_name })));

    } catch (error: any) {
      Alert.alert("Error", "Could not load data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => {
    fetchData();
  }, [fetchData]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  };

  const fetchFilteredShops = async (catId: number | 'all' = 'all', tagId: number | 'all' = 'all') => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_shops_by_link', {
        p_category_id: catId === 'all' ? null : catId,
        p_tag_id: tagId === 'all' ? null : tagId,
      });

      if (error) throw error;

      const shopsWithUrls = await Promise.all(
        (data || []).map(async (shop: Shop) => {
          let displayUrl = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
          if (shop.main_photo_path  ) {
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerContainer}>
        <LinearGradient colors={['#E53E3E', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerGradient}>
          {/* --- CHANGE 1: The main header content now uses the corrected styles --- */}
          <View style={styles.headerContent}>
              <View style={styles.welcomeSection}>
                  <View style={styles.logo}><Grid3x3 size={20} color="#1F2937" /></View>
                  <View style={styles.welcomeTextContainer}>
                      <Text style={styles.headerTitle} numberOfLines={1}>Welcome, {userName}!</Text>
                      <Text style={styles.headerSubtitle}>Discover & save Penang shops</Text>
                  </View>
              </View>
              <View style={styles.headerActions}>
                  <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/(customer)/favorites')}><Heart size={18} color="#1F2937" /></TouchableOpacity>
                  <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/(customer)/profile')}>
                    <View style={styles.profileIcon}>
                      {profilePhotoUrl ? (
                        <Image source={{ uri: profilePhotoUrl }} style={styles.profileImage} />
                      ) : (
                        <User size={18} color="#1F2937" />
                      )}
                    </View>
                  </TouchableOpacity>
              </View>
          </View>
        </LinearGradient>
      </View>
      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false}>
        <View style={styles.searchContainer}><Link href="/(customer)/search" asChild><TouchableOpacity style={styles.searchInputContainer}><Search size={20} color="#6B7280" /><Text style={styles.searchInputPlaceholder}>Search shops in Penang...</Text></TouchableOpacity></Link></View>
        <View style={styles.filtersSection}><Text style={styles.filterTitle}>Categories</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}><FilterButton id="all" name="All" isSelected={selectedCategoryId === 'all'} onSelect={() => handleSelectCategory('all')} icon={Grid3x3} />{categories.map(c => (<FilterButton key={`cat-${c.id}`} id={c.id} name={c.name} isSelected={selectedCategoryId === c.id} onSelect={() => handleSelectCategory(c.id)} icon={getIconForCategory(c.name)} />))}</ScrollView></View>
        <View style={styles.filtersSection}><Text style={styles.filterTitle}>Tags</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}><FilterButton id="all" name="All" isSelected={selectedTagId === 'all'} onSelect={() => handleSelectTag('all')} icon={Tag} />{tags.map(t => (<FilterButton key={`tag-${t.id}`} id={t.id} name={t.name} isSelected={selectedTagId === t.id} onSelect={() => handleSelectTag(t.id)} />))}</ScrollView></View>
        
        {isLoading && !refreshing ? <ActivityIndicator size="large" color="#E53E3E" style={{ marginTop: 40 }} /> : (
          <View style={styles.shopsGridContainer}>
            {shops.length > 0 ? shops.map(shop => <ShopCard key={shop.shop_id} shop={shop} />) : <Text style={styles.emptyText}>No restaurants found for the selected filters.</Text>}
          </View>
        )}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const FilterButton = ({ id, name, isSelected, onSelect, icon: Icon }: any) => (<TouchableOpacity style={[styles.filterButton, isSelected && styles.filterButtonSelected]} onPress={onSelect}>{Icon && <Icon size={20} color={isSelected ? '#FFFFFF' : '#E53E3E'} />}<Text style={[styles.filterButtonText, isSelected && styles.filterButtonTextSelected]}>{name}</Text></TouchableOpacity>);

const ShopCard = ({ shop }: any) => {
  const openDetails = () => router.push({ pathname: '/(customer)/restaurant-details', params: { restaurantId: shop.shop_id } });
  const handleNavigatePress = () => router.push({ pathname: '/(customer)/map', params: { highlightShopId: shop.shop_id } });

  return (
    <View style={styles.shopCard}>
      <TouchableOpacity onPress={openDetails} style={styles.cardTopSection}>
        <View style={styles.cardContent}>
          <View>
            <Image source={{ uri: shop.display_photo_url }} style={styles.shopImage} />
            <View style={styles.shopInfo}>
              <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
              <Text style={styles.shopDescription} numberOfLines={2}>{shop.description}</Text>
              {shop.address && (
                <View style={styles.locationContainer}>
                  <MapPin size={14} color="#6B7280" />
                  <Text style={styles.locationText} numberOfLines={1}>{shop.address}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.cardActionsContainer}>
            <TouchableOpacity style={styles.detailsButton} onPress={openDetails}>
              <Text style={styles.detailsButtonText}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navigateButton} onPress={handleNavigatePress}>
              <Navigation size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// --- CHANGE 2: Finalized styles for header and cards ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F7F7' },
    headerContainer: {},
    headerGradient: {},
    headerContent: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      paddingHorizontal: 15, // Adjusted padding
      paddingTop: 10,
      paddingBottom: 20,
    },
    // New style to group the logo and welcome text
    welcomeSection: {
      flex: 1, // This makes it take up the available space
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    logo: { 
      width: 40, 
      height: 40, 
      backgroundColor: '#FFFFFF', 
      borderRadius: 12, // Slightly less rounded
      alignItems: 'center', 
      justifyContent: 'center',
    },
    // New container for the text to allow it to shrink if needed
    welcomeTextContainer: {
      flex: 1, // Allows text to shrink and not push the buttons
    },
    headerTitle: { 
      fontSize: 18, // Slightly smaller
      fontWeight: 'bold', 
      color: '#FFFFFF' 
    },
    headerSubtitle: { 
      fontSize: 13, // Slightly smaller
      color: 'rgba(255,255,255,0.9)', 
      marginTop: 1 
    },
    headerActions: { 
      flexDirection: 'row', 
      alignItems: 'center',
      gap: 8,
    },
    headerButton: { 
      width: 40, 
      height: 40, 
      backgroundColor: 'rgba(255, 255, 255, 0.9)', 
      borderRadius: 12, 
      alignItems: 'center', 
      justifyContent: 'center',
    },
    profileIcon: { 
      width: 40, 
      height: 40, 
      borderRadius: 12, // Match the other buttons
      backgroundColor: '#F3F4F6', 
      alignItems: 'center', 
      justifyContent: 'center', 
      overflow: 'hidden' 
    },
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
    shopsGridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingHorizontal: 15,
    },
    shopCard: { 
      width: '48%', 
      backgroundColor: '#FFFFFF', 
      borderRadius: 24, 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 4 }, 
      shadowOpacity: 0.08, 
      shadowRadius: 10, 
      elevation: 6,
      marginBottom: 20,
    },
    cardTopSection: {
      flex: 1,
    },
    cardContent: {
      flex: 1,
      justifyContent: 'space-between',
      padding: 12,
    },
    shopImage: { 
      width: '100%', 
      height: 120,
      borderRadius: 16,
      backgroundColor: '#F3F4F6',
      marginBottom: 12,
    },
    shopInfo: {},
    shopName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
    shopDescription: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 8 },
    locationContainer: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      gap: 4, 
      marginTop: 4,
    },
    locationText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    cardActionsContainer: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    detailsButton: { 
      flex: 1, 
      backgroundColor: '#E53E3E', 
      borderRadius: 14, 
      paddingVertical: 10,
      alignItems: 'center', 
      justifyContent: 'center',
    },
    detailsButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
    navigateButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: '#3B82F6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bottomSpacing: { height: 20 },
    emptyText: { width: '100%', textAlign: 'center', color: '#6B7280', marginTop: 40, fontSize: 16, fontStyle: 'italic' },
});
