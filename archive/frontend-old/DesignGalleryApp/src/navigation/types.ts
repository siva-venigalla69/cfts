export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type HomeStackParamList = {
  HomeGallery: undefined;
  DesignDetail: { designId: number };
}

export type MainTabParamList = {
  Home: undefined; // This will be the home stack
  Search: undefined;
  Favorites: undefined;
  Profile: undefined;
}; 