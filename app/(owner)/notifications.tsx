// FILE: app/(owner)/notifications.tsx

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Clock, Star, Eye, Heart, Trash2, BookMarked as MarkAsRead } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase'; // Use our global Supabase client
import { useAuth } from '../../contexts/AuthContext'; // Use our own AuthContext

// --- TYPE DEFINITION (UNCHANGED) ---
type Notification = {
  notification_id: number;
  recipient_user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  // We'll add these client-side for the UI
  type?: string;
  icon?: React.ElementType;
  color?: string;
};

// Helper to map notification titles to icons and colors (UNCHANGED)
const getNotificationStyle = (title: string) => {
  if (title.includes('Approved')) return { icon: CheckCircle, color: '#10b981', type: 'approval' };
  if (title.includes('Review')) return { icon: Star, color: '#fbbf24', type: 'review' };
  if (title.includes('Milestone')) return { icon: Eye, color: '#0891b2', type: 'milestone' };
  if (title.includes('Favorited')) return { icon: Heart, color: '#ef4444', type: 'favorite' };
  if (title.includes('Under Review')) return { icon: Clock, color: '#f59e0b', type: 'pending' };
  return { icon: AlertCircle, color: '#8b5cf6', type: 'system' };
};

export default function NotificationsScreen() {
  // --- THIS IS THE FIX ---
  // Get the user directly from our own Supabase AuthContext
  const { session } = useAuth();
  const user = session?.user;
  // -----------------------

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // The fetch function is now much simpler. It uses the global supabase client.
  const fetchNotifications = useCallback(async () => {
    if (!user) {
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
  }, [user]); // The dependency is now just the user object.

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

  // The rest of the functions (markAsRead, deleteNotification, etc.)
  // already use the global supabase client and are correct.
  const markAsRead = async (id: number) => {
    setNotifications(prev => prev.map(notif => notif.notification_id === id ? { ...notif, is_read: true } : notif));
    await supabase.from('notifications').update({ is_read: true }).eq('notification_id', id);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).eq('recipient_user_id', user.id).eq('is_read', false);
  };

  const deleteNotification = async (id: number) => {
    setNotifications(prev => prev.filter(notif => notif.notification_id !== id));
    await supabase.from('notifications').delete().eq('notification_id', id);
  };

  // --- ALL RENDERING LOGIC AND STYLES ARE UNCHANGED ---
  // (The rest of the file is identical to what you provided)
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
      <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.header}>
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
        <ActivityIndicator size="large" color="#4F46E5" style={{ flex: 1 }} />
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
              <Bell size={72} color="#CBD5E1" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFC' },
  header: { paddingHorizontal: 24, paddingVertical: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 16 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#ffffff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 6 },
  markAllButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, gap: 8 },
  markAllButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '500' },
  content: { flex: 1 },
  notificationsContainer: { padding: 24 },
  notificationCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  notificationCardUnread: { borderLeftWidth: 4, borderLeftColor: '#4F46E5', backgroundColor: '#FEFEFE' },
  notificationHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  notificationIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  notificationContent: { flex: 1 },
  notificationTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 10 },
  notificationTitle: { fontSize: 16, fontWeight: '600', color: '#64748B', flex: 1 },
  notificationTitleUnread: { color: '#1E293B' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4F46E5' },
  notificationMessage: { fontSize: 14, color: '#64748B', lineHeight: 22, marginBottom: 10 },
  notificationTime: { fontSize: 12, color: '#94A3B8' },
  deleteButton: { padding: 6 },
  emptyState: { alignItems: 'center', paddingVertical: 100, paddingHorizontal: 48 },
  emptyStateTitle: { fontSize: 26, fontWeight: '700', color: '#64748B', marginTop: 28, marginBottom: 16 },
  emptyStateText: { fontSize: 16, color: '#94A3B8', textAlign: 'center', lineHeight: 26 },
  bottomSpacing: { height: 32 },
});
