// src/utils/helpers.ts

import { ImageSourcePropType, Platform } from 'react-native';

import * as FileSystem from 'expo-file-system';

import { getSupabase } from '../lib/supabaseClient';

import { Instrument, User } from '../types/dataTypes';

export interface NativeFileObject {
  uri: string;
  name?: string;
  mimeType?: string;
  type?: string;
  size?: number;
  [key: string]: any;
}

export const getUserDisplayName = (
  userOrProfile:
    | Pick<User, 'firstName' | 'lastName' | 'nickname'>
    | {
        first_name?: string | null;
        last_name?: string | null;
        nickname?: string | null;
      }
    | undefined
    | null
): string => {
  if (!userOrProfile) {
    return 'Unknown User';
  }

  const firstName =
    'firstName' in userOrProfile ? userOrProfile.firstName : userOrProfile.first_name;
  const lastName = 'lastName' in userOrProfile ? userOrProfile.lastName : userOrProfile.last_name;
  const nickname = userOrProfile.nickname;

  if (nickname) {
    return nickname;
  }
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  return firstName || lastName || 'Unnamed User';
};

const getSupabasePublicUrl = (bucket: string, path: string | null | undefined): string | null => {
  const supabase = getSupabase();
  if (!path || !supabase) {
    if (!supabase) console.warn('[Supabase Storage] Client not ready for getPublicUrl.');
    return null;
  }
  try {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
    return data?.publicUrl || null;
  } catch (e) {
    console.error('[Supabase Storage] Error getting public URL for path:', path, e);
    return null;
  }
};

export const getInstrumentNames = (
  instrumentIds: string[] | undefined | null,
  allInstruments: Instrument[] | undefined | null
): string => {
  if (
    !instrumentIds ||
    instrumentIds.length === 0 ||
    !allInstruments ||
    allInstruments.length === 0
  ) {
    return 'N/A';
  }
  const names = instrumentIds
    .map(id => {
      const instrument = allInstruments.find(inst => inst.id === id);
      return instrument ? instrument.name : null;
    })
    .filter((name): name is string => name !== null);
  return names.length > 0 ? names.join(', ') : 'N/A';
};

export const getInstrumentIconSource = (
  instrument: Pick<Instrument, 'name' | 'image_path'> | undefined | null
): ImageSourcePropType => {
  const defaultIcon = require('../../assets/instruments/icon.jpg');
  let publicUrl: string | null = null;
  if (instrument?.image_path) {
    publicUrl = getSupabasePublicUrl('instrument-icons', instrument.image_path);
  }
  if (publicUrl) {
    return { uri: publicUrl };
  }
  return defaultIcon;
};

export const capitalizeFirstLetter = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const timestampDisplay = (timestamp: string) =>
  new Date(timestamp).toLocaleString([], {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export const fileToBase64 = (file: File | NativeFileObject): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      if (Platform.OS === 'web') {
        if (file instanceof File) {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            const result = reader.result as string;
            if (result.includes(',')) {
              resolve(result.split(',')[1]);
            } else {
              resolve(result);
            }
          };
          reader.onerror = error => reject(new Error(`FileReader error: ${error}`));
        } else if (
          typeof file === 'object' &&
          file &&
          'uri' in file &&
          typeof file.uri === 'string'
        ) {
          console.warn('[fileToBase64 Web] Received URI on web platform, attempting fetch...');
          try {
            const response = await fetch(file.uri);
            if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onload = () => {
              const result = reader.result as string;
              if (result.includes(',')) {
                resolve(result.split(',')[1]);
              } else {
                resolve(result);
              }
            };
            reader.onerror = error => reject(error);
          } catch (fetchError: any) {
            console.error('[fileToBase64 Web] Error fetching URI:', fetchError);
            reject(new Error(`Failed to fetch file from web URI: ${fetchError.message}`));
          }
        } else {
          console.error('[fileToBase64 Web] Received unsupported input type:', file);
          reject(new Error('Unsupported file input type on web platform'));
        }
      } else {
        if (typeof file === 'object' && file && 'uri' in file && typeof file.uri === 'string') {
          const nativeFile = file as NativeFileObject;
          try {
            const base64 = await FileSystem.readAsStringAsync(nativeFile.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            resolve(base64);
          } catch (fsError: any) {
            console.error(
              '[fileToBase64 Native] Error reading file with expo-file-system:',
              fsError
            );
            reject(new Error(`Failed to read native file: ${fsError.message}.`));
          }
        } else {
          console.error('[fileToBase64 Native] Received unsupported input type:', file);
          reject(new Error('Unsupported file input type on native platform'));
        }
      }
    } catch (error) {
      console.error('[fileToBase64] Unexpected error:', error);
      reject(error);
    }
  });
};

export const getUserAvatarSource = async (
  user: Partial<User> | null | undefined
): Promise<{ uri: string } | null> => {
  if (!user?.avatarPath) {
    return null;
  }

  const client = getSupabase();
  const { data, error } = await client.storage.from('avatars').createSignedUrl(user.avatarPath, 60);

  if (error) {
    console.error('Error creating signed URL for avatar:', error.message);
    return null;
  }
  return { uri: data.signedUrl };
};
