import { TaskLibraryItem } from '../mocks/mockTaskLibrary';

/**
 * Fetches the entire task library.
 * TODO: Add pagination/filtering parameters if needed.
 */
export const fetchTaskLibrary = async (): Promise<TaskLibraryItem[]> => {
  console.log(`[API] Fetching Task Library`);
  const response = await fetch('/api/task-library');
  console.log(`[API] Task Library Response status: ${response.status}`);
  if (!response.ok) {
    console.error(`[API] Task Library Network response was not ok: ${response.statusText}`);
    throw new Error(`Failed to fetch task library: ${response.statusText}`);
  }
  const data: TaskLibraryItem[] = await response.json();
  console.log(`[API] Received ${data?.length} task library items from API mock.`);
  return data;
};

/**
 * Creates a new task library item.
 */
export const createTaskLibraryItem = async (
  taskData: Omit<TaskLibraryItem, 'id'>
): Promise<TaskLibraryItem> => {
  console.log('[API] Creating task library item:', taskData.title);
  const response = await fetch('/api/task-library', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData),
  });
  console.log(`[API] Create Task Library Item Response status: ${response.status}`);
  if (!response.ok) {
    let errorMsg = `Failed to create task library item: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {
      console.log('[API] taskLibrary try/catch error:', e);
    }
    console.error(`[API] Create Task Library Item failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  const createdTask: TaskLibraryItem = await response.json();
  console.log(`[API] Task library item created successfully (ID: ${createdTask.id})`);
  return createdTask;
};

/**
 * Updates an existing task library item.
 */
export const updateTaskLibraryItem = async ({
  taskId,
  updates,
}: {
  taskId: string;
  updates: Partial<Omit<TaskLibraryItem, 'id'>>;
}): Promise<TaskLibraryItem> => {
  console.log(`[API] Updating task library item ${taskId}:`, updates);
  const response = await fetch(`/api/task-library/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  console.log(`[API] Update Task Library Item Response status: ${response.status}`);
  if (!response.ok) {
    let errorMsg = `Failed to update task library item ${taskId}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {
      console.log('[API] taskLibrary try/catch error:', e);
    }
    console.error(`[API] Update Task Library Item failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  const updatedTask: TaskLibraryItem = await response.json();
  console.log(`[API] Task library item ${taskId} updated successfully`);
  return updatedTask;
};

/**
 * Deletes a task library item.
 */
export const deleteTaskLibraryItem = async (taskId: string): Promise<void> => {
  console.log(`[API] Deleting task library item ${taskId}`);
  const response = await fetch(`/api/task-library/${taskId}`, {
    method: 'DELETE',
  });
  console.log(`[API] Delete Task Library Item Response status: ${response.status}`);
  if (!response.ok && response.status !== 204) {
    let errorMsg = `Failed to delete task library item ${taskId}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {
      console.log('[API] taskLibrary try/catch error:', e);
    }
    console.error(`[API] Delete Task Library Item failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  if (response.status === 204) {
    console.log(`[API] Task library item ${taskId} deleted successfully (204 No Content).`);
  } else {
    console.log(
      `[API] Task library item ${taskId} deleted successfully (Status: ${response.status}).`
    );
  }
};
