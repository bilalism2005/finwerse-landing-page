import axios from 'axios';
import { getSupabase } from '@finwerse/shared';

const isProd = process.env.APP_ENV === 'production';
const API_BASE_URL = isProd
  ? 'https://finwerse-api.onrender.com'
  : 'https://finwerse-api-staging.onrender.com';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for cold-start tolerance
});

// Attach the Supabase access token to every request so the backend can
// verify the authenticated user.
apiClient.interceptors.request.use(async (config) => {
  try {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {
    // Supabase not yet initialised — proceed without token
  }
  return config;
});

// Auto-retry once on 502/503/504 or network timeout during cold start
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config || config._retry) {
      return Promise.reject(error);
    }
    
    // If it's a timeout or server waking up (502/503/504)
    if (error.code === 'ECONNABORTED' || (error.response && [502, 503, 504].includes(error.response.status))) {
      config._retry = true;
      console.warn('API cold-start/timeout detected, retrying request once...');
      return apiClient(config);
    }
    return Promise.reject(error);
  }
);

// Non-blocking background health check to pre-warm the backend on app start
export function warmUpBackend() {
  apiClient.get('/').catch(() => {});
}

export default apiClient;

