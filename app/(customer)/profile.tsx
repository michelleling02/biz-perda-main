import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Bell, MapPin, Star, Heart, LogOut, ChevronRight, Shield, CircleHelp as HelpCircle, Mail, Settings } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type ProfileData = {
  name: string;
  email: string;
  joinDate: string;
  profilePhotoUrl: string | null;
};

type ProfileStats = {
  total_favorites: number;
  total_reviews: number;
  total_visited: number;
};

export default function CustomerProfileScreen() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const fetchProfileData = async () => {
        if (!user) {
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        try {
          const [profileRes, statsRes] = await Promise.all([
            supabase.from('profiles').select('name, profile_photo_url').eq('id', user.id).single(),
            supabase.rpc('get_customer_profile_stats', { p_customer_id: user.id }).single()
          ]);

          if (profileRes.error && profileRes.error.code !== 'PGRST116') throw profileRes.error;
          if (statsRes.error) throw statsRes.error;

          let profilePhotoUrl = null;
          if (profileRes.data?.profile_photo_url) {
            const { data: urlData } = await supabase.storage
              .from('avatars')
              .createSignedUrl(profileRes.data.profile_photo_url, 3600);
            profilePhotoUrl = urlData?.signedUrl || null;
          }

          setProfile({
            name: profileRes.data?.name || 'New User',
            email: user.email || 'N/A',
            joinDate: user.created_at,
            profilePhotoUrl,
          });

          const statsData = statsRes.data as ProfileStats;
          setStats({
            total_favorites: statsData.total_favorites ?? 0,
            total_reviews: statsData.total_reviews ?? 0,
            total_visited: statsData.total_visited ?? 0,
          });

        } catch (error: any) {
          console.error("Error fetching profile data:", error);
          Alert.alert("Error", "Could not load your profile.");
        } finally {
          setIsLoading(false);
        }
      };

      fetchProfileData();
    }, [user])
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
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient 
        colors={['#E53E3E', '#3B82F6']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            {profile?.profilePhotoUrl ? (
              <Image source={{ uri: profile.profilePhotoUrl }} style={styles.avatarImage} />
            ) : (
              <User size={36} color="#ffffff" />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.name}</Text>
            <Text style={styles.profileEmail}>{profile?.email}</Text>
            <Text style={styles.joinDate}>
              Member since {new Date(profile?.joinDate || '').toLocaleDateString()}
            </Text>
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/(customer)/edit-profile')}>
            <Settings size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Your Activity</Text>
          <View style={styles.statsGrid}>
            <StatCard icon={MapPin} title="Visited" value={stats?.total_visited ?? 0} color="#3B82F6" />
            <StatCard icon={Star} title="Reviews" value={stats?.total_reviews ?? 0} color="#F59E0B" />
            <StatCard icon={Heart} title="Favorites" value={stats?.total_favorites ?? 0} color="#E53E3E" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <View style={styles.menuContainer}>
            <MenuItem 
              icon={User} 
              title="Personal Information" 
              subtitle="Update your profile details" 
              onPress={() => router.push('/(customer)/edit-profile')} 
            />
            <MenuItem 
              icon={Heart} 
              title="My Favorites" 
              subtitle="View your saved restaurants" 
              onPress={() => router.push('/(customer)/favorites')} 
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.menuContainer}>
            <MenuItem 
              icon={Bell} 
              title="Notifications" 
              subtitle="Manage notification preferences"
              rightContent={
                <Switch 
                  value={notificationsEnabled} 
                  onValueChange={setNotificationsEnabled} 
                  trackColor={{ false: '#E2E8F0', true: '#3B82F6' }} 
                />
              } 
            />
            <MenuItem 
              icon={MapPin} 
              title="Location Services" 
              subtitle="Allow location access for better experience"
              rightContent={
                <Switch 
                  value={locationEnabled} 
                  onValueChange={setLocationEnabled} 
                  trackColor={{ false: '#E2E8F0', true: '#3B82F6' }} 
                />
              } 
            />
            <MenuItem 
              icon={Mail} 
              title="Marketing Emails" 
              subtitle="Receive updates and promotions"
              rightContent={
                <Switch 
                  value={marketingEmails} 
                  onValueChange={setMarketingEmails} 
                  trackColor={{ false: '#E2E8F0', true: '#3B82F6' }} 
                />
              } 
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Legal</Text>
          <View style={styles.menuContainer}>
            <MenuItem 
              icon={Shield} 
              title="Privacy Policy" 
              onPress={() => console.log('Navigate to privacy policy')} 
            />
            <MenuItem 
              icon={HelpCircle} 
              title="Help & Support" 
              onPress={() => console.log('Navigate to help center')} 
            />
          </View>
        </View>

        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Biz@Perda v1.0.0</Text>
          <Text style={styles.appDescription}>
            Discover and explore the best restaurants in Penang
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={24} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const MenuItem = ({ icon: Icon, title, subtitle, onPress, rightContent, color = '#64748B' }: any) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuItemLeft}>
      <Icon size={24} color={color} />
      <View style={styles.menuItemText}>
        <Text style={styles.menuItemTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    {rightContent || <ChevronRight size={20} color="#94A3B8" />}
  </TouchableOpacity>
);

const StatCard = ({ icon: Icon, title, value, color }: any) => (
  <View style={styles.statCard}>
    <LinearGradient 
      colors={[color + '20', color + '10']} 
      style={styles.statCardGradient}
    >
      <Icon size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </LinearGradient>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 32, paddingVertical: 36 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  avatar: { 
    width: 72, 
    height: 72, 
    borderRadius: 36, 
    backgroundColor: 'rgba(255,255,255,0.25)', 
    alignItems: 'center', 
    justifyContent: 'center', 
    overflow: 'hidden', 
    borderWidth: 3, 
    borderColor: 'rgba(255,255,255,0.3)' 
  },
  avatarImage: { width: '100%', height: '100%' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', marginBottom: 6 },
  profileEmail: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginBottom: 4 },
  joinDate: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  settingsButton: { 
    backgroundColor: 'rgba(255,255,255,0.25)', 
    borderRadius: 16, 
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  content: { flex: 1 },
  statsContainer: { padding: 32 },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: '#1F2937', marginBottom: 24 },
  statsGrid: { flexDirection: 'row', gap: 16 },
  statCard: { flex: 1, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 },
  statCardGradient: { alignItems: 'center', padding: 24 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#1F2937', marginTop: 12, marginBottom: 6 },
  statTitle: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  section: { paddingHorizontal: 32, marginBottom: 32 },
  menuContainer: { 
    backgroundColor: '#ffffff', 
    borderRadius: 20, 
    overflow: 'hidden', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    elevation: 4 
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 24, 
    paddingVertical: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F8FAFC' 
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 20 },
  menuItemText: { flex: 1 },
  menuItemTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  menuItemSubtitle: { fontSize: 15, color: '#64748B' },
  appInfo: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 32 },
  appVersion: { fontSize: 16, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  appDescription: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
  logoutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#ffffff', 
    marginHorizontal: 32, 
    paddingVertical: 20, 
    borderRadius: 20, 
    gap: 16, 
    borderWidth: 1, 
    borderColor: '#FECACA', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    elevation: 4 
  },
  logoutText: { fontSize: 18, fontWeight: '600', color: '#EF4444' },
  bottomSpacing: { height: 32 },
});