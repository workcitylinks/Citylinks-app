import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==============================================================================
// CITYLINKS API URL CONFIGURATION
// Controlled by your .env file:
// - When EXPO_PUBLIC_API_URL is active in .env -> Uses Live Production (https://api.citylinks.in/api)
// - When EXPO_PUBLIC_API_URL is commented (#) in .env -> Automatically runs on Localhost
// ==============================================================================
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Dynamically detect the local machine's IP address from Expo/Metro:
const getLocalApiUrl = () => {
  if (Platform.OS === 'web') return 'http://localhost:5001/api';
  const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (metroHost) return `http://${metroHost}:5001/api`;
  if (Platform.OS === 'android') return 'http://10.0.2.2:5001/api';
  return 'http://192.168.31.20:5001/api';
};

const LOCAL_FALLBACK_URL = getLocalApiUrl();

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || LOCAL_FALLBACK_URL;
console.log('[CityLinks API] Connected to:', BASE_URL);

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach stored JWT token to all requests if present
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('user_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Failed to get token from storage:', error);
  }
  return config;
});

