// app/(owner)/_layout.tsx

import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Home, Plus, BarChart3, Bell, User } from 'lucide-react-native';
import { useNotifications } from '../../contexts/NotificationContext';

// A small component for the notification badge
const NotificationBadge = () => {
  const { unreadCount } = useNotifications();

  if (unreadCount === 0) {
    return null;
  }

  return (
    <View style={styles.badgeContainer}>
      <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
    </View>
  );
};

export default function OwnerTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ff6b35',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add-shop"
        options={{
          title: 'Add Restaurant',
          tabBarIcon: ({ size, color }) => <Plus size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ size, color }) => <BarChart3 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ size, color }) => (
            <View>
              <Bell size={size} color={color} />
              <NotificationBadge />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />

      {/* --- THIS IS THE FIX --- */}
      {/* These screens are part of the (owner) route group, but they are not */}
      {/* displayed in the tab bar. They can still be navigated to. */}
      <Tabs.Screen
        name="edit-shop"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="edit-shop-tags"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="edit-profile" // Add the entry for edit-profile
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="shop-details" // Add the entry for shop-details
        options={{
          href: null,
        }}
      />
      {/* --- END OF FIX --- */}

    </Tabs>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
