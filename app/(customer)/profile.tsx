import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Settings, Bell, MapPin, Heart, Star, LogOut, ChevronRight, Shield, CircleHelp as HelpCircle, Mail } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, router } from 'expo-router';
import { useClerk, useUser, useSession } from '@clerk/clerk-expo';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type CustomerProfile = {
  name: string;
  email: string;
  joinDate: string;
  profilePhotoUrl: string | null;
};

type CustomerStats = {
  total_favorites: number;
  total_reviews: number;
  total_visited: number;
};

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { session } = useSession();

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  useEffect(() => {
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

  const fetchProfileData = useCallback(async () => {
    if (!supabase || !user) return;
    
    setIsLoading(true);
    try {
      const [profileRes, statsRes] = await Promise.all([
        supabase.from('profiles').select('name, profile_photo_url, created_at').eq('id', user.id).single(),
        supabase.rpc('get_customer_profile_stats', { p_customer_id: user.id })
      ]);

      if (profileRes.error && profileRes.error.code !== 'PGRST116') throw profileRes.error;
      if (statsRes.error) throw statsRes.error;

      const profileData = profileRes.data;
      const statsData = statsRes.data && statsRes.data.length > 0 ? statsRes.data[0] : null;

      let finalPhotoUrl = null;
      if (profileData && profileData.profile_photo_url) {
        const urlParts = profileData.profile_photo_url.split('/avatars/');
        const path = urlParts[1];
        if (path) {
          const { data: urlData } = await supabase.storage.from('avatars').createSignedUrl(path, 3600);
          finalPhotoUrl = urlData?.signedUrl || null;
        }
      }

      setProfile({
        name: profileData?.name || user.fullName || 'N/A',
        email: user.primaryEmailAddress?.emailAddress || 'N/A',
        joinDate: profileData?.created_at || user.createdAt?.toISOString() || '',
        profilePhotoUrl: finalPhotoUrl,
      });

      if (statsData) {
        setStats({
          total_favorites: statsData.total_favorites,
          total_reviews: statsData.total_reviews,
          total_visited: statsData.total_visited,
        });
      }

    } catch (error: any) {
      Alert.alert("Error", "Could not fetch your profile data.");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, user]);

  useFocusEffect(useCallback(() => { fetchProfileData(); }, [fetchProfileData]));

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
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
      ]
    );
  };

  if (isLoading) {
    return <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color="#0891b2" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0891b2', '#0369a1']} style={styles.header}>
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
            <Text style={styles.joinDate}>Member since {profile ? new Date(profile.joinDate).getFullYear() : ''}</Text>
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/(customer)/edit-profile')}><Settings size={20} color="#ffffff" /></TouchableOpacity>
        </View>
      </LinearGradient>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Your Activity</Text>
          <View style={styles.statsGrid}>
            <StatCard icon={Heart} title="Favorites" value={stats?.total_favorites ?? 0} color="#ef4444" />
            <StatCard icon={Star} title="Reviews" value={stats?.total_reviews ?? 0} color="#fbbf24" />
            <StatCard icon={MapPin} title="Visited" value={stats?.total_visited ?? 0} color="#10b981" />
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuContainer}>
            <MenuItem icon={User} title="Personal Information" subtitle="Update your profile details" onPress={() => router.push('/(customer)/edit-profile')} />
            <MenuItem icon={Bell} title="Notifications" subtitle="Manage notification preferences" rightContent={<Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: '#d1d5db', true: '#0891b2' }} />} />
            <MenuItem icon={MapPin} title="Location Services" subtitle="Allow location access for better experience" rightContent={<Switch value={locationEnabled} onValueChange={setLocationEnabled} trackColor={{ false: '#d1d5db', true: '#0891b2' }} />} />
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.menuContainer}>
            <MenuItem icon={HelpCircle} title="Help Center" subtitle="Get help and find answers" onPress={() => {}} />
            <MenuItem icon={Mail} title="Contact Us" subtitle="Send us a message" onPress={() => {}} />
            <MenuItem icon={Shield} title="Privacy Policy" subtitle="Review our privacy policy" onPress={() => {}} />
          </View>
        </View>
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Biz@Perda v1.0.0</Text>
          <Text style={styles.appDescription}>Your guide to discovering local businesses in Pulau Pinang</Text>
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
    <TouchableOpacity style={styles.menuItem} onPress={onPress}><View style={styles.menuItemLeft}><Icon size={20} color={color} /><View style={styles.menuItemText}><Text style={styles.menuItemTitle}>{title}</Text>{subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}</View></View>{rightContent || <ChevronRight size={16} color="#94a3b8" />}</TouchableOpacity>
);
const StatCard = ({ icon: Icon, title, value, color }: any) => (
    <View style={styles.statCard}><LinearGradient colors={[color + '20', color + '10']} style={styles.statCardGradient}><Icon size={24} color={color} /><Text style={styles.statValue}>{value}</Text><Text style={styles.statTitle}>{title}</Text></LinearGradient></View>
);
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' }, header: { paddingHorizontal: 20, paddingVertical: 24 }, profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 }, avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { width: '100%', height: '100%' }, profileInfo: { flex: 1 }, profileName: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 }, profileEmail: { fontSize: 14, color: '#e0f2fe', marginBottom: 4 }, joinDate: { fontSize: 12, color: '#bae6fd' }, settingsButton: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 10 }, content: { flex: 1 }, statsContainer: { padding: 20 }, sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b', marginBottom: 16 }, statsGrid: { flexDirection: 'row', gap: 12 }, statCard: { flex: 1, borderRadius: 12, overflow: 'hidden' }, statCardGradient: { alignItems: 'center', padding: 16 }, statValue: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginTop: 8, marginBottom: 4 }, statTitle: { fontSize: 12, color: '#64748b', fontWeight: '500' }, section: { paddingHorizontal: 20, marginBottom: 24 }, menuContainer: { backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden' }, menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }, menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }, menuItemText: { flex: 1 }, menuItemTitle: { fontSize: 16, fontWeight: '500', color: '#1e293b', marginBottom: 2 }, menuItemSubtitle: { fontSize: 14, color: '#64748b' }, appInfo: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24 }, appVersion: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 8 }, appDescription: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 }, logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', marginHorizontal: 20, paddingVertical: 16, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: '#fecaca' }, logoutText: { fontSize: 16, fontWeight: '600', color: '#ef4444' }, bottomSpacing: { height: 20 },
});
