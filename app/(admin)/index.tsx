import React, { useState, useCallback } from 'react'; // Import useCallback
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  ActivityIndicator,
  RefreshControl, // Import RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Users, Store, ChartBar as BarChart3, Eye, CircleCheck as CheckCircle, Circle as XCircle, Clock, Search, Filter, Plus, Settings, LogOut, Star, MapPin, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router'; // Import useFocusEffect

// 1. Import the Supabase client
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

export default function AdminDashboard() {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [shopModalVisible, setShopModalVisible] = useState(false);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [stats, setStats] = useState({ totalUsers: 0, activeRestaurants: 0, pendingRestaurants: 0 });
  const [recentRestaurants, setRecentRestaurants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    console.log("--- Starting data fetch (v3) ---");
    try {
      // **THE FIX IS HERE**: Specify the exact foreign key relationship to use for the join.
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from('shops')
        .select('*, profiles:owner_user_id(name)')
        .eq('status', 'Pending') // <-- ADD THIS LINE
        .order('created_at', { ascending: false })
        .limit(10);

      if (restaurantsError) {
        console.error("Error fetching restaurants:", restaurantsError);
        Alert.alert("Error", "Failed to fetch restaurants: " + restaurantsError.message);
        return; // Stop execution if this critical query fails
      }
      
      console.log("Successfully fetched restaurants:", JSON.stringify(restaurantsData, null, 2));
      setRecentRestaurants(restaurantsData || []);

      // Now fetch stats
      const [usersCount, pendingCount, approvedCount] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('shops').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
        supabase.from('shops').select('*', { count: 'exact', head: true }).eq('status', 'Approved'),
      ]);

      setStats({
        totalUsers: usersCount.count ?? 0,
        pendingRestaurants: pendingCount.count ?? 0,
        activeRestaurants: approvedCount.count ?? 0,
      });

    } catch (error) {
      console.error("General error fetching admin data:", error);
      Alert.alert("Error", "A general error occurred while fetching dashboard data.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // **FIX APPLIED**: Use useFocusEffect to fetch data every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // --- Handlers ---
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/');
          }
        },
      ]
    );
  };

  const approveShop = async (shopId: number) => {
    const { error } = await supabase.from('shops').update({ status: 'Approved' }).eq('shop_id', shopId);
    if (error) {
      Alert.alert('Error', 'Failed to approve shop.');
    } else {
      Alert.alert('Success', 'Shop has been approved.');
      setShopModalVisible(false);
      fetchData();
    }
  };

  const rejectShop = async (shopId: number) => {
     const { error } = await supabase.from('shops').update({ status: 'Rejected' }).eq('shop_id', shopId);
    if (error) {
      Alert.alert('Error', 'Failed to reject shop.');
    } else {
      Alert.alert('Success', 'Shop has been rejected.');
      setShopModalVisible(false);
      fetchData();
    }
  };

  // --- UI Components ---
  const StatCard = ({ icon: Icon, title, value, color, subtitle }: any) => (
    <View style={[styles.statCard, isTablet && styles.statCardTablet]}>
      <LinearGradient colors={[color + '20', color + '10']} style={styles.statCardGradient}>
        <Icon size={isTablet ? 28 : 24} color={color} />
        <Text style={[styles.statValue, isTablet && styles.statValueTablet]}>{value.toLocaleString()}</Text>
        <Text style={[styles.statTitle, isTablet && styles.statTitleTablet]}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </LinearGradient>
    </View>
  );

  const ShopCard = ({ shop }: { shop: any }) => {
    const getStatusColor = (status: string) => status === 'Approved' ? '#10b981' : status === 'Pending' ? '#f59e0b' : '#ef4444';
    const getStatusIcon = (status: string) => status === 'Approved' ? CheckCircle : status === 'Pending' ? Clock : XCircle;
    const StatusIcon = getStatusIcon(shop.status);
    const statusColor = getStatusColor(shop.status);
    const openShopDetails = () => { setSelectedShop(shop); setShopModalVisible(true); };

    return (
      <TouchableOpacity style={[styles.shopCard, isTablet && styles.shopCardTablet]} onPress={openShopDetails}>
        <Image source={{ uri: shop.photo_url || 'https://placehold.co/400x200/e2e8f0/64748b?text=No+Image' }} style={styles.shopImage} />
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}><StatusIcon size={12} color="#ffffff" /><Text style={styles.statusText}>{shop.status}</Text></View>
        <View style={styles.shopInfo}>
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.shopOwner}>Owner: {shop.profiles?.name || 'N/A'}</Text>
          <View style={styles.shopMeta}>
            <View style={styles.shopMetaItem}><MapPin size={14} color="#64748b" /><Text style={styles.shopMetaText}>{shop.address || 'No address'}</Text></View>
            <View style={styles.shopMetaItem}><Calendar size={14} color="#64748b" /><Text style={styles.shopMetaText}>{new Date(shop.created_at ).toLocaleDateString()}</Text></View>
          </View>
          <TouchableOpacity style={styles.viewDetailsButton} onPress={openShopDetails}><Text style={styles.viewDetailsText}>View Details</Text></TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // --- Render Functions ---
  const renderDashboard = () => {
    if (isLoading && !refreshing) {
      return <ActivityIndicator size="large" color="#1e40af" style={{ marginTop: 50 }} />;
    }
    return (
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={ // **FIX APPLIED**: Added pull-to-refresh
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>System Overview</Text>
          <View style={[styles.statsGrid, isTablet && styles.statsGridTablet]}>
            <StatCard icon={Users} title="Total Users" value={stats.totalUsers} color="#007aff" subtitle="Registered accounts" />
            <StatCard icon={Store} title="Active Restaurants" value={stats.activeRestaurants} color="#32d74b" subtitle="Live listings" />
            <StatCard icon={Clock} title="Pending Review" value={stats.pendingRestaurants} color="#ff9500" subtitle="Awaiting approval" />
          </View>
        </View>
        <View style={styles.shopsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Submissions</Text>
            <TouchableOpacity style={styles.viewAllButton} onPress={() => setSelectedTab('restaurants')}><Text style={styles.viewAllText}>View All</Text></TouchableOpacity>
          </View>
          {recentRestaurants.length > 0 ? (
            <View style={[styles.shopsGrid, isTablet && styles.shopsGridTablet]}>
              {recentRestaurants.map(shop => <ShopCard key={shop.shop_id} shop={shop} />)}
            </View>
          ) : (
            <Text style={styles.emptyText}>No pending submissions right now.</Text>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderShops = () => <View style={styles.content}><Text style={styles.emptyText}>Restaurant Management Coming Soon</Text></View>;
  const renderUsers = () => <View style={styles.content}><Text style={styles.emptyText}>User Management Coming Soon</Text></View>;

  // --- Main Component Return ---
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#E53E3E', '#3B82F6']} style={[styles.header, isTablet && styles.headerTablet]}>
        <View style={styles.headerContent}><Shield size={isTablet ? 32 : 28} color="#ffffff" /><View style={styles.headerText}><Text style={[styles.headerTitle, isTablet && styles.headerTitleTablet]}>Admin Dashboard</Text><Text style={[styles.headerSubtitle, isTablet && styles.headerSubtitleTablet]}>Biz@Perda Management Portal</Text></View></View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}><LogOut size={20} color="#ffffff" /></TouchableOpacity>
      </LinearGradient>
      <View style={[styles.tabBar, isTablet && styles.tabBarTablet]}>
        {[{ id: 'dashboard', title: 'Dashboard', icon: BarChart3 }, { id: 'restaurants', title: 'Restaurants', icon: Store }, { id: 'users', title: 'Users', icon: Users }].map(tab => {
          const TabIcon = tab.icon;
          return (<TouchableOpacity key={tab.id} style={[styles.tabButton, selectedTab === tab.id && styles.tabButtonActive, isTablet && styles.tabButtonTablet]} onPress={() => setSelectedTab(tab.id)}><TabIcon size={isTablet ? 24 : 20} color={selectedTab === tab.id ? '#E53E3E' : '#6B7280'} /><Text style={[styles.tabButtonText, selectedTab === tab.id && styles.tabButtonTextActive, isTablet && styles.tabButtonTextTablet]}>{tab.title}</Text></TouchableOpacity>);
        })}
      </View>
      {selectedTab === 'dashboard' && renderDashboard()}
      {selectedTab === 'restaurants' && renderShops()}
      {selectedTab === 'users' && renderUsers()}
      <Modal visible={shopModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShopModalVisible(false)}>
        {selectedShop && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Restaurant Review</Text><TouchableOpacity style={styles.closeButton} onPress={() => setShopModalVisible(false)}><XCircle size={24} color="#64748b" /></TouchableOpacity></View>
            <ScrollView style={styles.modalContent}>
              <Image source={{ uri: selectedShop.photo_url || 'https://placehold.co/400x200/e2e8f0/64748b?text=No+Image' }} style={styles.modalImage} />
              <View style={styles.modalInfo}>
                <Text style={styles.modalShopName}>{selectedShop.name}</Text>
                <Text style={styles.modalOwner}>Owner: {selectedShop.profiles?.name || 'N/A'}</Text>
                <View style={styles.modalDetails}>
                  <View style={styles.modalDetailRow}><MapPin size={18} color="#64748b" /><Text style={styles.modalDetailText}>{selectedShop.address || 'No address'}</Text></View>
                  <View style={styles.modalDetailRow}><Calendar size={18} color="#64748b" /><Text style={styles.modalDetailText}>Submitted: {new Date(selectedShop.created_at ).toLocaleDateString()}</Text></View>
                </View>
                {selectedShop.status === 'Pending' && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.approveButton} onPress={() => approveShop(selectedShop.shop_id)}><LinearGradient colors={['#32d74b', '#30d158']} style={styles.actionButtonGradient}><CheckCircle size={20} color="#ffffff" /><Text style={styles.actionButtonText}>Approve</Text></LinearGradient></TouchableOpacity>
                    <TouchableOpacity style={styles.rejectButton} onPress={() => rejectShop(selectedShop.shop_id)}><LinearGradient colors={['#E53E3E', '#DC2626']} style={styles.actionButtonGradient}><XCircle size={20} color="#ffffff" /><Text style={styles.actionButtonText}>Reject</Text></LinearGradient></TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingHorizontal: 20, paddingVertical: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTablet: { paddingHorizontal: 40, paddingVertical: 32 },
    headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerText: { flex: 1 },
    headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#ffffff' },
    headerTitleTablet: { fontSize: 30 },
    headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
    headerSubtitleTablet: { fontSize: 16 },
    logoutButton: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 12 },
    tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    tabBarTablet: { paddingHorizontal: 20 },
    tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 8 },
    tabButtonTablet: { paddingVertical: 22 },
    tabButtonActive: { backgroundColor: '#FEF2F2', borderBottomWidth: 3, borderBottomColor: '#E53E3E' },
    tabButtonText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
    tabButtonTextTablet: { fontSize: 16 },
    tabButtonTextActive: { color: '#E53E3E', fontWeight: '700' },
    content: { flex: 1 },
    statsContainer: { padding: 24 },
    sectionTitle: { fontSize: 21, fontWeight: '700', color: '#1F2937', marginBottom: 18 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    viewAllButton: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FEF2F2', borderRadius: 12 },
    viewAllButtonText: { fontSize: 14, color: '#E53E3E', fontWeight: '600' },
    statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    statsGridTablet: { flexWrap: 'wrap' },
    statCard: { flex: 1, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    statCardTablet: { flexGrow: 0, flexShrink: 0, flexBasis: isTablet ? '48%' : '100%', marginBottom: 12 },
    statCardGradient: { alignItems: 'center', padding: 20 },
    statValue: { fontSize: 26, fontWeight: 'bold', color: '#1F2937', marginTop: 10, marginBottom: 6 },
    statValueTablet: { fontSize: 28 },
    statTitle: { fontSize: 13, color: '#6B7280', fontWeight: '600', textAlign: 'center' },
    statTitleTablet: { fontSize: 14 },
    statSubtitle: { fontSize: 11, color: '#9CA3AF', marginTop: 2, textAlign: 'center' },
    shopsSection: { paddingHorizontal: 24, marginBottom: 28 },
    shopsGrid: { gap: 16 },
    shopsGridTablet: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    shopCard: { backgroundColor: '#ffffff', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8, overflow: 'hidden', position: 'relative' },
    shopCardTablet: { width: '48%', marginBottom: 16 },
    shopImage: { width: '100%', height: 140, backgroundColor: '#F3F4F6' },
    statusBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
    statusText: { color: '#ffffff', fontSize: 10, fontWeight: '600' },
    shopInfo: { padding: 20 },
    shopName: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 6 },
    shopOwner: { fontSize: 14, color: '#6B7280', marginBottom: 14 },
    shopMeta: { gap: 8 },
    shopMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    shopMetaText: { fontSize: 12, color: '#6B7280' },
    viewDetailsButton: { backgroundColor: '#FEF2F2', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, marginTop: 14, alignItems: 'center' },
    viewDetailsText: { fontSize: 13, color: '#E53E3E', fontWeight: '700' },
    modalContainer: { flex: 1, backgroundColor: '#ffffff' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    modalTitle: { fontSize: 19, fontWeight: '700', color: '#1F2937' },
    closeButton: { padding: 8 },
    modalContent: { flex: 1 },
    modalImage: { width: '100%', height: 220, backgroundColor: '#F3F4F6' },
    modalInfo: { padding: 24 },
    modalShopName: { fontSize: 26, fontWeight: 'bold', color: '#1F2937', marginBottom: 10 },
    modalCategory: { fontSize: 16, color: '#E53E3E', fontWeight: '600', marginBottom: 10 },
    modalOwner: { fontSize: 16, color: '#6B7280', marginBottom: 24 },
    modalDetails: { gap: 12, marginBottom: 30 },
    modalDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    modalDetailText: { fontSize: 16, color: '#4B5563', flex: 1 },
    modalActions: { flexDirection: 'row', gap: 12 },
    approveButton: { flex: 1, borderRadius: 16, overflow: 'hidden' },
    rejectButton: { flex: 1, borderRadius: 16, overflow: 'hidden' },
    actionButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
    actionButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
    emptyText: { textAlign: 'center', color: '#6B7280', marginTop: 20, fontStyle: 'italic' },
});
