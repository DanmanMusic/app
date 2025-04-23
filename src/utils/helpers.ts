import { ImageSourcePropType } from 'react-native';

import { Instrument } from '../mocks/mockInstruments';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { User } from '../types/userTypes';

export const getTaskTitle = (taskId: string, taskLibrary: TaskLibraryItem[]): string => {
  const taskDetail = taskLibrary.find(libTask => libTask.id === taskId);
  return taskDetail?.title || `Custom Task (${taskId})`;
};

export const getInstrumentNames = (
  instrumentIds: string[] | undefined,
  instruments: Instrument[]
): string => {
  if (!instrumentIds || instrumentIds.length === 0) return 'N/A';
  return instrumentIds
    .map(id => {
      const instrument = instruments.find(inst => inst.id === id);
      return instrument?.name || `Unknown Instrument (${id})`;
    })
    .join(', ');
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

export const getInstrumentIconSource = (
  instrumentName: string | undefined
): ImageSourcePropType => {
  const defaultIcon = require('../../assets/instruments/icon.jpg');
  if (!instrumentName) {
    return defaultIcon;
  }
  const imageName = instrumentName.toLowerCase().trim();
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
    return defaultIcon;
  }
};
