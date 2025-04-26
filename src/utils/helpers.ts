// src/utils/helpers.ts
import { ImageSourcePropType } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { Instrument, TaskLibraryItem, User } from '../types/dataTypes';

export const getTaskTitle = (taskId: string, taskLibrary: TaskLibraryItem[]): string => {
  const taskDetail = taskLibrary.find(libTask => libTask.id === taskId);
  return taskDetail?.title || `Custom Task (${taskId})`;
};

export const getUserDisplayName = (
  user: Pick<User, 'firstName' | 'lastName' | 'nickname'> | undefined | null
): string => {
  if (!user) {
    return 'Unknown User';
  }
  const baseName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  if (user.nickname) {
    return `${baseName} (${user.nickname})`;
  }
  return baseName || 'Unnamed User';
};


const getSupabasePublicUrl = (bucket: string, path: string | null | undefined): string | null => {
  if (!path || !supabase) {
    if (!supabase) console.warn("[Supabase Storage] Client not ready for getPublicUrl.");
    return null;
  }
  try {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
    return data?.publicUrl || null;
  } catch (e) {
    console.error("[Supabase Storage] Error getting public URL for path:", path, e);
    return null;
  }
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

  if (!instrument?.name) {
    return defaultIcon;
  }

  const imageName = instrument.name.toLowerCase().trim();

  try {
    switch (imageName) {
      case 'piano':
        return require('../../assets/instruments/piano.jpg');
      case 'guitar':
        return require('../../assets/instruments/guitar.jpg');
      case 'drums':
        return require('../../assets/instruments/drums.jpg');
      case 'violin':
        return require('../../assets/instruments/violin.jpg');
      case 'voice':
        return require('../../assets/instruments/voice.jpg');
      case 'flute':
        return require('../../assets/instruments/flute.jpg');
      case 'bass':
      case 'bass guitar':
        return require('../../assets/instruments/bass.jpg');
      default:
        return defaultIcon;
    }
  } catch (error) {
    console.error(`Error loading local fallback image for ${imageName}:`, error);
    return defaultIcon;
  }
};