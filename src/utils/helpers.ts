import { ImageSourcePropType, ImageURISource } from 'react-native';
import { getSupabase } from '../lib/supabaseClient';
import { Instrument, TaskLibraryItem, User } from '../types/dataTypes';

export const getUserDisplayName = (
  userOrProfile:
    | Pick<User, 'firstName' | 'lastName' | 'nickname'>
    | { first_name?: string | null; last_name?: string | null; nickname?: string | null }
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

  const baseName = `${firstName || ''} ${lastName || ''}`.trim();

  if (nickname) {
    return `${baseName} (${nickname})`;
  }
  return baseName || 'Unnamed User';
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

export const capitalizeFirstLetter = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};
