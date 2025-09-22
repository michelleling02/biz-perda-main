import { Tabs } from 'expo-router';
import { Chrome as Home, MapPin, Heart, User } from 'lucide-react-native';
import { Platform } from 'react-native';

export default function CustomerTabLayout() {
  // No auth logic is needed here anymore.
  // The root _layout.tsx acts as the gatekeeper.
  // If a user ever reaches this layout, we know they are authenticated.
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#58508D',
        tabBarInactiveTintColor: '#9B9B9B',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
        }}
      />
      {Platform.OS !== 'web' && (
        <Tabs.Screen
          name="map"
          options={{
            title: 'Map',
            tabBarIcon: ({ size, color }) => <MapPin size={size} color={color} />,
          }}
        />
      )}
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Saved',
          tabBarIcon: ({ size, color }) => <Heart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />
      
      {/* Hidden screens */}
      <Tabs.Screen name="categories" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="restaurant-details" options={{ href: null }} />
    </Tabs>
  );
}
