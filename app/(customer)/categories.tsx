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
  { id: 'all', name: 'All', icon: Grid3X3, color: '#58508D', count: 156 },
  { id: 'food', name: 'Food', icon: Utensils, color: '#58508D', count: 89 },
  { id: 'cafe', name: 'Cafe', icon: Coffee, color: '#58508D', count: 28 },
  { id: 'bakery', name: 'Bakery', icon: Cake, color: '#FF6361', count: 12 },
  { id: 'desserts', name: 'Desserts', icon: Cake, color: '#58508D', count: 25 },
  { id: 'street-food', name: 'Street Food', icon: Utensils, color: '#FF6361', count: 45 },
  { id: 'local-cuisine', name: 'Local Cuisine', icon: Utensils, color: '#58508D', count: 38 },
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
          isSelected && { backgroundColor: '#FF6361' }
        ]}>
          <IconComponent 
            size={32} 
            color={isSelected ? '#FFFFFF' : category.color} 
          />
        </View>
        <Text style={[
          styles.categoryName,
          isSelected && { color: '#DC2626', fontWeight: '600' }
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
        colors={['#4ECDC4', '#44A08D', '#F7931E', '#FF6B35']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#2F4858" />
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
    backgroundColor: '#F7F7F7',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2F4858',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingBottom: 20,
  },
  categoryWrapper: {
    width: '47%',
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardSelected: {
    borderColor: '#FF6361',
    shadowColor: '#FF6361',
    shadowOpacity: 0.3,
  },
  categoryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2F4858',
    marginBottom: 8,
    textAlign: 'center',
  },
  categoryCount: {
    fontSize: 14,
    color: '#9B9B9B',
    textAlign: 'center',
  },
});