// src/lib/storageHelper.ts
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// --- Define storage keys centrally ---
export const CUSTOM_REFRESH_TOKEN_KEY = 'pin_refresh_token';
// Add other keys if needed, e.g.:
// export const CUSTOM_ACCESS_TOKEN_KEY = 'pin_access_token';

export const storeItem = async (key: string, value: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      console.log(`[StorageHelper] Stored item in localStorage (key: ${key})`);
    } else {
      await SecureStore.setItemAsync(key, value);
      console.log(`[StorageHelper] Stored item in SecureStore (key: ${key})`);
    }
  } catch (error) {
    console.error(`[StorageHelper] Error storing item (key: ${key}):`, error);
    // Optionally re-throw or handle specific errors
    throw new Error(`Failed to store item for key: ${key}`);
  }
};

export const getItem = async (key: string): Promise<string | null> => {
  try {
    let value: string | null = null;
    if (Platform.OS === 'web') {
      value = localStorage.getItem(key);
      console.log(
        `[StorageHelper] Retrieved item from localStorage (key: ${key}): ${value ? 'Found' : 'Not Found'}`
      );
    } else {
      value = await SecureStore.getItemAsync(key);
      console.log(
        `[StorageHelper] Retrieved item from SecureStore (key: ${key}): ${value ? 'Found' : 'Not Found'}`
      );
    }
    return value;
  } catch (error) {
    console.error(`[StorageHelper] Error retrieving item (key: ${key}):`, error);
    // Optionally re-throw or handle specific errors
    return null; // Return null on error to indicate failure
  }
};

export const removeItem = async (key: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      console.log(`[StorageHelper] Removed item from localStorage (key: ${key})`);
    } else {
      await SecureStore.deleteItemAsync(key);
      console.log(`[StorageHelper] Removed item from SecureStore (key: ${key})`);
    }
  } catch (error) {
    console.error(`[StorageHelper] Error removing item (key: ${key}):`, error);
    // Optionally re-throw or handle specific errors
    throw new Error(`Failed to remove item for key: ${key}`);
  }
};
