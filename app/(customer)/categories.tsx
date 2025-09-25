import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Grid3x3 as Grid3X3, Utensils, ShoppingBag, Monitor, Plus, ShoppingCart, Coffee, Cake, Cross, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

const CATEGORIES = [
  { id: 'all', name: 'All', icon: Grid3X3, color: '#4F46E5', count: 156 },
  { id: 'food', name: 'Food', icon: Utensils, color: '#4F46E5', count: 89 },
  { id: 'cafe', name: 'Cafe', icon: Coffee, color: '#4F46E5', count: 28 },
  { id: 'bakery', name: 'Bakery', icon: Cake, color: '#EC4899', count: 12 },
  { id: 'desserts', name: 'Desserts', icon: Cake, color: '#4F46E5', count: 25 },
  { id: 'street-food', name: 'Street Food', icon: Utensils, color: '#EC4899', count: 45 },
  { id: 'local-cuisine', name: 'Local Cuisine', icon: Utensils, color: '#4F46E5', count: 38 },
];

export default function CategoriesScreen() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const CategoryCard = ({ category }: { category: any }) => {
    const IconComponent = category.icon;
    const isSelected = selectedCategory === category.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryCard,
          isSelected && styles.categoryCardSelected
        ]}
        onPress={() => setSelectedCategory(category.id)}
      >
        <View style={[
          styles.categoryIconContainer,
          isSelected && { backgroundColor: '#4F46E5' }
        ]}>
          <IconComponent 
            size={28} 
            color={isSelected ? '#FFFFFF' : category.color} 
          />
        </View>
        <Text style={[
          styles.categoryName,
          isSelected && { color: '#4F46E5', fontWeight: '700' }
        ]}>
          {category.name}
        </Text>
        <Text style={styles.categoryCount}>{category.count} shops</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Categories</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.categoriesGrid}>
          {CATEGORIES.map(category => (
            <View key={category.id} style={styles.categoryWrapper}>
              <CategoryCard category={category} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    paddingBottom: 32,
  },
  categoryWrapper: {
    width: '46%',
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardSelected: {
    borderColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.2,
  },
  categoryIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  categoryName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
    textAlign: 'center',
  },
  categoryCount: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});