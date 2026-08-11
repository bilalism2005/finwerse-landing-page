import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

export function initSupabase(
  url: string,
  anonKey: string,
  options?: Parameters<typeof createClient>[2]
) {
  if (!supabase) {
    supabase = createClient(url, anonKey, options ?? {});
  }
  return supabase;
}

export function getSupabase() {
  if (!supabase) throw new Error('Call initSupabase() before using getSupabase()');
  return supabase;
}
