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
    studentLinkedTeacherIds: row.student_linked_teacher_ids || [],

    task_links: row.task_links || [],
    task_attachments: row.task_attachments || [],

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

type AdHocTaskPayload = {
  taskTitle: string;
  taskDescription?: string;
  taskBasePoints: number;
  urls?: { url: string; label: string }[];
  files?: { _nativeFile: NativeFileObject; fileName: string; mimeType: string }[];
};

export const createAssignedTask = async (
  payload: { studentId: string } & ({ taskLibraryId: string } | AdHocTaskPayload)
): Promise<AssignedTask> => {
  const client = getSupabase();

  let finalPayload: any;

  if ('taskLibraryId' in payload) {
    console.log(
      `[API] Assigning task from library ${payload.taskLibraryId} to student ${payload.studentId}`
    );
    finalPayload = {
      studentId: payload.studentId,
      taskLibraryId: payload.taskLibraryId,
    };
  } else {
    console.log(
      `[API] Assigning ad-hoc task "${payload.taskTitle}" to student ${payload.studentId}`
    );

    const filesForUpload = await Promise.all(
      (payload.files || []).map(async file => {
        const base64 = await fileToBase64(file._nativeFile);
        return { base64, mimeType: file.mimeType, fileName: file.fileName };
      })
    );

    finalPayload = {
      studentId: payload.studentId,
      taskTitle: payload.taskTitle,
      taskDescription: payload.taskDescription,
      taskBasePoints: payload.taskBasePoints,
      urls: payload.urls,
      files: filesForUpload,
    };
  }

  const { data, error } = await client.functions.invoke('assign-task', {
    body: finalPayload,
  });

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

  return mapRpcRowToAssignedTask(data);
};

export const deleteAssignedTask = async (assignmentId: string): Promise<void> => {
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

  const refetchViaRpc = async (id: string) => {
    const { data: rpcData, error: rpcError } = await client
      .rpc('get_assigned_task_details', { p_assignment_id: id })
      .single();
    if (rpcError) {
      throw new Error(`Failed to refetch task details via RPC: ${rpcError.message}`);
    }

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
