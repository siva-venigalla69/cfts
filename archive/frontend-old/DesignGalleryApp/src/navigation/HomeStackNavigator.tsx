import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/Main/HomeScreen';
import DesignDetailScreen from '../screens/Main/DesignDetailScreen';
import { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

const HomeStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeGallery" component={HomeScreen} options={{ title: 'Design Gallery' }} />
      <Stack.Screen name="DesignDetail" component={DesignDetailScreen} options={{ title: 'Design Details' }} />
    </Stack.Navigator>
  );
};

export default HomeStackNavigator; 