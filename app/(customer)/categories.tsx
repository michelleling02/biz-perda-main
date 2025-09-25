import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Grid3x3, Utensils, Coffee, Cake } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';

type Category = {
  category_id: number;
  name: string;
};

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      Alert.alert('Error', 'Could not load categories');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchCategories();
  }, [fetchCategories]));

  const getIconForCategory = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('coffee') || n.includes('kafe')) return Coffee;
    if (n.includes('bakery') || n.includes('cake')) return Cake;
    if (n.includes('restaurant') || n.includes('restoran')) return Utensils;
    return Grid3x3;
  };

  const CategoryCard = ({ category }: { category: Category }) => {
    const IconComponent = getIconForCategory(category.name);
    
    return (
      <TouchableOpacity 
        style={styles.categoryCard}
        onPress={() => router.push({ pathname: '/(customer)', params: { categoryId: category.category_id } })}
      >
        <View style={styles.categoryIconContainer}>
          <IconComponent size={32} color="#E53E3E" />
        </View>
        <Text style={styles.categoryName}>{category.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#E53E3E', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categories</Text>
        <Text style={styles.headerSubtitle}>Browse restaurants by category</Text>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.categoriesGrid}>
            {categories.map(category => (
              <CategoryCard key={category.category_id} category={category} />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 24, paddingVertical: 28 },
  backButton: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 12, alignSelf: 'flex-start', marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  categoriesGrid: { padding: 24, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCard: { width: '47%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, marginBottom: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6, borderWidth: 1, borderColor: '#F3F4F6' },
  categoryIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  categoryName: { fontSize: 16, fontWeight: '600', color: '#1F2937', textAlign: 'center' },
});