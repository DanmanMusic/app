
import { ImageSourcePropType } from 'react-native'; 


import { User } from '../types/userTypes'; 
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { Instrument } from '../mocks/mockInstruments';

/**
 * Helper to get task title from the task library or indicate a custom task.
 * @param taskId The ID of the task.
 * @param taskLibrary The array of task library items.
 * @returns The task title or a custom task indicator.
 */
export const getTaskTitle = (taskId: string, taskLibrary: TaskLibraryItem[]): string => {
  const taskDetail = taskLibrary.find(libTask => libTask.id === taskId);
  return taskDetail?.title || `Custom Task (${taskId})`;
};

/**
 * Helper to get instrument names from a list of instrument IDs.
 * @param instrumentIds Array of instrument IDs.
 * @param instruments The array of all instrument items.
 * @returns A comma-separated string of instrument names.
 */
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


/**
 * Generates a display name string from user name parts.
 * Format: "FirstName LastName (Nickname)" if nickname exists, otherwise "FirstName LastName".
 * @param user A user object containing firstName, lastName, and optional nickname.
 * @returns The formatted display name string.
 */
export const getUserDisplayName = (user: Pick<User, 'firstName' | 'lastName' | 'nickname'> | undefined | null): string => {
    if (!user) {
        return 'Unknown User';
    }
    const baseName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    if (user.nickname) {
        return `${baseName} (${user.nickname})`;
    }
    return baseName || 'Unnamed User'; 
};

/**
 * Helper to get the required source for an instrument icon JPEG.
 * Handles known instrument names and provides a default fallback icon.
 * @param instrumentName The name of the instrument (case-insensitive).
 * @returns The ImageSourcePropType for the require statement.
 */
export const getInstrumentIconSource = (instrumentName: string | undefined): ImageSourcePropType => {
  
  const defaultIcon = require('../../assets/instruments/icon.jpg');

  if (!instrumentName) {
    return defaultIcon;
  }

  const imageName = instrumentName.toLowerCase().trim(); 

  try {
    
    switch (imageName) {
      case 'piano': return require('../../assets/instruments/piano.jpg');
      case 'guitar': return require('../../assets/instruments/guitar.jpg');
      case 'drums': return require('../../assets/instruments/drums.jpg');
      case 'violin': return require('../../assets/instruments/violin.jpg');
      case 'voice': return require('../../assets/instruments/voice.jpg');
      case 'flute': return require('../../assets/instruments/flute.jpg');
      case 'bass': 
      case 'bass guitar': return require('../../assets/instruments/bass.jpg');
      default:
        
        return defaultIcon;
    }
  } catch (error) {
    
    return defaultIcon;
  }
};