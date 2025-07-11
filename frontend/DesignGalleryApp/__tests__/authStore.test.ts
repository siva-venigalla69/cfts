import useAuthStore from '../src/store/authStore';
import { act, renderHook } from '@testing-library/react-native';
import { useAuthActions } from '../src/store/authStore';

describe('useAuthStore', () => {
    beforeEach(() => {
        // Reset store before each test
        act(() => {
            useAuthStore.getState().actions.logout();
        });
    });

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