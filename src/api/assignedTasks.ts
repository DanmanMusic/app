// src/api/assignedTasks.ts

import { getSupabase } from '../lib/supabaseClient';
import { AssignedTask, TaskVerificationStatus, UserStatus } from '../types/dataTypes';
import { getUserDisplayName } from '../utils/helpers';

export type TaskAssignmentFilterStatusAPI = 'all' | 'assigned' | 'pending' | 'completed';
export type StudentTaskFilterStatusAPI = UserStatus | 'all';

type VerificationStatusInput = 'verified' | 'partial' | 'incomplete';

interface AssignedTasksListResponse {
  items: AssignedTask[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

const mapDbRowToAssignedTaskWithNames = (row: any): AssignedTask => {
  const getAssignerName = () => {
    if (row.assigner_profile?.first_name || row.assigner_profile?.last_name) {
      return getUserDisplayName(row.assigner_profile);
    }
    return row.assigned_by_id ? `ID: ${row.assigned_by_id}` : 'Unknown Assigner';
  };

  const getVerifierName = () => {
    if (!row.verifier_profile) return undefined;
    if (row.verifier_profile.first_name || row.verifier_profile.last_name) {
      return getUserDisplayName(row.verifier_profile);
    }
    return row.verified_by_id ? `ID: ${row.verified_by_id}` : undefined;
  };

  const getStudentStatus = (): UserStatus | 'unknown' => {
    if (row.student_profile?.status) {
      const status = row.student_profile.status;
      if (status === 'active' || status === 'inactive') {
        return status as UserStatus;
      }
    }
    return 'unknown';
  };

  return {
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
    assignerName: getAssignerName(),
    verifierName: getVerifierName(),
    studentStatus: getStudentStatus(),
  };
};

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

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit - 1;

  const selectString = `
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
      student_profile:profiles!fk_assigned_tasks_student ( status ),
      assigner_profile:profiles!fk_assigned_tasks_assigner ( first_name, last_name, nickname ),
      verifier_profile:profiles!fk_assigned_tasks_verifier ( first_name, last_name, nickname )
    `;

  let query = client.from('assigned_tasks').select(selectString, { count: 'exact' });

  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  switch (assignmentStatus) {
    case 'assigned':
      query = query.eq('is_complete', false);
      break;
    case 'pending':
      query = query.eq('is_complete', true);
      query = query.eq('verification_status', 'pending');
      break;
    case 'completed':
      query = query.eq('is_complete', true);
      query = query.not('verification_status', 'eq', 'pending');
      break;
  }

  if (studentStatus !== 'all') {
    console.log(
      `[Supabase] Applying student status filter: student_profile.status eq ${studentStatus}`
    ); // Add log
    query = query.filter('student_profile.status', 'eq', studentStatus);
  }

  let studentIdsForTeacher: string[] | null = null;
  if (teacherId && !studentId) {
    const { data: teacherStudentLinks, error: linkError } = await client
      .from('student_teachers')
      .select('student_id')
      .eq('teacher_id', teacherId);

    if (linkError) {
      throw new Error(`Failed to fetch student links for teacher: ${linkError.message}`);
    }
    studentIdsForTeacher = teacherStudentLinks?.map(link => link.student_id) || [];

    if (studentIdsForTeacher.length === 0) {
      return { items: [], totalPages: 1, currentPage: 1, totalItems: 0 };
    }
    query = query.in('student_id', studentIdsForTeacher);
  }

  query = query.order('assigned_date', { ascending: false }).range(startIndex, endIndex);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch assigned tasks: ${error.message}`);
  }

  const totalItems = count ?? 0;
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;

  const tasks = (data || []).map(mapDbRowToAssignedTaskWithNames);

  return { items: tasks, totalPages, currentPage: page, totalItems };
};

export const createAssignedTask = async (
  assignmentData: Omit<
    AssignedTask,
    | 'id'
    | 'assignedById'
    | 'isComplete'
    | 'verificationStatus'
    | 'assignedDate'
    | 'completedDate'
    | 'verifiedById'
    | 'verifiedDate'
    | 'actualPointsAwarded'
    | 'assignerName'
    | 'verifierName'
    | 'studentStatus'
  >
): Promise<AssignedTask> => {
  const client = getSupabase();

  const payload = {
    studentId: assignmentData.studentId,
    taskTitle: assignmentData.taskTitle,
    taskDescription: assignmentData.taskDescription,
    taskBasePoints: assignmentData.taskBasePoints,
    taskLinkUrl: assignmentData.taskLinkUrl || null,
    taskAttachmentPath: assignmentData.taskAttachmentPath || null,
  };

  if (
    !payload.studentId ||
    !payload.taskTitle ||
    payload.taskBasePoints == null ||
    payload.taskBasePoints < 0
  ) {
    throw new Error(
      'Missing required fields for task assignment (studentId, title, description, basePoints).'
    );
  }

  const { data, error } = await client.functions.invoke('assignTask', {
    body: payload,
  });

  if (error) {
    let detailedError = error.message || 'Unknown function error';
    if (
      error.context &&
      typeof error.context === 'object' &&
      error.context !== null &&
      'error' in error.context
    ) {
      detailedError = String((error.context as any).error) || detailedError;
    } else {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed && parsed.error) detailedError = String(parsed.error);
      } catch (e) {}
    }
    if (error.context?.message) {
      detailedError += ` (Context: ${error.context.message})`;
    }
    throw new Error(`Task assignment failed: ${detailedError}`);
  }

  if (!data || typeof data !== 'object' || !data.id) {
    throw new Error('Task assignment function returned invalid data format.');
  }

  return data as AssignedTask;
};

export const updateAssignedTask = async ({
  assignmentId,
  updates,
}: {
  assignmentId: string;
  updates:
    | { isComplete: true; verificationStatus?: never; actualPointsAwarded?: never }
    | { isComplete: false; verificationStatus?: never; actualPointsAwarded?: never }
    | {
        isComplete?: never;
        verificationStatus: VerificationStatusInput;
        actualPointsAwarded: number;
      };
}): Promise<AssignedTask> => {
  const client = getSupabase();

  const detailedSelectString = `
       id, student_id, assigned_by_id, assigned_date, task_title, task_description,
       task_base_points, is_complete, completed_date, verification_status, verified_by_id,
       verified_date, actual_points_awarded,
       student_profile:profiles!fk_assigned_tasks_student ( status ),
       assigner_profile:profiles!fk_assigned_tasks_assigner ( first_name, last_name, nickname ),
       verifier_profile:profiles!fk_assigned_tasks_verifier ( first_name, last_name, nickname )
   `;

  if (updates.verificationStatus && updates.actualPointsAwarded !== undefined) {
    const payload = {
      assignmentId: assignmentId,
      verificationStatus: updates.verificationStatus,
      actualPointsAwarded: updates.actualPointsAwarded,
    };

    if (payload.actualPointsAwarded < 0 || !Number.isInteger(payload.actualPointsAwarded)) {
      throw new Error('Invalid points awarded.');
    }
    if (payload.verificationStatus === 'incomplete' && payload.actualPointsAwarded !== 0) {
      throw new Error("Points must be 0 for 'incomplete'.");
    }

    const { data, error } = await client.functions.invoke('verifyTask', { body: payload });

    if (error) {
      throw new Error(`Task verification failed: ${error.message || 'Unknown function error'}`);
    }
    if (!data || typeof data !== 'object' || !data.id) {
      throw new Error('Task verification function returned invalid data format.');
    }

    const { data: refetchedData, error: fetchError } = await client
      .from('assigned_tasks')
      .select(detailedSelectString)
      .eq('id', assignmentId)
      .single();

    if (fetchError || !refetchedData) {
      return data as AssignedTask;
    }
    return mapDbRowToAssignedTaskWithNames(refetchedData);
  } else if (updates.isComplete === true) {
    const updatePayload = {
      is_complete: true,
      completed_date: new Date().toISOString(),
      verification_status: 'pending' as const,
    };
    const { error: updateError } = await client
      .from('assigned_tasks')
      .update(updatePayload)
      .eq('id', assignmentId);
    if (updateError) throw new Error(`Failed to mark task complete: ${updateError.message}`);

    const { data: refetchedData, error: fetchError } = await client
      .from('assigned_tasks')
      .select(detailedSelectString)
      .eq('id', assignmentId)
      .single();
    if (fetchError || !refetchedData)
      throw new Error(
        `Task marked complete, but failed to refetch: ${fetchError?.message || 'Not Found'}`
      );
    return mapDbRowToAssignedTaskWithNames(refetchedData);
  } else if (updates.isComplete === false) {
    const updatePayload = {
      is_complete: false,
      completed_date: null,
      verification_status: null,
      verified_by_id: null,
      verified_date: null,
      actual_points_awarded: null,
    };
    const { error: unmarkError } = await client
      .from('assigned_tasks')
      .update(updatePayload)
      .eq('id', assignmentId);
    if (unmarkError) throw new Error(`Failed to un-mark task complete: ${unmarkError.message}`);

    const { data: refetchedData, error: fetchError } = await client
      .from('assigned_tasks')
      .select(detailedSelectString)
      .eq('id', assignmentId)
      .single();
    if (fetchError || !refetchedData)
      throw new Error(
        `Task un-marked, but failed to refetch: ${fetchError?.message || 'Not Found'}`
      );
    return mapDbRowToAssignedTaskWithNames(refetchedData);
  } else {
    const { data: currentData, error: currentError } = await client
      .from('assigned_tasks')
      .select(detailedSelectString)
      .eq('id', assignmentId)
      .single();
    if (currentError || !currentData)
      throw new Error(
        `Failed to fetch current task ${assignmentId}: ${currentError?.message || 'Not Found'}`
      );
    return mapDbRowToAssignedTaskWithNames(currentData);
  }
};

export const deleteAssignedTask = async (assignmentId: string): Promise<void> => {
  const client = getSupabase();

  const payload = { assignmentId };
  if (!payload.assignmentId) throw new Error('Assignment ID missing.');

  const { data, error } = await client.functions.invoke('deleteAssignedTask', { body: payload });
  if (error) {
    let detailedError = error.message || 'Unknown function error';
    if (
      error.context &&
      typeof error.context === 'object' &&
      error.context !== null &&
      'error' in error.context
    ) {
      detailedError = String((error.context as any).error) || detailedError;
    } else {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed && parsed.error) detailedError = String(parsed.error);
      } catch (e) {}
    }
    if (error.context?.message) {
      detailedError += ` (Context: ${error.context.message})`;
    }
    throw new Error(`Failed to delete assigned task: ${detailedError}`);
  }
};
