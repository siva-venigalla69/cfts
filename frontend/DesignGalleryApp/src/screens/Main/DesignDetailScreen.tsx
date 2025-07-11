import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ActivityIndicator, Text, Card, Title, Paragraph, Chip, Divider, IconButton } from 'react-native-paper';
import { useRoute, RouteProp } from '@react-navigation/native';
import { getDesignById } from '../../api/designs';
import { Design } from '../../store/designStore';
import { useFavoriteIds, useFavoriteActions } from '../../store/favoriteStore';
import { theme } from '../../theme/theme';

// We need to define the param list for the home stack to get type safety for the route
type HomeStackParamList = {
  DesignDetail: { designId: number };
};

const DesignDetailScreen = () => {
  const route = useRoute<RouteProp<HomeStackParamList, 'DesignDetail'>>();
  const { designId } = route.params;

  const [design, setDesign] = useState<Design | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const favoriteIds = useFavoriteIds();
  const { toggleFavorite } = useFavoriteActions();

  useEffect(() => {
    const fetchDesign = async () => {
      try {
        setLoading(true);
        const response = await getDesignById(designId);
        setDesign(response.data.data);
      } catch (e) {
        setError('Failed to load design details.');
      } finally {
        setLoading(false);
      }
    };
    fetchDesign();
  }, [designId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating={true} size="large" />
      </View>
    );
  }

  if (error || !design) {
    return (
      <View style={styles.centered}>
        <Text>{error || 'Design not found.'}</Text>
      </View>
    );
  }

  const isFavorited = favoriteIds.has(design.id);

  return (
    <ScrollView style={styles.container}>
      <Card>
        <Card.Cover source={{ uri: design.image_url || 'https://picsum.photos/700' }} />
        <Card.Content>
            <View style={styles.titleContainer}>
                <Title style={styles.title}>{design.title}</Title>
                <IconButton
                    icon={isFavorited ? "heart" : "heart-outline"}
                    iconColor={isFavorited ? theme.colors.primary : theme.colors.placeholder}
                    size={30}
                    onPress={() => toggleFavorite(design)}
                />
            </View>
          <Paragraph style={styles.designer}>{design.designer_name}</Paragraph>
          <Divider style={styles.divider} />
          <Paragraph>{design.long_description || design.description}</Paragraph>
          <Divider style={styles.divider} />
          <View style={styles.chipContainer}>
            {design.tags?.split(',').map(tag => (
              <Chip key={tag} style={styles.chip}>{tag}</Chip>
            ))}
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1, // Allow title to take up available space
  },
  designer: {
    fontSize: 16,
    color: theme.colors.placeholder,
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    margin: 4,
  }
});

export default DesignDetailScreen; 