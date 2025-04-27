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
  limit = 10,
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

  // Base query targeting assigned_tasks
  // Select all columns needed for AssignedTask type
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
        profiles ( status ) -- Join profiles to filter by student status
    `, { count: 'exact' }); // Count needed for pagination


  // --- Apply Filters ---

  // Filter by specific student if provided
  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  // Filter by assignment status
  switch (assignmentStatus) {
    case 'assigned':
      query = query.eq('is_complete', false);
      break;
    case 'pending':
      query = query.eq('is_complete', true).eq('verification_status', 'pending');
      break;
    case 'completed':
      // Assumes 'verified', 'partial', 'incomplete' are all considered "completed" states (post-pending)
      query = query.eq('is_complete', true).not('verification_status', 'eq', 'pending');
       // Could also use .in('verification_status', ['verified', 'partial', 'incomplete']) if stricter
      break;
    // 'all' requires no specific filter here
  }

  // Filter by student status (requires join on profiles)
  if (studentStatus !== 'all') {
    // The join is implicitly handled by selecting `profiles(status)`
    // We filter on the joined table's column
    query = query.eq('profiles.status', studentStatus);
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

  // Map DB rows to AssignedTask objects
  const tasks = (data || []).map(mapDbRowToAssignedTask);

  console.log(`[Supabase] Received ${tasks.length} assigned tasks. Total matching filters: ${totalItems}`);
  return { items: tasks, totalPages, currentPage: page, totalItems };
};


export const createAssignedTask = async (
  assignmentData: Omit<AssignedTask, 'id' | 'isComplete' | 'verificationStatus' | 'assignedDate' | 'completedDate' | 'verifiedById' | 'verifiedDate' | 'actualPointsAwarded'> & { assignedById: string }
): Promise<AssignedTask> => {
  const client = getSupabase();
  console.log('[Supabase] Assigning task:', assignmentData.taskTitle, 'to student', assignmentData.studentId);

  // Validate required fields
  if (!assignmentData.studentId || !assignmentData.assignedById || !assignmentData.taskTitle || !assignmentData.taskDescription || assignmentData.taskBasePoints == null || assignmentData.taskBasePoints < 0) {
      throw new Error("Missing required fields for task assignment (studentId, assignedById, title, description, basePoints).");
  }

  const itemToInsert = {
      student_id: assignmentData.studentId,
      assigned_by_id: assignmentData.assignedById,
      task_title: assignmentData.taskTitle,
      task_description: assignmentData.taskDescription,
      task_base_points: assignmentData.taskBasePoints,
      // assigned_date defaults to now() in DB
      is_complete: false, // Default value
      // Other fields are null/undefined initially
  };

  const { data, error } = await client
    .from('assigned_tasks')
    .insert(itemToInsert)
    .select('*') // Select all columns after insert
    .single();

  if (error || !data) {
    console.error(`[Supabase] Error creating assigned task:`, error?.message);
    throw new Error(`Failed to assign task: ${error?.message || 'No data returned'}`);
  }

  const createdAssignment = mapDbRowToAssignedTask(data);
  console.log(`[Supabase] Task assigned successfully (ID: ${createdAssignment.id})`);
  return createdAssignment;
};


export const updateAssignedTask = async ({
  assignmentId,
  updates,
}: {
  assignmentId: string;
  // Only allow updating fields relevant to completion and verification
  updates: Partial<
    Pick<
      AssignedTask,
      | 'isComplete' // Student/Parent marks complete
      // Verification fields (Teacher/Admin)
      | 'verificationStatus'
      | 'verifiedById'
      | 'actualPointsAwarded'
    >
  >;
}): Promise<AssignedTask> => {
  const client = getSupabase();
  console.log(`[Supabase] Updating assigned task ${assignmentId}:`, updates);

  const updatePayload: any = {}; // Use any temporarily for easier snake_case mapping
  let isVerificationUpdate = false;

  // Handle marking as complete
  if (updates.isComplete === true) {
      updatePayload.is_complete = true;
      updatePayload.completed_date = new Date().toISOString();
      // When marked complete, implicitly set status to pending verification
      // This might overwrite an explicit 'pending' in updates, which is fine.
      updatePayload.verification_status = 'pending';
  }

  // Handle verification updates (only if status is provided)
  if (updates.verificationStatus) {
     isVerificationUpdate = true;
     updatePayload.verification_status = updates.verificationStatus;
     updatePayload.verified_by_id = updates.verifiedById; // Assume this is passed if status is passed
     updatePayload.verified_date = new Date().toISOString();

     // Only set points if status is verifying or partial
     if (updates.verificationStatus === 'verified' || updates.verificationStatus === 'partial') {
         if (updates.actualPointsAwarded == null || updates.actualPointsAwarded < 0) {
             throw new Error('Valid non-negative points required for verified/partial status.');
         }
         updatePayload.actual_points_awarded = updates.actualPointsAwarded;
     } else {
         // For 'incomplete', explicitly null out points
         updatePayload.actual_points_awarded = null;
     }
     // Ensure is_complete is true when verifying (should already be, but good practice)
      if (!updatePayload.is_complete) {
          updatePayload.is_complete = true;
          // Optionally set completed_date if marking complete AND verifying simultaneously (less common)
          // if (!updatePayload.completed_date) updatePayload.completed_date = new Date().toISOString();
      }
  }

  if (Object.keys(updatePayload).length === 0) {
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

  // Perform the update
  const { data, error } = await client
    .from('assigned_tasks')
    .update(updatePayload)
    .eq('id', assignmentId)
    .select('*')
    .single();

  if (error || !data) {
    console.error(`[Supabase] Error updating assigned task ${assignmentId}:`, error?.message);
    throw new Error(`Failed to update assigned task ${assignmentId}: ${error?.message || 'No data returned'}`);
  }

  // --- DEFERRED: Balance/History Update ---
  // If this was a verification update that awarded points, trigger balance/history update here.
  // This *should* ideally be an Edge Function call instead of direct client logic.
  if (isVerificationUpdate && updatePayload.actual_points_awarded > 0) {
      console.warn(`[Supabase] TODO: Implement balance update and history log for task ${assignmentId}, awarded ${updatePayload.actual_points_awarded} points.`);
      // Example (Conceptual - Needs Edge Function):
      // await client.rpc('award_task_points', {
      //    p_assignment_id: assignmentId,
      //    p_student_id: data.student_id,
      //    p_points: updatePayload.actual_points_awarded,
      //    p_verifier_id: updatePayload.verified_by_id,
      //    p_task_title: data.task_title,
      //    p_verification_status: data.verification_status
      // });
  }
  // --- END DEFERRED ---


  const updatedTask = mapDbRowToAssignedTask(data);
  console.log(`[Supabase] Assigned task ${assignmentId} updated successfully.`);
  return updatedTask;
};


export const deleteAssignedTask = async (assignmentId: string): Promise<void> => {
  const client = getSupabase();
  console.log(`[Supabase] Deleting assigned task ${assignmentId}`);

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