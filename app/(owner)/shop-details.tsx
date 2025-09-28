import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Image, FlatList, Dimensions, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Star, User, MapPin, Phone, Clock, MessageSquare, Image as ImageIcon, Crown } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// --- TYPE DEFINITIONS ---
type Profile = { name: string; profile_photo_url: string | null; };
type Reply = {
  reply_id: number;
  reply_text: string;
  created_at: string;
  user_id: string;
  profiles: { name: string; profile_photo_url: string | null; } | null;
};
type Review = {
  review_id: number;
  comment: string;
  rating: number;
  created_at: string;
  user_id: string;
  reviewer_name: string;
  reviewer_photo_url: string | null;
  review_replies: Reply[] | null; // Can be null from the view
};
type ShopDetails = { 
  shop_id: number; name: string; description: string; address: string; phone_number: string; operating_hours: string; location: string; owner_user_id: string;
};
type ShopPhoto = { photo_id: number; signed_url: string; type: string; };

export default function OwnerShopDetailsScreen() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { user } = useAuth();

  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [photos, setPhotos] = useState<ShopPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null);
  const [shopLocation, setShopLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [region, setRegion] = useState({ latitude: 5.4164, longitude: 100.3327, latitudeDelta: 0.0922, longitudeDelta: 0.0421 });

  const [isReplyModalVisible, setReplyModalVisible] = useState(false);
  const [currentReview, setCurrentReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const fetchData = useCallback(async () => {
    if (!shopId || !user) return;
    
    try {
      setIsLoading(true);
      
      // --- THIS IS THE FIX ---
      // Replicating the efficient logic from the customer-side screen.
      const [shopDetailsRes, reviewsRes, photosRes, ownerProfileRes] = await Promise.all([
        supabase.from('shops').select('*, location::text').eq('shop_id', shopId).single(),
        supabase.from('public_review_details').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }), // <-- Use the VIEW
        supabase.from('shopphotos').select('photo_id, photo_url, type').eq('shop_id', shopId),
        supabase.from('profiles').select('name, profile_photo_url').eq('id', user.id).single(),
      ]);
      // --- END OF FIX ---

      if (shopDetailsRes.error) throw shopDetailsRes.error;
      if (reviewsRes.error) throw reviewsRes.error;
      if (photosRes.error) throw photosRes.error;
      if (ownerProfileRes.error) throw ownerProfileRes.error;

      const shopData = shopDetailsRes.data as ShopDetails | null;
      setShop(shopData);
      setOwnerProfile(ownerProfileRes.data as Profile | null);
      
      if (shopData?.location) {
        const match = shopData.location.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
        if (match) {
          const longitude = parseFloat(match[1]);
          const latitude = parseFloat(match[2]);
          const initialLocation = { latitude, longitude };
          setShopLocation(initialLocation);
          setRegion(prev => ({ ...prev, ...initialLocation }));
        }
      }
      
      // The view provides the reviews and their replies together.
      setReviews((reviewsRes.data || []) as Review[]);

      const photoPaths = photosRes.data || [];
      const signedPhotos = await Promise.all(
        photoPaths.map(async (photo) => {
          const { data: signedUrlData } = await supabase.storage.from('shop-images').createSignedUrl(photo.photo_url, 3600);
          return { photo_id: photo.photo_id, signed_url: signedUrlData?.signedUrl || '', type: photo.type };
        })
      );
      setPhotos(signedPhotos);

    } catch (error: any) {
      Alert.alert("Error", `Could not load shop details: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [shopId, user]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleOpenReplyModal = (review: Review) => {
    setCurrentReview(review);
    setReplyText('');
    setReplyModalVisible(true);
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !currentReview) return;
    setIsSubmittingReply(true);
    try {
      const { error } = await supabase.rpc('add_review_reply', {
        p_review_id: currentReview.review_id,
        p_reply_text: replyText,
      });
      if (error) throw error;
      Alert.alert("Success", "Your reply has been posted.");
      setReplyModalVisible(false);
      fetchData();
    } catch (error: any) {
      Alert.alert("Error", "Failed to post reply: " + error.message);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const mainPhoto = photos.find(p => p.type === 'Main') || photos[0] || null;
  const galleryPhotos = photos.filter(p => p.signed_url !== mainPhoto?.signed_url);

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(<Star key={i} size={16} color={i <= rating ? '#fbbf24' : '#cbd5e1'} fill={i <= rating ? '#fbbf24' : 'transparent'} />);
    }
    return <View style={styles.starDisplay}>{stars}</View>;
  };

  if (isLoading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#4f46e5" style={{flex: 1, justifyContent: 'center'}} /></SafeAreaView>;
  }

  if (!shop) {
    return <SafeAreaView style={styles.container}><View style={styles.header}><TouchableOpacity onPress={() => router.back()} style={styles.backButton}><ArrowLeft size={24} color="#1e293b" /></TouchableOpacity><Text style={styles.headerTitle}>Shop Not Found</Text></View><View style={styles.notFoundContainer}><Text>The requested shop could not be found.</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><TouchableOpacity onPress={() => router.back()} style={styles.backButton}><ArrowLeft size={24} color="#1e293b" /></TouchableOpacity><Text style={styles.headerTitle} numberOfLines={1}>{shop.name}</Text></View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.mainPhotoContainer}>{mainPhoto ? <Image source={{ uri: mainPhoto.signed_url }} style={styles.mainPhotoImage} /> : <View style={[styles.mainPhotoImage, styles.placeholderImage]}><Text>No Main Image</Text></View>}</View>
        
        <View style={styles.detailsContainer}>
          <Text style={styles.shopName}>{shop.name}</Text>
          <View style={styles.infoRow}><MapPin size={20} color="#64748b" /><Text style={styles.infoText}>{shop.address || 'No address'}</Text></View>
          <View style={styles.infoRow}><Phone size={20} color="#64748b" /><Text style={styles.infoText}>{shop.phone_number || 'No phone number'}</Text></View>
          <View style={styles.infoRow}><Clock size={20} color="#64748b" /><Text style={styles.infoText}>{shop.operating_hours || 'No operating hours'}</Text></View>
          
          {shopLocation && (
            <View style={styles.mapContainer}>
              <MapView provider={PROVIDER_GOOGLE} style={styles.map} region={region} scrollEnabled={false} zoomEnabled={false}>
                <Marker coordinate={shopLocation} />
              </MapView>
            </View>
          )}

          <Text style={styles.description}>{shop.description || 'No description provided.'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gallery</Text>
          {galleryPhotos.length > 0 ? (
            <FlatList horizontal data={galleryPhotos} keyExtractor={(item) => item.photo_id.toString()} renderItem={({ item }) => <Image source={{ uri: item.signed_url }} style={styles.galleryImage} />} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }} />
          ) : (
            <View style={styles.galleryPlaceholder}><ImageIcon size={24} color="#94a3b8" /><Text style={styles.galleryPlaceholderText}>No other photos uploaded.</Text></View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
          {reviews.length > 0 ? (
            reviews.map(review => (
              <View key={review.review_id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAuthor}>
                    <View style={styles.reviewAvatar}>
                      {review.reviewer_photo_url ? <Image source={{ uri: review.reviewer_photo_url }} style={styles.reviewAvatarImage} /> : <User size={16} color="#4f46e5" />}
                    </View>
                    <Text style={styles.reviewAuthorName}>{review.reviewer_name || 'A User'}</Text>
                  </View>
                  {renderStars(review.rating)}
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
                <Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</Text>
                
                {/* Render all replies from the view */}
                {(review.review_replies || []).map(reply => (
                  <View key={reply.reply_id} style={styles.replyContainer}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewAuthor}>
                        <View style={styles.reviewAvatar}>
                          {reply.profiles?.profile_photo_url ? <Image source={{ uri: reply.profiles.profile_photo_url }} style={styles.reviewAvatarImage} /> : <User size={16} color="#059669" />}
                        </View>
                        <Text style={styles.reviewAuthorName}>{reply.profiles?.name || 'User'}</Text>
                        {reply.user_id === shop.owner_user_id && (
                          <View style={styles.ownerTag}><Crown size={10} color="#fff" /><Text style={styles.ownerTagText}>Owner</Text></View>
                        )}
                      </View>
                    </View>
                    <Text style={styles.replyText}>{reply.reply_text}</Text>
                    <Text style={styles.replyDate}>Replied on {new Date(reply.created_at).toLocaleDateString()}</Text>
                  </View>
                ))}

                {/* Always show the reply button */}
                <TouchableOpacity style={styles.replyButton} onPress={() => handleOpenReplyModal(review)}>
                  <MessageSquare size={16} color="#4f46e5" />
                  <Text style={styles.replyButtonText}>Add a comment</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>This shop has no reviews yet.</Text>
          )}
        </View>
      </ScrollView>

      <Modal visible={isReplyModalVisible} transparent={true} animationType="fade" onRequestClose={() => setReplyModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reply to Review</Text>
            <TextInput style={styles.replyInput} placeholder="Write your response..." multiline value={replyText} onChangeText={setReplyText} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setReplyModalVisible(false)}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={handleSubmitReply} disabled={isSubmittingReply}>
                {isSubmittingReply ? <ActivityIndicator color="#fff" /> : <Text style={[styles.modalButtonText, { color: '#fff' }]}>Submit Reply</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backButton: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#1e293b', textAlign: 'center', marginRight: 32 },
  content: { flex: 1 },
  mainPhotoContainer: { width: width, height: 250, backgroundColor: '#e2e8f0' },
  mainPhotoImage: { width: '100%', height: '100%' },
  placeholderImage: { justifyContent: 'center', alignItems: 'center' },
  detailsContainer: { padding: 20, backgroundColor: '#ffffff' },
  shopName: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  infoText: { fontSize: 16, color: '#475569', flex: 1, lineHeight: 22 },
  mapContainer: { height: 150, borderRadius: 12, overflow: 'hidden', marginTop: 8, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  map: { ...StyleSheet.absoluteFillObject },
  description: { fontSize: 16, color: '#475569', lineHeight: 24, marginTop: 8 },
  section: { marginTop: 12, backgroundColor: '#ffffff', paddingVertical: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 16, paddingHorizontal: 20 },
  galleryImage: { width: 120, height: 120, borderRadius: 8, marginRight: 12, backgroundColor: '#e2e8f0' },
  galleryPlaceholder: { height: 120, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, backgroundColor: '#f8fafc', borderRadius: 12, marginHorizontal: 20 },
  galleryPlaceholderText: { color: '#94a3b8', fontStyle: 'italic' },
  reviewCard: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginHorizontal: 20, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewAuthor: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  reviewAvatarImage: { width: '100%', height: '100%' },
  reviewAuthorName: { fontWeight: '600', color: '#334155' },
  starDisplay: { flexDirection: 'row' },
  reviewComment: { color: '#475569', marginBottom: 12, lineHeight: 20 },
  reviewDate: { fontSize: 12, color: '#94a3b8', textAlign: 'right' },
  replyButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: '#eef2ff', padding: 10, borderRadius: 8, alignSelf: 'flex-start' },
  replyButtonText: { color: '#4f46e5', fontWeight: '600' },
  replyContainer: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 12, backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#dcfce7', marginBottom: 8 },
  replyText: { fontStyle: 'italic', color: '#166534', lineHeight: 18 },
  replyDate: { fontSize: 12, color: '#16a34a', textAlign: 'right', marginTop: 8 },
  ownerTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10b981', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 },
  ownerTagText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },
  emptyText: { fontStyle: 'italic', color: '#64748b', padding: 10, textAlign: 'center' },
  notFoundContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  replyInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, height: 100, textAlignVertical: 'top', marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  modalButtonPrimary: { backgroundColor: '#4f46e5' },
  modalButtonText: { fontWeight: '600' },
});
