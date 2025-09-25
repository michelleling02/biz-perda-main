// /app/(customer)/search.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MapPin, Star, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

// Define a type for our search results for better code quality
type ShopSearchResult = {
  shop_id: string;
  name: string;
  description: string;
  address: string;
  avg_rating: number;
  review_count: number;
  display_photo_url: string | null; // This is the path from the DB
  signed_url?: string; // This will be the final, displayable URL
};

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ShopSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false); // Track if a search has been performed

  // --- REWRITTEN & MORE EFFICIENT SEARCH HANDLER ---
  const handleSearch = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      // 1. Call the database function (RPC) to get all data in one go
      const { data: searchData, error: searchError } = await supabase.rpc('search_shops', {
        search_term: trimmedQuery,
      });

      if (searchError) throw searchError;

      // 2. Get signed URLs for the photos in a single batch
      const shopsWithSignedUrls = await Promise.all(
        (searchData || []).map(async (shop: ShopSearchResult) => {
          if (!shop.display_photo_url) {
            return { ...shop, signed_url: 'https://placehold.co/400x200/e2e8f0/64748b?text=No+Image' };
          }
          const { data: signedUrlData } = await supabase.storage
            .from('shop-images' )
            .createSignedUrl(shop.display_photo_url, 3600); // 1 hour expiry

          return { ...shop, signed_url: signedUrlData?.signedUrl };
        })
      );

      setResults(shopsWithSignedUrls);
    } catch (error: any) {
      console.error("Search RPC error:", error);
      Alert.alert("Search Error", "Could not fetch search results. Please try again.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- DEBOUNCE EFFECT (No changes needed, it's already good!) ---
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // --- SHOP CARD COMPONENT (Updated to use new data structure) ---
  const ShopCard = ({ shop }: { shop: ShopSearchResult }) => (
    <TouchableOpacity
      style={styles.shopCard}
      onPress={() => router.push({ pathname: '/(customer)/restaurant-details', params: { restaurantId: shop.shop_id } })}
    >
      <Image source={{ uri: shop.signed_url }} style={styles.shopImage} />
      <View style={styles.shopInfo}>
        <Text style={styles.shopName}>{shop.name}</Text>
        <Text style={styles.shopDescription} numberOfLines={1}>{shop.description || 'No description'}</Text>
        <View style={styles.shopMeta}>
          <View style={styles.ratingContainer}>
            <Star size={14} color="#fbbf24" fill="#fbbf24" />
            <Text style={styles.rating}>{shop.avg_rating.toFixed(1)}</Text>
            <Text style={styles.reviews}>({shop.review_count})</Text>
          </View>
          <View style={styles.distanceContainer}>
            <MapPin size={14} color="#64748b" />
            <Text style={styles.distance} numberOfLines={1}>{shop.address || 'No address'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // --- RENDER LOGIC (Slightly improved for clarity) ---
  const renderContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color="#58508D" style={{ marginTop: 40 }} />;
    }

    if (hasSearched && results.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Search size={48} color="#cbd5e1" />
          <Text style={styles.emptyStateTitle}>No results for "{searchQuery}"</Text>
          <Text style={styles.emptyStateText}>Try a different keyword or check for typos.</Text>
        </View>
      );
    }

    return (
      <View style={styles.shopsContainer}>
        {results.map(shop => <ShopCard key={shop.shop_id} shop={shop} />)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.header}>
        <Text style={styles.headerTitle}>Search Food Places</Text>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or description..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#CBD5E1"
              autoFocus={true}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles are unchanged ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFC' },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#ffffff', marginBottom: 24 },
  searchContainer: { flexDirection: 'row', gap: 16 },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 20, gap: 12, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  searchInput: { flex: 1, fontSize: 16, color: '#1E293B', height: 54 },
  content: { flex: 1 },
  shopsContainer: { padding: 24, gap: 20 },
  shopCard: { backgroundColor: '#FFFFFF', borderRadius: 16, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, flexDirection: 'row', overflow: 'hidden' },
  shopImage: { width: 110, height: 110, backgroundColor: '#F8FAFC' },
  shopInfo: { flex: 1, padding: 16, justifyContent: 'space-between' },
  shopName: { fontSize: 17, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  shopDescription: { fontSize: 14, color: '#64748B', marginBottom: 10, lineHeight: 20 },
  shopMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rating: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  reviews: { fontSize: 12, color: '#94A3B8' },
  distanceContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginLeft: 12 },
  distance: { fontSize: 12, color: '#94A3B8', flex: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyStateTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginTop: 20, marginBottom: 12 },
  emptyStateText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
});