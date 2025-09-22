// app/(owner)/edit-shop-tags.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Check } from 'lucide-react-native';

// --- TYPES ---
// Use a generic 'pk' for the primary key to handle both category_id and tag_id
type Item = { pk: number; name: string; };

type ShopLinks = {
  categories: string[] | null;
  tags: string[] | null;
};

export default function EditShopTagsScreen() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [allCategories, setAllCategories] = useState<Item[]>([]);
  const [allTags, setAllTags] = useState<Item[]>([]);

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set());
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    if (!shopId) return;
    try {
      setIsLoading(true);
      
      const [categoriesRes, tagsRes, shopLinksRes] = await Promise.all([
        supabase.from('categories').select('category_id, name'),
        supabase.from('tags').select('tag_id, tag_name'),
        supabase.rpc('get_shop_details_with_relations', { p_shop_id: Number(shopId) }).single(),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (tagsRes.error) throw tagsRes.error;
      if (shopLinksRes.error) throw shopLinksRes.error;

      // Map the database columns to our generic 'Item' type
      const allCategoriesData: Item[] = (categoriesRes.data || []).map(c => ({ pk: c.category_id, name: c.name }));
      const allTagsData: Item[] = (tagsRes.data || []).map(t => ({ pk: t.tag_id, name: t.tag_name })); // <-- CORRECTED

      setAllCategories(allCategoriesData);
      setAllTags(allTagsData);

      const shopLinksData = shopLinksRes.data as ShopLinks;
      const currentCategoryNames = shopLinksData?.categories || [];
      const currentTagNames = shopLinksData?.tags || [];

      // Use the correctly mapped data to find the initial IDs
      const initialCategoryIds = new Set(
        allCategoriesData
          .filter(cat => currentCategoryNames.includes(cat.name))
          .map(cat => cat.pk)
      );
      const initialTagIds = new Set(
        allTagsData
          .filter(tag => currentTagNames.includes(tag.name))
          .map(tag => tag.pk)
      );

      setSelectedCategoryIds(initialCategoryIds);
      setSelectedTagIds(initialTagIds);

    } catch (error: any) {
      Alert.alert('Error', 'Failed to load data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleCategory = (id: number) => {
    setSelectedCategoryIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleToggleTag = (id: number) => {
    setSelectedTagIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleSaveChanges = async () => {
    if (!shopId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.rpc('update_shop_links', {
        p_shop_id: Number(shopId),
        p_category_ids: Array.from(selectedCategoryIds),
        p_tag_ids: Array.from(selectedTagIds)
      });

      if (error) throw error;

      Alert.alert('Success', 'Categories and tags have been updated.');
      router.back();

    } catch (error: any) {
      Alert.alert('Error', 'Failed to save changes: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#4f46e5" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Categories & Tags</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.itemsContainer}>
            {allCategories.map(item => (
              <TouchableOpacity
                key={item.pk}
                style={[styles.item, selectedCategoryIds.has(item.pk) && styles.itemSelected]}
                onPress={() => handleToggleCategory(item.pk)}
              >
                <Text style={[styles.itemText, selectedCategoryIds.has(item.pk) && styles.itemTextSelected]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.itemsContainer}>
            {allTags.map(item => (
              <TouchableOpacity
                key={item.pk}
                style={[styles.item, selectedTagIds.has(item.pk) && styles.itemSelected]}
                onPress={() => handleToggleTag(item.pk)}
              >
                <Text style={[styles.itemText, selectedTagIds.has(item.pk) && styles.itemTextSelected]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Check size={20} color="#ffffff" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b', marginLeft: 16 },
  content: { padding: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  itemsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
  },
  itemSelected: {
    backgroundColor: '#eef2ff',
    borderColor: '#4f46e5',
  },
  itemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  itemTextSelected: {
    color: '#4f46e5',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
