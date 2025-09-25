import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, MapPin, Star, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type FavoriteShop = {
  shop_id: number;
  name: string;
  description: string;
  address: string;
  main_photo_path: string | null;
  display_photo_url?: string;
};

export default function FavoritesScreen() {
  const { user } = useAuth();
  const [favoriteShops, setFavoriteShops] = useState<FavoriteShop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('shopfavourites')
        .select(`
          shop_id,
          shops!inner (
            shop_id,
            name,
            description,
            address,
            status
          )
        `)
        .eq('user_id', user.id)
        .eq('shops.status', 'Approved');

      if (favoritesError) throw favoritesError;

      const shopsWithPhotos = await Promise.all(
        (favoritesData || []).map(async (fav: any) => {
          const shop = fav.shops;
          
          const { data: photoData } = await supabase
            .from('shopphotos')
            .select('photo_url')
            .eq('shop_id', shop.shop_id)
            .eq('type', 'Main')
            .limit(1)
            .single();

          let displayUrl = 'https://placehold.co/400x200/F1F5F9/64748B?text=No+Image';
          
          if (photoData?.photo_url) {
            const { data: signedUrlData } = await supabase.storage
              .from('shop-images')
              .createSignedUrl(photoData.photo_url, 3600);
            
            if (signedUrlData) {
              displayUrl = signedUrlData.signedUrl;
            }
          }

          return {
            ...shop,
            display_photo_url: displayUrl,
          };
        })
      );

      setFavoriteShops(shopsWithPhotos);
    } catch (error: any) {
      console.error('Error fetching favorites:', error);
      Alert.alert('Error', 'Could not load your favorites.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchFavorites();
    }, [fetchFavorites])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const openShopDetails = (shop: FavoriteShop) => {
    router.push({
      pathname: '/(customer)/restaurant-details',
      params: { restaurantId: shop.shop_id },
    });
  };

  const FavoriteCard = ({ shop }: { shop: FavoriteShop }) => (
    <TouchableOpacity style={styles.favoriteCard} onPress={() => openShopDetails(shop)}>
      <Image source={{ uri: shop.display_photo_url }} style={styles.shopImage} />
      <View style={styles.shopInfo}>
        <Text style={styles.shopName}>{shop.name}</Text>
        <Text style={styles.shopDescription} numberOfLines={2}>
          {shop.description}
        </Text>
        <View style={styles.shopMeta}>
          <View style={styles.locationContainer}>
            <MapPin size={16} color="#64748B" />
            <Text style={styles.locationText} numberOfLines={1}>
              {shop.address || 'Location not set'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.viewButton} onPress={() => openShopDetails(shop)}>
          <Text style={styles.viewButtonText}>View Details</Text>
          <ArrowRight size={16} color="#E53E3E" />
        </TouchableOpacity>
      </View>
      <View style={styles.favoriteIcon}>
        <Heart size={20} color="#E53E3E" fill="#E53E3E" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient 
        colors={['#E53E3E', '#3B82F6']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Heart size={32} color="#ffffff" fill="#ffffff" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>My Favorites</Text>
            <Text style={styles.headerSubtitle}>
              {favoriteShops.length} saved restaurant{favoriteShops.length !== 1 && 's'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {isLoading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ flex: 1 }} />
      ) : (
        <ScrollView 
          style={styles.content} 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {favoriteShops.length > 0 ? (
            <View style={styles.favoritesContainer}>
              {favoriteShops.map(shop => (
                <FavoriteCard key={shop.shop_id} shop={shop} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Heart size={80} color="#E2E8F0" />
              <Text style={styles.emptyStateTitle}>No Favorites Yet</Text>
              <Text style={styles.emptyStateText}>
                Start exploring restaurants and tap the heart icon to save your favorites here.
              </Text>
              <TouchableOpacity 
                style={styles.exploreButton}
                onPress={() => router.push('/(customer)')}
              >
                <LinearGradient
                  colors={['#E53E3E', '#3B82F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.exploreButtonGradient}
                >
                  <Text style={styles.exploreButtonText}>Explore Restaurants</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 32, paddingVertical: 36 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#ffffff' },
  headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  content: { flex: 1 },
  favoritesContainer: { padding: 24, gap: 20 },
  favoriteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  shopImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F8FAFC',
  },
  favoriteIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shopInfo: { padding: 24 },
  shopName: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  shopDescription: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    marginBottom: 16,
  },
  shopMeta: { marginBottom: 16 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationText: { fontSize: 14, color: '#64748B', flex: 1 },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  viewButtonText: { fontSize: 16, fontWeight: '700', color: '#E53E3E' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  exploreButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#E53E3E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  exploreButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  exploreButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpacing: { height: 24 },
});