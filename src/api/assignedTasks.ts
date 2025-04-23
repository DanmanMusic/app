// src/api/assignedTasks.ts
import {
  AssignedTask,
  TaskVerificationStatus,
} from '../mocks/mockAssignedTasks'; // Assuming type source
import { UserStatus } from '../types/userTypes'; // For filtering

// Type definitions matching the hook filters
export type TaskAssignmentFilterStatusAPI = 'all' | 'assigned' | 'pending' | 'completed';
export type StudentTaskFilterStatusAPI = UserStatus | 'all';

// --- API Response Interfaces (Adjust if backend differs) ---
interface AssignedTasksListResponse {
  items: AssignedTask[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

// --- Fetch Functions ---

/**
 * Fetches assigned tasks with pagination and filtering.
 */
export const fetchAssignedTasks = async ({
  page = 1,
  limit = 10, // Default limit
  assignmentStatus = 'all',
  studentStatus = 'all',
  studentId, // Optional: Filter by specific student
}: {
  page?: number;
  limit?: number;
  assignmentStatus?: TaskAssignmentFilterStatusAPI;
  studentStatus?: StudentTaskFilterStatusAPI;
  studentId?: string;
}): Promise<AssignedTasksListResponse> => {
  console.log(
    `[API] Fetching Assigned Tasks: page=${page}, limit=${limit}, assignmentStatus=${assignmentStatus}, studentStatus=${studentStatus}${studentId ? `, studentId=${studentId}` : ''}`
  );
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));
  if (assignmentStatus !== 'all') {
    params.append('assignmentStatus', assignmentStatus);
  }
  if (studentStatus !== 'all') {
    params.append('studentStatus', studentStatus);
  }
  if (studentId) {
    params.append('studentId', studentId);
  }

  const response = await fetch(`/api/assigned-tasks?${params.toString()}`);
  console.log(`[API] Assigned Tasks Response status: ${response.status}`);
  if (!response.ok) {
    console.error(`[API] Assigned Tasks Network response was not ok: ${response.statusText}`);
    throw new Error(`Failed to fetch assigned tasks: ${response.statusText}`);
  }
  const data: AssignedTasksListResponse = await response.json();
  console.log(
    `[API] Received ${data.items?.length} assigned tasks from API mock. Total: ${data.totalItems}`
  );
  return data;
};

// --- Mutation Functions ---

/**
 * Creates a new assigned task.
 * Corresponds to Admin/Teacher assigning a task.
 */
export const createAssignedTask = async (
  // --- FIX: Expect assignedById in the input type ---
  assignmentData: Omit<AssignedTask, 'id' | 'isComplete' | 'verificationStatus' | 'assignedDate'> & {
    assignedById: string; // Expect assignedById to match the type
  }
): Promise<AssignedTask> => {
  console.log(
    '[API] Assigning task:',
    assignmentData.taskTitle,
    'to student',
    assignmentData.studentId
  );
  // --- FIX: Ensure the payload sent matches backend expectation if needed ---
  // If backend *strictly* expects 'assignerId', map it here:
  // const payload = { ...assignmentData, assignerId: assignmentData.assignedById };
  // delete (payload as any).assignedById;
  // Otherwise, send assignmentData directly if backend expects assignedById
  const payload = assignmentData;

  const response = await fetch('/api/assigned-tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), // Send the correct payload
  });
  console.log(`[API] Create Assigned Task Response status: ${response.status}`);
  if (!response.ok) {
    let errorMsg = `Failed to assign task: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {
      /* Ignore */
    }
    console.error(`[API] Create Assigned Task failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  const createdAssignment: AssignedTask = await response.json();
  console.log(`[API] Task assigned successfully (ID: ${createdAssignment.id})`);
  return createdAssignment;
};

/**
 * Updates an existing assigned task.
 * Used for marking complete and verification.
 */
export const updateAssignedTask = async ({
  assignmentId,
  updates,
}: {
  assignmentId: string;
  updates: Partial<
    Pick<
      AssignedTask,
      | 'isComplete'
      | 'completedDate'
      | 'verificationStatus'
      | 'verifiedById'
      | 'verifiedDate'
      | 'actualPointsAwarded'
    >
  >; // Only allow updating specific fields
}): Promise<AssignedTask> => {
  console.log(`[API] Updating assigned task ${assignmentId}:`, updates);
  // Basic validation on updates client-side?
  if (updates.actualPointsAwarded != null && updates.actualPointsAwarded < 0) {
     throw new Error("Awarded points cannot be negative.");
  }

  const response = await fetch(`/api/assigned-tasks/${assignmentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  console.log(`[API] Update Assigned Task Response status: ${response.status}`);
  if (!response.ok) {
    let errorMsg = `Failed to update assigned task ${assignmentId}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {
      /* Ignore */
    }
    console.error(`[API] Update Assigned Task failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  const updatedAssignment: AssignedTask = await response.json();
  console.log(`[API] Assigned task ${assignmentId} updated successfully`);
  return updatedAssignment;
};

/**
 * Deletes an assigned task.
 * Used by Admin/Teacher to remove an assignment.
 */
export const deleteAssignedTask = async (assignmentId: string): Promise<void> => {
  console.log(`[API] Deleting assigned task ${assignmentId}`);
  const response = await fetch(`/api/assigned-tasks/${assignmentId}`, {
    method: 'DELETE',
  });
  console.log(`[API] Delete Assigned Task Response status: ${response.status}`);
  if (!response.ok && response.status !== 204) {
    let errorMsg = `Failed to delete assigned task ${assignmentId}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {
      /* Ignore */
    }
    console.error(`[API] Delete Assigned Task failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  if (response.status === 204) {
    console.log(`[API] Assigned task ${assignmentId} deleted successfully (204 No Content).`);
  } else {
    console.log(
      `[API] Assigned task ${assignmentId} deleted successfully (Status: ${response.status}).`
    );
  }
};