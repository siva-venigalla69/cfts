import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useCartStore } from '../store/cartStore';

export default function CartScreen() {
  const { cart, isLoading, fetchCart, removeFromCart } = useCartStore();
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    fetchCart().catch(() => setError('Failed to load cart.'));
  }, []);

  const handleRemove = async (itemId: number) => {
    try {
      await removeFromCart(itemId);
    } catch {
      Alert.alert('Error', 'Failed to remove item.');
    }
  };

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#6750A4" />;
  }

  if (error) {
    return <Text style={{ color: 'red', textAlign: 'center', marginTop: 32 }}>{error}</Text>;
  }

  if (!cart || cart.items.length === 0) {
    return <Text style={{ textAlign: 'center', marginTop: 32 }}>Your cart is empty.</Text>;
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={cart.items}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold' }}>{item.design.title}</Text>
              <Text>Qty: {item.quantity}</Text>
            </View>
            <TouchableOpacity onPress={() => handleRemove(item.id)} style={{ backgroundColor: '#BA1A1A', padding: 8, borderRadius: 8 }}>
              <Text style={{ color: '#fff' }}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <Text style={{ fontWeight: 'bold', fontSize: 16, marginTop: 16 }}>Total Items: {cart.total_items}</Text>
    </View>
  );
} 