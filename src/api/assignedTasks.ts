// src/api/assignedTasks.ts
import { getSupabase } from '../lib/supabaseClient';

import { AssignedTask, TaskVerificationStatus, UserStatus } from '../types/dataTypes';

import { fileToBase64, getUserDisplayName, NativeFileObject } from '../utils/helpers';

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

  const rpcParams = {
    p_page: page,
    p_limit: limit,
    p_assignment_status: assignmentStatus,
    p_student_status: studentStatus,
    p_student_id: studentId ?? undefined,
    p_teacher_id: teacherId ?? undefined,
  };

  const { data: rpcData, error: rpcError } = await client.rpc(
    'get_assigned_tasks_filtered',
    rpcParams
  );

  if (rpcError) {
    throw new Error(`Failed to fetch assigned tasks via RPC: ${rpcError.message}`);
  }

  const totalItems = Number(rpcData?.[0]?.total_count ?? 0);
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;
  const tasks = (rpcData || []).map(mapRpcRowToAssignedTask);

  return { items: tasks, totalPages, currentPage: page, totalItems };
};

export const createAssignedTask = async (
  assignmentData: Omit<
    AssignedTask,
    | 'id'
    | 'assignedById'
    | 'assignedDate'
    | 'isComplete'
    | 'verificationStatus'
    | 'completedDate'
    | 'verifiedById'
    | 'verifiedDate'
    | 'actualPointsAwarded'
    | 'assignerName'
    | 'verifierName'
    | 'studentStatus'
  > & { file?: NativeFileObject | File; mimeType?: string; fileName?: string }
): Promise<AssignedTask> => {
  // This function remains unchanged as it calls an Edge Function
  const client = getSupabase();
  const {
    file,
    mimeType: providedMimeType,
    fileName: providedFileName,
    ...restAssignmentData
  } = assignmentData;
  const payload: {
    studentId: string;
    taskTitle: string;
    taskDescription: string;
    taskBasePoints: number;
    taskLinkUrl: string | null;
    taskAttachmentPath?: string | null;
    file?: { base64: string; mimeType: string; fileName: string };
  } = {
    studentId: restAssignmentData.studentId,
    taskTitle: restAssignmentData.taskTitle,
    taskDescription: restAssignmentData.taskDescription || '',
    taskBasePoints: restAssignmentData.taskBasePoints,
    taskLinkUrl: restAssignmentData.taskLinkUrl || null,
    taskAttachmentPath: undefined,
  };
  if (
    !payload.studentId ||
    !payload.taskTitle ||
    payload.taskBasePoints == null ||
    payload.taskBasePoints < 0
  ) {
    throw new Error('Missing required fields for task assignment (studentId, title, basePoints).');
  }
  if (file) {
    let finalMimeType = providedMimeType;
    let finalFileName = providedFileName;
    if (file && !finalMimeType && file instanceof File) finalMimeType = file.type;
    else if (file && !finalMimeType && typeof file === 'object' && 'mimeType' in file)
      finalMimeType = file.mimeType;
    else if (file && !finalMimeType && typeof file === 'object' && 'type' in file)
      finalMimeType = file.type;
    if (file && !finalFileName && file instanceof File) finalFileName = file.name;
    else if (file && !finalFileName && typeof file === 'object' && 'name' in file)
      finalFileName = file.name;
    if (file && !finalFileName) finalFileName = `upload.${finalMimeType?.split('/')[1] || 'bin'}`;
    if (file && finalMimeType && finalFileName) {
      try {
        const base64 = await fileToBase64(file);
        payload.file = { base64, mimeType: finalMimeType, fileName: finalFileName };
      } catch (error: any) {
        throw new Error(`Failed to process file: ${error.message}`);
      }
    }
  } else if (restAssignmentData.taskAttachmentPath) {
    payload.taskAttachmentPath = restAssignmentData.taskAttachmentPath;
  } else {
    payload.taskAttachmentPath = null;
  }
  const { data, error } = await client.functions.invoke('assign-task', { body: payload });
  if (error) {
    let detailedError = error.message || 'Unknown function error';
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

export const deleteAssignedTask = async (assignmentId: string): Promise<void> => {
  // This function remains unchanged as it calls an Edge Function
  const client = getSupabase();
  const payload = { assignmentId };
  if (!payload.assignmentId) throw new Error('Assignment ID missing.');
  const { error } = await client.functions.invoke('delete-assigned-task', { body: payload });
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
      } catch (_e) {}
    }
    if (error.context?.message) {
      detailedError += ` (Context: ${error.context.message})`;
    }
    throw new Error(`Failed to delete assigned task: ${detailedError}`);
  }
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

  // Helper to call our new reliable RPC
  const refetchViaRpc = async (id: string) => {
    const { data: rpcData, error: rpcError } = await client
      .rpc('get_assigned_task_details', { p_assignment_id: id })
      .single();
    if (rpcError) {
      throw new Error(`Failed to refetch task details via RPC: ${rpcError.message}`);
    }
    // The RPC function is guaranteed to return a single row or throw an error,
    // so we don't need to check for !rpcData here.
    return mapRpcRowToAssignedTask(rpcData);
  };

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

    const { error } = await client.functions.invoke('verify-task', { body: payload });
    if (error) {
      throw new Error(`Task verification failed: ${error.message || 'Unknown function error'}`);
    }
    return refetchViaRpc(assignmentId);
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

    return refetchViaRpc(assignmentId);
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

    return refetchViaRpc(assignmentId);
  } else {
    throw new Error('Invalid update operation provided to updateAssignedTask.');
  }
};
