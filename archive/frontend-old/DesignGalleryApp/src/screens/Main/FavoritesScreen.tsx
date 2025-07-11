import React, { useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { ActivityIndicator, Text, Card, Title, Paragraph } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import useFavoriteStore, { useFavorites, useFavoriteActions } from '../../store/favoriteStore';
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

const FavoritesScreen = () => {
  const favorites = useFavorites();
  const { fetchFavorites } = useFavoriteActions();
  const loading = useFavoriteStore((state) => state.loading);

  useEffect(() => {
    fetchFavorites();
  }, []);

  if (loading) {
    return <ActivityIndicator animating={true} size="large" style={styles.centered} />;
  }

  if (favorites.length === 0) {
      return <View style={styles.centered}><Text>You have no favorite designs yet.</Text></View>
  }

  return (
    <FlatList
      data={favorites}
      renderItem={({ item }) => <DesignCard item={item} />}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.list}
    />
  );
};

const styles = StyleSheet.create({
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

export default FavoritesScreen; 