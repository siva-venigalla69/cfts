import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, Image, FlatList } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { HomeStackParamList } from '../types';
import { useDesignStore } from '../store/designStore';
import { apiService } from '../services/api';
import { DesignImage, Design } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DesignDetailScreen() {
  const route = useRoute<RouteProp<HomeStackParamList, 'DesignDetail'>>();
  const { designId } = route.params;
  const { currentDesign, isLoading, fetchDesign } = useDesignStore();
  const [images, setImages] = useState<DesignImage[]>([]);
  const [imgLoading, setImgLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDesign(designId).catch(() => setError('Failed to load design.'));
    setImgLoading(true);
    apiService.get<{ data: { images: DesignImage[] } }>(`/designs/${designId}/images`)
      .then((res) => setImages(res.data.data.images))
      .catch(() => setError('Failed to load images.'))
      .finally(() => setImgLoading(false));
  }, [designId]);

  if (isLoading || imgLoading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#6750A4" />;
  }
  if (error) {
    return <Text style={{ color: 'red', textAlign: 'center', marginTop: 32 }}>{error}</Text>;
  }
  if (!currentDesign) {
    return <Text style={{ textAlign: 'center', marginTop: 32 }}>Design not found.</Text>;
  }

  // Use images array if present, else fallback to image_url
  let allImages: DesignImage[] = [];
  if (images.length > 0) {
    allImages = images;
  } else if ((currentDesign as any).images && Array.isArray((currentDesign as any).images)) {
    allImages = (currentDesign as any).images.map((img: any, idx: number) => ({
      ...img,
      id: img.id || idx,
      image_url: img.image_url || currentDesign.image_url,
    }));
  } else {
    allImages = [{ id: 0, image_url: currentDesign.image_url } as DesignImage];
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 20 }}>{currentDesign.title}</Text>
        <Text style={{ marginVertical: 8 }}>{currentDesign.long_description || currentDesign.description}</Text>
        <FlatList
          data={allImages}
          keyExtractor={item => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginVertical: 16 }}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item.image_url }}
              style={{ width: 200, height: 200, marginRight: 12, borderRadius: 8, backgroundColor: '#eee' }}
              resizeMode="cover"
            />
          )}
          ListEmptyComponent={<Text>No images found.</Text>}
        />
      </ScrollView>
    </SafeAreaView>
  );
} 