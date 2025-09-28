import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart as BarChartIcon, Eye, Heart, Star, Filter, MessageSquare, TrendingUp, Camera, Award } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import Svg, { G, Text as SvgText, Rect } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// --- TYPE DEFINITIONS ---
type OverviewStats = { total_views: number; total_favorites: number; avg_rating: number; total_reviews: number; };
type EngagementStat = { period_label: string; total_views: number; total_favorites: number; total_reviews: number; };
type ShopPerformance = { shop_id: number; name: string; total_views: number; total_favorites: number; average_rating: number; };

// --- THIS IS THE FIX ---
// Define a specific type for our insights to satisfy the LinearGradient component.
type Insight = {
  icon: React.ElementType;
  title: string;
  text: string;
  colors: [string, string]; // <-- Guarantees a tuple of two strings
};
// --- END OF FIX ---

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

          if (selectedPeriod === 'year') {
            const currentYear = today.getFullYear();
            startDate = new Date(currentYear, 0, 1); 
            endDate = new Date(currentYear, 11, 31);
          } else if (selectedPeriod === 'month') {
            startDate = new Date();
            startDate.setDate(today.getDate() - 29);
            endDate = today;
          } else { // week
            startDate = new Date();
            startDate.setDate(today.getDate() - 6);
            endDate = today;
          }
          
          const startDateStr = startDate.toISOString().split('T')[0];
          const endDateStr = endDate.toISOString().split('T')[0];

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
          Alert.alert("Error", "Could not load analytics data: " + error.message); 
        } finally { 
          setIsLoading(false); 
        }
      }
      fetchAllAnalytics();
    }, [user, selectedPeriod])
  );

  const generatePersonalizedInsights = (): Insight[] => {
    const insights: Insight[] = [];
    if (!overview || !shopPerformance) return [];

    if (overview.avg_rating >= 4.5 && overview.total_reviews > 5) {
      insights.push({
        icon: Award,
        title: 'Excellent Rating!',
        text: `Congrats! Your average rating of ${overview.avg_rating.toFixed(1)} is fantastic. Keep up the great work!`,
        colors: ['#facc15', '#eab308'],
      });
    }

    const lowViewShop = shopPerformance.sort((a, b) => a.total_views - b.total_views)[0];
    if (lowViewShop && lowViewShop.total_views < 20) {
      insights.push({
        icon: Camera,
        title: 'Boost Your Views',
        text: `Your shop "${lowViewShop.name}" has low views. Try adding more high-quality photos to attract customers.`,
        colors: ['#60a5fa', '#2563eb'],
      });
    }

    if (overview.total_favorites > 50) {
      insights.push({
        icon: Heart,
        title: 'Customers Love You!',
        text: `You have over ${overview.total_favorites} favorites. Consider running a special promotion for your loyal fans.`,
        colors: ['#f87171', '#dc2626'],
      });
    }
    
    if (insights.length === 0) {
      insights.push({
        icon: TrendingUp,
        title: 'Stay Consistent',
        text: 'Keep your shop information and photos updated to attract more customers and improve your visibility.',
        colors: ['#10b981', '#059669'],
      });
    }

    return insights.slice(0, 2);
  };

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
    // This first check for no data at all is still good practice.
    if (!data || data.length === 0) {
      return <Text style={styles.emptyChartText}>No data for this period.</Text>;
    }

    const maxTotal = Math.max(...data.map(item => (item.total_views || 0) + (item.total_favorites || 0) + (item.total_reviews || 0)), 1);
    const chartWidth = Dimensions.get('window').width - 80;
    const barWidth = chartWidth / data.length;

    // --- THIS IS THE FIX ---
    // Check if the grand total of all data is zero.
    const grandTotal = data.reduce((acc, item) => acc + (item.total_views || 0) + (item.total_favorites || 0) + (item.total_reviews || 0), 0);

    // If everything is zero, show the empty state message.
    if (grandTotal === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Engagement ({selectedPeriod})</Text>
          <View style={{ height: 160, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={styles.emptyChartText}>No engagement data for this period yet.</Text>
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}><View style={[styles.legendColor, { backgroundColor: '#0891b2' }]} /><Text style={styles.legendText}>Views</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendColor, { backgroundColor: '#ef4444' }]} /><Text style={styles.legendText}>Favorites</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendColor, { backgroundColor: '#10b981' }]} /><Text style={styles.legendText}>Reviews</Text></View>
          </View>
        </View>
      );
    }
    // --- END OF FIX ---

    // If there is data, render the chart as before.
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Engagement ({selectedPeriod})</Text>
        <View style={styles.chart}>
          <Svg height="160" width={chartWidth}>
            {data.map((item, index) => {
              const viewsHeight = ((item.total_views || 0) / maxTotal) * 120;
              const favsHeight = ((item.total_favorites || 0) / maxTotal) * 120;
              const reviewsHeight = ((item.total_reviews || 0) / maxTotal) * 120;
              const x = index * barWidth;

              return (
                <G key={index}>
                  <G x={x + (barWidth - 20) / 2}>
                    {/* These checks were added, but the main fix is the grandTotal check above */}
                    {viewsHeight > 0 && <Rect y={120 - viewsHeight} width={20} height={viewsHeight} fill="#0891b2" rx="4" />}
                    {favsHeight > 0 && <Rect y={120 - viewsHeight - favsHeight} width={20} height={favsHeight} fill="#ef4444" rx="4" />}
                    {reviewsHeight > 0 && <Rect y={120 - viewsHeight - favsHeight - reviewsHeight} width={20} height={reviewsHeight} fill="#10b981" rx="4" />}
                  </G>
                  <SvgText
                    x={x + barWidth / 2}
                    y={135}
                    fill="#64748b"
                    fontSize="12"
                    fontWeight="500"
                    originX={x + barWidth / 2}
                    originY={135}
                    rotation="-45"
                    textAnchor="middle"
                  >
                    {item.period_label}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
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

  const personalizedInsights = generatePersonalizedInsights();

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
          <View style={styles.chartSection}>
            {
              // First, calculate the grand total of all engagement stats
              (engagementStats.reduce((acc, item) => acc + item.total_views + item.total_favorites + item.total_reviews, 0)) > 0 
              ? (
                // If the total is greater than 0, render the chart
                <StackedBarChart data={engagementStats} />
              ) : (
                // Otherwise, render a placeholder
                <View style={styles.chartContainer}>
                  <Text style={styles.chartTitle}>Engagement ({selectedPeriod})</Text>
                  <View style={{ height: 160, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={styles.emptyChartText}>No engagement data for this period yet.</Text>
                  </View>
                  <View style={styles.chartLegend}>
                    <View style={styles.legendItem}><View style={[styles.legendColor, { backgroundColor: '#0891b2' }]} /><Text style={styles.legendText}>Views</Text></View>
                    <View style={styles.legendItem}><View style={[styles.legendColor, { backgroundColor: '#ef4444' }]} /><Text style={styles.legendText}>Favorites</Text></View>
                    <View style={styles.legendItem}><View style={[styles.legendColor, { backgroundColor: '#10b981' }]} /><Text style={styles.legendText}>Reviews</Text></View>
                  </View>
                </View>
              )
            }
          </View>
          <View style={styles.shopsSection}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Shop Performance</Text><TouchableOpacity style={styles.filterButton}><Filter size={16} color="#64748b" /></TouchableOpacity></View>
            {shopPerformance.map((shop) => <ShopPerformanceCard key={shop.shop_id} shop={shop} />)}
          </View>
          <View style={styles.insightsSection}>
            <Text style={styles.sectionTitle}>Insights & Tips</Text>
            {personalizedInsights.map((insight, index) => (
              <View key={index} style={styles.insightCard}>
                <LinearGradient colors={insight.colors} style={styles.insightGradient}>
                  <insight.icon size={20} color="#ffffff" />
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <Text style={styles.insightText}>{insight.text}</Text>
                  </View>
                </LinearGradient>
              </View>
            ))}
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
  chart: { height: 160, width: '100%', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  emptyChartText: { textAlign: 'center', color: '#64748b', fontStyle: 'italic', height: 140, lineHeight: 140 },
  chartLegend: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingTop: 16 },
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
  insightGradient: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  insightContent: { flex: 1 },
  insightTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  insightText: { fontSize: 14, color: '#ffffff', lineHeight: 20, opacity: 0.9 },
  bottomSpacing: { height: 20 },
});
