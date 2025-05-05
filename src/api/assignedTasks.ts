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

const mapRpcRowToAssignedTask = (row: any): AssignedTask => {
  const getAssignerName = () => {
    if (row.assigner_first_name || row.assigner_last_name) {
      return getUserDisplayName({
        firstName: row.assigner_first_name,
        lastName: row.assigner_last_name,
        nickname: row.assigner_nickname,
      });
    }

    return row.assigned_by_id ? `ID: ${row.assigned_by_id}` : 'Unknown Assigner';
  };

  const getVerifierName = () => {
    if (!row.verifier_first_name && !row.verifier_last_name) return undefined;
    return (
      getUserDisplayName({
        firstName: row.verifier_first_name,
        lastName: row.verifier_last_name,
        nickname: row.verifier_nickname,
      }) || (row.verified_by_id ? `ID: ${row.verified_by_id}` : undefined)
    );
  };

  const getStudentStatus = (): UserStatus | 'unknown' => {
    const status = row.student_profile_status;
    if (status === 'active' || status === 'inactive') {
      return status as UserStatus;
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
    taskLinkUrl: row.task_link_url ?? null,
    taskAttachmentPath: row.task_attachment_path ?? null,

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
  console.log(
    `[fetchAssignedTasks RPC v2] Calling RPC: page=${page}, limit=${limit}, assignment=${assignmentStatus}, student=${studentStatus}, studentId=${studentId}, teacherId=${teacherId}`
  );

  const rpcParams = {
    p_page: page,
    p_limit: limit,
    p_assignment_status: assignmentStatus,
    p_student_status: studentStatus,
    p_student_id: studentId || null,
    p_teacher_id: teacherId || null,
  };

  const { data: rpcData, error: rpcError } = await client.rpc(
    'get_assigned_tasks_filtered',
    rpcParams
  );

  if (rpcError) {
    console.error('[fetchAssignedTasks RPC v2] RPC execution error:', rpcError);
    throw new Error(`Failed to fetch assigned tasks via RPC: ${rpcError.message}`);
  }

  const totalItems = Number(rpcData?.[0]?.total_count ?? 0);
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;

  console.log(
    `[fetchAssignedTasks RPC v2] Call successful. Total Count: ${totalItems}, Rows fetched: ${rpcData?.length ?? 0}`
  );

  const tasks = (rpcData || []).map(mapRpcRowToAssignedTask);

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
