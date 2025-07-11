import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../types';
import { useDesignStore } from '../store/designStore';

export default function FavoritesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList, 'DesignList'>>();
  const { favorites, isLoading, fetchFavorites } = useDesignStore();
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    fetchFavorites().catch(() => setError('Failed to load favorites.'));
  }, []);

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#6750A4" />;
  }

  return (
    <FlatList
      data={favorites}
      keyExtractor={item => item.id.toString()}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={{ padding: 16, borderBottomWidth: 1, borderColor: '#eee' }}
          onPress={() => navigation.navigate('DesignDetail', { designId: item.id })}
        >
          <Text style={{ fontWeight: 'bold' }}>{item.title}</Text>
          <Text numberOfLines={2}>{item.short_description || item.description}</Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 32 }}>No favorites found.</Text>}
    />
  );
} 