import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Dimensions, Modal, ActivityIndicator, Alert, FlatList, TextInput, KeyboardAvoidingView, Platform, Share, // Import Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, MapPin, Heart, Share as ShareIcon, X, Phone, Clock, Navigation, Star, MessageSquare, User, Image as ImageIcon, Crown, Send,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

// --- TYPE DEFINITIONS ---
type ShopDetails = {
  shop_id: number; name: string; description: string; address: string; phone_number: string; operating_hours: string; owner_user_id: string; categories: string[] | null; tags: string[] | null;
};
type Photo = { url: string; type: string; };
type Reply = {
  reply_id: number; reply_text: string; created_at: string; user_id: string;
  profiles: { name: string; profile_photo_url: string | null; } | null;
};
type Review = {
  review_id: number; comment: string; rating: number; created_at: string; user_id: string;
  reviewer_name: string;
  reviewer_photo_url: string | null;
  review_replies: Reply[] | null;
};

export default function RestaurantDetailsScreen() {
  const params = useLocalSearchParams<{ restaurantId?: string }>();
  const restaurantId = Array.isArray(params.restaurantId) ? params.restaurantId[0] : params.restaurantId;
  const { user } = useAuth();
  
  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const [mainPhoto, setMainPhoto] = useState<Photo | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<Photo[]>([]);
  
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [starRating, setStarRating] = useState(0);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [currentReview, setCurrentReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const fetchShopDetails = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      supabase.rpc('log_shop_view', { p_shop_id_to_log: id }).then(() => {});

      const [shopDataRes, reviewsFromViewRes, photoPathsRes] = await Promise.all([
        supabase.rpc('get_shop_details_with_relations', { p_shop_id: Number(id) }).single<ShopDetails>(),
        supabase.from('public_review_details').select('*').eq('shop_id', id).order('created_at', { ascending: false }),
        supabase.from('shopphotos').select('photo_url, type').eq('shop_id', id)
      ]);

      if (shopDataRes.error || !shopDataRes.data) {
        setShop(null);
        setIsLoading(false);
        return;
      };
      setShop(shopDataRes.data);

      if (reviewsFromViewRes.error) throw reviewsFromViewRes.error;
      
      const reviewsData = (reviewsFromViewRes.data || []) as Review[];
      
      const totalRating = reviewsData.reduce((acc, review) => acc + review.rating, 0);
      const average = reviewsData.length > 0 ? totalRating / reviewsData.length : 0;
      setAvgRating(average);
      setReviews(reviewsData);

      if (user) {
        const { data: favoriteData } = await supabase.from('shopfavourites').select('shop_id').eq('user_id', user.id).eq('shop_id', id).maybeSingle();
        setIsFavorite(!!favoriteData);
      }

      if (photoPathsRes.error) throw photoPathsRes.error;
      const signedPhotos: Photo[] = await Promise.all(
        (photoPathsRes.data || []).map(async (photo) => {
          const { data: urlData } = await supabase.storage.from('shop-images').createSignedUrl(photo.photo_url, 3600);
          return { url: urlData?.signedUrl || '', type: photo.type };
        })
      );
      
      const main = signedPhotos.find(p => p.type === 'Main') || signedPhotos[0] || null;
      setMainPhoto(main);
      const gallery = signedPhotos.filter(p => p.url !== main?.url);
      setGalleryPhotos(gallery);

    } catch (error: any) {
      Alert.alert("Error", `Could not load restaurant details: ${error.message}`);
      setShop(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (restaurantId) {
        fetchShopDetails(restaurantId);
      } else {
        setIsLoading(false);
        setShop(null);
      }
    }, [restaurantId, fetchShopDetails])
  );

  // --- FIX 1: Implement the share functionality ---
  const handleShare = async () => {
    if (!shop) return;
    try {
      await Share.share({
        message: `Check out this cool spot: ${shop.name}! Find it on our app.`,
        // Optional: Add a URL to your app or website
        // url: `yourapp://shop/${shop.shop_id}`
      });
    } catch (error: any) {
      Alert.alert('Error', 'Could not share at this time.');
    }
  };

  const toggleFavorite = async () => {
    if (isTogglingFavorite || !user || !shop) return;
    setIsTogglingFavorite(true);
    if (isFavorite) {
      await supabase.from('shopfavourites').delete().match({ shop_id: shop.shop_id, user_id: user.id });
      setIsFavorite(false);
    } else {
      await supabase.from('shopfavourites').insert({ shop_id: shop.shop_id, user_id: user.id });
      setIsFavorite(true);
    }
    setIsTogglingFavorite(false);
  };

  const handleReviewSubmit = async () => {
    if (starRating === 0) { Alert.alert('Rating Required', 'Please select a star rating.'); return; }
    if (!reviewText.trim()) { Alert.alert('Review Required', 'Please write a few words for your review.'); return; }
    setIsSubmittingReview(true);
    if (!user || !shop) {
      Alert.alert('Error', 'You must be logged in to review a shop.');
      setIsSubmittingReview(false);
      return;
    }
    const { error } = await supabase.from('reviews').insert({ shop_id: shop.shop_id, user_id: user.id, comment: reviewText, rating: starRating });
    if (error) {
      Alert.alert('Error', 'Failed to submit review: ' + error.message);
    } else {
      Alert.alert('Success', 'Your review has been submitted!');
      setReviewModalVisible(false);
      setReviewText('');
      setStarRating(0);
      if (restaurantId) fetchShopDetails(restaurantId);
    }
    setIsSubmittingReview(false);
  };

  const handleOpenReplyModal = (review: Review) => {
    setCurrentReview(review);
    setReplyText('');
    setReplyModalVisible(true);
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !currentReview || !user) return;
    setIsSubmittingReply(true);
    try {
      const { error } = await supabase.rpc('add_review_reply', {
        p_review_id: currentReview.review_id,
        p_reply_text: replyText,
      });
      if (error) throw error;
      Alert.alert("Success", "Your comment has been posted.");
      setReplyModalVisible(false);
      if (restaurantId) fetchShopDetails(restaurantId);
    } catch (error: any) {
      Alert.alert("Error", "Failed to post comment: " + error.message);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleNavigatePress = () => {
    if (!restaurantId) return;
    router.push({ pathname: '/(customer)/map', params: { highlightShopId: restaurantId } });
  };

  const openImageModal = (url: string) => {
    setSelectedImageUrl(url);
    setImageModalVisible(true);
  };

  const renderStars = (rating: number, size: number = 16) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(<Star key={i} size={size} color={i <= rating ? '#fbbf24' : '#cbd5e1'} fill={i <= rating ? '#fbbf24' : 'transparent'} />);
    }
    return <View style={styles.starDisplay}>{stars}</View>;
  };

  if (isLoading) { return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#58508D" style={{ flex: 1 }} /></SafeAreaView>; }
  if (!shop) { return <SafeAreaView style={styles.container}><View style={styles.header}><TouchableOpacity style={styles.backButton} onPress={() => router.back()}><ArrowLeft size={24} color="#1e293b" /></TouchableOpacity></View><View style={styles.notFoundContainer}><Text>Restaurant not found.</Text></View></SafeAreaView>; }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* --- FIX 1 (continued): Added onPress handler to the Share button --- */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}><ArrowLeft size={24} color="#1e293b" /></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{shop.name}</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <ShareIcon size={24} color="#1e293b" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.mainPhotoContainer}>{mainPhoto ? (<TouchableOpacity onPress={() => openImageModal(mainPhoto.url)}><Image source={{ uri: mainPhoto.url }} style={styles.mainPhotoImage} /></TouchableOpacity>) : (<View style={[styles.mainPhotoImage, styles.placeholderImage]}><Text>No Image Available</Text></View>)}</View>
        <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavorite} disabled={isTogglingFavorite}><Heart size={24} color={isFavorite ? '#ef4444' : '#64748b'} fill={isFavorite ? '#ef4444' : 'transparent'} /></TouchableOpacity>
        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>{shop.name}</Text>
          <View style={styles.badgeSection}>{shop.categories?.map((cat, i) => <View key={`cat-${i}`} style={[styles.badge, styles.categoryBadge]}><Text style={[styles.badgeText, styles.categoryBadgeText]}>{cat}</Text></View>)}{shop.tags?.map((tag, i) => <View key={`tag-${i}`} style={[styles.badge, styles.tagBadge]}><Text style={[styles.badgeText, styles.tagBadgeText]}>{tag}</Text></View>)}</View>
          <View style={styles.ratingSummary}><View style={styles.starDisplay}>{renderStars(avgRating, 20)}</View><Text style={styles.ratingText}>{avgRating.toFixed(1)} ({reviews.length} reviews)</Text></View>
          <Text style={styles.description}>{shop.description || 'No description provided.'}</Text>
          
          {/* --- FIX 2: Adjusted Gallery Section --- */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gallery</Text>
            {galleryPhotos.length > 0 ? (
              <FlatList 
                data={galleryPhotos} 
                keyExtractor={(item) => item.url} 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => openImageModal(item.url)}>
                    <Image source={{ uri: item.url }} style={styles.horizontalGalleryImage} />
                  </TouchableOpacity>
                )} 
                contentContainerStyle={styles.horizontalGalleryContainer} 
              />
            ) : (
              <View style={styles.galleryPlaceholder}><ImageIcon size={24} color="#94a3b8" /><Text style={styles.galleryPlaceholderText}>No other photos available.</Text></View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Reviews & Comments</Text>
              <TouchableOpacity style={styles.writeReviewButton} onPress={() => setReviewModalVisible(true)}>
                <Text style={styles.writeReviewButtonText}>Write a Review</Text>
              </TouchableOpacity>
            </View>
            {reviews.length > 0 ? (
              <View style={styles.reviewList}>
                {reviews.map((review) => (
                  <View key={review.review_id} style={styles.reviewCard}>
                    <View style={styles.reviewCardHeader}>
                      <View style={styles.reviewAuthorInfo}>
                        <View style={styles.reviewAvatar}>
                          {review.reviewer_photo_url ? <Image source={{ uri: review.reviewer_photo_url }} style={styles.reviewAvatarImage} /> : <User size={16} color="#4f46e5" />}
                        </View>
                        <Text style={styles.reviewAuthorName}>{review.reviewer_name || 'A User'}</Text>
                      </View>
                      <View style={styles.starDisplay}>{renderStars(review.rating)}</View>
                    </View>
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                    
                    {(review.review_replies || []).map(reply => (
                      <View key={reply.reply_id} style={styles.replyContainer}>
                        <View style={styles.reviewAuthorInfo}>
                          <View style={styles.reviewAvatar}>
                            {reply.profiles?.profile_photo_url ? <Image source={{ uri: reply.profiles.profile_photo_url }} style={styles.reviewAvatarImage} /> : <User size={16} color="#059669" />}
                          </View>
                          <Text style={styles.reviewAuthorName}>{reply.profiles?.name || 'A User'}</Text>
                          {reply.user_id === shop.owner_user_id && (
                            <View style={styles.ownerTag}><Crown size={10} color="#fff" /><Text style={styles.ownerTagText}>Owner</Text></View>
                          )}
                        </View>
                        <Text style={styles.replyText}>{reply.reply_text}</Text>
                      </View>
                    ))}

                    <TouchableOpacity style={styles.replyButton} onPress={() => handleOpenReplyModal(review)}>
                      <MessageSquare size={14} color="#4f46e5" />
                      <Text style={styles.replyButtonText}>Add a comment</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.reviewPlaceholder}><MessageSquare size={24} color="#94a3b8" /><Text style={styles.reviewPlaceholderText}>Be the first to leave a review!</Text></View>
            )}
          </View>

          {/* --- FIX 3: Adjusted Contact & Location Section --- */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact & Location</Text>
            <View style={styles.contactRow}>
              <MapPin size={20} color="#64748b" style={styles.contactIcon} />
              <Text style={styles.contactText}>{shop.address || 'No address'}</Text>
            </View>
            {shop.phone_number && 
              <View style={styles.contactRow}>
                <Phone size={20} color="#64748b" style={styles.contactIcon} />
                <Text style={styles.contactText}>{shop.phone_number}</Text>
              </View>
            }
            {shop.operating_hours && 
              <View style={styles.contactRow}>
                <Clock size={20} color="#64748b" style={styles.contactIcon} />
                <Text style={styles.contactText}>{shop.operating_hours}</Text>
              </View>
            }
          </View>
          <View style={styles.actionButtons}><TouchableOpacity style={styles.callButton}><LinearGradient colors={['#10b981', '#059669']} style={styles.actionButtonGradient}><Phone size={20} color="#ffffff" /><Text style={styles.actionButtonText}>Call Now</Text></LinearGradient></TouchableOpacity><TouchableOpacity style={styles.navigateButton} onPress={handleNavigatePress}><LinearGradient colors={['#ff6b35', '#f7931e']} style={styles.actionButtonGradient}><Navigation size={20} color="#ffffff" /><Text style={styles.actionButtonText}>Navigate</Text></LinearGradient></TouchableOpacity></View>
        </View>
      </ScrollView>
      
      <Modal visible={imageModalVisible} animationType="fade" transparent={true} onRequestClose={() => setImageModalVisible(false)}><View style={styles.modalContainer}><TouchableOpacity style={styles.modalCloseButton} onPress={() => setImageModalVisible(false)}><X size={24} color="#ffffff" /></TouchableOpacity><Image source={{ uri: selectedImageUrl || '' }} style={styles.modalImage} resizeMode="contain" /></View></Modal>
      
      <Modal visible={reviewModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setReviewModalVisible(false)}><SafeAreaView style={styles.reviewModalContainer}><View style={styles.reviewModalHeader}><Text style={styles.reviewModalTitle}>Write a Review for {shop?.name}</Text><TouchableOpacity onPress={() => setReviewModalVisible(false)}><X size={24} color="#64748b" /></TouchableOpacity></View><ScrollView style={styles.reviewModalContent}><Text style={styles.reviewLabel}>Your Rating</Text><View style={styles.starContainer}>{[1, 2, 3, 4, 5].map((index) => (<TouchableOpacity key={index} onPress={() => setStarRating(index)}><Star size={40} color={index <= starRating ? '#fbbf24' : '#cbd5e1'} fill={index <= starRating ? '#fbbf24' : 'transparent'} /></TouchableOpacity>))}</View><Text style={styles.reviewLabel}>Your Review</Text><TextInput style={styles.reviewInput} placeholder="Share your experience..." multiline value={reviewText} onChangeText={setReviewText} /><TouchableOpacity style={[styles.submitReviewButton, isSubmittingReview && { opacity: 0.7 }]} onPress={handleReviewSubmit} disabled={isSubmittingReview}>{isSubmittingReview ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitReviewButtonText}>Submit Review</Text>}</TouchableOpacity></ScrollView></SafeAreaView></Modal>

      <Modal visible={replyModalVisible} transparent={true} animationType="fade" onRequestClose={() => setReplyModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}>
          <View style={styles.replyModalContent}>
            <View style={styles.reviewModalHeader}>
              <Text style={styles.reviewModalTitle}>Add a comment</Text>
              <TouchableOpacity onPress={() => setReplyModalVisible(false)}><X size={24} color="#64748b" /></TouchableOpacity>
            </View>
            <TextInput style={styles.replyInput} placeholder="Write your comment..." multiline value={replyText} onChangeText={setReplyText} />
            <TouchableOpacity style={[styles.submitReviewButton, isSubmittingReply && { opacity: 0.7 }]} onPress={handleSubmitReply} disabled={isSubmittingReply}>
              {isSubmittingReply ? <ActivityIndicator color="#fff" /> : <><Send size={16} color="#fff" /><Text style={styles.submitReviewButtonText}>Post Comment</Text></>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// --- FIX 4: Updated styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backButton: { padding: 8 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600', color: '#1e293b', marginHorizontal: 10 },
  shareButton: { padding: 8 },
  content: { flex: 1 },
  mainPhotoContainer: { width: width, height: 280, backgroundColor: '#f1f5f9' },
  mainPhotoImage: { width: '100%', height: '100%' },
  placeholderImage: { justifyContent: 'center', alignItems: 'center' },
  favoriteButton: { position: 'absolute', top: 290, right: 20, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 24, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4, zIndex: 1 },
  restaurantInfo: { backgroundColor: '#ffffff', marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 30 },
  restaurantName: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  badgeSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  badgeText: { fontSize: 12, fontWeight: '500' },
  categoryBadge: { backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#bfdbfe' },
  categoryBadgeText: { color: '#1e40af' },
  tagBadge: { backgroundColor: '#f1f5f9' },
  tagBadgeText: { color: '#475569' },
  ratingSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  starDisplay: { flexDirection: 'row', gap: 2 },
  ratingText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  description: { fontSize: 16, color: '#64748b', lineHeight: 24, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#1e293b' },
  horizontalGalleryContainer: { 
    gap: 10, 
    // Removed paddingHorizontal to let it anchor to the left edge of the parent container
  },
  horizontalGalleryImage: { width: 120, height: 120, borderRadius: 12, backgroundColor: '#e2e8f0' },
  galleryPlaceholder: { height: 120, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, flexDirection: 'row', gap: 8 },
  galleryPlaceholderText: { color: '#9ca3af' },
  reviewPlaceholder: { padding: 20, backgroundColor: '#f8fafc', borderRadius: 12, alignItems: 'center', gap: 8 },
  reviewPlaceholderText: { color: '#94a3b8', fontStyle: 'italic' },
  reviewList: { gap: 16 },
  reviewCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  reviewCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reviewAuthorInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  reviewAvatarImage: { width: '100%', height: '100%' },
  reviewAuthorName: { fontSize: 14, fontWeight: '600', color: '#374151' },
  reviewComment: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 12 },
  replyButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, alignSelf: 'flex-start' },
  replyButtonText: { color: '#4f46e5', fontWeight: '500', fontSize: 13 },
  replyContainer: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 12, paddingLeft: 12, gap: 8 },
  replyText: { fontSize: 14, color: '#475569', lineHeight: 20 },
  ownerTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10b981', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 4 },
  ownerTagText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },
  contactRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', // Changed from 'center' to 'flex-start'
    marginBottom: 12, 
    gap: 12 
  },
  contactIcon: {
    marginTop: 4, // Nudge the icon down to align with the top of the text
  },
  contactText: { 
    fontSize: 16, 
    color: '#374151', 
    flex: 1,
    lineHeight: 24, // Added line height for better spacing if text wraps
  },
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
  submitReviewButton: { backgroundColor: '#4f46e5', paddingVertical: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  submitReviewButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  replyModalContent: { backgroundColor: '#f8fafc', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingTop: 10 },
  replyInput: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, fontSize: 16, color: '#1e293b', height: 100, textAlignVertical: 'top', marginVertical: 20 },
  writeReviewButton: { backgroundColor: '#eef2ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  writeReviewButtonText: { color: '#4f46e5', fontWeight: '600', fontSize: 14 },
});
