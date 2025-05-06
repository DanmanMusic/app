// src/api/taskLibrary.ts

import { getSupabase } from '../lib/supabaseClient';

import { TaskLibraryItem } from '../types/dataTypes';

import { fileToBase64, NativeFileObject } from '../utils/helpers';

export const fetchTaskLibrary = async (): Promise<TaskLibraryItem[]> => {
  const client = getSupabase();
  console.log(`[API taskLibrary] Fetching Task Library`);
  const { data, error } = await client
    .from('task_library')
    .select(
      `
        id, title, description, base_tickets, created_by_id,
        attachment_path, reference_url,
        task_library_instruments ( instrument_id )
        `
    )
    .order('title', { ascending: true });

  if (error) {
    console.error(`[API taskLibrary] Error fetching task library:`, error.message);
    throw new Error(`Failed to fetch task library: ${error.message}`);
  }

  console.log(`[API taskLibrary] Received ${data?.length ?? 0} task library items.`);

  const taskLibrary: TaskLibraryItem[] = (data || []).map(item => ({
    id: item.id,
    title: item.title,
    description: item.description ?? null,
    baseTickets: item.base_tickets,
    createdById: item.created_by_id,
    attachmentPath: item.attachment_path ?? undefined,
    referenceUrl: item.reference_url ?? null,
    instrumentIds: item.task_library_instruments?.map((link: any) => link.instrument_id) ?? [],
  }));

  return taskLibrary;
};

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

  if (error) {
    throw new Error(`Failed to create task: ${error.message || 'EF error'}`);
  }
  if (!createdTaskRaw || typeof createdTaskRaw !== 'object' || !createdTaskRaw.id) {
    throw new Error('Invalid EF response');
  }

  const createdTask: TaskLibraryItem = {
    id: createdTaskRaw.id,
    title: createdTaskRaw.title,
    description: createdTaskRaw.description ?? null,
    baseTickets: createdTaskRaw.base_tickets,
    createdById: createdTaskRaw.created_by_id,
    attachmentPath: createdTaskRaw.attachment_path ?? undefined,
    referenceUrl: createdTaskRaw.reference_url ?? null,
    instrumentIds: payload.instrumentIds || [],
  };
  return createdTask;
};

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
    } else {
      console.warn('[API update] File provided but missing info.');
    }
  }

  if (!hasChanges) {
    const { data: currentData, error: currentError } = await client
      .from('task_library')
      .select(`*, task_library_instruments ( instrument_id )`)
      .eq('id', taskId)
      .single();
    if (currentError || !currentData)
      throw new Error(
        `Failed to fetch current task ${taskId}: ${currentError?.message || 'Not found'}`
      );
    return {
      /* map currentData */ id: currentData.id,
      title: currentData.title,
      description: currentData.description ?? null,
      baseTickets: currentData.base_tickets,
      createdById: currentData.created_by_id,
      attachmentPath: currentData.attachment_path ?? undefined,
      referenceUrl: currentData.reference_url ?? null,
      instrumentIds:
        currentData.task_library_instruments?.map((link: any) => link.instrument_id) ?? [],
    };
  }

  if (updatePayload.title !== undefined && !updatePayload.title)
    throw new Error('Task title cannot be empty.');

  const requestBody = { taskId, updates: updatePayload };
  const { error } = await client.functions.invoke('update-task-library-item', {
    body: requestBody,
  });

  if (error) {
    throw new Error(`Failed to update task: ${error.message || 'Unknown EF error'}`);
  }

  const { data: updatedData, error: refetchError } = await client
    .from('task_library')
    .select(`*, task_library_instruments ( instrument_id )`)
    .eq('id', taskId)
    .single();
  if (refetchError || !updatedData)
    throw new Error(
      `Update successful, but failed to refetch: ${refetchError?.message || 'Not found'}`
    );

  const updatedTask: TaskLibraryItem = {
    /* map updatedData */ id: updatedData.id,
    title: updatedData.title,
    description: updatedData.description ?? null,
    baseTickets: updatedData.base_tickets,
    createdById: updatedData.created_by_id,
    attachmentPath: updatedData.attachment_path ?? undefined,
    referenceUrl: updatedData.reference_url ?? null,
    instrumentIds:
      updatedData.task_library_instruments?.map((link: any) => link.instrument_id) ?? [],
  };
  return updatedTask;
};

export const deleteTaskLibraryItem = async (taskId: string): Promise<void> => {
  const client = getSupabase();
  const payload = { taskId };
  const { error } = await client.functions.invoke('delete-task-library-item', {
    body: payload,
  });
  if (error) {
    throw new Error(`Failed to delete task: ${error.message || 'EF error'}`);
  }
};
