import { getSupabase } from '../lib/supabaseClient';
import { AssignedTask, TaskVerificationStatus, UserStatus } from '../types/dataTypes';

export type TaskAssignmentFilterStatusAPI = 'all' | 'assigned' | 'pending' | 'completed';

export type StudentTaskFilterStatusAPI = UserStatus | 'all';

interface AssignedTasksListResponse {
  items: AssignedTask[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

const mapDbRowToAssignedTask = (row: any): AssignedTask => ({
  id: row.id,
  studentId: row.student_id,
  assignedById: row.assigned_by_id,
  assignedDate: row.assigned_date,
  taskTitle: row.task_title,
  taskDescription: row.task_description,
  taskBasePoints: row.task_base_points,
  isComplete: row.is_complete,
  completedDate: row.completed_date ?? undefined,
  verificationStatus: (row.verification_status as TaskVerificationStatus) ?? undefined,
  verifiedById: row.verified_by_id ?? undefined,
  verifiedDate: row.verified_date ?? undefined,
  actualPointsAwarded: row.actual_points_awarded ?? undefined,
});

export const fetchAssignedTasks = async ({
  page = 1,
  limit = 15,
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
  const client = getSupabase();
  console.log(
    `[Supabase] Fetching Assigned Tasks: page=${page}, limit=${limit}, assignmentStatus=${assignmentStatus}, studentStatus=${studentStatus}, studentId=${studentId}, teacherId=${teacherId}`
  );

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit - 1;

  let query = client.from('assigned_tasks').select(
    `
        id,
        student_id,
        assigned_by_id,
        assigned_date,
        task_title,
        task_description,
        task_base_points,
        is_complete,
        completed_date,
        verification_status,
        verified_by_id,
        verified_date,
        actual_points_awarded,
        profiles:student_id ( status )
    `,
    { count: 'exact' }
  );

  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  switch (assignmentStatus) {
    case 'assigned':
      query = query.eq('is_complete', false);
      break;
    case 'pending':
      query = query.eq('is_complete', true).eq('verification_status', 'pending');
      break;
    case 'completed':
      query = query.eq('is_complete', true).not('verification_status', 'eq', 'pending');

      break;
  }

  if (studentStatus !== 'all') {
    query = query.eq('profiles.status', studentStatus);
  }

  let studentIdsForTeacher: string[] | null = null;
  if (teacherId && !studentId) {
    const { data: teacherStudentLinks, error: linkError } = await client
      .from('student_teachers')
      .select('student_id')
      .eq('teacher_id', teacherId);

    if (linkError) {
      console.error(
        `[Supabase] Error fetching student links for teacher ${teacherId} in fetchAssignedTasks:`,
        linkError.message
      );
      throw new Error(`Failed to fetch student links for teacher: ${linkError.message}`);
    }
    studentIdsForTeacher = teacherStudentLinks?.map(link => link.student_id) || [];

    if (studentIdsForTeacher.length === 0) {
      console.log(
        `[Supabase] Teacher ${teacherId} has no linked students. Returning empty task list.`
      );
      return { items: [], totalPages: 1, currentPage: 1, totalItems: 0 };
    }

    query = query.in('student_id', studentIdsForTeacher);
  }

  query = query.order('assigned_date', { ascending: false }).range(startIndex, endIndex);

  const { data, error, count } = await query;

  if (error) {
    console.error(`[Supabase] Error fetching assigned tasks:`, error.message);

    console.error(`[Supabase] Filters applied:`, {
      assignmentStatus,
      studentStatus,
      studentId,
      teacherId,
      studentIdsForTeacher,
    });
    throw new Error(`Failed to fetch assigned tasks: ${error.message}`);
  }

  const totalItems = count ?? 0;
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;

  const tasks = (data || []).map(mapDbRowToAssignedTask);

  console.log(
    `[Supabase] Received ${tasks.length} assigned tasks. Total matching filters: ${totalItems}`
  );
  return { items: tasks, totalPages, currentPage: page, totalItems };
};

export const createAssignedTask = async (
  assignmentData: Omit<
    AssignedTask,
    | 'id'
    | 'isComplete'
    | 'verificationStatus'
    | 'assignedDate'
    | 'completedDate'
    | 'verifiedById'
    | 'verifiedDate'
    | 'actualPointsAwarded'
  > & { assignedById: string }
): Promise<AssignedTask> => {
  console.error('createAssignedTask API called, but implementation is deferred to Edge Function.');
  throw new Error(
    'Task assignment functionality requires server-side implementation (Edge Function).'
  );

  /* 
  const client = getSupabase();
  console.log('[Supabase] Assigning task:', assignmentData.taskTitle, 'to student', assignmentData.studentId);

  if (!assignmentData.studentId || !assignmentData.assignedById || !assignmentData.taskTitle || !assignmentData.taskDescription || assignmentData.taskBasePoints == null || assignmentData.taskBasePoints < 0) {
      throw new Error("Missing required fields for task assignment (studentId, assignedById, title, description, basePoints).");
  }
  const itemToInsert = {
      student_id: assignmentData.studentId,
      assigned_by_id: assignmentData.assignedById,
      task_title: assignmentData.taskTitle,
      task_description: assignmentData.taskDescription,
      task_base_points: assignmentData.taskBasePoints,
      is_complete: false,
  };
  const { data, error } = await client
    .from('assigned_tasks')
    .insert(itemToInsert)
    .select('*')
    .single();
  if (error || !data) {
    console.error(`[Supabase] Error creating assigned task:`, error?.message);
    throw new Error(`Failed to assign task: ${error?.message || 'No data returned'}`);
  }
  const createdAssignment = mapDbRowToAssignedTask(data);
  console.log(`[Supabase] Task assigned successfully (ID: ${createdAssignment.id})`);
  return createdAssignment;
  */
};

export const updateAssignedTask = async ({
  assignmentId,
  updates,
}: {
  assignmentId: string;

  updates: Partial<
    Pick<AssignedTask, 'isComplete' | 'verificationStatus' | 'verifiedById' | 'actualPointsAwarded'>
  >;
}): Promise<AssignedTask> => {
  const client = getSupabase();
  console.log(`[Supabase] Updating assigned task ${assignmentId}:`, updates);

  const updatePayload: any = {};
  let isVerificationUpdate = false;

  if (updates.isComplete === true && updates.verificationStatus === undefined) {
    console.log(`[Supabase] Marking task ${assignmentId} as complete (pending verification).`);
    updatePayload.is_complete = true;
    updatePayload.completed_date = new Date().toISOString();

    updatePayload.verification_status = 'pending';
  } else if (updates.verificationStatus) {
    console.error(
      `updateAssignedTask API called for verification update on ${assignmentId}, but implementation is deferred to Edge Function.`
    );
    throw new Error(
      'Task verification/point awarding requires server-side implementation (Edge Function).'
    );
  } else if (updates.hasOwnProperty('isComplete') && updates.isComplete === false) {
    console.warn(
      `[Supabase] Un-marking task ${assignmentId} as complete. Resetting related fields.`
    );
    updatePayload.is_complete = false;
    updatePayload.completed_date = null;
    updatePayload.verification_status = null;
    updatePayload.verified_by_id = null;
    updatePayload.verified_date = null;
    updatePayload.actual_points_awarded = null;
  } else {
    console.warn(
      `[Supabase] updateAssignedTask called for ${assignmentId} with no applicable changes.`
    );

    const { data: currentData, error: currentError } = await client
      .from('assigned_tasks')
      .select('*')
      .eq('id', assignmentId)
      .single();
    if (currentError || !currentData) {
      throw new Error(
        `Failed to fetch current task ${assignmentId} for no-op update: ${currentError?.message || 'Not Found'}`
      );
    }
    return mapDbRowToAssignedTask(currentData);
  }

  if (Object.keys(updatePayload).length === 0) {
    console.warn(
      `[Supabase] updateAssignedTask reached update block with empty payload for ${assignmentId}.`
    );
    const { data: currentData, error: currentError } = await client
      .from('assigned_tasks')
      .select('*')
      .eq('id', assignmentId)
      .single();
    if (currentError || !currentData)
      throw new Error(
        `Failed to fetch current task ${assignmentId}: ${currentError?.message || 'Not Found'}`
      );
    return mapDbRowToAssignedTask(currentData);
  }

  const { data, error } = await client
    .from('assigned_tasks')
    .update(updatePayload)
    .eq('id', assignmentId)
    .select('*')
    .single();

  if (error || !data) {
    console.error(`[Supabase] Error updating assigned task ${assignmentId}:`, error?.message);
    throw new Error(
      `Failed to update assigned task ${assignmentId}: ${error?.message || 'No data returned'}`
    );
  }

  const updatedTask = mapDbRowToAssignedTask(data);
  console.log(`[Supabase] Assigned task ${assignmentId} updated successfully.`);
  return updatedTask;
};

export const deleteAssignedTask = async (assignmentId: string): Promise<void> => {
  const client = getSupabase();
  console.log(`[Supabase] Deleting assigned task ${assignmentId}`);

  const { error } = await client.from('assigned_tasks').delete().eq('id', assignmentId);

  if (error) {
    console.error(`[Supabase] Error deleting assigned task ${assignmentId}:`, error.message);
    throw new Error(`Failed to delete assigned task ${assignmentId}: ${error.message}`);
  }

  console.log(`[Supabase] Assigned task ${assignmentId} deleted successfully.`);
};
