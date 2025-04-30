// src/lib/supabaseClient.ts
import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';
import { Platform } from 'react-native'; // Restore Platform import
import * as SecureStore from 'expo-secure-store'; // Restore SecureStore import

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// --- Restore SecureStoreAdapter ---
const SecureStoreAdapter = {
  getItem: (key: string) => {
    // Ensure SecureStore is only used on native
    if (Platform.OS === 'web') return null;
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') return;
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') return;
    SecureStore.deleteItemAsync(key);
  },
};

// --- Restore storageOptions with persistSession: true ---
let storageOptions: SupabaseClientOptions<'public'>['auth'] = {
  autoRefreshToken: true,
  persistSession: true, // <-- RESTORE TO TRUE
  detectSessionInUrl: false,
  // Use the adapter only on native platforms
  storage: Platform.OS === 'web' ? undefined : SecureStoreAdapter,
};

// --- Log the actual configuration ---
console.log(
  `[SupabaseClient] Using ${Platform.OS === 'web' ? 'default localStorage' : 'SecureStore'} adapter (persistSession: ${storageOptions.persistSession}).`
);

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
