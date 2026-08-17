import axios from 'axios';
import { getSupabase } from '@finwerse/shared';

const isProd = process.env.APP_ENV === 'production';
const API_BASE_URL = isProd
  ? 'https://finwerse-api.onrender.com'
  : 'https://finwerse-api-staging.onrender.com';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
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

