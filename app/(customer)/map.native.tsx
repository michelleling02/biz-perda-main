import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Star, CheckCircle, Search, Filter, X, Grid3x3, Tag } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

// --- TYPE DEFINITIONS ---
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
};

type Item = { id: number; name: string; };

const INITIAL_REGION = {
  latitude: 5.4145,
  longitude: 100.3354,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export default function MapScreen() {
  // --- STATE MANAGEMENT ---
  const [allShops, setAllShops] = useState<ShopLocation[]>([]); // Holds ALL shops from the DB
  const [visibleShops, setVisibleShops] = useState<ShopLocation[]>([]); // Holds shops currently visible on map
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);
  const params = useLocalSearchParams<{ highlightShopId?: string }>();

  // FIX #1: NEW STATE FOR SEARCH AND FILTERS
  const [currentRegion, setCurrentRegion] = useState<Region>(INITIAL_REGION);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [allCategories, setAllCategories] = useState<Item[]>([]);
  const [allTags, setAllTags] = useState<Item[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set());
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  // --- END OF FIX ---

  // --- DATA FETCHING ---
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [shopsRes, categoriesRes, tagsRes] = await Promise.all([
        supabase.rpc('get_all_approved_shops_with_details'),
        supabase.from('categories').select('category_id, name'),
        supabase.from('tags').select('tag_id, tag_name'),
      ]);

      if (shopsRes.error) throw shopsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (tagsRes.error) throw tagsRes.error;

      const validShops: ShopLocation[] = [];
      for (const shop of shopsRes.data) {
        if (!shop || typeof shop.location_text !== 'string' || !shop.location_text.startsWith('POINT')) continue;
        const point = shop.location_text.match(/POINT\(([^ ]+) ([^)]+)\)/);
        if (!point) continue;
        validShops.push({
          ...shop,
          longitude: parseFloat(point[1]),
          latitude: parseFloat(point[2]),
          avg_rating: parseFloat(shop.avg_rating.toFixed(1)),
        });
      }
      setAllShops(validShops);

      setAllCategories((categoriesRes.data || []).map(c => ({ id: c.category_id, name: c.name })));
      setAllTags((tagsRes.data || []).map(t => ({ id: t.tag_id, name: t.tag_name })));

      if (params.highlightShopId) {
        const shopToHighlight = validShops.find(s => String(s.shop_id) === params.highlightShopId);
        if (shopToHighlight) {
          onMarkerPress(shopToHighlight, true);
        }
      }
    } catch (error: any) {
      Alert.alert("Error", "Could not load map data.");
    } finally {
      setIsLoading(false);
    }
  }, [params.highlightShopId]);

  useFocusEffect(useCallback(() => { fetchInitialData(); }, [fetchInitialData]));

  // --- FIX #2: DYNAMIC FILTERING LOGIC ---
  const updateVisibleShops = useCallback(() => {
    if (!currentRegion) return;
    const selectedTagNames = new Set(allTags.filter(t => selectedTagIds.has(t.id)).map(t => t.name));

    const filtered = allShops.filter(shop => {
      // Region check
      const isVisible =
        shop.latitude > currentRegion.latitude - currentRegion.latitudeDelta / 2 &&
        shop.latitude < currentRegion.latitude + currentRegion.latitudeDelta / 2 &&
        shop.longitude > currentRegion.longitude - currentRegion.longitudeDelta / 2 &&
        shop.longitude < currentRegion.longitude + currentRegion.longitudeDelta / 2;
      if (!isVisible) return false;

      // Search query check
      if (searchQuery && !shop.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Category check
      if (selectedCategoryIds.size > 0 && !shop.categories.some(catName => {
        const category = allCategories.find(c => c.name === catName);
        return category && selectedCategoryIds.has(category.id);
      })) {
        return false;
      }

      // Tag check
      if (selectedTagNames.size > 0) {
        const shopTags = new Set(shop.tags);
        const hasAllTags = Array.from(selectedTagNames).every(tagName => shopTags.has(tagName));
        if (!hasAllTags) {
          return false;
        }
      }

      return true;
    });

    setVisibleShops(filtered);
  }, [allShops, currentRegion, searchQuery, selectedCategoryIds, selectedTagIds, allCategories, allTags]);

  // This effect runs whenever the filters or the map region change
  useEffect(() => {
    updateVisibleShops();
  }, [updateVisibleShops]);
  // --- END OF FIX ---

  // --- EVENT HANDLERS ---
  const onMarkerPress = (shop: ShopLocation, isInitialLoad = false) => {
    setSelectedShopId(shop.shop_id);
    setTimeout(() => {
      mapRef.current?.animateToRegion({
        latitude: shop.latitude,
        longitude: shop.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 300);
    }, isInitialLoad ? 500 : 0);
  };

  const onMapPress = () => setSelectedShopId(null);
  const onCalloutPress = (shop: ShopLocation) => router.push({ pathname: '/(customer)/restaurant-details', params: { restaurantId: shop.shop_id } });

  const handleToggleCategory = (id: number) => {
    setSelectedCategoryIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleToggleTag = (id: number) => {
    setSelectedTagIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const selectedShop = allShops.find(s => s.shop_id === selectedShopId);

  // --- JSX / RENDER ---
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={{ flex: 1 }}>
        {/* FIX #3: NEW SEARCH AND FILTER HEADER */}
        <View style={styles.header}>
          <View style={styles.searchBarContainer}>
            <Search size={20} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by shop name..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><X size={20} color="#64748b" /></TouchableOpacity> : null}
          </View>
          <TouchableOpacity style={styles.filterIconContainer} onPress={() => setFilterModalVisible(true)}>
            <Filter size={24} color="#334155" />
          </TouchableOpacity>
        </View>
        {/* END OF FIX */}

        {isLoading ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#58508D" /></View>
        ) : (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_GOOGLE}
            initialRegion={INITIAL_REGION}
            showsUserLocation
            showsMyLocationButton
            onPress={onMapPress}
            onRegionChangeComplete={setCurrentRegion} // Update region on pan/zoom
            mapPadding={{ top: 80, right: 0, bottom: 0, left: 0 }}
          >
            {visibleShops.map((shop) => { // Render only visible shops
              const isSelected = String(shop.shop_id) === selectedShopId;
              return (
                <Marker
                  key={shop.shop_id}
                  coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
                  onPress={() => onMarkerPress(shop)}
                  zIndex={isSelected ? 99 : 1}
                  anchor={{ x: 0.5, y: 1 }}
                >
                  <View style={[styles.marker, isSelected && styles.markerSelected]}>
                    <View style={[styles.markerInnerCircle, isSelected && styles.markerInnerCircleSelected]} />
                  </View>
                </Marker>
              );
            })}
          </MapView>
        )}
      </View>

      {selectedShop && (
        <View style={styles.calloutWrapper} pointerEvents="box-none">
          <TouchableOpacity onPress={() => onCalloutPress(selectedShop)}>
            <View style={styles.calloutContainer}>
              {/* Lazy load image for callout */}
              <CalloutImage shop={selectedShop} />
              <View style={styles.calloutContent}>
                <Text style={styles.calloutTitle}>{selectedShop.name}</Text>
                <View style={styles.calloutRow}><Text style={styles.calloutRating}>{selectedShop.avg_rating}</Text><Star size={14} color="#FFC700" fill="#FFC700" /><Text style={styles.calloutReviews}>({selectedShop.review_count} reviews)</Text></View>
                <View style={styles.calloutFeatures}><CheckCircle size={14} color="#4CAF50" /><Text style={styles.featureText}>{selectedShop.tags[0] || 'Featured'}</Text></View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* FIX #4: NEW FILTER MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isFilterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}><X size={24} color="#64748b" /></TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Categories</Text>
                <View style={styles.itemsContainer}>
                  {allCategories.map(item => (
                    <TouchableOpacity key={item.id} style={[styles.item, selectedCategoryIds.has(item.id) && styles.itemSelected]} onPress={() => handleToggleCategory(item.id)}>
                      <Text style={[styles.itemText, selectedCategoryIds.has(item.id) && styles.itemTextSelected]}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Tags</Text>
                <View style={styles.itemsContainer}>
                  {allTags.map(item => (
                    <TouchableOpacity key={item.id} style={[styles.item, selectedTagIds.has(item.id) && styles.itemSelected]} onPress={() => handleToggleTag(item.id)}>
                      <Text style={[styles.itemText, selectedTagIds.has(item.id) && styles.itemTextSelected]}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* END OF FIX */}
    </SafeAreaView>
  );
}

// Helper component to lazy-load images in the callout
const CalloutImage = ({ shop }: { shop: ShopLocation }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (shop.main_photo_path) {
      supabase.storage.from('shop-images').createSignedUrl(shop.main_photo_path, 60).then(({ data }) => {
        if (data) setUrl(data.signedUrl);
      });
    }
  }, [shop.main_photo_path]);

  return <Image source={{ uri: url || 'https://placehold.co/200x150/F7F7F7/333?text=No+Image' }} style={styles.calloutImage} />;
};

// --- FIX #5: NEW AND MODIFIED STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 15,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#1e293b',
  },
  filterIconContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  marker: { height: 32, width: 32, borderRadius: 16, backgroundColor: 'rgba(255, 99, 97, 0.3 )', justifyContent: 'center', alignItems: 'center' },
  markerSelected: { height: 40, width: 40, borderRadius: 20, backgroundColor: 'rgba(88, 80, 141, 0.3)' },
  markerInnerCircle: { height: 16, width: 16, borderRadius: 8, backgroundColor: '#FF6361', borderColor: '#FFFFFF', borderWidth: 2 },
  markerInnerCircleSelected: { height: 20, width: 20, borderRadius: 10, backgroundColor: '#58508D' },
  calloutWrapper: { position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center' },
  calloutContainer: { width: 320, backgroundColor: '#ffffff', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 10, flexDirection: 'row' },
  calloutImage: { width: 110, height: '100%', borderTopLeftRadius: 16, borderBottomLeftRadius: 16, backgroundColor: '#f0f0f0' },
  calloutContent: { flex: 1, padding: 14 },
  calloutTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  calloutRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 5 },
  calloutRating: { fontSize: 14, color: '#475569', fontWeight: '600' },
  calloutReviews: { fontSize: 12, color: '#64748b' },
  calloutFeatures: { marginTop: 8, gap: 5 },
  featureText: { fontSize: 13, color: '#475569' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { height: '60%', backgroundColor: '#f8fafc', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  modalSection: { marginBottom: 20 },
  modalSectionTitle: { fontSize: 16, fontWeight: '600', color: '#334155', marginBottom: 12 },
  itemsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20 },
  itemSelected: { backgroundColor: '#eef2ff', borderColor: '#4f46e5' },
  itemText: { fontSize: 14, fontWeight: '500', color: '#334155' },
  itemTextSelected: { color: '#312e81' },
});
