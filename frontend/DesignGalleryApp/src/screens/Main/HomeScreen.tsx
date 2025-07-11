import React, { useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { ActivityIndicator, Card, Title, Paragraph } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDesigns, useDesignLoading, useDesignActions, useDesignPagination, Design } from '../../store/designStore';
import { HomeStackParamList } from '../../navigation/types';

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

const HomeScreen = () => {
  const designs = useDesigns();
  const loading = useDesignLoading();
  const pagination = useDesignPagination();
  const { fetchDesigns, fetchMoreDesigns } = useDesignActions();

  useEffect(() => {
    fetchDesigns();
  }, [fetchDesigns]);

  const onRefresh = useCallback(() => {
    fetchDesigns();
  }, [fetchDesigns]);

  const renderFooter = () => {
    if (!loading || pagination?.page === 1) return null;
    return <ActivityIndicator animating size="large" style={styles.footer} />;
  };

  if (loading && pagination?.page === 1) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating={true} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={designs}
      renderItem={({ item }) => <DesignCard item={item} />}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.container}
      onEndReached={fetchMoreDesigns}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} />
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    margin: 8,
  },
  footer: {
    marginVertical: 20,
  }
});

export default HomeScreen; 