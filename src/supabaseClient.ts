import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe resolution across Vite browser context and Node.js test runners
function getEnvVar(key: string): string | undefined {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return undefined;
}

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY');

if (typeof window !== 'undefined' && supabaseAnonKey?.startsWith('sb_publishable_')) {
  console.warn(
    '[SupabaseClient] Warning: Detected "sb_publishable_..." key. Standard Supabase PostgREST endpoints require the JWT anon key (starts with "eyJ..."). If requests fail with 401/Invalid API Key, update VITE_SUPABASE_ANON_KEY in .env with the anon public key from Supabase Dashboard -> Project Settings -> API.'
  );
}

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    supabaseUrl !== 'https://your-project-id.supabase.co' &&
    !supabaseUrl.includes('placeholder')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

/**
 * Returns the public image URL for a given storage path in Supabase Storage.
 * If Supabase is not configured or an external source_url exists, falls back gracefully.
 */
export function getStorageImageUrl(
  bucketName: string,
  storagePath: string,
  fallbackSourceUrl?: string
): string {
  if (supabase) {
    const { data } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
    if (data?.publicUrl) return data.publicUrl;
  }
  return fallbackSourceUrl || '';
}
