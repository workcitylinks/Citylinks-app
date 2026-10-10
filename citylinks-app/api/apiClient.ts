import axios from 'axios';
import { Platform } from 'react-native';

// Update this to your computer's local IP address so physical phones can connect over Wi-Fi
const BASE_URL = 'http://192.168.0.108:5001/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
