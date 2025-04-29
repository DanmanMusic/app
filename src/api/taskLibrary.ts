import { getSupabase } from '../lib/supabaseClient';
import { TaskLibraryItem } from '../types/dataTypes';

/**
 * Fetches the entire task library from Supabase.
 */
export const fetchTaskLibrary = async (): Promise<TaskLibraryItem[]> => {
  const client = getSupabase();
  console.log(`[Supabase] Fetching Task Library`);
  const { data, error } = await client
    .from('task_library')
    .select('id, title, description, base_tickets')
    .order('title', { ascending: true });

  if (error) {
    console.error(`[Supabase] Error fetching task library:`, error.message);
    throw new Error(`Failed to fetch task library: ${error.message}`);
  }

  console.log(`[Supabase] Received ${data?.length ?? 0} task library items.`);

  const taskLibrary: TaskLibraryItem[] = (data || []).map(item => ({
    id: item.id,
    title: item.title,
    description: item.description ?? '',
    baseTickets: item.base_tickets,
  }));

  return taskLibrary;
};

/**
 * Creates a new task library item in Supabase.
 */
export const createTaskLibraryItem = async (
  taskData: Omit<TaskLibraryItem, 'id'>
): Promise<TaskLibraryItem> => {
  const client = getSupabase();
  console.log('[Supabase] Creating task library item:', taskData.title);

  const trimmedTitle = taskData.title?.trim();
  const trimmedDescription = taskData.description?.trim();
  const baseTickets = taskData.baseTickets;

  if (!trimmedTitle) {
    throw new Error('Task title cannot be empty.');
  }
  if (
    baseTickets == null ||
    typeof baseTickets !== 'number' ||
    baseTickets < 0 ||
    !Number.isInteger(baseTickets)
  ) {
    throw new Error('Base tickets must be a non-negative integer.');
  }

  const itemToInsert = {
    title: trimmedTitle,
    description: trimmedDescription || null,
    base_tickets: baseTickets,
  };

  const { data, error } = await client
    .from('task_library')
    .insert(itemToInsert)
    .select('id, title, description, base_tickets')
    .single();

  if (error || !data) {
    console.error(`[Supabase] Error creating task library item:`, error?.message);
    throw new Error(`Failed to create task library item: ${error?.message || 'No data returned'}`);
  }

  const createdTask: TaskLibraryItem = {
    id: data.id,
    title: data.title,
    description: data.description ?? '',
    baseTickets: data.base_tickets,
  };

  console.log(`[Supabase] Task library item created successfully (ID: ${createdTask.id})`);
  return createdTask;
};

/**
 * Updates an existing task library item in Supabase.
 */
export const updateTaskLibraryItem = async ({
  taskId,
  updates,
}: {
  taskId: string;
  updates: Partial<Omit<TaskLibraryItem, 'id'>>;
}): Promise<TaskLibraryItem> => {
  const client = getSupabase();
  console.log(`[Supabase] Updating task library item ${taskId}:`, updates);

  const updatePayload: { title?: string; description?: string | null; base_tickets?: number } = {};
  let hasChanges = false;

  if (updates.title !== undefined) {
    const trimmedTitle = updates.title.trim();
    if (!trimmedTitle) {
      throw new Error('Task title cannot be empty.');
    }
    updatePayload.title = trimmedTitle;
    hasChanges = true;
  }
  if (updates.description !== undefined) {
    updatePayload.description = updates.description.trim() || null;
    hasChanges = true;
  }
  if (updates.baseTickets !== undefined) {
    const baseTickets = updates.baseTickets;
    if (
      baseTickets == null ||
      typeof baseTickets !== 'number' ||
      baseTickets < 0 ||
      !Number.isInteger(baseTickets)
    ) {
      throw new Error('Base tickets must be a non-negative integer.');
    }
    updatePayload.base_tickets = baseTickets;
    hasChanges = true;
  }

  if (Object.keys(updatePayload).length === 0) {
    console.warn('[Supabase] updateTaskLibraryItem called with no valid updates.');

    const { data: currentData, error: currentError } = await client
      .from('task_library')
      .select('id, title, description, base_tickets')
      .eq('id', taskId)
      .single();
    if (currentError || !currentData) {
      throw new Error(
        `Failed to fetch current task library item ${taskId} for no-op update: ${currentError?.message || 'Not Found'}`
      );
    }
    return {
      id: currentData.id,
      title: currentData.title,
      description: currentData.description ?? '',
      baseTickets: currentData.base_tickets,
    };
  }

  const { data, error } = await client
    .from('task_library')
    .update(updatePayload)
    .eq('id', taskId)
    .select('id, title, description, base_tickets')
    .single();

  if (error || !data) {
    console.error(`[Supabase] Error updating task library item ${taskId}:`, error?.message);
    throw new Error(
      `Failed to update task library item ${taskId}: ${error?.message || 'No data returned'}`
    );
  }

  const updatedTask: TaskLibraryItem = {
    id: data.id,
    title: data.title,
    description: data.description ?? '',
    baseTickets: data.base_tickets,
  };

  console.log(`[Supabase] Task library item ${taskId} updated successfully.`);
  return updatedTask;
};

/**
 * Deletes a task library item from Supabase.
 */
export const deleteTaskLibraryItem = async (taskId: string): Promise<void> => {
  const client = getSupabase();
  console.log(`[Supabase] Deleting task library item ${taskId}`);

  const { error } = await client.from('task_library').delete().eq('id', taskId);

  if (error) {
    console.error(`[Supabase] Error deleting task library item ${taskId}:`, error.message);

    if (error.code === '23503') {
      throw new Error(
        `Cannot delete task: It might be currently assigned to one or more students.`
      );
    }
    throw new Error(`Failed to delete task library item ${taskId}: ${error.message}`);
  }

  console.log(`[Supabase] Task library item ${taskId} deleted successfully.`);
};
