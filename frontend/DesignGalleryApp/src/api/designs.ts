import apiClient from './apiClient';

export const getDesigns = (page = 1, limit = 10, query = '') => {
  return apiClient.get('/designs', {
    params: {
      page,
      per_page: limit,
      search: query,
    },
  });
};

export const getDesignById = (id: number) => {
  return apiClient.get(`/designs/${id}`);
}; 