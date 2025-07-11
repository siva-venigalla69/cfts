import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../types';
import { useDesignStore } from '../store/designStore';

export default function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList, 'DesignList'>>();
  const { searchResults, isLoading, searchDesigns } = useDesignStore();
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const handleSearch = async () => {
    setError('');
    try {
      await searchDesigns(query);
    } catch {
      setError('Search failed.');
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TextInput
        placeholder="Search designs..."
        value={query}
        onChangeText={setQuery}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 12 }}
        onSubmitEditing={handleSearch}
        returnKeyType="search"
      />
      <TouchableOpacity onPress={handleSearch} style={{ backgroundColor: '#6750A4', padding: 10, borderRadius: 8, marginBottom: 12 }}>
        <Text style={{ color: '#fff', textAlign: 'center' }}>Search</Text>
      </TouchableOpacity>
      {isLoading && <ActivityIndicator size="small" color="#6750A4" />}
      {error ? <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text> : null}
      <FlatList
        data={searchResults}
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
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 32 }}>No results found.</Text>}
      />
    </View>
  );
} 