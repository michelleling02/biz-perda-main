import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Heart, Star, LogOut, ChevronRight, Edit } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// --- TYPE DEFINITIONS ---
type CustomerProfile = {
  name: string;
  email: string;
  joinDate: string;
  profile_photo_url: string | null; // This now matches the DB column
};

type CustomerStats = {
  total_favorites: number;
  total_reviews: number;
  total_shops_viewed: number;
};

export default function ProfileScreen() {
  const { session } = useAuth();
  const user = session?.user;

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [stats, setStats] = useState<CustomerStats | null>(null);

  const fetchProfileData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      // Fetch profile and stats in parallel
      const [profileRes, statsRes] = await Promise.all([
        supabase.from('profiles').select('name, profile_photo_url, created_at').eq('id', user.id).single(),
        supabase.rpc('get_customer_profile_stats', { p_customer_id: user.id })
      ]);

      if (profileRes.error && profileRes.error.code !== 'PGRST116') throw profileRes.error;
      if (statsRes.error) throw statsRes.error;

      const profileData = profileRes.data;
      const statsData = statsRes.data?.[0];

      setProfile({
        name: profileData?.name || 'New User',
        email: user.email || 'No Email',
        joinDate: profileData?.created_at || user.created_at || new Date().toISOString(),
        profile_photo_url: profileData?.profile_photo_url || null, // Use the direct public URL
      });

      if (statsData) {
        setStats({
          total_favorites: statsData.total_favorites,
          total_reviews: statsData.total_reviews,
          total_shops_viewed: statsData.total_shops_viewed,
        });
      }

    } catch (error: any) {
      Alert.alert("Error", "Could not fetch your profile data.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => {
    fetchProfileData();
  }, [fetchProfileData]));

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  if (isLoading) {
    return <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color="#ef4444" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* --- NEW HEADER AND PROFILE SECTION --- */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profile?.profile_photo_url ? (
              <Image source={{ uri: profile.profile_photo_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}><User size={48} color="#64748b" /></View>
            )}
          </View>
          <Text style={styles.profileName}>{profile?.name}</Text>
          <Text style={styles.profileEmail}>{profile?.email}</Text>
          <TouchableOpacity style={styles.editProfileButton} onPress={() => router.push('/(customer)/edit-profile')}>
            <Edit size={16} color="#374151" />
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
        {/* --- END OF NEW HEADER --- */}

        <View style={styles.statsContainer}>
          <StatCard icon={Heart} title="Favorites" value={stats?.total_favorites ?? 0} color="#ef4444" />
          <StatCard icon={Star} title="Reviews Given" value={stats?.total_reviews ?? 0} color="#fbbf24" />
        </View>

        {/* --- SIMPLIFIED MENU --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Activity</Text>
          <View style={styles.menuContainer}>
            <MenuItem icon={Heart} title="My Favorites" onPress={() => router.push('/(customer)/favorites')} />
            {/* You can add a "My Reviews" page link here in the future */}
          </View>
        </View>
        {/* --- END OF SIMPLIFIED MENU --- */}

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

// --- HELPER COMPONENTS AND STYLES ---
const MenuItem = ({ icon: Icon, title, onPress }: any) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuItemLeft}>
      <Icon size={20} color="#475569" />
      <Text style={styles.menuItemTitle}>{title}</Text>
    </View>
    <ChevronRight size={16} color="#94a3b8" />
  </TouchableOpacity>
);

const StatCard = ({ icon: Icon, title, value, color }: any) => (
  <View style={styles.statCard}>
    <LinearGradient colors={[color + '1A', color + '0D']} style={styles.statCardGradient}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '2A' }]}>
        <Icon size={20} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </LinearGradient>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1 },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  editProfileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    padding: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statTitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  menuContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  appInfo: {
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
  },
  appVersion: {
    fontSize: 14,
    color: '#94a3b8',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  bottomSpacing: {
    height: 40,
  },
});
