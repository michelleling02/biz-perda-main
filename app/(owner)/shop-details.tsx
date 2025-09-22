// app/(owner)/shop-details.tsx

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Image, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Star, User, MapPin, Phone, Clock, Eye, Heart, Tag, Folder } from 'lucide-react-native'; // Added Tag and Folder icons

const { width } = Dimensions.get('window');

// --- UPDATED TYPE DEFINITIONS ---
type Review = { review_id: number; comment: string; rating: number; created_at: string; profiles: { name: string } | null; };
type ShopPhoto = { photo_id: number; signed_url: string; };
// This now includes categories and tags
type ShopDetails = { 
  shop_id: number; 
  name: string; 
  description: string; 
  address: string; 
  phone_number: string; 
  operating_hours: string; 
  // Added new fields
  categories: string[] | null;
  tags: string[] | null;
};

export default function OwnerShopDetailsScreen() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [photos, setPhotos] = useState<ShopPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function fetchAllData() {
        if (!shopId) {
          Alert.alert("Error", "No shop ID provided.");
          setIsLoading(false);
          return;
        }

        try {
          setIsLoading(true);
          
          // --- THIS IS THE MAIN CHANGE ---
          // 1. Fetch main details, categories, and tags using our new RPC function
          const { data: shopData, error: shopError } = await supabase
            .rpc('get_shop_details_with_relations', { p_shop_id: Number(shopId) })
            .single();

          if (shopError) throw shopError;
          setShop(shopData as ShopDetails | null);

          // 2. Fetch reviews separately (this logic remains the same)
          const { data: reviewsData, error: reviewsError } = await supabase
            .from('reviews')
            .select(`review_id, comment, rating, created_at, profiles ( name )`)
            .eq('shop_id', shopId);

          if (reviewsError) throw reviewsError;
          setReviews((reviewsData as unknown as Review[]) || []);

          // 3. Fetch photos and get signed URLs (this logic remains the same)
          const { data: photoPaths, error: photosError } = await supabase
            .from('shopphotos')
            .select('photo_id, photo_url')
            .eq('shop_id', shopId);
          if (photosError) throw photosError;

          const signedPhotos = await Promise.all(
            (photoPaths || []).map(async (photo) => {
              const { data: signedUrlData } = await supabase.storage
                .from('shop-images')
                .createSignedUrl(photo.photo_url, 3600);
              return { photo_id: photo.photo_id, signed_url: signedUrlData?.signedUrl || 'https://placehold.co/600x400?text=No+Image' };
            }  )
          );
          setPhotos(signedPhotos);

        } catch (error: any) {
          console.error("Error fetching comprehensive shop details:", error);
          Alert.alert("Error", `Could not load shop details: ${error.message}`);
        } finally {
          setIsLoading(false);
        }
      }

      fetchAllData();

      return () => {
        setIsLoading(true);
        setShop(null);
        setReviews([]);
        setPhotos([]);
      };
    }, [shopId])
  );

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(<Star key={i} size={16} color={i <= rating ? '#fbbf24' : '#cbd5e1'} fill={i <= rating ? '#fbbf24' : 'transparent'} />);
    }
    return <View style={styles.starDisplay}>{stars}</View>;
  };

  if (isLoading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#58508D" style={{flex: 1, justifyContent: 'center'}} /></SafeAreaView>;
  }

  if (!shop) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}><TouchableOpacity onPress={() => router.back()} style={styles.backButton}><ArrowLeft size={24} color="#1e293b" /></TouchableOpacity><Text style={styles.headerTitle}>Shop Not Found</Text></View>
        <View style={styles.notFoundContainer}><Text>The requested shop could not be found.</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><TouchableOpacity onPress={() => router.back()} style={styles.backButton}><ArrowLeft size={24} color="#1e293b" /></TouchableOpacity><Text style={styles.headerTitle} numberOfLines={1}>{shop.name}</Text></View>
      <ScrollView style={styles.content}>
        
        {/* Performance section removed as it's not returned by the new function. We can add it back if needed. */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photo Gallery</Text>
          <FlatList
            horizontal
            data={photos}
            keyExtractor={(item) => item.photo_id.toString()}
            renderItem={({ item }) => <Image source={{ uri: item.signed_url }} style={styles.galleryImage} />}
            showsHorizontalScrollIndicator={false}
            ListEmptyComponent={<Text style={styles.emptyText}>No photos uploaded.</Text>}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shop Information</Text>
          
          {/* --- NEW: Categories Section --- */}
          {shop.categories && shop.categories.length > 0 && (
            <View style={styles.infoRow}>
              <Folder size={20} color="#64748b" />
              <View style={styles.badgeContainer}>
                {shop.categories.map((category, index) => (
                  <View key={`cat-${index}`} style={[styles.badge, styles.categoryBadge]}>
                    <Text style={[styles.badgeText, styles.categoryBadgeText]}>{category}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* --- NEW: Tags Section --- */}
          {shop.tags && shop.tags.length > 0 && (
            <View style={styles.infoRow}>
              <Tag size={20} color="#64748b" />
              <View style={styles.badgeContainer}>
                {shop.tags.map((tag, index) => (
                  <View key={`tag-${index}`} style={[styles.badge, styles.tagBadge]}>
                    <Text style={[styles.badgeText, styles.tagBadgeText]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.infoRow}><MapPin size={20} color="#64748b" /><Text style={styles.infoText}>{shop.address || 'No address'}</Text></View>
          <View style={styles.infoRow}><Phone size={20} color="#64748b" /><Text style={styles.infoText}>{shop.phone_number || 'No phone number'}</Text></View>
          <View style={styles.infoRow}><Clock size={20} color="#64748b" /><Text style={styles.infoText}>{shop.operating_hours || 'No operating hours'}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{shop.description || 'No description provided.'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
          {reviews.length > 0 ? (
            reviews.map(review => (
              <View key={review.review_id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}><View style={styles.reviewAuthor}><User size={16} color="#4f46e5" /><Text style={styles.reviewAuthorName}>{review.profiles?.name || 'A User'}</Text></View>{renderStars(review.rating)}</View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
                <Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>This shop has no reviews yet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- ADDED NEW STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backButton: { padding: 8 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600', color: '#1e293b', marginHorizontal: 10 },
  content: { flex: 1 },
  section: { marginBottom: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  galleryImage: { width: width / 2.5, height: 120, borderRadius: 8, marginRight: 12, backgroundColor: '#e2e8f0' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  infoText: { fontSize: 16, color: '#475569', flex: 1, lineHeight: 22 },
  description: { fontSize: 16, color: '#475569', lineHeight: 24 },
  reviewCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewAuthor: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewAuthorName: { fontWeight: '600', color: '#334155' },
  starDisplay: { flexDirection: 'row' },
  reviewComment: { color: '#475569', marginBottom: 12 },
  reviewDate: { fontSize: 12, color: '#94a3b8', textAlign: 'right' },
  emptyText: { fontStyle: 'italic', color: '#64748b', padding: 10 },
  notFoundContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Badge styles
  badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  badgeText: { fontSize: 12, fontWeight: '500' },
  categoryBadge: { backgroundColor: '#dbeafe' },
  categoryBadgeText: { color: '#1e40af' },
  tagBadge: { backgroundColor: '#f1f5f9' },
  tagBadgeText: { color: '#475569' },
});
