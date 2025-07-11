import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator'; // We will create this next
import useAuthStore, { useAuthToken, useIsAuthLoading } from '../store/authStore';

const RootNavigator = () => {
  const token = useAuthToken();
  const isLoading = useIsAuthLoading();
  const { setLoading } = useAuthStore.getState().actions;

  useEffect(() => {
    // This effect handles the initial loading state from persisted storage
    setLoading(false);
  }, [setLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {token ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default RootNavigator; 