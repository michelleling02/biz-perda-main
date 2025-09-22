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
import { Store, Eye, Heart, Star, TrendingUp, CheckCircle, Clock, Edit, BarChart3, ChefHat, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useSession, useUser } from '@clerk/clerk-expo';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Define the TypeScript type for our shop data
type ShopWithStats = {
  shop_id: number;
  created_at: string;
  name: string;
  description: string;
  address: string;
  operating_hours: string;
  phone_number: string;
  owner_user_id: string;
  status: string;
  total_views: number | null;
  total_favorites: number | null;
  average_rating: number | null;
  display_photo_url?: string;
};

export default function OwnerDashboard() {
  const { session } = useSession();
  const { user } = useUser();

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [ownedShops, setOwnedShops] = useState<ShopWithStats[]>([]);
  const [stats, setStats] = useState({ totalViews: 0, totalFavorites: 0, avgRating: 0 });
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Effect 1: Create the session-aware Supabase client
  React.useEffect(() => {
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

  const fetchOwnerData = useCallback(async () => {
    if (!supabase || !user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;
      setOwnerProfile(profileData);

      const { data: shopsData, error: shopsError } = await supabase
        .rpc('get_owner_shops_with_stats', { p_owner_id: user.id });

      if (shopsError) {
        console.error("Supabase RPC failed:", JSON.stringify(shopsError, null, 2));
        throw shopsError;
      }

      const shopsWithPhotos = await Promise.all(
        (shopsData || []).map(async (shop: ShopWithStats) => {
          const { data: photoData } = await supabase
            .from('shopphotos')
            .select('photo_url')
            .eq('shop_id', shop.shop_id)
            .eq('type', 'Main')
            .limit(1)
            .single();
          
          let displayUrl = 'https://placehold.co/400x200/e2e8f0/64748b?text=No+Image';
          if (photoData?.photo_url) {
            const { data: signedUrlData } = await supabase.storage
              .from('shop-images')
              .createSignedUrl(photoData.photo_url, 3600);
            displayUrl = signedUrlData?.signedUrl || displayUrl;
          }
          return { ...shop, display_photo_url: displayUrl };
        })
      );
      setOwnedShops(shopsWithPhotos);

      const totalViews = shopsData.reduce((acc: number, shop: ShopWithStats) => acc + (shop.total_views || 0), 0);
      const totalFavorites = shopsData.reduce((acc: number, shop: ShopWithStats) => acc + (shop.total_favorites || 0), 0);
      const shopsWithRatings = shopsData.filter((shop: ShopWithStats) => shop.average_rating !== null);
      const totalAvgRating = shopsWithRatings.reduce((acc: number, shop: ShopWithStats) => acc + (shop.average_rating || 0), 0);
      
      setStats({
        totalViews,
        totalFavorites,
        avgRating: shopsWithRatings.length > 0 ? totalAvgRating / shopsWithRatings.length : 0,
      });

    } catch (error: any) {
      console.error("Error fetching owner data:", error);
      Alert.alert("Error", "Could not fetch your dashboard data.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [supabase, user]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchOwnerData();
    }, [fetchOwnerData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOwnerData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return '#10b981';
      case 'Pending': return '#f59e0b';
      case 'Rejected': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return CheckCircle;
      case 'Pending': return Clock;
      case 'Rejected': return AlertCircle;
      default: return Store;
    }
  };

  const StatCard = ({ icon: Icon, title, value, color, subtitle }: any) => (
    <View style={styles.statCard}>
      <LinearGradient colors={[color + '20', color + '10']} style={styles.statCardGradient}>
        <Icon size={20} color={color} />
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </LinearGradient>
    </View>
  );

  const ShopCard = ({ shop }: { shop: ShopWithStats }) => {
    const StatusIcon = getStatusIcon(shop.status);
    const statusColor = getStatusColor(shop.status);
    
    const views = shop.total_views ?? 0;
    const favorites = shop.total_favorites ?? 0;
    const rating = shop.average_rating;
    const shopAvgRating = rating ? Number(rating).toFixed(1) : 'N/A';

    return (
      <TouchableOpacity 
        style={styles.shopCard}
        onPress={() => router.push({ pathname: '/(owner)/shop-details', params: { shopId: shop.shop_id } })}
      >
        <Image source={{ uri: shop.display_photo_url }} style={styles.shopImage} />
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <StatusIcon size={12} color="#ffffff" />
          <Text style={styles.statusText}>{shop.status}</Text>
        </View>
        <View style={styles.shopInfo}>
          <Text style={styles.shopName}>{shop.name}</Text>
          <View style={styles.shopStats}>
            <View style={styles.shopStat}><Eye size={14} color="#64748b" /><Text style={styles.shopStatValue}>{views}</Text></View>
            <View style={styles.shopStat}><Heart size={14} color="#ef4444" /><Text style={styles.shopStatValue}>{favorites}</Text></View>
            <View style={styles.shopStat}><Star size={14} color="#fbbf24" /><Text style={styles.shopStatValue}>{shopAvgRating}</Text></View>
          </View>
          <Text style={styles.lastUpdated}>Created: {new Date(shop.created_at).toLocaleDateString()}</Text>
          <TouchableOpacity 
            style={styles.editButton} 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={(e) => {
              e.stopPropagation(); 
              router.push({ pathname: '/(owner)/edit-shop', params: { shopId: shop.shop_id } });
            }}
          >
            <Edit size={16} color="#DC2626" />
            <Text style={styles.editButtonText}>Edit Shop</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#DC2626" style={{ flex: 1 }} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#DC2626', '#3B4ECC']} style={styles.header}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.ownerName}>{ownerProfile?.name || 'Owner'}</Text>
        </View>
        <TouchableOpacity style={styles.analyticsButton} onPress={() => router.push('/(owner)/analytics')}><BarChart3 size={20} color="#ffffff" /></TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard icon={ChefHat} title="Restaurants" value={ownedShops.length} color="#DC2626" subtitle="Total listings" />
            <StatCard icon={Eye} title="Total Views" value={stats.totalViews.toLocaleString()} color="#3B4ECC" subtitle="All time" />
          </View>
          <View style={styles.statsGrid}>
            <StatCard icon={Heart} title="Total Favorites" value={stats.totalFavorites} color="#DC2626" subtitle="Total saves" />
            <StatCard icon={Star} title="Avg. Rating" value={stats.avgRating.toFixed(1)} color="#3B4ECC" subtitle="Across all shops" />
          </View>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(owner)/add-shop')}>
              <LinearGradient colors={['#DC2626', '#3B4ECC']} style={styles.actionCardGradient}><ChefHat size={24} color="#ffffff" /><Text style={styles.actionText}>Add New Restaurant</Text></LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(owner)/analytics')}>
              <LinearGradient colors={['#3B4ECC', '#DC2626']} style={styles.actionCardGradient}><TrendingUp size={24} color="#ffffff" /><Text style={styles.actionText}>View Analytics</Text></LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.shopsSection}>
          <Text style={styles.sectionTitle}>My Restaurants ({ownedShops.length})</Text>
          {ownedShops.length > 0 ? (
            ownedShops.map(shop => <ShopCard key={shop.shop_id} shop={shop} />)
          ) : (
            <Text style={styles.emptyText}>You haven't added any restaurants yet. Tap "Add New Restaurant" to get started!</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  header: { paddingHorizontal: 20, paddingVertical: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeSection: { flex: 1 },
  welcomeText: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  ownerName: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', marginVertical: 4 },
  analyticsButton: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 10 },
  content: { flex: 1 },
  statsContainer: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#2F4858', marginBottom: 16 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  statCardGradient: { padding: 16, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#2F4858', marginTop: 8, marginBottom: 4 },
  statTitle: { fontSize: 12, color: '#9B9B9B', fontWeight: '500' },
  statSubtitle: { fontSize: 10, color: '#9B9B9B', marginTop: 2 },
  quickActions: { paddingHorizontal: 20, marginBottom: 24 },
  actionsGrid: { flexDirection: 'row', gap: 12 },
  actionCard: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  actionCardGradient: { padding: 20, alignItems: 'center', gap: 8 },
  actionText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  shopsSection: { paddingHorizontal: 20, marginBottom: 24 },
  shopCard: { backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3, overflow: 'hidden', position: 'relative' },
  shopImage: { width: '100%', height: 120, backgroundColor: '#F7F7F7' },
  statusBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusText: { color: '#ffffff', fontSize: 10, fontWeight: '600' },
  shopInfo: { padding: 16 },
  shopName: { fontSize: 16, fontWeight: '600', color: '#2F4858', marginBottom: 12 },
  shopStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  shopStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shopStatValue: { fontSize: 12, color: '#9B9B9B', fontWeight: '500' },
  lastUpdated: { fontSize: 12, color: '#9B9B9B', marginBottom: 12, fontStyle: 'italic' },
  editButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE2E2', paddingVertical: 8, borderRadius: 8, gap: 6, borderWidth: 1, borderColor: '#DC2626' },
  editButtonText: { color: '#DC2626', fontSize: 14, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#64748b', marginTop: 20, fontStyle: 'italic', paddingHorizontal: 20 },
});