import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==============================================================================
// CITYLINKS API URL CONFIGURATION
// To switch environments, comment (//) one option and uncomment the other:
// ==============================================================================

// Option 1: Live Production (Cloudflare + VPS)
const BASE_URL = 'https://api.citylinks.in/api';

// Option 2: Local Development (Uncomment below to run locally)
// const BASE_URL = 'http://192.168.0.108:5001/api';
// const BASE_URL = 'http://localhost:5001/api';

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

