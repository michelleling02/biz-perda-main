import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, MapPin, Trash2, Eye } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase'; // Use the global Supabase client
import { useAuth } from '../../contexts/AuthContext'; // Use our own AuthContext

// Define a type for the shop data for clarity
type FavoriteShop = {
  shop_id: number;
  name: string;
  address: string;
  main_photo_path: string | null;
  display_photo_url?: string; // This will be the signed URL
};

export default function FavoritesScreen() {
  // Get the session from our own Supabase AuthContext
  const { session } = useAuth();

  const [favoriteShops, setFavoriteShops] = useState<FavoriteShop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch data using the user ID from the Supabase session
  const fetchFavoriteShops = useCallback(async () => {
    if (!session?.user) {
      setIsLoading(false);
      setFavoriteShops([]); // Clear shops if user is not logged in
      return;
    }
    
    try {
      // 1. Get the list of favorite shop IDs for the current user
      const { data: favorites, error: favoritesError } = await supabase
        .from('shopfavourites')
        .select('shop_id')
        .eq('user_id', session.user.id);

      if (favoritesError) throw favoritesError;

      const shopIds = favorites.map(fav => fav.shop_id);
      if (shopIds.length === 0) {
        setFavoriteShops([]);
        return;
      }

      // 2. Fetch the details for those shops from the public view
      const { data: shopsData, error: shopsError } = await supabase
        .from('public_shops_with_photos')
        .select('*')
        .in('shop_id', shopIds);

      if (shopsError) throw shopsError;

      // 3. Get signed URLs for the shop photos
      const shopsWithSignedUrls = await Promise.all(
        (shopsData || []).map(async (shop) => {
          let displayUrl = 'https://placehold.co/400x200/e2e8f0/64748b?text=No+Image';
          if (shop.main_photo_path ) {
            const { data } = await supabase.storage.from('shop-images').createSignedUrl(shop.main_photo_path, 3600);
            if (data) displayUrl = data.signedUrl;
          }
          return { ...shop, display_photo_url: displayUrl };
        })
      );
      setFavoriteShops(shopsWithSignedUrls);

    } catch (error: any) {
      Alert.alert("Error", "Could not fetch your favorite shops.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [session]); // The dependency is now the Supabase session

  // Refetch data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchFavoriteShops();
    }, [fetchFavoriteShops])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavoriteShops();
  };

  // Remove favorite function now uses the session user ID
  const removeFavorite = async (shopId: number) => {
    if (!session?.user) return;

    // Optimistically update the UI for a faster response
    setFavoriteShops(prev => prev.filter(shop => shop.shop_id !== shopId));

    // Perform the delete operation in the background
    const { error } = await supabase
      .from('shopfavourites')
      .delete()
      .match({ shop_id: shopId, user_id: session.user.id });

    if (error) {
      Alert.alert("Error", "Could not remove favorite. Please refresh and try again.");
      // If the delete fails, refresh the data to get the correct state
      fetchFavoriteShops();
    }
  };

  const openDetails = (shop: FavoriteShop) => {
    router.push({ pathname: '/(customer)/restaurant-details', params: { restaurantId: String(shop.shop_id) } });
  };

  // The ShopCard component and render logic remain the same
  const ShopCard = ({ shop }: { shop: FavoriteShop }) => (
    <View style={styles.shopCard}>
      <Image source={{ uri: shop.display_photo_url }} style={styles.shopImage} />
      <TouchableOpacity style={styles.removeButton} onPress={() => removeFavorite(shop.shop_id)}>
        <Trash2 size={18} color="#ef4444" />
      </TouchableOpacity>
      <View style={styles.shopInfo}>
        <Text style={styles.shopName} numberOfLines={2}>{shop.name}</Text>
        <View style={styles.distanceContainer}>
          <MapPin size={14} color="#64748b" />
          <Text style={styles.distance} numberOfLines={1}>{shop.address || 'No address'}</Text>
        </View>
        <TouchableOpacity style={styles.detailsButton} onPress={() => openDetails(shop)}>
          <Eye size={16} color="#ffffff" />
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#DC2626', '#3B4ECC']} style={styles.header}>
        <View style={styles.headerContent}>
          <Heart size={28} color="#ffffff" fill="#ffffff" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>My Favorites</Text>
            <Text style={styles.headerSubtitle}>{favoriteShops.length} saved restaurant{favoriteShops.length !== 1 && 's'}</Text>
          </View>
        </View>
      </LinearGradient>
      {isLoading ? (
        <ActivityIndicator size="large" color="#58508D" style={{ flex: 1 }} />
      ) : (
        <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {favoriteShops.length > 0 ? (
            <View style={styles.shopsGrid}>{favoriteShops.map(shop => <ShopCard key={shop.shop_id} shop={shop} />)}</View>
          ) : (
            <View style={styles.emptyState}>
              <Heart size={64} color="#cbd5e1" />
              <Text style={styles.emptyStateTitle}>No Favorites Yet</Text>
              <Text style={styles.emptyStateText}>Start exploring and tap the heart icon to save your favorite spots.</Text>
              <TouchableOpacity style={styles.exploreButton} onPress={() => router.push('/(customer)')}>
                <LinearGradient colors={['#DC2626', '#3B4ECC']} style={styles.exploreButtonGradient}>
                  <Text style={styles.exploreButtonText}>Explore Restaurants</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// Styles are unchanged
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  header: { paddingHorizontal: 20, paddingVertical: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  content: { flex: 1 },
  shopsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', padding: 16 },
  shopCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, overflow: 'hidden' },
  shopImage: { width: '100%', height: 120, backgroundColor: '#F7F7F7' },
  removeButton: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16, padding: 6, zIndex: 1 },
  shopInfo: { padding: 12 },
  shopName: { fontSize: 16, fontWeight: 'bold', color: '#2F4858', marginBottom: 8, height: 40 },
  distanceContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  distance: { fontSize: 12, color: '#64748b', flex: 1 },
  detailsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, gap: 6, backgroundColor: '#58508D' },
  actionButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40, flex: 1, justifyContent: 'center' },
  emptyStateTitle: { fontSize: 24, fontWeight: 'bold', color: '#2F4858', marginTop: 24, marginBottom: 12 },
  emptyStateText: { fontSize: 16, color: '#9B9B9B', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  exploreButton: { borderRadius: 12, overflow: 'hidden' },
  exploreButtonGradient: { paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center' },
  exploreButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
