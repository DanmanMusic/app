// src/api/taskLibrary.ts

import { getSupabase } from '../lib/supabaseClient';

import { TaskLibraryItem } from '../types/dataTypes';

import { fileToBase64, NativeFileObject } from '../utils/helpers';

// in src/api/taskLibrary.ts

// The interface for the result remains the same.
interface TaskLibraryRpcResult {
  id: string;
  title: string;
  description: string | null;
  base_tickets: number;
  created_by_id: string;
  attachment_path: string | null;
  reference_url: string | null;
  can_self_assign: boolean;
  journey_location_id: string | null;
  instrument_ids: string[] | null;
}

export const fetchTaskLibrary = async (): Promise<TaskLibraryItem[]> => {
  const client = getSupabase();
  console.log(`[API taskLibrary] Fetching Task Library via RPC`);

  // THIS IS THE FIX:
  // The rpc method is generic over the Function Name (1st arg) and the arguments object (2nd arg).
  // The return type is then inferred from this.
  const { data, error } = await client.rpc(
    'get_full_task_library', // The function name
    {}, // An empty object for arguments, since our function takes none
    { count: 'exact' } // Optional: if we needed to count, but not necessary here
  );

  if (error) {
    console.error(`[API taskLibrary] Error fetching task library via RPC:`, error.message);
    throw new Error(`Failed to fetch task library: ${error.message}`);
  }

  // To fix the 'any' type error that still remains, we must cast the result.
  // This tells TypeScript to trust us that the 'data' variable matches our interface.
  const typedData = data as TaskLibraryRpcResult[];

  console.log(`[API taskLibrary] Received ${typedData?.length ?? 0} task library items from RPC.`);

  const taskLibrary: TaskLibraryItem[] = (typedData || []).map(item => ({
    id: item.id,
    title: item.title,
    description: item.description ?? null,
    baseTickets: item.base_tickets,
    createdById: item.created_by_id,
    attachmentPath: item.attachment_path ?? undefined,
    referenceUrl: item.reference_url ?? null,
    canSelfAssign: item.can_self_assign,
    journeyLocationId: item.journey_location_id ?? null,
    instrumentIds: item.instrument_ids || [],
  }));

  return taskLibrary;
};

// MODIFIED: Added canSelfAssign to parameters
export const createTaskLibraryItem = async (
  taskData: Omit<TaskLibraryItem, 'id'> & {
    file?: File | NativeFileObject;
    mimeType?: string;
    fileName?: string;
  }
): Promise<TaskLibraryItem> => {
  const client = getSupabase();
  const {
    file,
    mimeType: providedMimeType,
    fileName: providedFileName,
    ...restTaskData
  } = taskData;
  const payload: any = {};
  payload.title = restTaskData.title?.trim();
  payload.description =
    restTaskData.description === null ? null : restTaskData.description?.trim() || undefined;
  payload.baseTickets = restTaskData.baseTickets;
  payload.referenceUrl =
    restTaskData.referenceUrl === null ? null : restTaskData.referenceUrl?.trim() || undefined;
  payload.instrumentIds = restTaskData.instrumentIds || [];
  payload.canSelfAssign = restTaskData.canSelfAssign ?? false; // MODIFIED: Add to payload

  if (!payload.title) throw new Error('Task title cannot be empty.');
  if (
    payload.baseTickets == null ||
    payload.baseTickets < 0 ||
    !Number.isInteger(payload.baseTickets)
  ) {
    throw new Error('Base tickets must be a non-negative integer.');
  }

  let finalMimeType = providedMimeType;
  let finalFileName = providedFileName;

  // File handling logic remains the same...
  if (file && !finalMimeType && file instanceof File) finalMimeType = file.type;
  else if (file && !finalMimeType && typeof file === 'object' && 'mimeType' in file)
    finalMimeType = file.mimeType;
  else if (file && !finalMimeType && typeof file === 'object' && 'type' in file)
    finalMimeType = file.type;
  if (file && !finalFileName && file instanceof File) finalFileName = file.name;
  else if (file && !finalFileName && typeof file === 'object' && 'name' in file)
    finalFileName = file.name;
  if (file && !finalFileName) finalFileName = `upload.${finalMimeType?.split('/')[1] || 'bin'}`;

  if (file && finalMimeType && finalFileName) {
    try {
      const base64 = await fileToBase64(file);
      payload.file = { base64, mimeType: finalMimeType, fileName: finalFileName };
    } catch (error: any) {
      throw new Error(`Failed to process file: ${error.message}`);
    }
  }

  const { data: createdTaskRaw, error } = await client.functions.invoke(
    'create-task-library-item',
    { body: payload }
  );

  if (error) throw new Error(`Failed to create task: ${error.message || 'EF error'}`);
  if (!createdTaskRaw || typeof createdTaskRaw !== 'object' || !createdTaskRaw.id) {
    throw new Error('Invalid EF response');
  }

  // MODIFIED: Map new property in the returned object
  const createdTask: TaskLibraryItem = {
    id: createdTaskRaw.id,
    title: createdTaskRaw.title,
    description: createdTaskRaw.description ?? null,
    baseTickets: createdTaskRaw.base_tickets,
    createdById: createdTaskRaw.created_by_id,
    attachmentPath: createdTaskRaw.attachment_path ?? undefined,
    referenceUrl: createdTaskRaw.reference_url ?? null,
    instrumentIds: payload.instrumentIds || [],
    canSelfAssign: createdTaskRaw.can_self_assign,
  };
  return createdTask;
};

// MODIFIED: Added canSelfAssign to parameters
export const updateTaskLibraryItem = async ({
  taskId,
  updates,
  file,
  mimeType: providedMimeType,
  fileName: providedFileName,
}: {
  taskId: string;
  updates: Partial<Omit<TaskLibraryItem, 'id' | 'createdById'>>;
  file?: File | NativeFileObject | null;
  mimeType?: string;
  fileName?: string;
}): Promise<TaskLibraryItem> => {
  const client = getSupabase();
  const updatePayload: any = {};
  let hasChanges = false;

  // Logic for most fields remains the same...
  if (updates.hasOwnProperty('title')) {
    updatePayload.title = updates.title?.trim();
    hasChanges = true;
  }
  if (updates.hasOwnProperty('description')) {
    updatePayload.description = updates.description === null ? null : updates.description?.trim();
    hasChanges = true;
  }
  if (updates.hasOwnProperty('baseTickets')) {
    if (
      updates.baseTickets == null ||
      updates.baseTickets < 0 ||
      !Number.isInteger(updates.baseTickets)
    ) {
      throw new Error('Base tickets must be a non-negative integer.');
    }
    updatePayload.baseTickets = updates.baseTickets;
    hasChanges = true;
  }
  if (updates.hasOwnProperty('referenceUrl')) {
    updatePayload.referenceUrl =
      updates.referenceUrl === null ? null : updates.referenceUrl?.trim();
    hasChanges = true;
  }
  if (updates.hasOwnProperty('instrumentIds')) {
    updatePayload.instrumentIds = updates.instrumentIds || [];
    hasChanges = true;
  }

  // MODIFIED: Check for canSelfAssign
  if (updates.hasOwnProperty('canSelfAssign')) {
    updatePayload.canSelfAssign = updates.canSelfAssign;
    hasChanges = true;
  }

  // File handling logic remains the same...
  if (file === null) {
    updatePayload.deleteAttachment = true;
    hasChanges = true;
  } else if (file) {
    let finalMimeType = providedMimeType;
    let finalFileName = providedFileName;
    if (!finalMimeType && file instanceof File) finalMimeType = file.type;
    else if (file && !finalMimeType && typeof file === 'object' && 'mimeType' in file)
      finalMimeType = file.mimeType;
    else if (file && !finalMimeType && typeof file === 'object' && 'type' in file)
      finalMimeType = file.type;
    if (!finalFileName && file instanceof File) finalFileName = file.name;
    else if (file && !finalFileName && typeof file === 'object' && 'name' in file)
      finalFileName = file.name;
    if (!finalFileName) finalFileName = `update.${finalMimeType?.split('/')[1] || 'bin'}`;

    if (finalMimeType && finalFileName) {
      try {
        const base64 = await fileToBase64(file);
        updatePayload.file = { base64, mimeType: finalMimeType, fileName: finalFileName };
        hasChanges = true;
      } catch (error: any) {
        throw new Error(`Failed to process file for update: ${error.message}`);
      }
    }
  }

  if (!hasChanges) {
    return fetchTaskLibrary().then(tasks => tasks.find(t => t.id === taskId)!);
  }
  if (updatePayload.title !== undefined && !updatePayload.title)
    throw new Error('Task title cannot be empty.');

  const requestBody = { taskId, updates: updatePayload };
  const { error } = await client.functions.invoke('update-task-library-item', {
    body: requestBody,
  });
  if (error) throw new Error(`Failed to update task: ${error.message || 'Unknown EF error'}`);

  const { data: updatedData, error: refetchError } = await client
    .from('task_library')
    .select(`*, task_library_instruments ( instrument_id )`)
    .eq('id', taskId)
    .single();
  if (refetchError || !updatedData)
    throw new Error(
      `Update successful, but failed to refetch: ${refetchError?.message || 'Not found'}`
    );

  // MODIFIED: Map new property
  const updatedTask: TaskLibraryItem = {
    id: updatedData.id,
    title: updatedData.title,
    description: updatedData.description ?? null,
    baseTickets: updatedData.base_tickets,
    createdById: updatedData.created_by_id,
    attachmentPath: updatedData.attachment_path ?? undefined,
    referenceUrl: updatedData.reference_url ?? null,
    instrumentIds:
      updatedData.task_library_instruments?.map((link: any) => link.instrument_id) ?? [],
    canSelfAssign: updatedData.can_self_assign,
  };
  return updatedTask;
};

// This function remains unchanged
export const deleteTaskLibraryItem = async (taskId: string): Promise<void> => {
  const client = getSupabase();
  const payload = { taskId };
  const { error } = await client.functions.invoke('delete-task-library-item', { body: payload });
  if (error) {
    throw new Error(`Failed to delete task: ${error.message || 'EF error'}`);
  }
};
