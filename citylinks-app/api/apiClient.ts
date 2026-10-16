import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==============================================================================
// CITYLINKS API URL CONFIGURATION
// Controlled by your .env file:
// - When EXPO_PUBLIC_API_URL is active in .env -> Uses Live Production (https://api.citylinks.in/api)
// - When EXPO_PUBLIC_API_URL is commented (#) in .env -> Automatically runs on Localhost
// ==============================================================================
const LOCAL_FALLBACK_URL = 'http://192.168.0.108:5001/api';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || LOCAL_FALLBACK_URL;

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

