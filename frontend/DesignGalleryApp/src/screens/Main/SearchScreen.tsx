import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { ActivityIndicator, Card, Title, Paragraph, Searchbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getDesigns } from '../../api/designs';
import { Design } from '../../store/designStore';
import { HomeStackParamList } from '../../navigation/types';
import { TouchableOpacity } from 'react-native-gesture-handler';

const DesignCard = ({ item }: { item: Design }) => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  return (
    <TouchableOpacity onPress={() => navigation.navigate('DesignDetail', { designId: item.id })}>
      <Card style={styles.card}>
        <Card.Cover source={{ uri: item.image_url || 'https://picsum.photos/700' }} />
        <Card.Content>
          <Title>{item.title}</Title>
          <Paragraph>{item.designer_name}</Paragraph>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(false);

  const performSearch = useCallback(async (query: string) => {
    if (!query) {
      setDesigns([]);
      return;
    }
    setLoading(true);
    try {
      const response = await getDesigns(1, 20, query);
      setDesigns(response.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search for designs..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        onIconPress={() => performSearch(searchQuery)}
        onSubmitEditing={() => performSearch(searchQuery)}
        style={styles.searchbar}
      />
      {loading ? (
        <ActivityIndicator animating={true} size="large" style={styles.centered} />
      ) : (
        <FlatList
          data={designs}
          renderItem={({ item }) => <DesignCard item={item} />}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchbar: {
    margin: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    margin: 8,
  },
  list: {
    padding: 8,
  }
});

export default SearchScreen; 