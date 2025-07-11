import apiClient from './apiClient';

export const getFavoriteDesigns = () => {
  return apiClient.get('/designs/user/favorites');
};

export const addFavorite = (designId: number) => {
  return apiClient.post(`/designs/${designId}/favorite`);
};

export const removeFavorite = (designId: number) => {
  return apiClient.delete(`/designs/${designId}/favorite`);
}; 