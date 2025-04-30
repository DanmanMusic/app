import { getSupabase } from '../lib/supabaseClient';
import { AssignedTask, TaskVerificationStatus, UserStatus } from '../types/dataTypes';

export type TaskAssignmentFilterStatusAPI = 'all' | 'assigned' | 'pending' | 'completed';

export type StudentTaskFilterStatusAPI = UserStatus | 'all';

type VerificationStatusInput = 'verified' | 'partial' | 'incomplete';

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
  // Payload from UI: Details needed for assignment
  // assignerId is NOT needed here, it comes from auth token
  assignmentData: Omit<
    AssignedTask,
    | 'id'
    | 'assignedById' // Removed from input type
    | 'isComplete'
    | 'verificationStatus'
    | 'assignedDate'
    | 'completedDate'
    | 'verifiedById'
    | 'verifiedDate'
    | 'actualPointsAwarded'
  >
): Promise<AssignedTask> => {
  const client = getSupabase();
  console.log('[API createAssignedTask] Calling Edge Function "assignTask" for student:', assignmentData.studentId);

  // Prepare payload for the Edge Function
  // Only include fields the function expects in its payload interface
  const payload = {
      studentId: assignmentData.studentId,
      taskTitle: assignmentData.taskTitle,
      taskDescription: assignmentData.taskDescription,
      taskBasePoints: assignmentData.taskBasePoints,
  };

  // Validate required fields before sending
  if (!payload.studentId || !payload.taskTitle || payload.taskBasePoints == null || payload.taskBasePoints < 0) {
      console.error("[API createAssignedTask] Validation failed. Payload:", payload);
      throw new Error("Missing required fields for task assignment (studentId, title, description, basePoints).");
  }

  console.log('[API createAssignedTask] Payload being sent:', payload);

  const { data, error } = await client.functions.invoke('assignTask', {
    body: payload,
  });

  if (error) {
    console.error('[API createAssignedTask] Error invoking assignTask function:', error);
    // Attempt to parse nested error message
    let detailedError = error.message || 'Unknown function error';
    if (error.context && typeof error.context === 'object' && error.context !== null && 'error' in error.context) {
        detailedError = String((error.context as any).error) || detailedError;
    } else { try { const parsed = JSON.parse(error.message); if (parsed && parsed.error) detailedError = String(parsed.error); } catch (e) {} }
    if (error.context?.message) { detailedError += ` (Context: ${error.context.message})`; }
    throw new Error(`Task assignment failed: ${detailedError}`);
  }

  console.log('[API createAssignedTask] Edge Function returned successfully:', data);

  // Assuming the edge function returns the fully formed AssignedTask object
  if (!data || typeof data !== 'object' || !data.id) {
       console.error('[API createAssignedTask] Edge Function returned unexpected data structure:', data);
       throw new Error('Task assignment function returned invalid data format.');
  }

  // Directly return the data assuming it matches the AssignedTask type
  return data as AssignedTask;
};

export const updateAssignedTask = async ({
  assignmentId,
  updates,
}: {
  assignmentId: string;
  // Updated type to reflect distinct operations
  updates:
    | { isComplete: true; verificationStatus?: never; actualPointsAwarded?: never }
    | { isComplete: false; verificationStatus?: never; actualPointsAwarded?: never }
    | { isComplete?: never; verificationStatus: VerificationStatusInput; actualPointsAwarded: number }
}): Promise<AssignedTask> => {
  const client = getSupabase();
  console.log(`[API updateAssignedTask] Request for task ${assignmentId}:`, updates);

  // --- CASE 1: Verification Update (Call Edge Function) ---
  if (updates.verificationStatus && updates.actualPointsAwarded !== undefined) {
    console.log(`[API updateAssignedTask] Verification request detected. Calling "verifyTask" Edge Function.`);

    // Prepare payload for the Edge Function
    const payload = {
      assignmentId: assignmentId,
      verificationStatus: updates.verificationStatus,
      actualPointsAwarded: updates.actualPointsAwarded,
    };

    // Basic validation before calling function
    if (payload.actualPointsAwarded < 0 || !Number.isInteger(payload.actualPointsAwarded)) {
        throw new Error("Invalid points awarded. Must be a non-negative integer.");
    }
     if (payload.verificationStatus === 'incomplete' && payload.actualPointsAwarded !== 0) {
         throw new Error("Points must be 0 for 'incomplete' status.");
     }

     console.log('[API updateAssignedTask] Payload being sent to verifyTask:', payload);

     // --- Invoke the verifyTask Edge Function ---
     const { data, error } = await client.functions.invoke('verifyTask', {
       body: payload,
     });
     // --- End Invoke ---

     if (error) {
       console.error('[API updateAssignedTask] Error invoking verifyTask function:', error);
       let detailedError = error.message || 'Unknown function error';
        if (error.context && typeof error.context === 'object' && error.context !== null && 'error' in error.context) { detailedError = String((error.context as any).error) || detailedError; }
        else { try { const parsed = JSON.parse(error.message); if (parsed && parsed.error) detailedError = String(parsed.error); } catch (e) {} }
        if (error.context?.message) { detailedError += ` (Context: ${error.context.message})`; }
       throw new Error(`Task verification failed: ${detailedError}`);
     }

     console.log('[API updateAssignedTask] verifyTask Edge Function returned successfully:', data);

     if (!data || typeof data !== 'object' || !data.id) {
          console.error('[API updateAssignedTask] verifyTask returned unexpected data structure:', data);
          throw new Error('Task verification function returned invalid data format.');
     }

     // Return the updated task data received from the Edge Function
     return data as AssignedTask;
  }

  // --- CASE 2: Marking Task Complete (Direct DB Update - relies on RLS) ---
  else if (updates.isComplete === true) {
    console.log(`[API updateAssignedTask] Marking task ${assignmentId} as complete (Direct DB Update).`);
    const updatePayload = {
      is_complete: true,
      completed_date: new Date().toISOString(),
      verification_status: 'pending' as const,
    };

    // Perform update without select().single()
    const { error: updateError } = await client
        .from('assigned_tasks')
        .update(updatePayload)
        .eq('id', assignmentId);

    if (updateError) {
        console.error(`[API updateAssignedTask] Error marking task complete ${assignmentId}:`, updateError.message);
        throw new Error(`Failed to mark task complete: ${updateError.message}`);
    }

    // Refetch the updated task data separately
    console.log(`[API updateAssignedTask] Update successful for ${assignmentId}. Refetching task...`);
    const { data: refetchedData, error: fetchError } = await client
        .from('assigned_tasks')
        .select('*')
        .eq('id', assignmentId)
        .single();

    if (fetchError || !refetchedData) {
        console.error(`[API updateAssignedTask] Failed to refetch task ${assignmentId} after update:`, fetchError?.message);
        throw new Error(`Task marked complete, but failed to refetch updated record: ${fetchError?.message || 'Not Found'}`);
    }

    const updatedTask = mapDbRowToAssignedTask(refetchedData);
    console.log(`[API updateAssignedTask] Task ${assignmentId} marked complete successfully.`);
    return updatedTask;
  }

  // --- CASE 3: Un-marking Task Complete (Direct DB Update - RLS might block/restrict) ---
  else if (updates.isComplete === false) {
     console.warn(`[API updateAssignedTask] Un-marking task ${assignmentId} as complete (Direct DB Update - Requires appropriate RLS).`);
     const updatePayload = {
        is_complete: false, completed_date: null, verification_status: null, verified_by_id: null, verified_date: null, actual_points_awarded: null,
     };
     const { error: unmarkError } = await client
      .from('assigned_tasks').update(updatePayload).eq('id', assignmentId);

     if (unmarkError) {
        console.error(`[API updateAssignedTask] Error un-marking task complete ${assignmentId}:`, unmarkError.message);
        throw new Error(`Failed to un-mark task complete: ${unmarkError.message}`);
     }
     console.log(`[API updateAssignedTask] Un-mark successful for ${assignmentId}. Refetching task...`);
     const { data: refetchedData, error: fetchError } = await client
        .from('assigned_tasks').select('*').eq('id', assignmentId).single();
     if (fetchError || !refetchedData) {
         console.error(`[API updateAssignedTask] Failed to refetch task ${assignmentId} after un-mark:`, fetchError?.message);
         throw new Error(`Task un-marked, but failed to refetch updated record: ${fetchError?.message || 'Not Found'}`);
     }
     const updatedTask = mapDbRowToAssignedTask(refetchedData);
     console.log(`[API updateAssignedTask] Task ${assignmentId} un-marked successfully.`);
     return updatedTask;
  }

  // --- CASE 4: No recognized update operation ---
  else {
    console.warn(`[API updateAssignedTask] Called for ${assignmentId} with no applicable changes/operation detected. Updates:`, updates);
    const { data: currentData, error: currentError } = await client
      .from('assigned_tasks').select('*').eq('id', assignmentId).single();
    if (currentError || !currentData) { throw new Error(`Failed to fetch current task ${assignmentId}: ${currentError?.message || 'Not Found'}`); }
    return mapDbRowToAssignedTask(currentData);
  }
};

export const deleteAssignedTask = async (assignmentId: string): Promise<void> => {
  const client = getSupabase();
  console.log(`[API deleteAssignedTask] Calling Edge Function "deleteAssignedTask" for ID: ${assignmentId}`);

  // Prepare payload for the Edge Function
  const payload = {
    assignmentId: assignmentId,
  };

  if (!payload.assignmentId) {
      console.error("[API deleteAssignedTask] Validation failed: assignmentId is missing.");
      throw new Error("Cannot delete task: Assignment ID is missing.");
  }

  console.log('[API deleteAssignedTask] Payload being sent:', payload);

  const { data, error } = await client.functions.invoke('deleteAssignedTask', {
    body: payload,
  });

  if (error) {
    console.error('[API deleteAssignedTask] Error invoking deleteAssignedTask function:', error);
    // Attempt to parse nested error message
    let detailedError = error.message || 'Unknown function error';
    if (error.context && typeof error.context === 'object' && error.context !== null && 'error' in error.context) {
        detailedError = String((error.context as any).error) || detailedError;
    } else { try { const parsed = JSON.parse(error.message); if (parsed && parsed.error) detailedError = String(parsed.error); } catch (e) {} }
    if (error.context?.message) { detailedError += ` (Context: ${error.context.message})`; }

    // Distinguish between permission denied and other errors if possible
    if (detailedError.toLowerCase().includes('permission denied')) {
         throw new Error(`Deletion failed: ${detailedError}`); // More specific message
    } else {
        throw new Error(`Failed to delete assigned task: ${detailedError}`);
    }
  }

  console.log('[API deleteAssignedTask] Edge Function returned successfully:', data);
  // No need to return anything on successful delete (Promise<void>)
};
