// src/api/users.ts

import { Platform } from 'react-native';

import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

import { getSupabase } from '../lib/supabaseClient';

import { SimplifiedStudent, User, UserRole, UserStatus } from '../types/dataTypes';

import { fileToBase64, getUserDisplayName, NativeFileObject } from '../utils/helpers';

// Define the avatar storage bucket
const AVATARS_BUCKET = 'avatars';

// Helper function to upload an avatar
const uploadAvatar = async (
  userId: string,
  imageUri: string,
  mimeType?: string
): Promise<string | null> => {
  const client = getSupabase();
  try {
    const fileExt = mimeType ? mimeType.split('/')[1] : 'jpg';
    // Use the required {user_id}/{filename} convention for RLS
    const filePath = `${userId}/avatar.${fileExt}`;

    let uploadData: { path: string } | null = null;

    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      if (!response.ok) throw new Error(`Failed to fetch image blob: ${response.statusText}`);
      const imageBlob = await response.blob();
      const { data, error } = await client.storage
        .from(AVATARS_BUCKET)
        .upload(filePath, imageBlob, {
          contentType: mimeType || imageBlob.type || 'image/jpeg',
          upsert: true, // Use upsert to overwrite existing avatar
        });
      if (error) throw error;
      uploadData = data;
    } else {
      const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
      const { data, error } = await client.storage
        .from(AVATARS_BUCKET)
        .upload(filePath, decode(base64), {
          contentType: mimeType || 'image/jpeg',
          upsert: true, // Use upsert to overwrite existing avatar
        });
      if (error) throw error;
      uploadData = data;
    }

    return uploadData?.path ?? null;
  } catch (e) {
    console.error('[API users] Exception during avatar upload:', e);
    throw new Error(`Failed to upload avatar: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
};

// maps a raw database profile row to the rich User type
const mapProfileToUser = async (
  profile: any,
  client: ReturnType<typeof getSupabase>
): Promise<User> => {
  const userId = profile.id;
  let instrumentIds: string[] | undefined = undefined;
  let linkedTeacherIds: string[] | undefined = undefined;
  let linkedStudentIds: string[] | undefined = undefined;

  if (profile.role === 'student') {
    const { data: instruments } = await client
      .from('student_instruments')
      .select('instrument_id')
      .eq('student_id', userId);
    instrumentIds = instruments?.map(i => i.instrument_id) || [];
    const { data: teachers } = await client
      .from('student_teachers')
      .select('teacher_id')
      .eq('student_id', userId);
    linkedTeacherIds = teachers?.map(t => t.teacher_id) || [];
  } else if (profile.role === 'parent') {
    const { data: students } = await client
      .from('parent_students')
      .select('student_id')
      .eq('parent_id', userId);
    linkedStudentIds = students?.map(s => s.student_id) || [];
  }

  const mappedUser: User = {
    id: profile.id,
    role: profile.role as UserRole,
    firstName: profile.first_name,
    lastName: profile.last_name,
    nickname: profile.nickname ?? undefined,
    status: profile.status as UserStatus,
    current_goal_reward_id: profile.current_goal_reward_id ?? null,
    avatarPath: profile.avatar_path ?? null,
    ...(instrumentIds !== undefined && { instrumentIds }),
    ...(linkedTeacherIds !== undefined && { linkedTeacherIds }),
    ...(linkedStudentIds !== undefined && { linkedStudentIds }),
  };
  return mappedUser;
};

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

// Replace the existing fetchProfilesByRole function in src/api/users.ts with this one.

export const fetchProfilesByRole = async ({
  page = 1,
  limit = 10,
  role,
  filter = 'all',
  searchTerm = '',
  teacherId,
}: FetchUsersParams): Promise<ProfilesApiResponse> => {
  const client = getSupabase();
  console.log(
    `[API] fetchProfilesByRole: role=${role}, page=${page}, search='${searchTerm}', filter=${filter}, teacherId=${teacherId}`
  );
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit - 1;

  let query = client
    .from('profiles')
    .select(
      'id, role, first_name, last_name, nickname, status, avatar_path, current_goal_reward_id',
      { count: 'exact' }
    )
    .eq('role', role);

  if (filter !== 'all') {
    query = query.eq('status', filter);
  }

  if (searchTerm.trim()) {
    const searchString = `%${searchTerm.trim()}%`;
    query = query.or(
      `first_name.ilike.${searchString},last_name.ilike.${searchString},nickname.ilike.${searchString}`
    );
  }

  // This logic is specifically for fetching a teacher's students
  if (teacherId && role === 'student') {
    const { data: links, error: linkError } = await client
      .from('student_teachers')
      .select('student_id')
      .eq('teacher_id', teacherId);

    if (linkError) {
      console.error(
        `[API] Error fetching student links for teacher ${teacherId}:`,
        linkError.message
      );
      throw new Error(`Failed to fetch student links for teacher: ${linkError.message}`);
    }

    const studentIds = links?.map(l => l.student_id) || [];
    if (studentIds.length === 0) {
      // If a teacher has no students, return an empty set immediately.
      return { items: [], totalPages: 1, currentPage: 1, totalItems: 0 };
    }
    query = query.in('id', studentIds);
  }

  query = query
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })
    .range(startIndex, endIndex);

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Failed to fetch ${role}s: ${error.message}`);
  }

  const totalItems = count ?? 0;
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;
  // The mapProfileToUser helper will fetch the necessary linked data for each profile
  const itemsWithLinks = await Promise.all(
    (data || []).map(profile => mapProfileToUser(profile, client))
  );

  return { items: itemsWithLinks, totalPages, currentPage: page, totalItems };
};

interface FetchStudentsResult {
  students: SimplifiedStudent[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

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
    if (linkError)
      throw new Error(`Failed to fetch student links for teacher: ${linkError.message}`);
    const linkedStudentIds = teacherStudentLinks?.map(link => link.student_id) || [];
    if (linkedStudentIds.length === 0)
      return { students: [], totalPages: 1, currentPage: 1, totalItems: 0 };
    query = query.in('id', linkedStudentIds);
  }

  query = query
    .order('status', { ascending: true })
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })
    .range(startIndex, endIndex);
  const { data: studentProfiles, error, count } = await query;
  if (error) throw new Error(`Failed to fetch students: ${error.message}`);

  const totalItems = count ?? 0;
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;

  const studentIds = studentProfiles?.map(p => p.id) || [];
  let instrumentsMap: Record<string, string[]> = {};
  if (studentIds.length > 0) {
    const { data: instrumentsData } = await client
      .from('student_instruments')
      .select('student_id, instrument_id')
      .in('student_id', studentIds);
    instrumentsMap = (instrumentsData || []).reduce(
      (acc, row) => {
        if (!acc[row.student_id]) acc[row.student_id] = [];
        acc[row.student_id].push(row.instrument_id);
        return acc;
      },
      {} as Record<string, string[]>
    );
  }

  const simplifiedStudents = (studentProfiles || []).map(profile => ({
    id: profile.id,
    name: getUserDisplayName(profile),
    instrumentIds: instrumentsMap[profile.id] || [],
    balance: 0,
    isActive: profile.status === 'active',
  }));

  return { students: simplifiedStudents, totalPages, currentPage: page, totalItems };
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

export const fetchAdmins = async ({
  page = 1,
  limit = 20,
}: { page?: number; limit?: number } = {}): Promise<ProfilesApiResponse> => {
  return fetchProfilesByRole({ page, limit, role: 'admin' });
};

export const fetchUserProfile = async (userId: string): Promise<User | null> => {
  const client = getSupabase();
  const { data, error } = await client
    .from('profiles')
    .select(
      'id, role, first_name, last_name, nickname, status, current_goal_reward_id, avatar_path'
    )
    .eq('id', userId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }
  if (!data) return null;
  return await mapProfileToUser(data, client);
};

export const createUser = async (
  userData: Omit<User, 'id' | 'status' | 'avatarPath'>
): Promise<User> => {
  const client = getSupabase();
  const { data, error } = await client.functions.invoke('createUser', { body: userData });
  if (error) {
    const detailedError = error.context?.error || error.message;
    throw new Error(`User creation failed: ${detailedError}`);
  }
  return data as User;
};

// The corrected updateUser function for src/api/users.ts

export const updateUser = async ({
  userId,
  updates,
  avatarFile,
  avatarMimeType,
}: {
  userId: string;
  updates: Partial<Omit<User, 'id' | 'role' | 'status' | 'avatarPath'>>;
  avatarFile?: NativeFileObject | null;
  avatarMimeType?: string;
}): Promise<User> => {
  const client = getSupabase();
  console.log(`[API updateUser] Preparing update for user ${userId}`);

  let avatarPath: string | null | undefined = undefined;

  if (avatarFile) {
    console.log(`[API updateUser] New avatar provided. Uploading...`);
    avatarPath = await uploadAvatar(userId, avatarFile.uri, avatarMimeType);
  } else if (avatarFile === null) {
    console.log(`[API updateUser] Request to remove avatar.`);
    avatarPath = null;
  }

  const finalUpdates: Partial<User> = { ...updates };

  if (avatarPath !== undefined) {
    finalUpdates.avatarPath = avatarPath;
  }

  if (Object.keys(finalUpdates).length === 0) {
    console.warn('[API updateUser] No changes to apply.');
    const user = await fetchUserProfile(userId);
    if (!user) throw new Error('User not found after no-op update.');
    return user;
  }

  const payload = {
    userIdToUpdate: userId,
    updates: finalUpdates,
  };

  const { error } = await client.functions.invoke('updateUserWithLinks', { body: payload });
  if (error) {
    const detailedError = (error as any).context?.error?.message || error.message;
    throw new Error(`User update failed: ${detailedError}`);
  }

  const updatedUser = await fetchUserProfile(userId);
  if (!updatedUser) throw new Error(`Update succeeded, but failed to re-fetch profile.`);

  return updatedUser;
};

export const deleteUser = async (userId: string): Promise<void> => {
  const client = getSupabase();
  const { error } = await client.functions.invoke('deleteUser', {
    body: { userIdToDelete: userId },
  });
  if (error) {
    const detailedError = error.context?.error || error.message;
    throw new Error(`User deletion failed: ${detailedError}`);
  }
};

export const toggleUserStatus = async (userId: string): Promise<User> => {
  const client = getSupabase();
  const { data, error } = await client.functions.invoke('toggleUserStatus', {
    body: { userIdToToggle: userId },
  });
  if (error) {
    const detailedError = error.context?.error || error.message;
    throw new Error(`Failed to toggle status: ${detailedError}`);
  }
  const updatedUser = await fetchUserProfile(userId);
  if (!updatedUser) throw new Error(`Status updated, but failed to re-fetch profile.`);
  return updatedUser;
};

interface UpdateAuthPayload {
  email?: string;
  password?: string;
}

interface UpdateAuthResponse {
  message: string;
}

export const generatePinForUser = async (
  targetUserId: string,
  targetRole: UserRole
): Promise<string> => {
  const client = getSupabase();
  const { data, error } = await client.functions.invoke('generate-onetime-pin', {
    body: { userId: targetUserId, targetRole: targetRole },
  });
  if (error) {
    const detailedError = error.context?.error || error.message;
    throw new Error(`PIN generation failed: ${detailedError}`);
  }
  return data.pin;
};

export const updateAuthCredentials = async (
  updates: UpdateAuthPayload
): Promise<UpdateAuthResponse> => {
  const client = getSupabase();
  const { data, error } = await client.functions.invoke('update-auth-credentials', {
    body: updates,
  });
  if (error) {
    const detailedError = error.context?.error || error.message;
    throw new Error(`Credential update failed: ${detailedError}`);
  }
  return data as UpdateAuthResponse;
};

export const fetchAuthUser = async (userId: string): Promise<{ email: string | null } | null> => {
  const client = getSupabase();
  const { data, error } = await client.functions.invoke('get-user-auth-details', {
    body: { targetUserId: userId },
  });
  if (error) {
    const detailedError = error.context?.error || error.message;
    throw new Error(`Failed to fetch auth details: ${detailedError}`);
  }
  return { email: data.email };
};

export const linkStudentToParent = async (parentId: string, studentId: string): Promise<void> => {
  const client = getSupabase();
  const { error } = await client
    .from('parent_students')
    .insert({ parent_id: parentId, student_id: studentId });
  if (error) {
    if (error.code === '23505') throw new Error(`Student is already linked to Parent.`);
    if (error.code === '23503') throw new Error(`Linking failed: Parent or Student ID not found.`);
    if (error.code === '42501') throw new Error(`Permission denied. Ensure you are an Admin.`);
    throw new Error(`Failed to link student to parent: ${error.message}`);
  }
};

export const unlinkStudentFromParent = async (
  parentId: string,
  studentId: string
): Promise<void> => {
  const client = getSupabase();
  const { error } = await client
    .from('parent_students')
    .delete()
    .eq('parent_id', parentId)
    .eq('student_id', studentId);
  if (error) {
    if (error.code === '42501') throw new Error(`Permission denied. Ensure you are an Admin.`);
    throw new Error(`Failed to unlink student from parent: ${error.message}`);
  }
};

export const updateStudentGoal = async (
  studentId: string,
  rewardId: string | null
): Promise<{ id: string; current_goal_reward_id?: string | null }> => {
  const client = getSupabase();
  const { data, error } = await client
    .from('profiles')
    .update({ current_goal_reward_id: rewardId })
    .eq('id', studentId)
    .select('id, current_goal_reward_id')
    .single();
  if (error) {
    if (error.code === '42501') throw new Error('Permission denied to update this goal.');
    throw new Error(error.message || 'Failed to update student goal.');
  }
  return data;
};
