import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Heart, Search, Grid3x3, Utensils, Coffee, Cake, Tag } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Link, useFocusEffect } from 'expo-router';
import { useSession, useUser } from '@clerk/clerk-expo';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type Shop = {
  shop_id: number; name: string; description: string; address: string; main_photo_path: string | null;
};
type Item = { id: number; name: string; };

export default function CustomerHomeScreen() {
  const { session } = useSession();
  const { user, isLoaded: isUserLoaded } = useUser();

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shops, setShops] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Item[]>([]);
  const [tags, setTags] = useState<Item[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [selectedTagId, setSelectedTagId] = useState<number | 'all'>('all');
  
  // --- THIS IS THE FIX: State specifically for the profile photo ---
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  // --- END OF FIX ---

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

  const syncProfileAndFetchData = useCallback(async () => {
    if (!supabase || !user) return;
    setIsLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('id, name, profile_photo_url').eq('id', user.id).single();
      if (profileError && profileError.code === 'PGRST116') {
        await supabase.from('profiles').insert({ id: user.id, name: user.fullName || 'New User', email: user.primaryEmailAddress?.emailAddress });
      } else if (profileError) {
        throw profileError;
      }
      
      // --- THIS IS THE FIX: Fetch and set the signed URL for the avatar ---
      if (profileData?.profile_photo_url) {
        const urlParts = profileData.profile_photo_url.split('/avatars/');
        const path = urlParts[1];
        if (path) {
          const { data: urlData } = await supabase.storage.from('avatars').createSignedUrl(path, 3600);
          setProfilePhotoUrl(urlData?.signedUrl || null);
        }
      } else {
        setProfilePhotoUrl(user.imageUrl); // Fallback to Clerk's default image URL
      }
      // --- END OF FIX ---

      await Promise.all([fetchFilteredShops(), fetchCategories(), fetchTags()]);
    } catch (error: any) {
      Alert.alert("Error", "Could not initialize data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, user]);

  useFocusEffect(useCallback(() => {
    if (supabase && user) {
      syncProfileAndFetchData();
    }
  }, [supabase, user]));

  const fetchFilteredShops = async (catId: number | 'all' = 'all', tagId: number | 'all' = 'all') => {
    if (!supabase) return;
    let query = supabase.from('public_shops_with_photos').select('*');
    if (catId !== 'all') query = query.eq('category_id', catId);
    if (tagId !== 'all') query = query.contains('tags', [tagId]);
    const { data, error } = await query;
    if (error) throw error;
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
  };

  const fetchTags = async () => { if (supabase) { const { data, error } = await supabase.from('tags').select('tag_id, tag_name'); if (error) throw error; setTags((data || []).map(t => ({ id: t.tag_id, name: t.tag_name }))); } };
  const fetchCategories = async () => { if (supabase) { const { data, error } = await supabase.from('categories').select('category_id, name'); if (error) throw error; setCategories((data || []).map(c => ({ id: c.category_id, name: c.name }))); } };
  const onRefresh = () => { setRefreshing(true); syncProfileAndFetchData().finally(() => setRefreshing(false)); };
  const handleSelectCategory = (id: number | 'all') => { setSelectedCategoryId(id); fetchFilteredShops(id, selectedTagId); };
  const handleSelectTag = (id: number | 'all') => { setSelectedTagId(id); fetchFilteredShops(selectedCategoryId, id); };
  const openDetails = (shop: any) => router.push({ pathname: '/(customer)/restaurant-details', params: { restaurantId: shop.shop_id } });
  const getIconForCategory = (name: string) => { const n = name.toLowerCase(); if (n.includes('kafe')) return Coffee; if (n.includes('bakery')) return Cake; if (n.includes('restoran')) return Utensils; return Tag; };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F7F7'}}>
        <ActivityIndicator size="large" color="#58508D" />
        <Text style={{marginTop: 10, color: '#64748b'}}>Loading and Syncing User...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#4ECDC4', '#44A08D', '#F7931E', '#FF6B35']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
      <LinearGradient colors={['#DC2626', '#3B4ECC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <View style={styles.headerContent}>
            <View style={styles.logoContainer}><View style={styles.logo}><Grid3x3 size={24} color="#2F4858" /></View><View><Text style={styles.headerTitle}>BIZ@PERDA</Text><Text style={styles.headerSubtitle}>Discover & save Penang shops</Text></View></View>
            <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/(customer)/favorites')}><Heart size={20} color="#2F4858" /></TouchableOpacity>
                <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/(customer)/profile')}>
                  {/* --- THIS IS THE FIX: Display the fetched profile photo --- */}
                  <View style={styles.profileIcon}>
                    {profilePhotoUrl ? (
                      <Image source={{ uri: profilePhotoUrl }} style={styles.profileImage} />
                    ) : (
                      <Text style={styles.profileIconText}>👤</Text>
                    )}
                  </View>
                  {/* --- END OF FIX --- */}
                </TouchableOpacity>
            </View>
        </View>
      </LinearGradient>
      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false}>
        <View style={styles.searchContainer}><Link href="/(customer)/search" asChild><TouchableOpacity style={styles.searchInputContainer}><Search size={20} color="#9B9B9B" /><Text style={styles.searchInputPlaceholder}>Search shops in Penang...</Text></TouchableOpacity></Link></View>
        <View style={styles.filtersSection}><Text style={styles.filterTitle}>Categories</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}><FilterButton id="all" name="All" isSelected={selectedCategoryId === 'all'} onSelect={() => handleSelectCategory('all')} icon={Grid3x3} />{categories.map(c => (<FilterButton key={`cat-${c.id}`} id={c.id} name={c.name} isSelected={selectedCategoryId === c.id} onSelect={() => handleSelectCategory(c.id)} icon={getIconForCategory(c.name)} />))}</ScrollView></View>
        <View style={styles.filtersSection}><Text style={styles.filterTitle}>Tags</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}><FilterButton id="all" name="All" isSelected={selectedTagId === 'all'} onSelect={() => handleSelectTag('all')} icon={Tag} />{tags.map(t => (<FilterButton key={`tag-${t.id}`} id={t.id} name={t.name} isSelected={selectedTagId === t.id} onSelect={() => handleSelectTag(t.id)} />))}</ScrollView></View>
        {isLoading && !refreshing ? <ActivityIndicator size="large" color="#58508D" style={{ marginTop: 40 }} /> : <View style={styles.shopsContainer}>{shops.length > 0 ? shops.map(shop => <ShopCard key={shop.shop_id} shop={shop} openDetails={openDetails} />) : <Text style={styles.emptyText}>No restaurants found.</Text>}</View>}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const FilterButton = ({ id, name, isSelected, onSelect, icon: Icon }: any) => (<TouchableOpacity style={[styles.filterButton, isSelected && styles.filterButtonSelected]} onPress={onSelect}>{Icon && <Icon size={20} color={isSelected ? '#FFFFFF' : '#58508D'} />}<Text style={[styles.filterButtonText, isSelected && styles.filterButtonTextSelected]}>{name}</Text></TouchableOpacity>);
const ShopCard = ({ shop, openDetails }: any) => (<TouchableOpacity style={styles.shopCard} onPress={() => openDetails(shop)}><View style={styles.shopImageContainer}><Image source={{ uri: shop.display_photo_url }} style={styles.shopImage} /></View><View style={styles.shopInfo}><Text style={styles.shopName}>{shop.name}</Text><Text style={styles.shopDescription} numberOfLines={2}>{shop.description}</Text><View style={styles.shopMeta}><View style={styles.ratingContainer}><MapPin size={14} color="#9B9B9B" /><Text style={styles.distance}>{shop.address || 'Location not set'}</Text></View></View><TouchableOpacity style={styles.detailsButton} onPress={() => openDetails(shop)}><Text style={styles.detailsButtonText}>View Details</Text></TouchableOpacity></View></TouchableOpacity>);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F7F7' },
    header: { paddingHorizontal: 20, paddingVertical: 20 },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    logo: { width: 40, height: 40, backgroundColor: '#FFFFFF', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#2F4858' },
    headerSubtitle: { fontSize: 14, color: '#2F4858', opacity: 0.8 },
    headerActions: { flexDirection: 'row', gap: 8 },
    headerButton: { width: 40, height: 40, backgroundColor: '#FFFFFF', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    profileIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F7F7F7', alignItems: 'center', justifyContent: 'center' },
    profileImage: { width: 40, height: 40, borderRadius: 20 },
    profileIconText: { fontSize: 16 },
    content: { flex: 1 },
    searchContainer: { paddingHorizontal: 20, paddingTop: 20 },
    searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    searchInputPlaceholder: { flex: 1, fontSize: 16, color: '#9B9B9B' },
    filtersSection: { paddingLeft: 20, marginBottom: 20 },
    filterTitle: { fontSize: 16, fontWeight: '600', color: '#2F4858', marginBottom: 12 },
    filterButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: '#F0F0F0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, marginRight: 12 },
    filterButtonSelected: { backgroundColor: '#FF6361', borderColor: '#FF6361', shadowColor: '#FF6361', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
    filterButtonSelected: { backgroundColor: '#DC2626', borderColor: '#DC2626', shadowColor: '#DC2626', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
    filterButtonText: { fontSize: 14, color: '#2F4858', fontWeight: '500' },
    filterButtonTextSelected: { color: '#FFFFFF', fontWeight: '600' },
    shopsContainer: { paddingHorizontal: 20, gap: 16 },
    shopCard: { backgroundColor: '#FFFFFF', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6, overflow: 'hidden' },
    shopImageContainer: { position: 'relative' },
    shopImage: { width: '100%', height: 200, backgroundColor: '#F7F7F7' },
    shopInfo: { padding: 20 },
    shopName: { fontSize: 20, fontWeight: 'bold', color: '#2F4858', marginBottom: 8 },
    shopDescription: { fontSize: 14, color: '#9B9B9B', lineHeight: 20, marginBottom: 12 },
    shopMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    distance: { fontSize: 14, color: '#9B9B9B', fontWeight: '500' },
    detailsButton: { backgroundColor: '#58508D', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    detailsButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
    bottomSpacing: { height: 20 },
    emptyText: { textAlign: 'center', color: '#64748b', marginTop: 40, fontSize: 16, fontStyle: 'italic' },
});
