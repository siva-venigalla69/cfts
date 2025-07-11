import React from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { useUser, useAuthStore } from '../store/authStore';

export default function ProfileScreen() {
  const user = useUser();
  const logout = useAuthStore(state => state.logout);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  if (!user) {
    return <Text style={{ textAlign: 'center', marginTop: 32 }}>Not logged in.</Text>;
  }

  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 8 }}>{user.username}</Text>
      <Text style={{ marginBottom: 8 }}>User ID: {user.id}</Text>
      <Text style={{ marginBottom: 8 }}>Admin: {user.is_admin ? 'Yes' : 'No'}</Text>
      <Text style={{ marginBottom: 8 }}>Approved: {user.is_approved ? 'Yes' : 'No'}</Text>
      <Button title="Logout" color="#BA1A1A" onPress={handleLogout} />
    </View>
  );
} 