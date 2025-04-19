// src/utils/helpers.ts

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
  // In a real app, custom task details might be stored on the AssignedTask itself
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
