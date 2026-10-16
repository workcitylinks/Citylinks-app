import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * ==============================================================================
 * CITYLINKS API URL CONFIGURATION
 * ==============================================================================
 * To switch between Production Domain and Localhost, you can:
 * 1. Toggle in `citylinks-app/.env` (recommended), OR
 * 2. Comment / uncomment the URLs below:
 */

// [OPTION 1] Production Server (Cloudflare + Hostinger VPS)
const PROD_URL = 'https://api.citylinks.in/api';

// [OPTION 2] Local Development (Local Machine / Wi-Fi IP)
const LOCAL_URL = 'http://192.168.0.108:5001/api';
// const LOCAL_URL = 'http://localhost:5001/api';

// Active Base URL:
// Reads from .env (EXPO_PUBLIC_API_URL) if defined, otherwise falls back to PROD_URL:
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || PROD_URL;
// To force local without .env, simply uncomment the line below:
// const BASE_URL = LOCAL_URL;

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

