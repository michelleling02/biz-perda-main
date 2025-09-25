import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Settings, Bell, MapPin, Heart, Star, LogOut, ChevronRight, Shield, HelpCircle, Mail } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, router } from 'expo-router';
import { supabase } from '../../lib/supabase'; // Use the global Supabase client
import { useAuth } from '../../contexts/AuthContext'; // Use our own AuthContext

// Type definitions for the data we expect
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
  // Get session and user from our own Supabase AuthContext
  const { session } = useAuth();
  const user = session?.user;

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  const fetchProfileData = useCallback(async () => {
    if (!user) {
      console.log("fetchProfileData: No user found, returning.");
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      console.log("fetchProfileData: Starting fetch for user:", user.id);

      // We will test each call individually.
      
      console.log("fetchProfileData: Fetching from 'profiles' table...");
      const profileRes = await supabase
        .from('profiles')
        .select('name, profile_photo_url, created_at')
        .eq('id', user.id)
        .single();

      // Check for an error immediately after the call.
      if (profileRes.error && profileRes.error.code !== 'PGRST116') {
        console.error("!!! PROFILE FETCH FAILED:", JSON.stringify(profileRes.error, null, 2));
        throw new Error("Failed to fetch profile.");
      }
      console.log("fetchProfileData: Profile fetch successful.", profileRes.data);


      console.log("fetchProfileData: Calling RPC 'get_customer_profile_stats'...");
      const statsRes = await supabase.rpc('get_customer_profile_stats', { p_customer_id: user.id });

      // Check for an error immediately after the call.
      if (statsRes.error) {
        console.error("!!! STATS RPC FAILED:", JSON.stringify(statsRes.error, null, 2));
        throw new Error("Failed to fetch stats.");
      }
      console.log("fetchProfileData: Stats RPC successful.", statsRes.data);


      // If we get here, both calls succeeded. Now we process the data.
      const profileData = profileRes.data;
      // The RPC function returns an array, so we take the first element.
      const statsData = statsRes.data && statsRes.data.length > 0 ? statsRes.data[0] : null;

      let finalPhotoUrl = null;
      if (profileData?.profile_photo_url) {
        const { data: urlData } = await supabase.storage.from('avatars').createSignedUrl(profileData.profile_photo_url, 3600);
        finalPhotoUrl = urlData?.signedUrl || null;
      }

      setProfile({
        name: profileData?.name || 'N/A',
        email: user.email || 'N/A',
        joinDate: profileData?.created_at || user.created_at || '',
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
      // The console.error from the try block will have already fired.
      // This alert is for the user.
      Alert.alert("Error", "Could not fetch your profile data. Check the console for details.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => {
    fetchProfileData();
  }, [fetchProfileData]));

  // Original logout handler using the Supabase client
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
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert("Logout Failed", error.message);
            }
            // The onAuthStateChange listener in AuthContext will handle the redirect
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

// Helper components and styles are unchanged
const MenuItem = ({ icon: Icon, title, subtitle, onPress, rightContent, color = '#64748b' }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}><View style={styles.menuItemLeft}><Icon size={20} color={color} /><View style={styles.menuItemText}><Text style={styles.menuItemTitle}>{title}</Text>{subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}</View></View>{rightContent || <ChevronRight size={16} color="#94a3b8" />}</TouchableOpacity>
);
const StatCard = ({ icon: Icon, title, value, color }: any) => (
    <View style={styles.statCard}><LinearGradient colors={[color + '20', color + '10']} style={styles.statCardGradient}><Icon size={24} color={color} /><Text style={styles.statValue}>{value}</Text><Text style={styles.statTitle}>{title}</Text></LinearGradient></View>
);
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' }, header: { paddingHorizontal: 20, paddingVertical: 24 }, profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 }, avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { width: '100%', height: '100%' }, profileInfo: { flex: 1 }, profileName: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 }, profileEmail: { fontSize: 14, color: '#e0f2fe', marginBottom: 4 }, joinDate: { fontSize: 12, color: '#bae6fd' }, settingsButton: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 10 }, content: { flex: 1 }, statsContainer: { padding: 20 }, sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b', marginBottom: 16 }, statsGrid: { flexDirection: 'row', gap: 12 }, statCard: { flex: 1, borderRadius: 12, overflow: 'hidden' }, statCardGradient: { alignItems: 'center', padding: 16 }, statValue: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginTop: 8, marginBottom: 4 }, statTitle: { fontSize: 12, color: '#64748b', fontWeight: '500' }, section: { paddingHorizontal: 20, marginBottom: 24 }, menuContainer: { backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden' }, menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }, menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }, menuItemText: { flex: 1 }, menuItemTitle: { fontSize: 16, fontWeight: '500', color: '#1e293b', marginBottom: 2 }, menuItemSubtitle: { fontSize: 14, color: '#64748b' }, appInfo: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24 }, appVersion: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 8 }, appDescription: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 }, logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', marginHorizontal: 20, paddingVertical: 16, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: '#fecaca' }, logoutText: { fontSize: 16, fontWeight: '600', color: '#ef4444' }, bottomSpacing: { height: 20 },
});
