import { getSupabase } from '../lib/supabaseClient';
import { SimplifiedStudent, User, UserRole, UserStatus } from '../types/dataTypes';
import { getUserDisplayName } from '../utils/helpers';

interface ProfilesApiResponse {
  items: User[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

interface FetchUsersParams {
  page?: number;
  limit?: number;
  role: UserRole;
  filter?: UserStatus | 'all';
  searchTerm?: string;
  teacherId?: string;
}

interface FetchStudentsResult {
  students: SimplifiedStudent[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

interface UpdateAuthPayload {
  email?: string;
  password?: string;
}

interface UpdateAuthResponse {
  message: string;
}

const mapProfileToUser = async (
  profile: any,
  client: ReturnType<typeof getSupabase>
): Promise<User> => {
  console.log(`[mapProfileToUser] Mapping profile for ID: ${profile.id}, Role: ${profile.role}`);
  const userId = profile.id;
  let instrumentIds: string[] | undefined = undefined;
  let linkedTeacherIds: string[] | undefined = undefined;
  let linkedStudentIds: string[] | undefined = undefined;

  if (profile.role === 'student') {
    const { data: instruments, error: instError } = await client
      .from('student_instruments')
      .select('instrument_id')
      .eq('student_id', userId);
    if (instError)
      console.error(
        `[mapProfileToUser] Error fetching instruments for student ${userId}:`,
        instError.message
      );
    else instrumentIds = instruments?.map(i => i.instrument_id) || [];

    const { data: teachers, error: teachError } = await client
      .from('student_teachers')
      .select('teacher_id')
      .eq('student_id', userId);
    if (teachError)
      console.error(
        `[mapProfileToUser] Error fetching teachers for student ${userId}:`,
        teachError.message
      );
    else linkedTeacherIds = teachers?.map(t => t.teacher_id) || [];
  } else if (profile.role === 'parent') {
    const { data: students, error: stuError } = await client
      .from('parent_students')
      .select('student_id')
      .eq('parent_id', userId);
    if (stuError)
      console.error(
        `[mapProfileToUser] Error fetching students for parent ${userId}:`,
        stuError.message
      );
    else linkedStudentIds = students?.map(s => s.student_id) || [];
  }

  const mappedUser: User = {
    id: profile.id,
    role: profile.role as UserRole,
    firstName: profile.first_name,
    lastName: profile.last_name,
    nickname: profile.nickname ?? undefined,
    status: profile.status as UserStatus,
    current_goal_reward_id: profile.current_goal_reward_id ?? null,

    ...(instrumentIds !== undefined && { instrumentIds }),
    ...(linkedTeacherIds !== undefined && { linkedTeacherIds }),
    ...(linkedStudentIds !== undefined && { linkedStudentIds }),
  };
  console.log(
    `[mapProfileToUser] Successfully mapped profile for ${userId}, Goal ID: ${mappedUser.current_goal_reward_id}`
  );
  return mappedUser;
};

const fetchProfilesByRole = async ({
  page = 1,
  limit = 10,
  role,
}: FetchUsersParams): Promise<ProfilesApiResponse> => {
  const client = getSupabase();
  console.log(`[Supabase] Fetching profiles: role=${role}, page=${page}, limit=${limit}`);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit - 1;

  const query = client
    .from('profiles')
    .select('id, role, first_name, last_name, nickname, status', { count: 'exact' })
    .eq('role', role)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })
    .range(startIndex, endIndex);

  const { data, error, count } = await query;

  if (error) {
    console.error(`[Supabase] Error fetching ${role}s:`, error.message);
    throw new Error(`Failed to fetch ${role}s: ${error.message}`);
  }

  const totalItems = count ?? 0;
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;

  const itemsWithLinks = await Promise.all(
    (data || []).map(profile => mapProfileToUser(profile, client))
  );

  console.log(
    `[Supabase] Received ${itemsWithLinks.length} ${role}s from API. Total: ${totalItems}`
  );

  return {
    items: itemsWithLinks,
    totalPages,
    currentPage: page,
    totalItems,
  };
};

export const fetchStudents = async ({
  page = 1,
  limit = 20,
  filter = 'active',
  searchTerm = '',
  teacherId,
}: {
  page?: number;
  limit?: number;
  filter?: UserStatus | 'all';
  searchTerm?: string;
  teacherId?: string;
}): Promise<FetchStudentsResult> => {
  const client = getSupabase();
  console.log(
    `[Supabase] Fetching students: page=${page}, limit=${limit}, filter=${filter}, search='${searchTerm}', teacherId=${teacherId}`
  );

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit - 1;

  let query = client
    .from('profiles')
    .select('id, first_name, last_name, nickname, status', { count: 'exact' })
    .eq('role', 'student');

  if (filter !== 'all') {
    query = query.eq('status', filter);
  }

  if (searchTerm) {
    query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`);
  }

  if (teacherId) {
    const { data: teacherStudentLinks, error: linkError } = await client
      .from('student_teachers')
      .select('student_id')
      .eq('teacher_id', teacherId);

    if (linkError) {
      console.error(
        `[Supabase] Error fetching student links for teacher ${teacherId}:`,
        linkError.message
      );
      throw new Error(`Failed to fetch student links for teacher: ${linkError.message}`);
    }

    const linkedStudentIds = teacherStudentLinks?.map(link => link.student_id) || [];

    if (linkedStudentIds.length === 0) {
      console.log(`[Supabase] Teacher ${teacherId} has no linked students.`);
      return { students: [], totalPages: 1, currentPage: 1, totalItems: 0 };
    }
    query = query.in('id', linkedStudentIds);
  }

  query = query
    .order('status', { ascending: true })
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })
    .range(startIndex, endIndex);

  const { data: studentProfiles, error, count } = await query;

  if (error) {
    console.error(`[Supabase] Error fetching students:`, error.message);
    throw new Error(`Failed to fetch students: ${error.message}`);
  }

  const totalItems = count ?? 0;
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;

  const studentIds = studentProfiles?.map(p => p.id) || [];
  let instrumentsMap: Record<string, string[]> = {};
  if (studentIds.length > 0) {
    const { data: instrumentsData, error: instError } = await client
      .from('student_instruments')
      .select('student_id, instrument_id')
      .in('student_id', studentIds);

    if (instError) {
      console.error(`[Supabase] Error fetching instruments for student list:`, instError.message);
    } else {
      instrumentsMap = (instrumentsData || []).reduce(
        (acc, row) => {
          if (!acc[row.student_id]) acc[row.student_id] = [];
          acc[row.student_id].push(row.instrument_id);
          return acc;
        },
        {} as Record<string, string[]>
      );
    }
  }

  const simplifiedStudents = (studentProfiles || []).map(profile => ({
    id: profile.id,
    name: getUserDisplayName(profile),
    instrumentIds: instrumentsMap[profile.id] || [],
    balance: 0,
    isActive: profile.status === 'active',
  }));

  console.log(
    `[Supabase] Received ${simplifiedStudents.length} students from API. Total: ${totalItems}`
  );

  return {
    students: simplifiedStudents,
    totalPages,
    currentPage: page,
    totalItems,
  };
};

export const fetchTeachers = async ({
  page = 1,
  limit = 20,
}: { page?: number; limit?: number } = {}): Promise<ProfilesApiResponse> => {
  return fetchProfilesByRole({ page, limit, role: 'teacher' });
};

export const fetchParents = async ({
  page = 1,
  limit = 20,
}: { page?: number; limit?: number } = {}): Promise<ProfilesApiResponse> => {
  return fetchProfilesByRole({ page, limit, role: 'parent' });
};

export const fetchUserProfile = async (userId: string): Promise<User | null> => {
  const client = getSupabase();
  console.log(`[fetchUserProfile] Attempting to fetch profile for user: ${userId}`);

  let profile: any = null;
  try {
    const { data, error } = await client
      .from('profiles')
      .select('id, role, first_name, last_name, nickname, status, current_goal_reward_id')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.warn(`[fetchUserProfile] Profile not found for user ${userId}.`);
        return null;
      }

      console.error(`[fetchUserProfile] Error fetching profile for ${userId}:`, error.message);
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }
    if (!data) {
      console.warn(
        `[fetchUserProfile] No profile data returned for user ${userId}, but no error received.`
      );
      return null;
    }

    profile = data;
    console.log(
      `[fetchUserProfile] Profile data fetched for ${userId}. Raw Goal ID: ${profile.current_goal_reward_id}`
    );
    console.log(`[fetchUserProfile] Proceeding to map...`);

    const mappedUser = await mapProfileToUser(profile, client);
    console.log(
      `[fetchUserProfile] Successfully fetched and mapped profile for ${userId}. Mapped Goal ID: ${mappedUser.current_goal_reward_id}`
    );
    return mappedUser;
  } catch (catchError: any) {
    console.error(
      `[fetchUserProfile] CAUGHT ERROR fetching/mapping profile for ${userId}:`,
      catchError.message
    );

    throw catchError;
  }
};

export const createUser = async (
  userData: Omit<User, 'id' | 'status'> & { initialPin?: string }
): Promise<User> => {
  const client = getSupabase();
  console.log('[API] Calling createUser Edge Function with payload:', userData);

  const { data, error } = await client.functions.invoke('createUser', {
    body: userData,
  });

  if (error) {
    console.error('[API] Error invoking createUser function:', error);

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
    throw new Error(`User creation failed: ${detailedError}`);
  }

  console.log('[API] createUser Edge Function returned successfully:', data);

  if (
    !data ||
    typeof data !== 'object' ||
    !data.id ||
    !data.role ||
    !data.firstName ||
    !data.lastName ||
    !data.status
  ) {
    console.error('[API] createUser Edge Function returned unexpected data structure:', data);
    throw new Error('User creation function returned invalid data format.');
  }

  return data as User;
};

export const updateUser = async ({
  userId,
  updates,
}: {
  userId: string;

  updates: Partial<Omit<User, 'id' | 'role' | 'status'>>;
}): Promise<User> => {
  const client = getSupabase();
  console.log(
    `[API updateUser] Calling Edge Function 'updateUserWithLinks' for user ${userId} with updates:`,
    updates
  );

  const payload = {
    userIdToUpdate: userId,
    updates: {
      firstName: updates.firstName,
      lastName: updates.lastName,

      nickname: updates.nickname === '' ? null : updates.nickname?.trim(),

      ...(updates.instrumentIds !== undefined && { instrumentIds: updates.instrumentIds }),
      ...(updates.linkedTeacherIds !== undefined && { linkedTeacherIds: updates.linkedTeacherIds }),
    },
  };

  Object.keys(payload.updates).forEach(
    key =>
      payload.updates[key as keyof typeof payload.updates] === undefined &&
      delete payload.updates[key as keyof typeof payload.updates]
  );

  console.log('[API updateUser] Payload being sent:', JSON.stringify(payload));

  const { data, error } = await client.functions.invoke('updateUserWithLinks', {
    body: payload,
  });

  if (error) {
    console.error('[API updateUser] Error invoking updateUserWithLinks function:', error);

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

    throw new Error(`User update failed: ${detailedError}`);
  }

  console.log('[API updateUser] Edge Function returned successfully:', data);

  console.log(`[API updateUser] Update reported success for ${userId}. Re-fetching profile...`);
  const updatedUser = await fetchUserProfile(userId);
  if (!updatedUser) {
    console.error(
      `[API updateUser] Update succeeded, but failed to re-fetch profile for ${userId}.`
    );
    throw new Error(`Update succeeded, but failed to re-fetch profile.`);
  }

  console.log(`[API updateUser] User ${userId} update process finished.`);
  return updatedUser;
};

export const deleteUser = async (userId: string): Promise<void> => {
  const client = getSupabase();
  console.log(`[API deleteUser] Calling Edge Function "deleteUser" for ID: ${userId}`);

  const payload = {
    userIdToDelete: userId,
  };

  if (!payload.userIdToDelete) {
    console.error('[API deleteUser] Validation failed: userIdToDelete is missing.');
    throw new Error('Cannot delete user: User ID is missing.');
  }

  console.log('[API deleteUser] Payload being sent:', payload);

  const { data, error } = await client.functions.invoke('deleteUser', {
    body: payload,
  });

  if (error) {
    console.error('[API deleteUser] Error invoking deleteUser function:', error);
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

    throw new Error(`User deletion failed: ${detailedError}`);
  }

  console.log('[API deleteUser] Edge Function returned successfully:', data);
};

export const toggleUserStatus = async (userId: string): Promise<User> => {
  const client = getSupabase();
  console.log(`[API toggleUserStatus] Calling Edge Function "toggleUserStatus" for user ${userId}`);

  const payload = {
    userIdToToggle: userId,
  };

  if (!payload.userIdToToggle) {
    console.error('[API toggleUserStatus] Validation failed: userIdToToggle is missing.');
    throw new Error('Cannot toggle status: User ID is missing.');
  }

  console.log('[API toggleUserStatus] Payload being sent:', payload);

  const { data, error } = await client.functions.invoke('toggleUserStatus', {
    body: payload,
  });

  if (error) {
    console.error('[API toggleUserStatus] Error invoking toggleUserStatus function:', error);
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
    throw new Error(`Failed to toggle status: ${detailedError}`);
  }

  console.log('[API toggleUserStatus] Edge Function returned successfully:', data);

  console.log(`[API toggleUserStatus] Status toggled for ${userId}. Re-fetching full profile...`);
  const updatedUser = await fetchUserProfile(userId);
  if (!updatedUser) {
    console.error(
      `[API toggleUserStatus] Status updated, but failed to re-fetch profile for ${userId}.`
    );

    throw new Error(`Status updated, but failed to re-fetch profile.`);
  }

  console.log(
    `[API toggleUserStatus] Successfully toggled status and refetched profile for ${userId}.`
  );
  return updatedUser;
};

export const generatePinForUser = async (
  targetUserId: string,
  targetRole: UserRole
): Promise<string> => {
  const client = getSupabase();
  console.log(
    `[API] Calling generate-onetime-pin Edge Function for user ${targetUserId}, role ${targetRole}`
  );

  const payload = {
    userId: targetUserId,
    targetRole: targetRole,
  };

  const { data, error } = await client.functions.invoke('generate-onetime-pin', {
    body: payload,
  });

  if (error) {
    console.error('[API] Error invoking generate-onetime-pin function:', error);

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
    throw new Error(`PIN generation failed: ${detailedError}`);
  }

  console.log('[API] generate-onetime-pin Edge Function returned:', data);
  if (!data || typeof data !== 'object' || typeof data.pin !== 'string' || !data.pin) {
    console.error('[API] generate-onetime-pin function returned unexpected data:', data);
    throw new Error('PIN generation function returned invalid data format.');
  }

  return data.pin;
};

export const updateAuthCredentials = async (
  updates: UpdateAuthPayload
): Promise<UpdateAuthResponse> => {
  const client = getSupabase();
  console.log('[API] Calling update-auth-credentials Edge Function with payload:', updates);

  if (!updates.email && !updates.password) {
    throw new Error('No credentials provided to update.');
  }

  const { data, error } = await client.functions.invoke('update-auth-credentials', {
    body: updates,
  });

  if (error) {
    console.error('[API] Error invoking update-auth-credentials function:', error);

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

    throw new Error(`Credential update failed: ${detailedError}`);
  }

  if (!data || typeof data !== 'object' || typeof data.message !== 'string') {
    console.error('[API] update-auth-credentials function returned unexpected data:', data);
    throw new Error('Credential update function returned invalid data format.');
  }

  return data as UpdateAuthResponse;
};

export const fetchAdmins = async ({
  page = 1,
  limit = 20,
}: { page?: number; limit?: number } = {}): Promise<ProfilesApiResponse> => {
  return fetchProfilesByRole({ page, limit, role: 'admin' });
};

export const fetchAuthUser = async (userId: string): Promise<{ email: string | null } | null> => {
  const client = getSupabase();
  console.log(
    `[fetchAuthUser API] Calling Edge Function 'get-user-auth-details' for target ID: ${userId}`
  );

  try {
    const { data, error } = await client.functions.invoke('get-user-auth-details', {
      body: { targetUserId: userId },
    });

    if (error) {
      console.error(`[fetchAuthUser API] Error invoking Edge Function:`, error);

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

      throw new Error(`Failed to fetch auth details: ${detailedError}`);
    }

    if (!data || typeof data !== 'object' || typeof data.email === 'undefined') {
      console.error('[fetchAuthUser API] Edge Function returned unexpected data structure:', data);
      throw new Error('Function returned invalid auth details format.');
    }

    return { email: data.email };
  } catch (catchError: any) {
    console.error(
      `[fetchAuthUser API] CAUGHT ERROR calling Edge Function for ${userId}:`,
      catchError.message
    );

    return null;
  }
};

export const linkStudentToParent = async (parentId: string, studentId: string): Promise<void> => {
  const client = getSupabase();
  console.log(`[API linkStudentToParent] Linking Student ${studentId} to Parent ${parentId}`);

  if (!parentId || !studentId) {
    throw new Error('Parent ID and Student ID are required for linking.');
  }

  const linkData = {
    parent_id: parentId,
    student_id: studentId,
  };

  const { error } = await client.from('parent_students').insert(linkData);

  if (error) {
    console.error(`[API linkStudentToParent] Error inserting link:`, error);

    if (error.code === '23505') {
      throw new Error(`Student ${studentId} is already linked to Parent ${parentId}.`);
    }

    if (error.code === '23503') {
      throw new Error(`Linking failed: Parent or Student ID not found.`);
    }

    if (error.code === '42501') {
      throw new Error(`Permission denied. Ensure you are logged in as an Admin.`);
    }
    throw new Error(`Failed to link student to parent: ${error.message}`);
  }

  console.log(`[API linkStudentToParent] Link created successfully.`);
};

export const unlinkStudentFromParent = async (
  parentId: string,
  studentId: string
): Promise<void> => {
  const client = getSupabase();
  console.log(
    `[API unlinkStudentFromParent] Unlinking Student ${studentId} from Parent ${parentId}`
  );

  if (!parentId || !studentId) {
    throw new Error('Parent ID and Student ID are required for unlinking.');
  }

  const { error, count } = await client
    .from('parent_students')
    .delete()
    .eq('parent_id', parentId)
    .eq('student_id', studentId);

  if (error) {
    console.error(`[API unlinkStudentFromParent] Error deleting link:`, error);

    if (error.code === '42501') {
      throw new Error(`Permission denied. Ensure you are logged in as an Admin.`);
    }
    throw new Error(`Failed to unlink student from parent: ${error.message}`);
  }

  if (count === 0) {
    console.warn(
      `[API unlinkStudentFromParent] No link found to delete for Parent ${parentId} and Student ${studentId}.`
    );
  } else {
    console.log(`[API unlinkStudentFromParent] Link deleted successfully.`);
  }
};

export const updateStudentGoal = async (
  studentId: string,
  rewardId: string | null
): Promise<{ id: string; current_goal_reward_id?: string | null }> => {
  const client = getSupabase();
  console.log(
    `[API updateStudentGoal] Updating goal for student ${studentId} to reward ${rewardId}`
  );

  const { data, error } = await client
    .from('profiles')
    .update({ current_goal_reward_id: rewardId })
    .eq('id', studentId)
    .select('id, current_goal_reward_id')
    .single();

  if (error) {
    console.error(`[API updateStudentGoal] Error updating goal for student ${studentId}:`, error);

    if (error.code === '42501') {
      throw new Error('Permission denied. You might not be allowed to update this goal.');
    }
    throw new Error(error.message || 'Failed to update student goal.');
  }

  if (!data) {
    console.error(`[API updateStudentGoal] No data returned after update for student ${studentId}`);
    throw new Error('Failed to confirm goal update.');
  }

  console.log(`[API updateStudentGoal] Goal updated successfully for ${studentId}`);

  return {
    id: data.id,
    current_goal_reward_id: data.current_goal_reward_id,
  };
};
