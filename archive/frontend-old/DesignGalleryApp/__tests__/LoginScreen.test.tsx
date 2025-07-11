import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../src/screens/Auth/LoginScreen';
import { useAuthActions } from '../src/store/authStore';
import { login } from '../src/api/auth';

// Mock the dependencies
const mockSetToken = jest.fn();
const mockSetUser = jest.fn();

jest.mock('../src/store/authStore', () => ({
  useAuthActions: () => ({
    setToken: mockSetToken,
    setUser: mockSetUser,
  }),
}));

jest.mock('../src/api/auth', () => ({
  login: jest.fn(),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => {
    const actualNav = jest.requireActual('@react-navigation/native');
    return {
      ...actualNav,
      useNavigation: () => ({
        navigate: jest.fn(),
      }),
    };
  });

describe('LoginScreen', () => {
  const mockLogin = login as jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText, getByTestId } = render(<LoginScreen />);
    expect(getByText('Welcome Back')).toBeVisible();
    expect(getByTestId('username-input')).toBeVisible();
    expect(getByTestId('password-input')).toBeVisible();
    expect(getByText('Login')).toBeVisible();
  });

  it('allows a user to log in successfully', async () => {
    const { getByTestId, getByText } = render(<LoginScreen />);
    
    const fakeUserData = { id: 1, username: 'testuser', is_admin: false, is_approved: true };
    const fakeToken = 'fake-jwt-token';
    mockLogin.mockResolvedValue({ data: { data: { user: fakeUserData, token: fakeToken } } });

    // Find and interact with elements
    fireEvent.changeText(getByTestId('username-input'), 'testuser');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.press(getByText('Login'));

    // Assertions
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
      expect(mockSetToken).toHaveBeenCalledWith(fakeToken);
      expect(mockSetUser).toHaveBeenCalledWith(fakeUserData);
    });
  });

  it('shows an error message on login failure', async () => {
    const { getByTestId, getByText, findByText } = render(<LoginScreen />);
    
    const errorMessage = 'Invalid credentials';
    mockLogin.mockRejectedValue({ response: { data: { message: errorMessage } } });

    // Interact with elements
    fireEvent.changeText(getByTestId('username-input'), 'wrong');
    fireEvent.changeText(getByTestId('password-input'), 'user');
    fireEvent.press(getByText('Login'));

    // Assert that the error message is displayed
    const errorSnackbar = await findByText(errorMessage);
    expect(errorSnackbar).toBeOnTheScreen();
  });
}); 