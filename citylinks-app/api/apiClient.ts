import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Update this to your computer's local IP address so physical phones can connect over Wi-Fi
const BASE_URL = 'http://192.168.0.108:5001/api';

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

