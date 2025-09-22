// app/(owner)/profile.tsx

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Store, Bell, MapPin, Star, Eye, LogOut, ChevronRight, Shield, CircleHelp as HelpCircle, Mail, CreditCard as Edit } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, router } from 'expo-router';
import { useSession, useUser } from '@clerk/clerk-expo';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useClerk } from '@clerk/clerk-expo';

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
  const { session } = useSession();
  const { user } = useUser();
  const { signOut } = useClerk();

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
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
          try {
            await signOut();
            router.replace('/');
          } catch (e: any) {
            console.error("Logout error", e);
            Alert.alert("Logout Failed", e.message || "An error occurred.");
          }
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
      <LinearGradient colors={['#f97316', '#ea580c']} style={styles.header}>
      <LinearGradient colors={['#DC2626', '#3B4ECC']} style={styles.header}>
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
            <StatCard icon={Store} title="Total Shops" value={stats?.total_shops ?? 0} color="#f97316" />
            <StatCard icon={Store} title="Total Shops" value={stats?.total_shops ?? 0} color="#DC2626" />
            <StatCard icon={Eye} title="Total Views" value={(stats?.total_views ?? 0).toLocaleString()} color="#0891b2" />
            <StatCard icon={Eye} title="Total Views" value={(stats?.total_views ?? 0).toLocaleString()} color="#3B4ECC" />
          </View>
          <View style={styles.statsGrid}>
            <StatCard icon={Star} title="Avg Rating" value={(stats?.avg_rating ?? 0).toFixed(1)} color="#fbbf24" />
            <StatCard icon={MapPin} title="Favorites" value={stats?.total_favorites ?? 0} color="#ef4444" />
            <StatCard icon={MapPin} title="Favorites" value={stats?.total_favorites ?? 0} color="#DC2626" />
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
            <MenuItem icon={Bell} title="Push Notifications" rightContent={<Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: '#d1d5db', true: '#f97316' }} />} />
            <MenuItem icon={Mail} title="Marketing Emails" rightContent={<Switch value={marketingEmails} onValueChange={setMarketingEmails} trackColor={{ false: '#d1d5db', true: '#f97316' }} />} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Support</Text>
          <View style={styles.menuContainer}>
            <MenuItem icon={MapPin} title="Location Services" rightContent={<Switch value={locationEnabled} onValueChange={setLocationEnabled} trackColor={{ false: '#d1d5db', true: '#f97316' }} />} />
            <MenuItem icon={MapPin} title="Location Services" rightContent={<Switch value={locationEnabled} onValueChange={setLocationEnabled} trackColor={{ false: '#d1d5db', true: '#DC2626' }} />} />
            <MenuItem icon={Shield} title="Privacy Policy" onPress={() => console.log('Navigate to privacy policy')} />
            <MenuItem icon={HelpCircle} title="Help & Support" onPress={() => console.log('Navigate to help center')} />
          </View>
        </View>

        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Biz@Perda v1.0.0</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#ef4444" />
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
    {rightContent || <ChevronRight size={16} color="#94a3b8" />}
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingVertical: 24 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  profileEmail: { fontSize: 14, color: '#fed7aa' },
  editButton: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 10 },
  content: { flex: 1 },
  statsContainer: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b', marginBottom: 16 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  statCardGradient: { alignItems: 'center', padding: 16 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginTop: 8, marginBottom: 4 },
  statTitle: { fontSize: 12, color: '#64748b', fontWeight: '500', textAlign: 'center' },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  menuContainer: { backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  menuItemText: { flex: 1 },
  menuItemTitle: { fontSize: 16, fontWeight: '500', color: '#1e293b', marginBottom: 2 },
  menuItemSubtitle: { fontSize: 14, color: '#64748b' },
  appInfo: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  appVersion: { fontSize: 12, color: '#94a3b8' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', marginHorizontal: 20, paddingVertical: 16, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: '#fecaca' },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#ef4444' },
  bottomSpacing: { height: 20 },
});
