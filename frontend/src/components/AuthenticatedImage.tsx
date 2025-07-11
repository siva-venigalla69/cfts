import React, { useState, useEffect } from 'react';
import { Image, ImageProps, ActivityIndicator, View, StyleSheet } from 'react-native';

interface AuthenticatedImageProps extends Omit<ImageProps, 'source'> {
  imageUrl: string;
  fallbackUrl?: string;
  style?: any;
  onError?: (error: any) => void;
  onLoad?: () => void;
}

export const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({
  imageUrl,
  fallbackUrl = 'https://via.placeholder.com/300x300/6750A4/FFFFFF?text=Design+Image',
  style,
  onError,
  onLoad,
  ...props
}) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        setImageUri(imageUrl);
      } catch (error) {
        console.error('Error setting up image:', error);
        setHasError(true);
        setImageUri(fallbackUrl);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [imageUrl, fallbackUrl]);

  const handleError = (error: any) => {
    console.log('Image load error:', error);
    setHasError(true);
    setImageUri(fallbackUrl);
    onError?.(error);
  };

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  if (isLoading && !imageUri) {
    return (
      <View style={[style, styles.loadingContainer]}>
        <ActivityIndicator size="small" color="#6750A4" />
      </View>
    );
  }

  return (
    <Image
      {...props}
      source={{ uri: imageUri || fallbackUrl }}
      style={style}
      onError={handleError}
      onLoad={handleLoad}
      defaultSource={{ uri: fallbackUrl }}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
}); 