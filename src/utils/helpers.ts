// src/utils/helpers.ts
import { ImageSourcePropType } from 'react-native'; // Import ImageSourcePropType

// Import the User type if needed elsewhere, or just use relevant fields
import { User } from '../types/userTypes'; // Import the new User type
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
    .join(', '); // Join multiple instruments with comma
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
    return baseName || 'Unnamed User'; // Fallback if somehow names are empty
};

/**
 * Helper to get the required source for an instrument icon JPEG.
 * Handles known instrument names and provides a default fallback icon.
 * @param instrumentName The name of the instrument (case-insensitive).
 * @returns The ImageSourcePropType for the require statement.
 */
export const getInstrumentIconSource = (instrumentName: string | undefined): ImageSourcePropType => {
  // Default icon path relative to this file (src/utils/)
  const defaultIcon = require('../../assets/instruments/icon.jpg');

  if (!instrumentName) {
    return defaultIcon;
  }

  const imageName = instrumentName.toLowerCase().trim(); // Normalize name

  try {
    // Paths are now relative to src/utils/
    switch (imageName) {
      case 'piano': return require('../../assets/instruments/piano.jpg');
      case 'guitar': return require('../../assets/instruments/guitar.jpg');
      case 'drums': return require('../../assets/instruments/drums.jpg');
      case 'violin': return require('../../assets/instruments/violin.jpg');
      case 'voice': return require('../../assets/instruments/voice.jpg');
      case 'flute': return require('../../assets/instruments/flute.jpg');
      case 'bass': // Handle variations
      case 'bass guitar': return require('../../assets/instruments/bass.jpg');
      default:
        // console.warn(`Icon not found for instrument: ${imageName}.jpg. Using default.`);
        return defaultIcon;
    }
  } catch (error) {
    // console.warn(`Error loading icon for instrument: ${imageName}.jpg`, error);
    return defaultIcon;
  }
};