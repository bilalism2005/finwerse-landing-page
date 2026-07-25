import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

export function initSupabase(url: string, anonKey: string) {
  if (!supabase) {
    supabase = createClient(url, anonKey);
  }
  return supabase;
}

export function getSupabase() {
  if (!supabase) throw new Error('Call initSupabase() before using getSupabase()');
  return supabase;
}
