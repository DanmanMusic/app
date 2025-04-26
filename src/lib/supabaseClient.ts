// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

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

const AsyncStorageAdapter = {
    getItem: (key: string) => {
        return AsyncStorage.getItem(key);
    },
    setItem: (key: string, value: string) => {
        AsyncStorage.setItem(key, value);
    },
    removeItem: (key: string) => {
        AsyncStorage.removeItem(key);
    },
};

const storageAdapter = Platform.OS === 'web' ? AsyncStorageAdapter : SecureStoreAdapter;
console.log(`[SupabaseClient] Using ${Platform.OS === 'web' ? 'AsyncStorage' : 'SecureStore'} adapter.`);


if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage =
    'Supabase URL or Anon Key is missing. Make sure they are set in your .env file with the EXPO_PUBLIC_ prefix and that you have restarted the bundler.';
  console.error('*********************************************************************');
  console.error('SUPABASE CONFIG ERROR:', errorMessage);
  console.error('*********************************************************************');
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: storageAdapter,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export const getSupabase = () => {
  if (!supabase) {
    throw new Error(
      'Supabase client not initialized. Check environment variables (EXPO_PUBLIC_...) and restart the bundler.'
    );
  }
  return supabase;
};

console.log(
  '[SupabaseClient] Initialized:',
  supabase ? `URL: ${supabaseUrl?.substring(0, 25)}...` : 'FAILED (Missing Config)'
);