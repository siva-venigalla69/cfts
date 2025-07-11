# Comprehensive Guide to Testing the Frontend

This guide provides a comprehensive overview of how to test your React Native application. We will cover setting up the testing environment, writing component tests, and testing state management and API calls.

## 1. The Existing Test Setup

Your project is already configured with [Jest](https://jestjs.io/), a popular JavaScript testing framework.

- **Configuration**: The configuration is in `jest.config.js` and uses the `react-native` preset.
- **Test Script**: You can run tests using the `test` script in your `package.json`.

### How to Run Existing Tests

To run all tests, navigate to the frontend directory and run the following command:

```bash
cd frontend/DesignGalleryApp
npm test
```

Jest will run in "watch mode" by default, which means it will automatically re-run tests when you save a file.

## 2. Enhancing the Test Setup: React Native Testing Library

The default setup uses `react-test-renderer`, which is good for snapshot testing. However, to test user interactions and component behavior, we recommend using [React Native Testing Library](https://callstack.github.io/react-native-testing-library/). It provides utilities that encourage better testing practices.

### Installation

First, install the library and its peer dependencies:

```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native
```

### Setup

To make the matchers from `@testing-library/jest-native` (like `toBeVisible()`, `toHaveTextContent()`) available in all your test files, you need to create a setup file.

1.  **Create a setup file**: Create a file named `jest.setup.js` in the root of your `frontend/DesignGalleryApp` directory:

    ```javascript
    // jest.setup.js
    import '@testing-library/jest-native/extend-expect';
    ```

2.  **Update your Jest configuration**: Modify your `jest.config.js` to include this setup file.

    ```javascript
    // jest.config.js
    module.exports = {
      preset: 'react-native',
      setupFilesAfterEnv: ['./jest.setup.js'],
    };
    ```

Now you are ready to write more powerful tests.

## 3. Writing Component Tests

Let's write a test for the `LoginScreen`. We'll create a new test file `frontend/DesignGalleryApp/src/screens/Auth/LoginScreen.test.tsx`.

This test will:
1.  Render the component.
2.  Check for the presence of input fields and the login button.
3.  Simulate user input.
4.  Check that the login button is pressed.

```typescript
// frontend/DesignGalleryApp/src/screens/Auth/LoginScreen.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LoginScreen from './LoginScreen';

// Mocking navigation
const mockNavigation = {
  navigate: jest.fn(),
};

describe('LoginScreen', () => {
  it('renders correctly and allows user to log in', () => {
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    const usernameInput = getByPlaceholderText('Username');
    const passwordInput = getByPlaceholderText('Password');
    const loginButton = getByText('Login');

    expect(usernameInput).toBeVisible();
    expect(passwordInput).toBeVisible();
    expect(loginButton).toBeVisible();

    // Simulate typing text into the input fields
    fireEvent.changeText(usernameInput, 'testuser');
    fireEvent.changeText(passwordInput, 'password123');

    // Simulate pressing the login button
    fireEvent.press(loginButton);

    // Here you would typically also test if a login function was called,
    // which we will cover in the API testing section.
  });
});
```
*Note: We are mocking the `navigation` prop that is passed to screen components by React Navigation.*

## 4. Testing State Management (Zustand)

You can test your Zustand stores in isolation from your components. Here's how you can test `authStore`.

```typescript
// frontend/DesignGalleryApp/src/store/authStore.test.ts
import useAuthStore from './authStore';
import { act, renderHook } from '@testing-library/react-native';

describe('useAuthStore', () => {
  it('should set the token', () => {
    const { result } = renderHook(() => useAuthStore());
    
    act(() => {
      result.current.actions.setToken('my-secret-token');
    });

    expect(result.current.token).toBe('my-secret-token');
  });

  it('should set the user', () => {
    const { result } = renderHook(() => useAuthStore());
    const user = { id: 1, username: 'test', is_admin: false, is_approved: true };

    act(() => {
      result.current.actions.setUser(user);
    });

    expect(result.current.user).toEqual(user);
  });

  it('should clear user and token on logout', () => {
    const { result } = renderHook(() => useAuthStore());

    // First, set a user and token
    act(() => {
      result.current.actions.setUser({ id: 1, username: 'test', is_admin: false, is_approved: true });
      result.current.actions.setToken('some-token');
    });

    // Then, logout
    act(() => {
      result.current.actions.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });
});
```

## 5. Testing API Calls (Axios)

When testing API calls, you should mock the API client (`apiClient` in this case) to avoid making real network requests. This makes your tests faster and more reliable.

Here's an example of how to test the `login` function in `src/api/auth.ts`.

```typescript
// frontend/DesignGalleryApp/src/api/auth.test.ts
import { login } from './auth';
import apiClient from './apiClient';

// Mock the apiClient
jest.mock('./apiClient');

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('Auth API', () => {
  it('calls the login endpoint with correct credentials', async () => {
    const username = 'testuser';
    const password = 'password123';
    const responseData = { token: 'fake-token' };

    // Configure the mock to return a successful response
    mockedApiClient.post.mockResolvedValue({ data: responseData });

    const result = await login(username, password);

    // Check if apiClient.post was called correctly
    expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/login', {
      username,
      password,
    });

    // Check if the function returns the correct data
    expect(result.data).toEqual(responseData);
  });
});
```

## Conclusion

By combining Jest with React Native Testing Library, you can create a robust testing suite for your application that covers components, state, and API logic. We recommend you create test files for every new feature you add to the codebase. Happy testing! 