import { login } from '../src/api/auth';
import apiClient from '../src/api/apiClient';

// Mock the apiClient
jest.mock('../src/api/apiClient');

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