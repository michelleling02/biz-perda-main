// app/(owner)/profile.tsx

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Store, Bell, MapPin, Star, Eye, LogOut, ChevronRight, Shield, CircleHelp as HelpCircle, Mail, CreditCard as Edit } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, router } from 'expo-router';
import { supabase } from '../../lib/supabase';

type ProfileData = {
  name: string;
  email: string;
  joinDate: string;
  profilePhotoUrl: string | null;
};

type ProfileStats = {
  total_shops: number;
  total_views: number;
  total_favorites: number;
  avg_rating: number;
};

export default function OwnerProfileScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const fetchProfileData = async () => {
        setIsLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            Alert.alert("Not Authenticated", "Please log in.");
            router.replace('/');
            return;
          }

          const [profileRes, statsRes] = await Promise.all([
            supabase.from('profiles').select('name, profile_photo_url').eq('id', user.id).single(),
            supabase.rpc('get_owner_profile_stats', { p_owner_id: user.id }).single()
          ]);

          if (profileRes.error) throw profileRes.error;
          if (statsRes.error) throw statsRes.error;

          const statsData = statsRes.data as ProfileStats;

          setProfile({
            name: profileRes.data.name || 'N/A',
            email: user.email || 'N/A',
            joinDate: user.created_at,
            profilePhotoUrl: profileRes.data.profile_photo_url,
          });

          setStats({
            total_shops: statsData.total_shops ?? 0,
            total_views: statsData.total_views ?? 0,
            total_favorites: statsData.total_favorites ?? 0,
            avg_rating: Number(statsData.avg_rating ?? 0),
          });

        } catch (error: any) {
          console.error("Error fetching profile data:", error);
          Alert.alert("Error", "Could not load your profile.");
        } finally {
          setIsLoading(false);
        }
      };

      fetchProfileData();
    }, [])
  );

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) Alert.alert('Error', 'Failed to logout: ' + error.message);
          router.replace('/');
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#f97316" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.header}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            {profile?.profilePhotoUrl ? (
              <Image source={{ uri: profile.profilePhotoUrl }} style={styles.avatarImage} />
            ) : (
              <User size={32} color="#ffffff" />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.name}</Text>
            <Text style={styles.profileEmail}>{profile?.email}</Text>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={() => router.push('/(owner)/edit-profile')}>
            <Edit size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Business Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard icon={Store} title="Total Shops" value={stats?.total_shops ?? 0} color="#EC4899" />
            <StatCard icon={Eye} title="Total Views" value={(stats?.total_views ?? 0).toLocaleString()} color="#4F46E5" />
          </View>
          <View style={styles.statsGrid}>
            <StatCard icon={Star} title="Avg Rating" value={(stats?.avg_rating ?? 0).toFixed(1)} color="#F59E0B" />
            <StatCard icon={MapPin} title="Favorites" value={stats?.total_favorites ?? 0} color="#EF4444" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <View style={styles.menuContainer}>
            <MenuItem icon={User} title="Personal Information" subtitle="Update your profile details" onPress={() => router.push('/(owner)/edit-profile')} />
            <MenuItem icon={Store} title="Business Information" subtitle="Manage your business details" onPress={() => console.log('Navigate to business info')} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.menuContainer}>
            <MenuItem icon={Bell} title="Push Notifications" rightContent={<Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: '#E2E8F0', true: '#4F46E5' }} />} />
            <MenuItem icon={Mail} title="Marketing Emails" rightContent={<Switch value={marketingEmails} onValueChange={setMarketingEmails} trackColor={{ false: '#E2E8F0', true: '#4F46E5' }} />} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Support</Text>
          <View style={styles.menuContainer}>
            <MenuItem icon={MapPin} title="Location Services" rightContent={<Switch value={locationEnabled} onValueChange={setLocationEnabled} trackColor={{ false: '#E2E8F0', true: '#4F46E5' }} />} />
            <MenuItem icon={Shield} title="Privacy Policy" onPress={() => console.log('Navigate to privacy policy')} />
            <MenuItem icon={HelpCircle} title="Help & Support" onPress={() => console.log('Navigate to help center')} />
          </View>
        </View>

        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Biz@Perda v1.0.0</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const MenuItem = ({ icon: Icon, title, subtitle, onPress, rightContent, color = '#64748b' }: any) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuItemLeft}>
      <Icon size={20} color={color} />
      <View style={styles.menuItemText}>
        <Text style={styles.menuItemTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    {rightContent || <ChevronRight size={16} color="#CBD5E1" />}
  </TouchableOpacity>
);

const StatCard = ({ icon: Icon, title, value, color }: any) => (
  <View style={styles.statCard}>
    <LinearGradient colors={[color + '20', color + '10']} style={styles.statCardGradient}>
      <Icon size={20} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </LinearGradient>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFC' },
  header: { paddingHorizontal: 24, paddingVertical: 28 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 24, fontWeight: '700', color: '#ffffff', marginBottom: 6 },
  profileEmail: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  editButton: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 12 },
  content: { flex: 1 },
  statsContainer: { padding: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 20 },
  statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  statCardGradient: { alignItems: 'center', padding: 20 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#1E293B', marginTop: 10, marginBottom: 6 },
  statTitle: { fontSize: 12, color: '#64748B', fontWeight: '500', textAlign: 'center' },
  section: { paddingHorizontal: 24, marginBottom: 28 },
  menuContainer: { backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 16 },
  menuItemText: { flex: 1 },
  menuItemTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 4 },
  menuItemSubtitle: { fontSize: 14, color: '#64748B' },
  appInfo: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  appVersion: { fontSize: 12, color: '#94A3B8' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', marginHorizontal: 24, paddingVertical: 18, borderRadius: 16, gap: 10, borderWidth: 1, borderColor: '#FECACA', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#EF4444' },
  bottomSpacing: { height: 32 },
});