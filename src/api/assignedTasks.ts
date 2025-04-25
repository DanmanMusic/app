import { AssignedTask } from '../mocks/mockAssignedTasks';
import { UserStatus } from '../types/userTypes';

export type TaskAssignmentFilterStatusAPI = 'all' | 'assigned' | 'pending' | 'completed';
export type StudentTaskFilterStatusAPI = UserStatus | 'all';

interface AssignedTasksListResponse {
  items: AssignedTask[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

export const fetchAssignedTasks = async ({
  page = 1,
  limit = 10,
  assignmentStatus = 'all',
  studentStatus = 'all',
  studentId,
  teacherId,
}: {
  page?: number;
  limit?: number;
  assignmentStatus?: TaskAssignmentFilterStatusAPI;
  studentStatus?: StudentTaskFilterStatusAPI;
  studentId?: string;
  teacherId?: string;
}): Promise<AssignedTasksListResponse> => {
  console.log(
    `[API] Fetching Assigned Tasks: page=${page}, limit=${limit}, assignmentStatus=${assignmentStatus}, studentStatus=${studentStatus}${studentId ? `, studentId=${studentId}` : ''}${teacherId ? `, teacherId=${teacherId}` : ''}`
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

  if (teacherId) {
    params.append('teacherId', teacherId);
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

export const createAssignedTask = async (
  assignmentData: Omit<
    AssignedTask,
    'id' | 'isComplete' | 'verificationStatus' | 'assignedDate'
  > & {
    assignedById: string;
  }
): Promise<AssignedTask> => {
  console.log(
    '[API] Assigning task:',
    assignmentData.taskTitle,
    'to student',
    assignmentData.studentId
  );

  const payload = assignmentData;

  const response = await fetch('/api/assigned-tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  console.log(`[API] Create Assigned Task Response status: ${response.status}`);
  if (!response.ok) {
    let errorMsg = `Failed to assign task: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {
      console.log('[API] assignedTasks try/catch error:', e);
    }
    console.error(`[API] Create Assigned Task failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  const createdAssignment: AssignedTask = await response.json();
  console.log(`[API] Task assigned successfully (ID: ${createdAssignment.id})`);
  return createdAssignment;
};

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
  >;
}): Promise<AssignedTask> => {
  console.log(`[API] Updating assigned task ${assignmentId}:`, updates);

  if (updates.actualPointsAwarded != null && updates.actualPointsAwarded < 0) {
    throw new Error('Awarded points cannot be negative.');
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
      console.log('[API] assignedTasks try/catch error:', e);
    }
    console.error(`[API] Update Assigned Task failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  const updatedAssignment: AssignedTask = await response.json();
  console.log(`[API] Assigned task ${assignmentId} updated successfully`);
  return updatedAssignment;
};

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
      console.log('[API] assignedTasks try/catch error:', e);
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
