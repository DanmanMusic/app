import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const SecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

let storageOptions: SupabaseClientOptions<'public'>['auth'] = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
};

if (Platform.OS !== 'web') {
  console.log(`[SupabaseClient] Using SecureStore adapter for native platform.`);
  storageOptions.storage = SecureStoreAdapter;
} else {
  console.log(`[SupabaseClient] Using default localStorage adapter for web.`);
}

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage =
    'Supabase URL or Anon Key is missing. Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in your .env file and restart the bundler.';
  console.error('*********************************************************************');
  console.error('SUPABASE CONFIG ERROR:', errorMessage);
  console.error('*********************************************************************');
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: storageOptions,
      })
    : null;

export const getSupabase = () => {
  if (!supabase) {
    const errorMsg =
      !supabaseUrl || !supabaseAnonKey
        ? 'Supabase URL or Anon Key missing in environment variables.'
        : 'Supabase client failed to initialize for an unknown reason.';
    throw new Error(
      `Supabase client not initialized. ${errorMsg} Check environment variables (EXPO_PUBLIC_...) and restart the bundler.`
    );
  }
  return supabase;
};

console.log(
  '[SupabaseClient] Initialized:',
  supabase
    ? `URL: ${supabaseUrl?.substring(0, 25)}... Using ${Platform.OS === 'web' ? 'default localStorage' : 'SecureStore'}`
    : 'FAILED (Missing Config)'
);
