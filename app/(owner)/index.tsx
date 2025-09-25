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
import { Store, Eye, Heart, Star, TrendingUp, CircleCheck as CheckCircle, Clock, CreditCard as Edit, ChartBar as BarChart3, ChefHat, CircleAlert as AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// Type definitions
type ShopWithStats = {
  shop_id: number;
  created_at: string;
  name: string;
  status: string;
  total_views: number | null;
  total_favorites: number | null;
  average_rating: number | null;
  display_photo_url?: string;
};

type DashboardOverview = {
  total_shops: number;
  total_views: number;
  total_favorites: number;
  overall_avg_rating: number;
};

export default function OwnerDashboard() {
  const { user } = useAuth();
  
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [ownedShops, setOwnedShops] = useState<ShopWithStats[]>([]);
  const [overviewStats, setOverviewStats] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOwnerData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // We now only need two calls: one for the profile name, and one for ALL data.
      const [profileRes, overviewRes, shopsListRes] = await Promise.all([
        supabase.from('profiles').select('name').eq('id', user.id).single(),
        supabase.rpc('get_owner_dashboard_stats', { p_owner_id: user.id }).single(),
        supabase.rpc('get_owner_shops_with_stats', { p_owner_id: user.id })
      ]);

      if (profileRes.error) throw profileRes.error;
      setOwnerProfile(profileRes.data);

      if (overviewRes.error) throw overviewRes.error;
      setOverviewStats(overviewRes.data as DashboardOverview);

      if (shopsListRes.error) throw shopsListRes.error;

      const shopsWithPhotos = await Promise.all(
        (shopsListRes.data || []).map(async (shop: ShopWithStats) => {
          const { data: photoData } = await supabase.from('shopphotos').select('photo_url').eq('shop_id', shop.shop_id).eq('type', 'Main').limit(1).single();
          let displayUrl = 'https://placehold.co/400x200/e2e8f0/64748b?text=No+Image';
          if (photoData?.photo_url ) {
            const { data: signedUrlData } = await supabase.storage.from('shop-images').createSignedUrl(photoData.photo_url, 3600);
            displayUrl = signedUrlData?.signedUrl || displayUrl;
          }
          return { ...shop, display_photo_url: displayUrl };
        })
      );
      setOwnedShops(shopsWithPhotos);

    } catch (error: any) {
      console.error("Error fetching owner data:", error);
      Alert.alert("Error", "Could not fetch your dashboard data: " + error.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if(user) {
        setIsLoading(true);
        fetchOwnerData();
      }
    }, [user, fetchOwnerData])
  );

  // The rest of the file is unchanged.
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
          <TouchableOpacity 
            style={styles.editButton} 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={(e) => {
              e.stopPropagation(); 
              router.push({ pathname: '/(owner)/edit-shop', params: { shopId: shop.shop_id } });
            }}
          >
            <Edit size={16} color="#E53E3E" />
            <Text style={styles.editButtonText}>Edit Shop</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#E53E3E" style={{ flex: 1 }} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#E53E3E', '#3B82F6']} style={styles.header}>
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
            <StatCard icon={ChefHat} title="Restaurants" value={overviewStats?.total_shops ?? 0} color="#FF6361" subtitle="Total listings" />
            <StatCard icon={Eye} title="Total Views" value={(overviewStats?.total_views ?? 0).toLocaleString()} color="#3B82F6" subtitle="All time" />
          </View>
          <View style={styles.statsGrid}>
            <StatCard icon={Heart} title="Total Favorites" value={overviewStats?.total_favorites ?? 0} color="#E53E3E" subtitle="Total saves" />
            <StatCard icon={Star} title="Avg. Rating" value={(overviewStats?.overall_avg_rating ?? 0).toFixed(1)} color="#3B82F6" subtitle="Across all shops" />
          </View>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(owner)/add-shop')}>
              <LinearGradient colors={['#E53E3E', '#3B82F6']} style={styles.actionCardGradient}><ChefHat size={24} color="#ffffff" /><Text style={styles.actionText}>Add New Restaurant</Text></LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(owner)/analytics')}>
              <LinearGradient colors={['#3B82F6', '#E53E3E']} style={styles.actionCardGradient}><TrendingUp size={24} color="#ffffff" /><Text style={styles.actionText}>View Analytics</Text></LinearGradient>
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
  header: { paddingHorizontal: 20, paddingVertical: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeSection: { flex: 1 },
  welcomeText: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  ownerName: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', marginVertical: 6 },
  analyticsButton: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  content: { flex: 1 },
  statsContainer: { padding: 24 },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: '#1F2937', marginBottom: 18 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  statCardGradient: { padding: 20, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginTop: 10, marginBottom: 6 },
  statTitle: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  statSubtitle: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  quickActions: { paddingHorizontal: 24, marginBottom: 28 },
  actionsGrid: { flexDirection: 'row', gap: 12 },
  actionCard: { flex: 1, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  actionCardGradient: { padding: 24, alignItems: 'center', gap: 10 },
  actionText: { color: '#ffffff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  shopsSection: { paddingHorizontal: 24, marginBottom: 28 },
  shopCard: { backgroundColor: '#FFFFFF', borderRadius: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8, overflow: 'hidden', position: 'relative' },
  shopImage: { width: '100%', height: 140, backgroundColor: '#F3F4F6' },
  statusBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusText: { color: '#ffffff', fontSize: 10, fontWeight: '600' },
  shopInfo: { padding: 20 },
  shopName: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 14 },
  shopStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  shopStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shopStatValue: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  editButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', paddingVertical: 10, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: '#E53E3E', marginTop: 10 },
  editButtonText: { color: '#E53E3E', fontSize: 15, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#6B7280', marginTop: 20, fontStyle: 'italic', paddingHorizontal: 20 },
});
