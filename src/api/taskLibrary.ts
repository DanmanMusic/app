// src/api/taskLibrary.ts

import { getSupabase } from '../lib/supabaseClient';

import { AssignedTask, TaskLibraryItem, Url, Attachment } from '../types/dataTypes';

import { fileToBase64, NativeFileObject } from '../utils/helpers';

interface TaskLibraryRpcResult {
  id: string;
  title: string;
  description: string | null;
  base_tickets: number;
  created_by_id: string;
  can_self_assign: boolean;
  journey_location_id: string | null;
  instrument_ids: string[] | null;
  urls: Url[] | null;
  attachments: Attachment[] | null;
}

const mapRpcResultToTaskLibraryItem = (item: TaskLibraryRpcResult): TaskLibraryItem => ({
  id: item.id,
  title: item.title,
  description: item.description ?? null,
  baseTickets: item.base_tickets,
  createdById: item.created_by_id,
  canSelfAssign: item.can_self_assign,
  journeyLocationId: item.journey_location_id ?? null,
  instrumentIds: item.instrument_ids || [],
  urls: item.urls || [],
  attachments: item.attachments || [],
});

export const fetchTaskLibrary = async (): Promise<TaskLibraryItem[]> => {
  const client = getSupabase();
  console.log(`[API taskLibrary] Fetching Task Library via RPC`);

  const { data, error } = await client.rpc('get_full_task_library');

  if (error) {
    console.error(`[API taskLibrary] Error fetching task library via RPC:`, error.message);
    throw new Error(`Failed to fetch task library: ${error.message}`);
  }

  const typedData = data as TaskLibraryRpcResult[];
  return (typedData || []).map(mapRpcResultToTaskLibraryItem);
};

export type UrlPayload = Omit<Url, 'id'>;
export type FilePayload = { _nativeFile: NativeFileObject; fileName: string; mimeType: string };
export type AttachmentPayload = Omit<Attachment, 'id'>;

export const createTaskLibraryItem = async (
  taskData: Omit<TaskLibraryItem, 'id' | 'createdById' | 'urls' | 'attachments'> & {
    urls: UrlPayload[];
    files: FilePayload[];
  }
): Promise<TaskLibraryItem> => {
  const client = getSupabase();
  const { urls, files, ...restTaskData } = taskData;

  const filesForUpload = await Promise.all(
    (files || []).map(async file => {
      const base64 = await fileToBase64(file._nativeFile);
      return { base64, mimeType: file.mimeType, fileName: file.fileName };
    })
  );

  const payload = {
    ...restTaskData,
    urls,
    files: filesForUpload,
  };

  const { data: newTaskId, error } = await client.functions.invoke('create-task-library-item', {
    body: payload,
  });

  if (error) throw new Error(`Failed to create task: ${error.message || 'EF error'}`);

  const { data: refetchedData, error: refetchError } = await client
    .rpc('get_single_task_library_item', { p_task_id: newTaskId.id })
    .single();

  if (refetchError || !refetchedData) {
    throw new Error(`Task created (ID: ${newTaskId.id}), but failed to refetch details.`);
  }

  return mapRpcResultToTaskLibraryItem(refetchedData as TaskLibraryRpcResult);
};

export interface UpdateTaskApiPayload {
  taskId: string;
  updates: {
    title: string;
    description: string | null;
    baseTickets: number;
    canSelfAssign: boolean;
    journeyLocationId: string | null;
    instrumentIds: string[];
    urls: Url[];
    attachments: Attachment[];
    newFiles: FilePayload[];
    attachmentPathsToDelete: string[];
  };
}

export const updateTaskLibraryItem = async ({
  taskId,
  updates,
}: UpdateTaskApiPayload): Promise<TaskLibraryItem> => {
  const client = getSupabase();

  const newFilesForUpload = await Promise.all(
    (updates.newFiles || []).map(async file => {
      const base64 = await fileToBase64(file._nativeFile);
      return { base64, mimeType: file.mimeType, fileName: file.fileName };
    })
  );

  const payload = {
    taskId,
    updates: {
      ...updates,
      newFiles: newFilesForUpload,
    },
  };

  const { error } = await client.functions.invoke('update-task-library-item', {
    body: payload,
  });

  if (error) {
    throw new Error(`Failed to update task: ${error.message || 'Unknown EF error'}`);
  }

  const { data: updatedData, error: refetchError } = await client
    .rpc('get_single_task_library_item', { p_task_id: taskId })
    .single();

  if (refetchError || !updatedData) {
    throw new Error(
      `Update successful, but failed to refetch: ${refetchError?.message || 'Not found'}`
    );
  }

  return mapRpcResultToTaskLibraryItem(updatedData as TaskLibraryRpcResult);
};

export const deleteTaskLibraryItem = async (taskId: string): Promise<void> => {
  const client = getSupabase();
  const payload = { taskId };
  const { error } = await client.functions.invoke('delete-task-library-item', { body: payload });
  if (error) {
    throw new Error(`Failed to delete task: ${error.message || 'EF error'}`);
  }
};

export interface SelfAssignableTask {
  id: string;
  title: string;
  description: string | null;
  base_tickets: number;
  journey_location_id: string;
  journey_location_name: string;
  urls: Url[];
  attachments: Attachment[];
}

export const fetchSelfAssignableTasks = async (
  studentId: string
): Promise<SelfAssignableTask[]> => {
  const client = getSupabase();
  const { data, error } = await client.rpc('get_self_assignable_tasks', {
    p_student_id: studentId,
  });

  if (error) {
    throw new Error(`Failed to fetch available tasks: ${error.message}`);
  }

  return ((data as any[]) || []).map(task => ({
    ...task,
    urls: task.urls || [],
    attachments: task.attachments || [],
  }));
};

export const selfAssignTask = async (
  taskLibraryId: string,
  studentId: string
): Promise<AssignedTask> => {
  const client = getSupabase();
  console.log(`[API taskLibrary] Self-assigning task ${taskLibraryId} for student ${studentId}`);

  const payload = { taskLibraryId, studentId };

  const { data, error } = await client.functions.invoke('self-assign-task', { body: payload });
  if (error) {
    let detailedError = error.message;
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && parsed.error) detailedError = parsed.error;
    } catch (e) {}
    throw new Error(detailedError);
  }
  return data as AssignedTask;
};

export const fetchSingleTaskLibraryItem = async (
  taskId: string
): Promise<TaskLibraryItem | null> => {
  const client = getSupabase();
  console.log(`[API taskLibrary] Fetching single task item via RPC: ${taskId}`);

  const { data, error } = await client
    .rpc('get_single_task_library_item', { p_task_id: taskId })
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.warn(`[API taskLibrary] Task with ID ${taskId} not found.`);
      return null;
    }
    console.error(`[API taskLibrary] Error fetching single task item:`, error.message);
    throw new Error(`Failed to fetch task details: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const typedData = data as TaskLibraryRpcResult;
  return mapRpcResultToTaskLibraryItem(typedData);
};
