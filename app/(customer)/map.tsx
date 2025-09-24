import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MapPin, Star, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';

// Expanded type to match the new SQL function's return values
type ShopLocation = {
  shop_id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  main_photo_path: string | null;
  signed_url?: string;
  avg_rating: number;
  review_count: number;
  categories: string[];
  tags: string[];
  status_text: string; // We'll keep this as a client-side value for now
};

const INITIAL_REGION = {
  latitude: 5.4145,
  longitude: 100.3354,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export default function MapScreen() {
  const [shops, setShops] = useState<ShopLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);

  const fetchShopLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use the new, more detailed RPC function
      const { data: shopsData, error: shopsError } = await supabase.rpc('get_all_approved_shops_with_details');
      if (shopsError) throw shopsError;

      const validShops: ShopLocation[] = [];
      for (const shop of shopsData) {
        if (!shop || typeof shop.location_text !== 'string' || !shop.location_text.startsWith('POINT')) continue;
        const point = shop.location_text.match(/POINT\(([^ ]+) ([^)]+)\)/);
        if (!point) continue;

        let signedUrl = 'https://placehold.co/200x150/F7F7F7/333?text=No+Image';
        if (shop.main_photo_path ) {
          const { data: urlData } = await supabase.storage.from('shop-images').createSignedUrl(shop.main_photo_path, 60 * 5);
          if (urlData) signedUrl = urlData.signedUrl;
        }

        validShops.push({
          ...shop,
          longitude: parseFloat(point[1]),
          latitude: parseFloat(point[2]),
          avg_rating: parseFloat(shop.avg_rating.toFixed(1)), // Format rating
          signed_url: signedUrl,
          status_text: 'Open', // Default value as requested
        });
      }
      setShops(validShops);
    } catch (error: any) {
      console.error("Error fetching shops:", error);
      Alert.alert("Error", "Could not load shop locations.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchShopLocations(); }, [fetchShopLocations]));

  const onMarkerPress = (shop: ShopLocation) => {
    setSelectedShopId(shop.shop_id);
    mapRef.current?.animateToRegion({
      latitude: shop.latitude,
      longitude: shop.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 300);
  };

  const onMapPress = () => {
    setSelectedShopId(null);
  };

  const onCalloutPress = (shop: ShopLocation) => {
    router.push({
      pathname: '/(customer)/restaurant-details',
      params: { restaurantId: shop.shop_id },
    });
  };

  const selectedShop = shops.find(s => s.shop_id === selectedShopId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* --- THIS IS THE FIX for the cutoff issue --- */}
      {/* The MapView and the Callout are now siblings, not parent/child */}
      <View style={{ flex: 1 }}>
        <LinearGradient colors={['#58508D', '#FF6361']} style={styles.header}>
          <Text style={styles.headerTitle}>Food Locations</Text>
          <Text style={styles.headerSubtitle}>Tap markers to view details</Text>
        </LinearGradient>

        {isLoading ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#58508D" /></View>
        ) : (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill} // Map takes up the whole screen behind everything
            provider={PROVIDER_GOOGLE}
            initialRegion={INITIAL_REGION}
            showsUserLocation
            showsMyLocationButton
            onPress={onMapPress}
            paddingAdjustmentBehavior="automatic"
            // Add top padding to account for the header
            mapPadding={{ top: 100, right: 0, bottom: 0, left: 0 }}
          >
            {shops.map((shop) => {
              const isSelected = shop.shop_id === selectedShopId;
              return (
                <Marker
                  key={shop.shop_id}
                  coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
                  onPress={() => onMarkerPress(shop)}
                  zIndex={isSelected ? 99 : 1}
                >
                  <View style={styles.customMarkerContainer}>
                    <View style={[styles.markerBubble, isSelected && styles.markerBubbleSelected]}>
                      <Image 
                        source={require('../../assets/images/icon.png')} // Or use a specific icon for shops
                        style={styles.markerImage}
                      />
                    </View>
                    <View style={[styles.markerPointer, isSelected && styles.markerPointerSelected]} />
                  </View>
                </Marker>
              );
            })}
          </MapView>
        )}
      </View>

      {/* The Custom Callout is now an overlay on top of the entire screen */}
      {selectedShop && (
        <View style={styles.calloutWrapper} pointerEvents="box-none">
          <TouchableOpacity onPress={() => onCalloutPress(selectedShop)}>
            <View style={styles.calloutContainer}>
              <Image source={{ uri: selectedShop.signed_url }} style={styles.calloutImage} />
              <View style={styles.calloutContent}>
                <Text style={styles.calloutTitle}>{selectedShop.name}</Text>
                <View style={styles.calloutRow}>
                  <Text style={styles.calloutRating}>{selectedShop.avg_rating}</Text>
                  <Star size={14} color="#FFC700" fill="#FFC700" />
                  <Text style={styles.calloutReviews}>({selectedShop.review_count} reviews)</Text>
                </View>
                <Text style={[styles.calloutStatus, styles.statusOpen]}>
                  {selectedShop.status_text}
                </Text>
                {/* Display real tags from the database */}
                <View style={styles.calloutFeatures}>
                  {selectedShop.tags.slice(0, 2).map(tag => (
                    <View style={styles.calloutRow} key={tag}>
                      <CheckCircle size={14} color="#4CAF50" />
                      <Text style={styles.featureText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// (Styles are the same as the previous response)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  header: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10, zIndex: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  customMarkerContainer: {
    alignItems: 'center',
    overflow: 'visible', 
  },
  markerBubble: {
    backgroundColor: '#FF6361',
    borderRadius: 99,
    padding: 5,
    borderColor: '#fff',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  markerBubbleSelected: {
    backgroundColor: '#58508D',
    transform: [{ scale: 1.1 }],
  },
  markerImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  markerPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FF6361',
    marginTop: -3, // Overlap with the bubble
  },
  markerPointerSelected: {
    borderTopColor: '#58508D',
  },
  marker: {
    backgroundColor: '#FF6361',
    padding: 8,
    borderRadius: 24,
    borderColor: '#ffffff',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  markerSelected: {
    backgroundColor: '#58508D',
    transform: [{ scale: 1.2 }],
  },
  calloutWrapper: {
    position: 'absolute',
    bottom: 100, // Adjust position to be above the bottom nav bar
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  calloutContainer: {
    width: 320,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    flexDirection: 'row',
  },
  calloutImage: {
    width: 110,
    height: '100%',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  calloutContent: {
    flex: 1,
    padding: 14,
  },
  calloutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 5,
  },
  calloutRating: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  calloutReviews: {
    fontSize: 12,
    color: '#64748b',
  },
  calloutStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statusOpen: { color: '#34D399' },
  calloutFeatures: {
    marginTop: 10,
    gap: 5,
  },
  featureText: {
    fontSize: 13,
    color: '#475569',
  },
});