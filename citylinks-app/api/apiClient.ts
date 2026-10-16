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
import { queryCache } from '../utils/queryCache';

export type ApiEnvironment = 'production' | 'local';

export const PROD_API_URL = 'https://api.citylinks.in/api';

// Dynamically detect the local machine's IP address from Expo/Metro:
export const getLocalApiUrl = () => {
  if (Platform.OS === 'web') return 'http://localhost:5001/api';
  const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (metroHost) return `http://${metroHost}:5001/api`;
  if (Platform.OS === 'android') return 'http://10.0.2.2:5001/api';
  return 'http://192.168.31.20:5001/api';
};

export const LOCAL_FALLBACK_URL = getLocalApiUrl();

// Default initial Base URL based on .env
const INITIAL_BASE_URL = process.env.EXPO_PUBLIC_API_URL || LOCAL_FALLBACK_URL;

export const apiClient = axios.create({
  baseURL: INITIAL_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

type EnvListener = (env: ApiEnvironment, url: string) => void;
const envListeners = new Set<EnvListener>();

export const onApiEnvironmentChange = (cb: EnvListener) => {
  envListeners.add(cb);
  return () => envListeners.delete(cb);
};

export const getActiveApiEnvironment = (): ApiEnvironment => {
  const current = apiClient.defaults.baseURL || INITIAL_BASE_URL;
  return current.includes('api.citylinks.in') ? 'production' : 'local';
};

export const switchApiEnvironment = async (env: ApiEnvironment): Promise<string> => {
  const newUrl = env === 'production' ? PROD_API_URL : getLocalApiUrl();
  apiClient.defaults.baseURL = newUrl;
  await AsyncStorage.setItem('@citylinks_api_env_override', env).catch(() => {});
  await queryCache.clear();
  console.log(`[CityLinks API] ⚡ Switched instantly to ${env.toUpperCase()} (${newUrl})`);
  envListeners.forEach((listener) => {
    try {
      listener(env, newUrl);
    } catch (e) {}
  });
  return newUrl;
};

// Warm up from storage override on startup
AsyncStorage.getItem('@citylinks_api_env_override').then((saved) => {
  if (saved === 'production') {
    apiClient.defaults.baseURL = PROD_API_URL;
    console.log('[CityLinks API] Restored active environment: PRODUCTION (https://api.citylinks.in/api)');
  } else if (saved === 'local') {
    apiClient.defaults.baseURL = getLocalApiUrl();
    console.log('[CityLinks API] Restored active environment: LOCAL (', apiClient.defaults.baseURL, ')');
  } else {
    console.log('[CityLinks API] Default connected to:', apiClient.defaults.baseURL);
  }
}).catch(() => {});

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



