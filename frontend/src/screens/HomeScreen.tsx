import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../types';
import { useDesignStore } from '../store/designStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, useTheme, Chip, IconButton } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { AuthenticatedImage } from '../components/AuthenticatedImage';
import { apiService } from '../services/api';

const categories = [
  '', 'sarees', 'lehenga', 'kurta', 'gown', 'salwar', 'other'
];
const sortOptions = [
  { label: 'Newest', value: 'created_at_desc' },
  { label: 'Oldest', value: 'created_at_asc' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
];
const fallbackImage = 'https://via.placeholder.com/300x300/6750A4/FFFFFF?text=Design+Image';
const numColumns = 2;
const CARD_MARGIN = 8;
const CARD_WIDTH = (Dimensions.get('window').width - (numColumns + 1) * CARD_MARGIN) / numColumns;

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList, 'DesignList'>>();
  const { designs, isLoading, fetchDesigns } = useDesignStore();
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('created_at_desc');
  const [search, setSearch] = useState('');
  const [searchText, setSearchText] = useState('');
  const theme = useTheme();

  useEffect(() => {
    let sort_by = 'created_at';
    let sort_order: 'asc' | 'desc' = 'desc';
    if (sort === 'created_at_asc') sort_order = 'asc';
    if (sort === 'price_asc') { sort_by = 'price_range'; sort_order = 'asc'; }
    if (sort === 'price_desc') { sort_by = 'price_range'; sort_order = 'desc'; }
    fetchDesigns(1, {
      ...(category ? { category } : {}),
      ...(search ? { search } : {}),
      sort_by,
      sort_order,
    });
  }, [category, sort, search]);

  const onSearch = () => setSearch(searchText.trim());

  const renderCard = ({ item }: any) => (
    <TouchableOpacity
      style={{ flex: 1 / numColumns, margin: CARD_MARGIN }}
      onPress={() => navigation.navigate('DesignDetail', { designId: item.id })}
      activeOpacity={0.85}
    >
      <Card style={styles.card}>
        <View style={{ borderRadius: 16, overflow: 'hidden' }}>
          <AuthenticatedImage
            imageUrl={item.image_url || fallbackImage}
            style={styles.image}
            resizeMode="cover"
            onError={(error) => {
              console.log('Image load error for:', item.title, 'URL:', item.image_url, 'Error:', error);
            }}
            onLoad={() => {
              console.log('Image loaded successfully for:', item.title, 'URL:', item.image_url);
            }}
          />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.desc} numberOfLines={2}>{item.short_description || item.description}</Text>
          <Chip style={styles.chip} textStyle={{ color: theme.colors.primary }}>{item.category?.charAt(0).toUpperCase() + item.category?.slice(1) || 'Other'}</Chip>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.colors.primary} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search designs..."
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={onSearch}
          returnKeyType="search"
        />
        <IconButton icon="magnify" onPress={onSearch} size={24} />
      </View>
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map(cat => (
            <Chip
              key={cat}
              style={[styles.filterChip, category === cat && styles.filterChipActive]}
              textStyle={{ color: category === cat ? '#fff' : theme.colors.primary }}
              selected={category === cat}
              onPress={() => setCategory(cat)}
            >
              {cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'All'}
            </Chip>
          ))}
        </ScrollView>
        <View style={{ marginLeft: 8 }}>
          <Chip
            icon="sort"
            onPress={() => {}}
            style={styles.sortChip}
            textStyle={{ color: theme.colors.primary }}
          >
            <Picker
              selectedValue={sort}
              style={styles.picker}
              onValueChange={setSort}
              dropdownIconColor={theme.colors.primary}
            >
              {sortOptions.map(opt => (
                <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
              ))}
            </Picker>
          </Chip>
        </View>
      </View>
      <FlatList
        data={designs}
        keyExtractor={item => item.id.toString()}
        renderItem={renderCard}
        numColumns={numColumns}
        contentContainerStyle={{ padding: CARD_MARGIN, paddingBottom: 80 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 32 }}>No designs found.</Text>}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#fff',
    zIndex: 2,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 40,
    fontSize: 16,
    marginRight: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 4,
    backgroundColor: '#fff',
    zIndex: 1,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#f2f2f2',
    borderRadius: 16,
    height: 32,
  },
  filterChipActive: {
    backgroundColor: '#6750A4',
  },
  sortChip: {
    backgroundColor: '#f2f2f2',
    borderRadius: 16,
    height: 32,
    paddingHorizontal: 0,
  },
  picker: {
    width: 140,
    height: 32,
    color: '#6750A4',
    backgroundColor: 'transparent',
    marginTop: -8,
    marginLeft: -8,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: CARD_MARGIN,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  image: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    backgroundColor: '#eee',
  },
  cardContent: {
    padding: 8,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 2,
    color: '#222',
  },
  desc: {
    color: '#555',
    fontSize: 13,
    marginBottom: 4,
  },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: '#f2f2f2',
    marginTop: 2,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
  },
}); 