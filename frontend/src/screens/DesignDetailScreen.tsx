import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, FlatList } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { HomeStackParamList } from '../types';
import { useDesignStore } from '../store/designStore';
import { DesignImage, Design } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthenticatedImage } from '../components/AuthenticatedImage';

export default function DesignDetailScreen() {
  const route = useRoute<RouteProp<HomeStackParamList, 'DesignDetail'>>();
  const { designId } = route.params;
  const { currentDesign, isLoading, fetchDesign } = useDesignStore();
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDesign(designId).catch(() => setError('Failed to load design.'));
  }, [designId]);

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#6750A4" />;
  }
  if (error) {
    return <Text style={{ color: 'red', textAlign: 'center', marginTop: 32 }}>{error}</Text>;
  }
  if (!currentDesign) {
    return <Text style={{ textAlign: 'center', marginTop: 32 }}>Design not found.</Text>;
  }

  // Use images array from design response, fallback to single image_url
  let allImages: DesignImage[] = [];
  if (currentDesign.images && currentDesign.images.length > 0) {
    allImages = currentDesign.images;
  } else {
    // Fallback to single image if no images array
    allImages = [{ 
      id: 0, 
      design_id: currentDesign.id,
      image_url: currentDesign.image_url,
      r2_object_key: currentDesign.r2_object_key,
      image_order: 0,
      is_primary: true,
      created_at: currentDesign.created_at,
      updated_at: currentDesign.updated_at
    } as DesignImage];
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 8 }}>{currentDesign.title}</Text>
        <Text style={{ marginVertical: 8, color: '#666', lineHeight: 20 }}>
          {currentDesign.long_description || currentDesign.description}
        </Text>
        
        {/* Design Details */}
        <View style={{ marginVertical: 16, padding: 16, backgroundColor: '#f8f8f8', borderRadius: 8 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Design Details</Text>
          <Text>Category: {currentDesign.category}</Text>
          <Text>Style: {currentDesign.style}</Text>
          <Text>Color: {currentDesign.colour}</Text>
          <Text>Fabric: {currentDesign.fabric}</Text>
          <Text>Occasion: {currentDesign.occasion}</Text>
          <Text>Price Range: {currentDesign.price_range}</Text>
        </View>

        {/* Images */}
        <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Images</Text>
        <FlatList
          data={allImages}
          keyExtractor={item => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginVertical: 8 }}
          renderItem={({ item }) => (
            <AuthenticatedImage
              imageUrl={item.image_url}
              style={{ width: 200, height: 200, marginRight: 12, borderRadius: 8, backgroundColor: '#eee' }}
              resizeMode="cover"
              onError={(error) => console.log('Image load error:', error)}
            />
          )}
          ListEmptyComponent={<Text>No images found.</Text>}
        />
      </ScrollView>
    </SafeAreaView>
  );
} 