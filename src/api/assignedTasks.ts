// src/api/assignedTasks.ts
import { getSupabase } from '../lib/supabaseClient';
import { AssignedTask, TaskVerificationStatus, UserStatus } from '../types/dataTypes';

// API type aliases remain the same
export type TaskAssignmentFilterStatusAPI = 'all' | 'assigned' | 'pending' | 'completed';
// UserStatus covers 'active' | 'inactive', so StudentTaskFilterStatusAPI aligns
export type StudentTaskFilterStatusAPI = UserStatus | 'all';

// Response structure remains the same
interface AssignedTasksListResponse {
  items: AssignedTask[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

// Helper to map DB row to AssignedTask type
// IMPORTANT: Does not include profile data, as it's only needed for filtering in the query
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
    verificationStatus: row.verification_status as TaskVerificationStatus ?? undefined,
    verifiedById: row.verified_by_id ?? undefined,
    verifiedDate: row.verified_date ?? undefined,
    actualPointsAwarded: row.actual_points_awarded ?? undefined,
});


export const fetchAssignedTasks = async ({
  page = 1,
  limit = 15, // Keep default limit consistent (or adjust globally)
  assignmentStatus = 'all',
  studentStatus = 'all', // UserStatus ('active' | 'inactive') or 'all'
  studentId,
  teacherId,
}: {
  page?: number;
  limit?: number;
  assignmentStatus?: TaskAssignmentFilterStatusAPI;
  studentStatus?: StudentTaskFilterStatusAPI; // Matches UserStatus | 'all'
  studentId?: string;
  teacherId?: string;
}): Promise<AssignedTasksListResponse> => {
  const client = getSupabase();
  console.log(`[Supabase] Fetching Assigned Tasks: page=${page}, limit=${limit}, assignmentStatus=${assignmentStatus}, studentStatus=${studentStatus}, studentId=${studentId}, teacherId=${teacherId}`);

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit - 1;

  // Select columns from assigned_tasks explicitly.
  // Use explicit foreign table syntax: 'profiles:student_id(status)' to link for filtering.
  // This relies on the Foreign Key being defined in the DB schema.
  let query = client
    .from('assigned_tasks')
    .select(`
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
    `, { count: 'exact' }); // Ensure count is requested

  // --- Apply Filters ---

  // Filter by specific student if provided
  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  // Filter by assignment status (remains the same)
  switch (assignmentStatus) {
    case 'assigned':
      query = query.eq('is_complete', false);
      break;
    case 'pending':
      // Ensure verification_status is checked correctly (ENUM or text)
      query = query.eq('is_complete', true).eq('verification_status', 'pending');
      break;
    case 'completed':
      // Assumes 'verified', 'partial', 'incomplete' are all considered "completed" states
      query = query.eq('is_complete', true).not('verification_status', 'eq', 'pending');
       // Could also use .in('verification_status', ['verified', 'partial', 'incomplete'])
      break;
    // 'all' requires no specific filter here
  }

  // Filter using the explicitly referenced foreign table 'profiles' via 'student_id'
  if (studentStatus !== 'all') {
    query = query.eq('profiles.status', studentStatus); // Filter on the linked table's column
  }


  // Filter by teacherId (requires fetching linked students first, similar to fetchStudents)
  let studentIdsForTeacher: string[] | null = null;
  if (teacherId && !studentId) { // Only filter by teacher if not already filtering by a specific student
    const { data: teacherStudentLinks, error: linkError } = await client
        .from('student_teachers')
        .select('student_id')
        .eq('teacher_id', teacherId);

    if (linkError) {
        console.error(`[Supabase] Error fetching student links for teacher ${teacherId} in fetchAssignedTasks:`, linkError.message);
        throw new Error(`Failed to fetch student links for teacher: ${linkError.message}`);
    }
    studentIdsForTeacher = teacherStudentLinks?.map(link => link.student_id) || [];

    if (studentIdsForTeacher.length === 0) {
        console.log(`[Supabase] Teacher ${teacherId} has no linked students. Returning empty task list.`);
        return { items: [], totalPages: 1, currentPage: 1, totalItems: 0 };
    }
    // Apply the filter using the fetched student IDs
    query = query.in('student_id', studentIdsForTeacher);
  }


  // Add ordering (e.g., newest assigned first) and pagination
  query = query
    .order('assigned_date', { ascending: false })
    .range(startIndex, endIndex);


  // Execute the final query
  const { data, error, count } = await query;

  if (error) {
    console.error(`[Supabase] Error fetching assigned tasks:`, error.message);
    // Log the filters that might have caused an issue
    console.error(`[Supabase] Filters applied:`, { assignmentStatus, studentStatus, studentId, teacherId, studentIdsForTeacher });
    throw new Error(`Failed to fetch assigned tasks: ${error.message}`);
  }

  const totalItems = count ?? 0;
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;

  // Map DB rows to AssignedTask objects (does not include profile data)
  const tasks = (data || []).map(mapDbRowToAssignedTask);

  console.log(`[Supabase] Received ${tasks.length} assigned tasks. Total matching filters: ${totalItems}`);
  return { items: tasks, totalPages, currentPage: page, totalItems };
};


// --- createAssignedTask ---
// NOTE: This is currently deferred until Edge Functions are implemented for proper assignment logic.
// It will throw an error if called.
export const createAssignedTask = async (
  assignmentData: Omit<AssignedTask, 'id' | 'isComplete' | 'verificationStatus' | 'assignedDate' | 'completedDate' | 'verifiedById' | 'verifiedDate' | 'actualPointsAwarded'> & { assignedById: string }
): Promise<AssignedTask> => {
  console.error("createAssignedTask API called, but implementation is deferred to Edge Function.");
  throw new Error("Task assignment functionality requires server-side implementation (Edge Function).");

  /* // Conceptual Edge Function Logic / Previous Supabase Insert (for reference)
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

// --- updateAssignedTask ---
// NOTE: Verification/points logic is currently deferred until Edge Functions.
// This function currently only handles marking as complete (is_complete: true).
export const updateAssignedTask = async ({
  assignmentId,
  updates,
}: {
  assignmentId: string;
  // Allow updating isComplete (for student/parent) OR verification fields (for teacher/admin - deferred)
  updates: Partial<
    Pick<
      AssignedTask,
      | 'isComplete'
      | 'verificationStatus'
      | 'verifiedById'
      | 'actualPointsAwarded'
    >
  >;
}): Promise<AssignedTask> => {
  const client = getSupabase();
  console.log(`[Supabase] Updating assigned task ${assignmentId}:`, updates);

  const updatePayload: any = {}; // Use any temporarily for easier snake_case mapping
  let isVerificationUpdate = false; // Keep flag for potential future use

  // Handle marking as complete ONLY (current capability)
  if (updates.isComplete === true && updates.verificationStatus === undefined) {
      console.log(`[Supabase] Marking task ${assignmentId} as complete (pending verification).`);
      updatePayload.is_complete = true;
      updatePayload.completed_date = new Date().toISOString();
      // When student marks complete, set status to pending verification
      updatePayload.verification_status = 'pending';
  } else if (updates.verificationStatus) {
     // --- Verification Logic DEFERRED ---
     console.error(`updateAssignedTask API called for verification update on ${assignmentId}, but implementation is deferred to Edge Function.`);
     throw new Error("Task verification/point awarding requires server-side implementation (Edge Function).");
     // isVerificationUpdate = true; // Flag would be set here
     // updatePayload.verification_status = updates.verificationStatus;
     // updatePayload.verified_by_id = updates.verifiedById; // Assume passed
     // updatePayload.verified_date = new Date().toISOString();
     // if (updates.verificationStatus === 'verified' || updates.verificationStatus === 'partial') {
     //     if (updates.actualPointsAwarded == null || updates.actualPointsAwarded < 0) { throw new Error(...); }
     //     updatePayload.actual_points_awarded = updates.actualPointsAwarded;
     // } else { // 'incomplete'
     //     updatePayload.actual_points_awarded = null;
     // }
     // if (!updatePayload.is_complete) { updatePayload.is_complete = true; }
     // --- END DEFERRED ---
  } else if (updates.hasOwnProperty('isComplete') && updates.isComplete === false) {
      // Handle edge case: Un-marking as complete?
      console.warn(`[Supabase] Un-marking task ${assignmentId} as complete. Resetting related fields.`);
      updatePayload.is_complete = false;
      updatePayload.completed_date = null;
      updatePayload.verification_status = null;
      updatePayload.verified_by_id = null;
      updatePayload.verified_date = null;
      updatePayload.actual_points_awarded = null;
  } else {
      // If no specific update action applies (e.g., just passing isComplete: false when already false)
      console.warn(`[Supabase] updateAssignedTask called for ${assignmentId} with no applicable changes.`);
      // Fetch and return current task state if no changes made
       const { data: currentData, error: currentError } = await client
           .from('assigned_tasks')
           .select('*')
           .eq('id', assignmentId)
           .single();
       if (currentError || !currentData) {
          throw new Error(`Failed to fetch current task ${assignmentId} for no-op update: ${currentError?.message || 'Not Found'}`);
       }
       return mapDbRowToAssignedTask(currentData);
  }


  // Perform the update only if updatePayload has keys
  if (Object.keys(updatePayload).length === 0) {
      // This case should be handled above, but as a fallback:
       console.warn(`[Supabase] updateAssignedTask reached update block with empty payload for ${assignmentId}.`);
       const { data: currentData, error: currentError } = await client.from('assigned_tasks').select('*').eq('id', assignmentId).single();
       if (currentError || !currentData) throw new Error(`Failed to fetch current task ${assignmentId}: ${currentError?.message || 'Not Found'}`);
       return mapDbRowToAssignedTask(currentData);
  }

  const { data, error } = await client
    .from('assigned_tasks')
    .update(updatePayload)
    .eq('id', assignmentId)
    .select('*') // Select all columns to return the updated task
    .single();

  if (error || !data) {
    console.error(`[Supabase] Error updating assigned task ${assignmentId}:`, error?.message);
    throw new Error(`Failed to update assigned task ${assignmentId}: ${error?.message || 'No data returned'}`);
  }

  // --- DEFERRED: Balance/History Update ---
  // if (isVerificationUpdate && updatePayload.actual_points_awarded > 0) {
  //     console.warn(`[Supabase] TODO: Implement balance update and history log via Edge Function for task ${assignmentId}.`);
  // }
  // --- END DEFERRED ---


  const updatedTask = mapDbRowToAssignedTask(data);
  console.log(`[Supabase] Assigned task ${assignmentId} updated successfully.`);
  return updatedTask;
};


// --- deleteAssignedTask ---
// Simple delete, likely okay for client-side if RLS allows.
// Consider if points need to be revoked if deleting a *verified* task (needs Edge Function).
export const deleteAssignedTask = async (assignmentId: string): Promise<void> => {
  const client = getSupabase();
  console.log(`[Supabase] Deleting assigned task ${assignmentId}`);

  // TODO: Consider implications if deleting a verified task. Should points be revoked?

  const { error } = await client
    .from('assigned_tasks')
    .delete()
    .eq('id', assignmentId);

  if (error) {
    console.error(`[Supabase] Error deleting assigned task ${assignmentId}:`, error.message);
    throw new Error(`Failed to delete assigned task ${assignmentId}: ${error.message}`);
  }

  console.log(`[Supabase] Assigned task ${assignmentId} deleted successfully.`);
};