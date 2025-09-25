import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart as BarChartIcon, Eye, Heart, Star, Filter, MessageSquare } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// --- TYPE DEFINITIONS ---
type OverviewStats = { total_views: number; total_favorites: number; avg_rating: number; total_reviews: number; };
type EngagementStat = { period_label: string; total_views: number; total_favorites: number; total_reviews: number; };
type ShopPerformance = { shop_id: number; name: string; total_views: number; total_favorites: number; average_rating: number; };

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [engagementStats, setEngagementStats] = useState<EngagementStat[]>([]);
  const [shopPerformance, setShopPerformance] = useState<ShopPerformance[]>([]);

  const periodMap: { [key: string]: { days: number; groupBy: 'day' | 'week' | 'month' } } = {
    week: { days: 7, groupBy: 'day' },
    month: { days: 30, groupBy: 'week' },
    year: { days: 365, groupBy: 'month' },
  };

  useFocusEffect(
    useCallback(() => {
      async function fetchAllAnalytics() {
        if (!user) {
          setIsLoading(false);
          return;
        }
        setIsLoading(true);
        try {
          const periodConfig = periodMap[selectedPeriod];
          const today = new Date();
          let startDate: Date;
          let endDate: Date;

          // --- THIS IS THE FIX ---
          // More precise date range calculation to avoid duplicate months.
          if (selectedPeriod === 'year') {
            const currentYear = today.getFullYear();
            // Start of the year is Jan 1st.
            startDate = new Date(currentYear, 0, 1); 
            // End of the year is Dec 31st.
            endDate = new Date(currentYear, 11, 31);
          } else if (selectedPeriod === 'month') {
            // Go back 30 days from today.
            startDate = new Date();
            startDate.setDate(today.getDate() - 29);
            endDate = today;
          } else { // week
            // Go back 7 days from today.
            startDate = new Date();
            startDate.setDate(today.getDate() - 6);
            endDate = today;
          }
          
          const startDateStr = startDate.toISOString().split('T')[0];
          const endDateStr = endDate.toISOString().split('T')[0];
          // --- END OF FIX ---

          const [overviewRes, engagementRes, shopPerformanceRes] = await Promise.all([
            supabase.rpc('get_owner_analytics_overview', { p_owner_id: user.id, p_period_days: periodConfig.days }).single(),
            supabase.rpc('get_daily_engagement_stats', { p_owner_id: user.id, p_start_date: startDateStr, p_end_date: endDateStr, p_group_by_period: periodConfig.groupBy }),
            supabase.rpc('get_owner_shops_with_stats', { p_owner_id: user.id })
          ]);

          if (overviewRes.error) throw overviewRes.error;
          setOverview(overviewRes.data as OverviewStats);

          if (engagementRes.error) throw engagementRes.error;
          setEngagementStats(engagementRes.data as EngagementStat[]);

          if (shopPerformanceRes.error) throw shopPerformanceRes.error;
          setShopPerformance(shopPerformanceRes.data as ShopPerformance[]);

        } catch (error: any) { 
          console.error("Error fetching analytics data:", error); 
          Alert.alert("Error", "Could not load analytics data: " + error.message); 
        } finally { 
          setIsLoading(false); 
        }
      }
      fetchAllAnalytics();
    }, [user, selectedPeriod])
  );

  // The rest of the file is unchanged.
  const StatCard = ({ icon: Icon, title, value, color }: any) => (
    <View style={styles.statCard}>
      <LinearGradient colors={[color + '20', color + '10']} style={styles.statCardGradient}>
        <View style={styles.statCardHeader}><Icon size={20} color={color} /></View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </LinearGradient>
    </View>
  );

  const StackedBarChart = ({ data }: { data: EngagementStat[] }) => {
    if (!data || data.length === 0) {
      return <Text style={styles.emptyChartText}>No data for this period.</Text>;
    }

    const maxTotal = Math.max(...data.map(item => (item.total_views || 0) + (item.total_favorites || 0) + (item.total_reviews || 0)));
    if (maxTotal === 0) {
        return <Text style={styles.emptyChartText}>No engagement data for this period.</Text>;
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Engagement ({selectedPeriod})</Text>
        <View style={styles.chart}>
          {data.map((item, index) => {
            const total = (item.total_views || 0) + (item.total_favorites || 0) + (item.total_reviews || 0);
            const barHeight = total > 0 ? (total / maxTotal) * 120 : 0;

            return (
              <View key={index} style={styles.chartBar}>
                <View style={[styles.barContainer, { height: barHeight }]}>
                  <View style={{ flex: item.total_reviews || 0, backgroundColor: '#10b981' }} />
                  <View style={{ flex: item.total_favorites || 0, backgroundColor: '#ef4444' }} />
                  <View style={{ flex: item.total_views || 0, backgroundColor: '#0891b2' }} />
                </View>
                <Text style={styles.barLabel}>{item.period_label}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}><View style={[styles.legendColor, { backgroundColor: '#0891b2' }]} /><Text style={styles.legendText}>Views</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendColor, { backgroundColor: '#ef4444' }]} /><Text style={styles.legendText}>Favorites</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendColor, { backgroundColor: '#10b981' }]} /><Text style={styles.legendText}>Reviews</Text></View>
        </View>
      </View>
    );
  };

  const ShopPerformanceCard = ({ shop }: { shop: ShopPerformance }) => (
    <View style={styles.shopCard}>
      <Text style={styles.shopName}>{shop.name}</Text>
      <View style={styles.shopStats}>
        <View style={styles.shopStat}><Eye size={16} color="#64748b" /><Text style={styles.shopStatValue}>{(shop.total_views ?? 0).toLocaleString()}</Text><Text style={styles.shopStatLabel}>Views</Text></View>
        <View style={styles.shopStat}><Heart size={16} color="#ef4444" /><Text style={styles.shopStatValue}>{shop.total_favorites ?? 0}</Text><Text style={styles.shopStatLabel}>Favorites</Text></View>
        <View style={styles.shopStat}><Star size={16} color="#fbbf24" /><Text style={styles.shopStatValue}>{Number(shop.average_rating ?? 0).toFixed(1)}</Text><Text style={styles.shopStatLabel}>Rating</Text></View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <Text style={styles.headerSubtitle}>Track your business performance</Text>
        <View style={styles.periodSelector}>
          {['week', 'month', 'year'].map(period => (
            <TouchableOpacity key={period} style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]} onPress={() => setSelectedPeriod(period)}>
              <Text style={[styles.periodButtonText, selectedPeriod === period && styles.periodButtonTextActive]}>{period.charAt(0).toUpperCase() + period.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>
      {isLoading ? <ActivityIndicator size="large" color="#4F46E5" style={{ flex: 1 }} /> : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.overviewContainer}>
            <Text style={styles.sectionTitle}>Overview ({selectedPeriod})</Text>
            <View style={styles.statsGrid}>
              <StatCard icon={Eye} title="Total Views" value={(overview?.total_views ?? 0).toLocaleString()} color="#4F46E5" />
              <StatCard icon={Heart} title="Total Favorites" value={(overview?.total_favorites ?? 0).toLocaleString()} color="#EC4899" />
            </View>
            <View style={styles.statsGrid}>
              <StatCard icon={Star} title="Avg Rating" value={Number(overview?.avg_rating ?? 0).toFixed(1)} color="#F59E0B" />
              <StatCard icon={MessageSquare} title="Total Reviews" value={(overview?.total_reviews ?? 0).toLocaleString()} color="#10B981" />
            </View>
          </View>
          <View style={styles.chartSection}><StackedBarChart data={engagementStats} /></View>
          <View style={styles.shopsSection}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Shop Performance</Text><TouchableOpacity style={styles.filterButton}><Filter size={16} color="#64748b" /></TouchableOpacity></View>
            {shopPerformance.map((shop) => <ShopPerformanceCard key={shop.shop_id} shop={shop} />)}
          </View>
          <View style={styles.insightsSection}>
            <Text style={styles.sectionTitle}>Insights & Tips</Text>
            <View style={styles.insightCard}><LinearGradient colors={['#10b981', '#059669']} style={styles.insightGradient}><Text style={styles.insightTitle}>📈 Stay Consistent</Text><Text style={styles.insightText}>Keep your shop information and photos updated to attract more customers and improve your visibility.</Text></LinearGradient></View>
            <View style={styles.insightCard}><LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.insightGradient}><Text style={styles.insightTitle}>💡 Engage Your Customers</Text><Text style={styles.insightText}>Responding to reviews and running promotions on busy days can significantly boost customer loyalty.</Text></LinearGradient></View>
          </View>
          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFC' },
  header: { paddingHorizontal: 24, paddingVertical: 28 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#ffffff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 6, marginBottom: 24 },
  periodSelector: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, padding: 6 },
  periodButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center' },
  periodButtonActive: { backgroundColor: '#ffffff' },
  periodButtonText: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.9)' },
  periodButtonTextActive: { color: '#4F46E5' },
  content: { flex: 1 },
  overviewContainer: { padding: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  filterButton: { padding: 10 },
  statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  statCardGradient: { padding: 20 },
  statCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statValue: { fontSize: 26, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  statTitle: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  chartSection: { paddingHorizontal: 24, marginBottom: 28 },
  chartContainer: { backgroundColor: '#ffffff', borderRadius: 20, padding: 24, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  chartTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 20 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 140, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  chartBar: { alignItems: 'center', flex: 1, paddingHorizontal: 6 },
  barContainer: {
    width: '100%',
    minWidth: 20,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    flexDirection: 'column-reverse',
    marginBottom: 10,
  },
  barLabel: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  emptyChartText: { textAlign: 'center', color: '#64748B', fontStyle: 'italic', height: 140, lineHeight: 140 },
  chartLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendColor: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 12, color: '#64748B' },
  shopsSection: { paddingHorizontal: 24, marginBottom: 28 },
  shopCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  shopName: { fontSize: 17, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  shopStats: { flexDirection: 'row', justifyContent: 'space-around' },
  shopStat: { alignItems: 'center', gap: 6 },
  shopStatValue: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  shopStatLabel: { fontSize: 12, color: '#64748B' },
  insightsSection: { paddingHorizontal: 24, marginBottom: 28 },
  insightCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  insightGradient: { padding: 20 },
  insightTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff', marginBottom: 10 },
  insightText: { fontSize: 14, color: '#ffffff', lineHeight: 22, opacity: 0.95 },
  bottomSpacing: { height: 32 },
});
