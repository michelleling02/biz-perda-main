import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CreditCard as Edit } from 'lucide-react-native';

export default function EditShopScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient 
        colors={['#E53E3E', '#3B82F6']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Edit size={32} color="#ffffff" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Edit Restaurant</Text>
            <Text style={styles.headerSubtitle}>Update your restaurant details</Text>
          </View>
        </View>
      </LinearGradient>
      
      <View style={styles.content}>
        <View style={styles.comingSoon}>
          <Edit size={80} color="#E2E8F0" />
          <Text style={styles.comingSoonTitle}>Edit Restaurant Coming Soon</Text>
          <Text style={styles.comingSoonText}>
            We're working on bringing you comprehensive restaurant editing capabilities.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 32, paddingVertical: 36 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#ffffff' },
  headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  comingSoon: { alignItems: 'center', paddingHorizontal: 40 },
  comingSoonTitle: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#1F2937', 
    marginTop: 24, 
    marginBottom: 16 
  },
  comingSoonText: { 
    fontSize: 16, 
    color: '#64748B', 
    textAlign: 'center', 
    lineHeight: 24 
  },
});