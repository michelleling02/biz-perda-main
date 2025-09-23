import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Dimensions, Modal, ActivityIndicator, Alert, FlatList, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, MapPin, Heart, Share, X, Phone, Clock, Navigation, Star, MessageSquare, User,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSession, useUser } from '@clerk/clerk-expo';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const { width } = Dimensions.get('window');

type ShopDetailsWithRelations = {
  shop_id: number; name: string; description: string; address: string; phone_number: string; operating_hours: string; categories: string[] | null; tags: string[] | null; owner_user_id: string; photos: { url: string; type: string; }[];
};

export default function RestaurantDetailsScreen() {
  const params = useLocalSearchParams<{ restaurantId?: string }>();
  const restaurantId = Array.isArray(params.restaurantId) ? params.restaurantId[0] : params.restaurantId;

  const { session } = useSession();
  const { user } = useUser();

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [shop, setShop] = useState<ShopDetailsWithRelations | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [starRating, setStarRating] = useState(0);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Effect 1: Create the session-aware Supabase client
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

  // Effect 2: Fetch shop details once the client and ID are ready
  // Effect 2: Fetch shop details once the client and ID are ready
  const fetchShopDetails = useCallback(async () => {
    if (!supabase || !restaurantId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      // --- THIS IS THE FIX ---
      // If the user is logged in, call the RPC with BOTH parameters.
      if (user) {
        const viewResult = await supabase.rpc('log_shop_view', { 
          shop_id_to_log: Number(restaurantId),
          user_id_to_log: user.id // Pass the Clerk user ID here
        });
        if (viewResult.error) {
          console.error('Failed to log shop view:', viewResult.error);
        }
      }

      // The rest of the function remains the same...
      const { data: rpcData, error: shopError } = await supabase
        .rpc('get_shop_details_with_relations', { p_shop_id: Number(restaurantId) }).single();
      
      if (shopError) throw shopError;

      const shopData = rpcData as { shop_id: number; [key: string]: any };

      if (!shopData) {
        setShop(null);
        setIsLoading(false);
        return; 
      }

      const [reviewsRes, favRes, photosRes] = await Promise.all([
        supabase.from('reviews').select('*, profiles(name, profile_photo_url)').eq('shop_id', shopData.shop_id),
        user ? supabase.from('shopfavourites').select('shop_id').eq('user_id', user.id).eq('shop_id', shopData.shop_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('shopphotos').select('photo_url, type').eq('shop_id', shopData.shop_id)
      ]);

      const { data: reviewsData, error: reviewsError } = reviewsRes;
      if (reviewsError) throw reviewsError;
      
      const totalRating = (reviewsData || []).reduce((acc, r) => acc + r.rating, 0);
      setAvgRating(reviewsData.length > 0 ? totalRating / reviewsData.length : 0);
      setReviews(reviewsData || []);
      setIsFavorite(!!favRes.data);

      const { data: photoPaths, error: photosError } = photosRes;
      if (photosError) throw photosError;

      const signedPhotos = await Promise.all(
        (photoPaths || []).map(async (photo) => {
          let url = 'https://placehold.co/600x400?text=No+Image';
          if (photo.photo_url ) {
            const { data } = await supabase.storage.from('shop-images').createSignedUrl(photo.photo_url, 3600);
            if (data) url = data.signedUrl;
          }
          return { url, type: photo.type };
        })
      );
      
      setShop({ ...shopData, photos: signedPhotos } as ShopDetailsWithRelations);

    } catch (error: any) {
      Alert.alert("Error", `Could not load details: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, restaurantId, user]);

  useFocusEffect(useCallback(() => { fetchShopDetails(); }, [fetchShopDetails]));

  const handleReviewSubmit = async () => {
    if (starRating === 0) { Alert.alert('Rating Required', 'Please select a star rating.'); return; }
    if (!reviewText.trim()) { Alert.alert('Review Required', 'Please write a few words.'); return; }
    
    if (!user || !supabase) {
      Alert.alert('Not Logged In', 'You must be logged in to leave a review.');
      return;
    }
    if (!shop) { Alert.alert('Error', 'Shop details not found.'); return; }

    setIsSubmittingReview(true);
    try {
      const { error } = await supabase
        .from('reviews').insert({ shop_id: shop.shop_id, user_id: user.id, comment: reviewText, rating: starRating });
      if (error) throw error;

      Alert.alert('Success', 'Your review has been submitted!');
      setReviewModalVisible(false);
      setReviewText('');
      setStarRating(0);
      fetchShopDetails(); // Refetch all details to show the new review

    } catch (error: any) {
      Alert.alert('Error', 'Failed to submit review: ' + error.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const toggleFavorite = async () => {
    if (isTogglingFavorite) return;
    if (!user || !supabase) {
      Alert.alert('Please log in', 'You need to be logged in to save favorites.');
      return;
    }
    if (!shop) return;

    setIsTogglingFavorite(true);
    try {
      if (isFavorite) {
        const { error } = await supabase.from('shopfavourites').delete().match({ shop_id: shop.shop_id, user_id: user.id });
        if (error) throw error;
        setIsFavorite(false);
      } else {
        const { error } = await supabase.from('shopfavourites').insert({ shop_id: shop.shop_id, user_id: user.id });
        if (error) throw error;
        setIsFavorite(true);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Could not update favorites.');
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleNavigatePress = () => { if (restaurantId) router.push({ pathname: '/(customer)/map', params: { highlightShopId: restaurantId } }); };
  const openImageModal = (index: number) => { setSelectedImageIndex(index); setImageModalVisible(true); };
  const renderStars = (rating: number, size: number = 16) => { const stars = []; for (let i = 1; i <= 5; i++) { stars.push(<Star key={i} size={size} color={i <= rating ? '#fbbf24' : '#cbd5e1'} fill={i <= rating ? '#fbbf24' : 'transparent'} />); } return stars; };

  if (isLoading) { return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#58508D" style={{ flex: 1 }} /></SafeAreaView>; }
  if (!shop) { return <SafeAreaView style={styles.container}><View style={styles.header}><TouchableOpacity style={styles.backButton} onPress={() => router.back()}><ArrowLeft size={24} color="#1e293b" /></TouchableOpacity></View><View style={styles.notFoundContainer}><Text>Restaurant not found.</Text></View></SafeAreaView>; }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><TouchableOpacity style={styles.backButton} onPress={() => router.back()}><ArrowLeft size={24} color="#1e293b" /></TouchableOpacity><Text style={styles.headerTitle} numberOfLines={1}>{shop.name}</Text><TouchableOpacity style={styles.shareButton}><Share size={24} color="#1e293b" /></TouchableOpacity></View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <FlatList data={shop.photos} keyExtractor={(item, index) => item.url + index} horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.galleryScrollView} renderItem={({ item, index }) => (<TouchableOpacity onPress={() => openImageModal(index)}><Image source={{ uri: item.url }} style={styles.galleryImage} /></TouchableOpacity>)} ListEmptyComponent={() => <View style={[styles.galleryImage, styles.placeholderImage]}><Text>No Images Available</Text></View>} />
        <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavorite} disabled={isTogglingFavorite}><Heart size={24} color={isFavorite ? '#ef4444' : '#64748b'} fill={isFavorite ? '#ef4444' : 'transparent'} /></TouchableOpacity>
        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>{shop.name}</Text>
          <View style={styles.badgeSection}>
            {shop.categories?.map((cat, i) => <View key={`cat-${i}`} style={[styles.badge, styles.categoryBadge]}><Text style={[styles.badgeText, styles.categoryBadgeText]}>{cat}</Text></View>)}
            {shop.tags?.map((tag, i) => <View key={`tag-${i}`} style={[styles.badge, styles.tagBadge]}><Text style={[styles.badgeText, styles.tagBadgeText]}>{tag}</Text></View>)}
          </View>
          <View style={styles.ratingSummary}><View style={styles.starDisplay}>{renderStars(avgRating, 20)}</View><Text style={styles.ratingText}>{avgRating.toFixed(1)} ({reviews.length} reviews)</Text></View>
          <Text style={styles.description}>{shop.description || 'No description provided.'}</Text>
          <View style={styles.section}><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Reviews</Text><TouchableOpacity style={styles.writeReviewButton} onPress={() => setReviewModalVisible(true)}><Text style={styles.writeReviewButtonText}>Write a Review</Text></TouchableOpacity></View>{reviews.length > 0 ? <View style={styles.reviewList}>{reviews.map((review, index) => (<View key={index} style={styles.reviewCard}><View style={styles.reviewCardHeader}><View style={styles.reviewAuthorInfo}><View style={styles.reviewAvatar}><Image source={{ uri: review.profiles?.profile_photo_url || 'https://via.placeholder.com/150' }} style={{width: '100%', height: '100%'}} /></View><Text style={styles.reviewAuthorName}>{review.profiles?.name || 'A User'}</Text></View><View style={styles.starDisplay}>{renderStars(review.rating )}</View></View><Text style={styles.reviewComment}>{review.comment}</Text></View>))}</View> : <View style={styles.reviewPlaceholder}><MessageSquare size={24} color="#94a3b8" /><Text style={styles.reviewPlaceholderText}>Be the first to leave a review!</Text></View>}</View>
          <View style={styles.section}><Text style={styles.sectionTitle}>Contact & Location</Text><View style={styles.contactRow}><MapPin size={20} color="#64748b" /><Text style={styles.contactText}>{shop.address || 'No address'}</Text></View>{shop.phone_number && <View style={styles.contactRow}><Phone size={20} color="#64748b" /><Text style={styles.contactText}>{shop.phone_number}</Text></View>}{shop.operating_hours && <View style={styles.contactRow}><Clock size={20} color="#64748b" /><Text style={styles.contactText}>{shop.operating_hours}</Text></View>}</View>
          <View style={styles.actionButtons}><TouchableOpacity style={styles.callButton}><LinearGradient colors={['#10b981', '#059669']} style={styles.actionButtonGradient}><Phone size={20} color="#ffffff" /><Text style={styles.actionButtonText}>Call Now</Text></LinearGradient></TouchableOpacity><TouchableOpacity style={styles.navigateButton} onPress={handleNavigatePress}><LinearGradient colors={['#ff6b35', '#f7931e']} style={styles.actionButtonGradient}><Navigation size={20} color="#ffffff" /><Text style={styles.actionButtonText}>Navigate</Text></LinearGradient></TouchableOpacity></View>
        </View>
      </ScrollView>
      <Modal visible={imageModalVisible} animationType="fade" transparent={true} onRequestClose={() => setImageModalVisible(false)}><View style={styles.modalContainer}><TouchableOpacity style={styles.modalCloseButton} onPress={() => setImageModalVisible(false)}><X size={24} color="#ffffff" /></TouchableOpacity><Image source={{ uri: shop?.photos?.[selectedImageIndex]?.url }} style={styles.modalImage} resizeMode="contain" /></View></Modal>
      <Modal visible={reviewModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setReviewModalVisible(false)}><SafeAreaView style={styles.reviewModalContainer}><View style={styles.reviewModalHeader}><Text style={styles.reviewModalTitle}>Write a Review for {shop?.name}</Text><TouchableOpacity onPress={() => setReviewModalVisible(false)}><X size={24} color="#64748b" /></TouchableOpacity></View><ScrollView style={styles.reviewModalContent}><Text style={styles.reviewLabel}>Your Rating</Text><View style={styles.starContainer}>{[1, 2, 3, 4, 5].map((index) => (<TouchableOpacity key={index} onPress={() => setStarRating(index)}><Star size={40} color={index <= starRating ? '#fbbf24' : '#cbd5e1'} fill={index <= starRating ? '#fbbf24' : 'transparent'} /></TouchableOpacity>))}</View><Text style={styles.reviewLabel}>Your Review</Text><TextInput style={styles.reviewInput} placeholder="Share your experience..." multiline value={reviewText} onChangeText={setReviewText} /><TouchableOpacity style={[styles.submitReviewButton, isSubmittingReview && { opacity: 0.7 }]} onPress={handleReviewSubmit} disabled={isSubmittingReview}>{isSubmittingReview ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitReviewButtonText}>Submit Review</Text>}</TouchableOpacity></ScrollView></SafeAreaView></Modal>
    </SafeAreaView>
   );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backButton: { padding: 8 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600', color: '#1e293b', marginHorizontal: 10 },
  shareButton: { padding: 8 },
  content: { flex: 1 },
  galleryScrollView: { height: 280 },
  galleryImage: { width: width, height: 280, backgroundColor: '#f1f5f9' },
  placeholderImage: { justifyContent: 'center', alignItems: 'center' },
  favoriteButton: { position: 'absolute', top: 290, right: 20, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 24, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4, zIndex: 1 },
  restaurantInfo: { backgroundColor: '#ffffff', marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 30 },
  restaurantName: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  ratingSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  starDisplay: { flexDirection: 'row', gap: 2 },
  ratingText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  description: { fontSize: 16, color: '#64748b', lineHeight: 24, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#1e293b' },
  writeReviewButton: { backgroundColor: '#eef2ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  writeReviewButtonText: { color: '#4f46e5', fontWeight: '600', fontSize: 14 },
  reviewPlaceholder: { padding: 20, backgroundColor: '#f8fafc', borderRadius: 12, alignItems: 'center', gap: 8 },
  reviewPlaceholderText: { color: '#94a3b8', fontStyle: 'italic' },
  reviewList: { gap: 16 },
  reviewCard: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12 },
  reviewCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reviewAuthorInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  reviewAuthorName: { fontSize: 14, fontWeight: '600', color: '#374151' },
  reviewComment: { fontSize: 14, color: '#64748b', lineHeight: 20 },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  contactText: { fontSize: 16, color: '#374151', flex: 1 },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  callButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  navigateButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  actionButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  actionButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalCloseButton: { position: 'absolute', top: 60, right: 20, zIndex: 1, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8 },
  modalImage: { width: width, height: '100%' },
  notFoundContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  reviewModalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  reviewModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  reviewModalTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b', flex: 1, marginRight: 16 },
  reviewModalContent: { padding: 20 },
  reviewLabel: { fontSize: 16, fontWeight: '500', color: '#374151', marginBottom: 12 },
  starContainer: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  reviewInput: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, fontSize: 16, color: '#1e293b', height: 120, textAlignVertical: 'top', marginBottom: 24 },
  submitReviewButton: { backgroundColor: '#4f46e5', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitReviewButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  badgeSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  badgeText: { fontSize: 12, fontWeight: '500' },
  categoryBadge: { backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#bfdbfe' },
  categoryBadgeText: { color: '#1e40af' },
  tagBadge: { backgroundColor: '#f1f5f9' },
  tagBadgeText: { color: '#475569' },
});