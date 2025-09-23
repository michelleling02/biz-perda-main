// /app/(owner)/notifications.tsx

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Clock, Star, Eye, Heart, Trash2, BookMarked as MarkAsRead } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, router } from 'expo-router';
import { useSession, useUser } from '@clerk/clerk-expo';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- TYPE DEFINITION FOR OUR LIVE NOTIFICATION DATA ---
type Notification = {
  notification_id: number;
  recipient_user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  // We'll add these client-side for the UI
  type?: string; // e.g., 'approval', 'review'
  icon?: React.ElementType;
  color?: string;
};

// Helper to map notification titles to icons and colors
const getNotificationStyle = (title: string) => {
  if (title.includes('Approved')) return { icon: CheckCircle, color: '#10b981', type: 'approval' };
  if (title.includes('Review')) return { icon: Star, color: '#fbbf24', type: 'review' };
  if (title.includes('Milestone')) return { icon: Eye, color: '#0891b2', type: 'milestone' };
  if (title.includes('Favorited')) return { icon: Heart, color: '#ef4444', type: 'favorite' };
  if (title.includes('Under Review')) return { icon: Clock, color: '#f59e0b', type: 'pending' };
  return { icon: AlertCircle, color: '#8b5cf6', type: 'system' }; // Default
};

export default function NotificationsScreen() {
  const { session } = useSession();
  const { user } = useUser();

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Effect 1: Create the session-aware Supabase client
  React.useEffect(() => {
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

  const fetchNotifications = useCallback(async () => {
    if (!supabase || !user) {
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map the data to include UI styles
      const styledNotifications = data.map(n => ({
        ...n,
        ...getNotificationStyle(n.title),
      }));

      setNotifications(styledNotifications);

    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      Alert.alert("Error", "Could not load notifications.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [supabase, user]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchNotifications();
    }, [fetchNotifications])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (id: number) => {
    // Optimistically update the UI
    setNotifications(prev =>
      prev.map(notif =>
        notif.notification_id === id ? { ...notif, is_read: true } : notif
      )
    );
    // Update the database in the background
    await supabase
      ?.from('notifications')
      .update({ is_read: true })
      .eq('notification_id', id);
  };

  const markAllAsRead = async () => {
    if (!supabase || !user) return;

    setNotifications(prev =>
      prev.map(notif => ({ ...notif, is_read: true }))
    );
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_user_id', user.id)
      .eq('is_read', false);
  };

  const deleteNotification = async (id: number) => {
    if (!supabase) return;
    setNotifications(prev => prev.filter(notif => notif.notification_id !== id));
    await supabase
      .from('notifications')
      .delete()
      .eq('notification_id', id);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return 'Just now';
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const NotificationCard = ({ notification }: { notification: Notification }) => {
    const IconComponent = notification.icon || AlertCircle;
    
    return (
      <TouchableOpacity
        style={[styles.notificationCard, !notification.is_read && styles.notificationCardUnread]}
        onPress={() => !notification.is_read && markAsRead(notification.notification_id)}
      >
        <View style={styles.notificationHeader}>
          <View style={styles.notificationIcon}><IconComponent size={20} color={notification.color} /></View>
          <View style={styles.notificationContent}>
            <View style={styles.notificationTitleRow}>
              <Text style={[styles.notificationTitle, !notification.is_read && styles.notificationTitleUnread]}>{notification.title}</Text>
              {!notification.is_read && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.notificationMessage}>{notification.message}</Text>
            <Text style={styles.notificationTime}>{formatTimestamp(notification.created_at)}</Text>
          </View>
          <TouchableOpacity style={styles.deleteButton} onPress={() => deleteNotification(notification.notification_id)}>
            <Trash2 size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#DC2626', '#3B4ECC']} style={styles.header}>
        <View style={styles.headerContent}>
          <Bell size={24} color="#ffffff" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>{unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}</Text>
          </View>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
            <MarkAsRead size={16} color="#ffffff" /><Text style={styles.markAllButtonText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {isLoading ? (
        <ActivityIndicator size="large" color="#8b5cf6" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {notifications.length > 0 ? (
            <View style={styles.notificationsContainer}>
              {notifications.map(notification => (
                <NotificationCard key={notification.notification_id} notification={notification} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Bell size={64} color="#cbd5e1" />
              <Text style={styles.emptyStateTitle}>No Notifications</Text>
              <Text style={styles.emptyStateText}>You're all caught up! New notifications will appear here.</Text>
            </View>
          )}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// --- STYLES (UNCHANGED) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingVertical: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  headerSubtitle: { fontSize: 14, color: '#e9d5ff', marginTop: 4 },
  markAllButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  markAllButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '500' },
  content: { flex: 1 },
  notificationsContainer: { padding: 20 },
  notificationCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  notificationCardUnread: { borderLeftWidth: 4, borderLeftColor: '#8b5cf6', backgroundColor: '#fefefe' },
  notificationHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  notificationIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  notificationContent: { flex: 1 },
  notificationTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  notificationTitle: { fontSize: 16, fontWeight: '600', color: '#64748b', flex: 1 },
  notificationTitleUnread: { color: '#1e293b' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' },
  notificationMessage: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 8 },
  notificationTime: { fontSize: 12, color: '#94a3b8' },
  deleteButton: { padding: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyStateTitle: { fontSize: 24, fontWeight: 'bold', color: '#64748b', marginTop: 24, marginBottom: 12 },
  emptyStateText: { fontSize: 16, color: '#94a3b8', textAlign: 'center', lineHeight: 24 },
  bottomSpacing: { height: 20 },
});
