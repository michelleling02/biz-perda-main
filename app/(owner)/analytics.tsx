// /app/(owner)/analytics.tsx

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart as BarChartIcon, Eye, Heart, Star, Filter, MessageSquare } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, router } from 'expo-router';
import { supabase } from '../../lib/supabase';

// --- TYPE DEFINITIONS ---
type OverviewStats = { total_views: number; total_favorites: number; avg_rating: number; total_reviews: number; };
type EngagementStat = { period_label: string; total_views: number; total_favorites: number; total_reviews: number; };
type ShopPerformance = { shop_id: number; name: string; total_views: number; total_favorites: number; average_rating: number; };

export default function AnalyticsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [engagementStats, setEngagementStats] = useState<EngagementStat[]>([]);
  const [shopPerformance, setShopPerformance] = useState<ShopPerformance[]>([]);

  // This map defines the days and the groupBy parameter for the SQL function
  const periodMap: { [key: string]: { days: number; groupBy: 'day' | 'week' | 'month' } } = {
    week: { days: 7, groupBy: 'day' },
    month: { days: 30, groupBy: 'week' },
    year: { days: 365, groupBy: 'month' },
  };

  useFocusEffect(
    useCallback(() => {
      async function fetchAllAnalytics() {
        setIsLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { Alert.alert("Not logged in"); router.replace('/'); return; }

          const periodConfig = periodMap[selectedPeriod];
          const today = new Date();
          const endDate = today.toISOString().split('T')[0];
          const startDate = new Date();
          startDate.setDate(today.getDate() - (periodConfig.days - 1));
          const startDateStr = startDate.toISOString().split('T')[0];

          // The RPC calls now use the correct parameters from periodMap
          const [overviewRes, engagementRes, shopPerformanceRes] = await Promise.all([
            supabase.rpc('get_owner_analytics_overview', { p_owner_id: user.id, p_period_days: periodConfig.days }).single(),
            supabase.rpc('get_daily_engagement_stats', { p_owner_id: user.id, p_start_date: startDateStr, p_end_date: endDate, p_group_by_period: periodConfig.groupBy }),
            supabase.rpc('get_owner_shops_with_stats', { p_owner_id: user.id })
          ]);

          if (overviewRes.error) throw overviewRes.error;
          setOverview(overviewRes.data as unknown as OverviewStats);
          if (engagementRes.error) throw engagementRes.error;
          setEngagementStats(engagementRes.data as EngagementStat[]);
          if (shopPerformanceRes.error) throw shopPerformanceRes.error;
          setShopPerformance(shopPerformanceRes.data as ShopPerformance[]);
        } catch (error: any) { console.error("Error fetching analytics data:", error); Alert.alert("Error", "Could not load analytics data."); } finally { setIsLoading(false); }
      }
      fetchAllAnalytics();
    }, [selectedPeriod])
  );

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

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Engagement ({selectedPeriod})</Text>
        <View style={styles.chart}>
          {data.map((item, index) => {
            const total = item.total_views + item.total_favorites + item.total_reviews;
            if (total === 0) {
              return (
                <View key={index} style={styles.chartBar}>
                  <View style={styles.barContainer} />
                  <Text style={styles.barLabel}>{item.period_label}</Text>
                </View>
              );
            }
            return (
              <View key={index} style={styles.chartBar}>
                <View style={styles.barContainer}>
                  <View style={{ flex: item.total_reviews, backgroundColor: '#10b981' }} />
                  <View style={{ flex: item.total_favorites, backgroundColor: '#ef4444' }} />
                  <View style={{ flex: item.total_views, backgroundColor: '#0891b2' }} />
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
      <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.header}>
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
      {isLoading ? <ActivityIndicator size="large" color="#3b82f6" style={{ flex: 1 }} /> : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.overviewContainer}>
            <Text style={styles.sectionTitle}>Overview ({selectedPeriod})</Text>
            <View style={styles.statsGrid}>
              <StatCard icon={Eye} title="Total Views" value={(overview?.total_views ?? 0).toLocaleString()} color="#0891b2" />
              <StatCard icon={Heart} title="Total Favorites" value={(overview?.total_favorites ?? 0).toLocaleString()} color="#ef4444" />
            </View>
            <View style={styles.statsGrid}>
              <StatCard icon={Star} title="Avg Rating" value={Number(overview?.avg_rating ?? 0).toFixed(1)} color="#fbbf24" />
              <StatCard icon={MessageSquare} title="Total Reviews" value={(overview?.total_reviews ?? 0).toLocaleString()} color="#10b981" />
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
            <View style={styles.insightCard}><LinearGradient colors={['#f59e0b', '#d97706']} style={styles.insightGradient}><Text style={styles.insightTitle}>💡 Engage Your Customers</Text><Text style={styles.insightText}>Responding to reviews and running promotions on busy days can significantly boost customer loyalty.</Text></LinearGradient></View>
          </View>
          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingVertical: 24 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  headerSubtitle: { fontSize: 14, color: '#dbeafe', marginTop: 4, marginBottom: 20 },
  periodSelector: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 4 },
  periodButton: { flex: 1, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  periodButtonActive: { backgroundColor: '#ffffff' },
  periodButtonText: { fontSize: 14, fontWeight: '500', color: '#dbeafe' },
  periodButtonTextActive: { color: '#3b82f6' },
  content: { flex: 1 },
  overviewContainer: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  filterButton: { padding: 8 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  statCardGradient: { padding: 16 },
  statCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  statTitle: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  chartSection: { paddingHorizontal: 20, marginBottom: 24 },
  chartContainer: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  chartTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 16 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, marginBottom: 16 },
  chartBar: { alignItems: 'center', flex: 1 },
  barContainer: {
    height: 120,
    width: 20,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    flexDirection: 'column-reverse', // This stacks items from the bottom up
    marginBottom: 8,
  },
  barLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  emptyChartText: { textAlign: 'center', color: '#64748b', fontStyle: 'italic', height: 140, lineHeight: 140 },
  chartLegend: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendColor: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 12, color: '#64748b' },
  shopsSection: { paddingHorizontal: 20, marginBottom: 24 },
  shopCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  shopName: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 12 },
  shopStats: { flexDirection: 'row', justifyContent: 'space-around' },
  shopStat: { alignItems: 'center', gap: 4 },
  shopStatValue: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  shopStatLabel: { fontSize: 12, color: '#64748b' },
  insightsSection: { paddingHorizontal: 20, marginBottom: 24 },
  insightCard: { borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  insightGradient: { padding: 16 },
  insightTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 8 },
  insightText: { fontSize: 14, color: '#ffffff', lineHeight: 20, opacity: 0.9 },
  bottomSpacing: { height: 20 },
});
