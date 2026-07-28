import axios from 'axios';

// Replace with your actual local IP address when running on physical device
// For iOS simulator, localhost works. For Android emulator, use 10.0.2.2
const API_BASE_URL = 'http://localhost:8000'; 

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});
