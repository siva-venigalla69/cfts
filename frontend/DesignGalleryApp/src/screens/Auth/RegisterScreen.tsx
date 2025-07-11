import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, TextInput, Snackbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { register } from '../../api/auth';
import { theme } from '../../theme/theme';

const RegisterScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const handleRegister = async () => {
    if (!username || !password) {
      setError('Username and password are required.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await register(username, password);
      setSuccess('Registration successful! An admin will approve your account soon.');
      setTimeout(() => navigation.navigate('Login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineLarge" style={styles.title}>
        Create an Account
      </Text>
      <TextInput
        label="Username"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
        autoCapitalize="none"
        disabled={loading}
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        disabled={loading}
      />
      <Button
        mode="contained"
        onPress={handleRegister}
        style={styles.button}
        disabled={loading}
        loading={loading}
      >
        {loading ? 'Creating Account...' : 'Register'}
      </Button>
      <Button
        mode="text"
        onPress={() => navigation.goBack()}
        style={styles.button}
        disabled={loading}
      >
        Already have an account? Login
      </Button>
      <Snackbar
        visible={!!error || !!success}
        onDismiss={() => {
          setError(null);
          setSuccess(null);
        }}
        duration={3000}
      >
        {error || success || ''}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
});

export default RegisterScreen; 