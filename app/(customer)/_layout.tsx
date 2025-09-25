import React from 'react';
import { Tabs } from 'expo-router';
import { Home, MapPin, Heart, User } from 'lucide-react-native';
import { Platform } from 'react-native';

export default function CustomerTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E53E3E',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          // Use Platform to handle different OS padding/height
          paddingBottom: Platform.OS === 'android' ? 5 : 30,
          paddingTop: 5,
          height: Platform.OS === 'android' ? 60 : 90,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index" // Links to app/(customer)/index.tsx
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map" // Links to app/(customer)/map.tsx
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => <MapPin size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites" // Links to app/(customer)/favorites.tsx
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile" // Links to app/(customer)/profile.tsx
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      
      {/* These screens are part of the (customer) group but are not shown in the tab bar. */}
      {/* This is how you navigate to them from other screens. */}
      <Tabs.Screen name="restaurant-details" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="categories" options={{ href: null }} />
    </Tabs>
  );
}
