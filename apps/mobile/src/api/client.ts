import axios from 'axios';

// Replace with your actual local IP address when running on physical device
const API_BASE_URL = 'https://finwerse-api.onrender.com'; 

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});
