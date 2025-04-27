// src/api/taskLibrary.ts
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

  // The fetched data structure should match TaskLibraryItem, but we explicitly map
  // to ensure type consistency and handle potential nulls if schema changes.
  const taskLibrary: TaskLibraryItem[] = (data || []).map(item => ({
      id: item.id,
      title: item.title,
      description: item.description ?? '', // Ensure description is string, fallback to empty
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

  // Basic Validation
  const trimmedTitle = taskData.title?.trim();
  const trimmedDescription = taskData.description?.trim(); // Description is optional based on latest schema/discussion
  const baseTickets = taskData.baseTickets;

  if (!trimmedTitle) {
    throw new Error("Task title cannot be empty.");
  }
  if (baseTickets == null || typeof baseTickets !== 'number' || baseTickets < 0 || !Number.isInteger(baseTickets)) {
    throw new Error("Base tickets must be a non-negative integer.");
  }
  // Note: Description is optional, no validation needed if empty string is allowed

  const itemToInsert = {
    title: trimmedTitle,
    description: trimmedDescription || null, // Store null if description is empty/whitespace
    base_tickets: baseTickets,
  };

  const { data, error } = await client
    .from('task_library')
    .insert(itemToInsert)
    .select('id, title, description, base_tickets') // Select the fields matching TaskLibraryItem
    .single(); // Expecting a single row back

  if (error || !data) {
    console.error(`[Supabase] Error creating task library item:`, error?.message);
    throw new Error(`Failed to create task library item: ${error?.message || 'No data returned'}`);
  }

  // Map the result to TaskLibraryItem structure
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

  // Validate and prepare updates
  if (updates.title !== undefined) {
    const trimmedTitle = updates.title.trim();
    if (!trimmedTitle) {
      throw new Error("Task title cannot be empty.");
    }
    updatePayload.title = trimmedTitle;
    hasChanges = true; // Assuming we fetch current data later if needed, for now assume change
  }
  if (updates.description !== undefined) {
    // Allow setting description to empty string (which we store as null)
    updatePayload.description = updates.description.trim() || null;
    hasChanges = true; // Assuming change
  }
  if (updates.baseTickets !== undefined) {
    const baseTickets = updates.baseTickets;
    if (baseTickets == null || typeof baseTickets !== 'number' || baseTickets < 0 || !Number.isInteger(baseTickets)) {
      throw new Error("Base tickets must be a non-negative integer.");
    }
    updatePayload.base_tickets = baseTickets;
    hasChanges = true; // Assuming change
  }

  // Optional: Could fetch current item and compare to avoid unnecessary DB call if !hasChanges after comparison.
  // For simplicity now, we proceed if any potential update was provided.
  if (Object.keys(updatePayload).length === 0) {
      console.warn('[Supabase] updateTaskLibraryItem called with no valid updates.');
      // Fetch and return current item if no changes provided
       const { data: currentData, error: currentError } = await client
         .from('task_library')
         .select('id, title, description, base_tickets')
         .eq('id', taskId)
         .single();
        if (currentError || !currentData) {
            throw new Error(`Failed to fetch current task library item ${taskId} for no-op update: ${currentError?.message || 'Not Found'}`);
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
    throw new Error(`Failed to update task library item ${taskId}: ${error?.message || 'No data returned'}`);
  }

  // Map result to TaskLibraryItem
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

  const { error } = await client
    .from('task_library')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error(`[Supabase] Error deleting task library item ${taskId}:`, error.message);
    // Check for specific errors, e.g., foreign key constraint if tasks are linked
    if (error.code === '23503') { // Foreign key violation
        throw new Error(`Cannot delete task: It might be currently assigned to one or more students.`);
    }
    throw new Error(`Failed to delete task library item ${taskId}: ${error.message}`);
  }

  console.log(`[Supabase] Task library item ${taskId} deleted successfully.`);
  // No return value needed for delete
};