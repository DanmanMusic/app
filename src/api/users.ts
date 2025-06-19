// src/api/users.ts

import { Platform } from 'react-native';

import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

import { getSupabase } from '../lib/supabaseClient';

import {
  SimplifiedStudent,
  TeacherWithStats,
  User,
  UserRole,
  UserStatus,
} from '../types/dataTypes';

import { getUserDisplayName, NativeFileObject } from '../utils/helpers';

const AVATARS_BUCKET = 'avatars';

const uploadAvatar = async (
  userId: string,
  companyId: string,
  imageUri: string,
  mimeType?: string
): Promise<string | null> => {
  const client = getSupabase();
  try {
    const fileExt = mimeType ? mimeType.split('/')[1] : 'jpg';

    const filePath = `${companyId}/${userId}/avatar.${fileExt}`;

    let uploadData: { path: string } | null = null;

    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      if (!response.ok) throw new Error(`Failed to fetch image blob: ${response.statusText}`);
      const imageBlob = await response.blob();
      const { data, error } = await client.storage
        .from(AVATARS_BUCKET)
        .upload(filePath, imageBlob, {
          contentType: mimeType || imageBlob.type || 'image/jpeg',
          upsert: true,
        });
      if (error) throw error;
      uploadData = data;
    } else {
      const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
      const { data, error } = await client.storage
        .from(AVATARS_BUCKET)
        .upload(filePath, decode(base64), {
          contentType: mimeType || 'image/jpeg',
          upsert: true,
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
    companyId: profile.company_id,
    avatarPath: profile.avatar_path ?? null,
    current_goal_reward_id: profile.current_goal_reward_id ?? null,
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

export const fetchProfilesByRole = async ({
  page = 1,
  limit = 10,
  role,
  filter = 'all',
  searchTerm = '',
  teacherId,
}: FetchUsersParams): Promise<ProfilesApiResponse> => {
  const client = getSupabase();
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit - 1;

  let query = client.from('profiles').select('*, company_id', { count: 'exact' }).eq('role', role);

  if (filter !== 'all') {
    query = query.eq('status', filter);
  }

  if (searchTerm.trim()) {
    const searchString = `%${searchTerm.trim()}%`;
    query = query.or(
      `first_name.ilike.${searchString},last_name.ilike.${searchString},nickname.ilike.${searchString}`
    );
  }

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

  const simplifiedStudents = (studentProfiles || []).map(profile => ({
    id: profile.id,
    name: getUserDisplayName(profile),
    balance: 0,
    isActive: profile.status === 'active',
  }));

  return { students: simplifiedStudents, totalPages, currentPage: page, totalItems };
};

export const fetchTeachers = async (
  params: Omit<FetchUsersParams, 'role'>
): Promise<ProfilesApiResponse> => {
  return fetchProfilesByRole({ ...params, role: 'teacher' });
};

export const fetchParents = async (
  params: Omit<FetchUsersParams, 'role'>
): Promise<ProfilesApiResponse> => {
  return fetchProfilesByRole({ ...params, role: 'parent' });
};

export const fetchAdmins = async (
  params: Omit<FetchUsersParams, 'role'>
): Promise<ProfilesApiResponse> => {
  return fetchProfilesByRole({ ...params, role: 'admin' });
};

export const fetchUserProfile = async (userId: string): Promise<User | null> => {
  const client = getSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('*, company_id')
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
  const { data, error } = await client.functions.invoke('create-user', { body: userData });
  if (error) {
    const detailedError = (error as any).context?.error || error.message;
    throw new Error(`User creation failed: ${detailedError}`);
  }

  return data as User;
};

export const updateUser = async ({
  userId,
  companyId,
  updates,
  avatarFile,
  avatarMimeType,
}: {
  userId: string;
  companyId: string;
  updates: Partial<Omit<User, 'id' | 'role' | 'status' | 'avatarPath' | 'companyId'>>;
  avatarFile?: NativeFileObject | null;
  avatarMimeType?: string;
}): Promise<User> => {
  const client = getSupabase();
  let avatarPath: string | null | undefined = undefined;

  if (avatarFile) {
    avatarPath = await uploadAvatar(userId, companyId, avatarFile.uri, avatarMimeType);
  } else if (avatarFile === null) {
    avatarPath = null;
  }

  const finalUpdates: Partial<User> & { avatarPath?: string | null } = { ...updates };

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

  const { error } = await client.functions.invoke('update-user-with-links', { body: payload });
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
  const { error } = await client.functions.invoke('delete-user', {
    body: { userIdToDelete: userId },
  });
  if (error) {
    const detailedError = (error as any).context?.error || error.message;
    throw new Error(`User deletion failed: ${detailedError}`);
  }
};

export const toggleUserStatus = async (userId: string): Promise<User> => {
  const client = getSupabase();
  const { data, error } = await client.functions.invoke('toggle-user-status', {
    body: { userIdToToggle: userId },
  });
  if (error) {
    const detailedError = (error as any).context?.error || error.message;
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

export const updateAuthCredentials = async (
  updates: UpdateAuthPayload
): Promise<UpdateAuthResponse> => {
  const client = getSupabase();
  const { data, error } = await client.functions.invoke('update-auth-credentials', {
    body: updates,
  });
  if (error) {
    const detailedError = (error as any).context?.error || error.message;
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
    const detailedError = (error as any).context?.error || error.message;
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

export interface StudentWithStats {
  id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  status: UserStatus;
  avatar_path: string | null;
  companyId: string;
  instrumentIds: string[];
  balance: number;
  current_streak: number;
  goal_reward_name: string | null;
  goal_reward_cost: number | null;
  teacher_names: string[];
  total_count: number;
}

export const fetchStudentsWithStats = async ({
  companyId,
  teacherId,
  page = 1,
  limit = 20,
  filter = 'all',
  searchTerm = '',
}: {
  companyId: string;
  teacherId?: string;
  page?: number;
  limit?: number;
  filter?: UserStatus | 'all';
  searchTerm?: string;
}) => {
  const client = getSupabase();
  const { data, error } = await client.rpc('get_student_list_with_stats', {
    p_company_id: companyId,
    p_teacher_id: teacherId,
    p_status: filter,
    p_search_term: searchTerm,
    p_page: page,
    p_limit: limit,
  });

  if (error) {
    console.error(`[API users] Error fetching students with stats:`, error.message);
    throw new Error(`Failed to fetch student list: ${error.message}`);
  }

  const items: StudentWithStats[] = (data || []).map(item => ({
    id: item.id,
    first_name: item.first_name,
    last_name: item.last_name,
    nickname: item.nickname,
    status: item.status as UserStatus,
    avatar_path: item.avatar_path,
    companyId: item.company_id,
    instrumentIds: item.instrument_ids || [],
    balance: item.balance,
    current_streak: item.current_streak,
    goal_reward_name: item.goal_reward_name,
    goal_reward_cost: item.goal_reward_cost,
    teacher_names: item.teacher_names || [],
    total_count: item.total_count,
  }));

  const totalItems = data?.[0]?.total_count ?? 0;
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;

  return { items, totalPages, currentPage: page, totalItems };
};

export const fetchTeachersWithStats = async ({
  companyId,
  page = 1,
  limit = 20,
}: {
  companyId: string;
  page?: number;
  limit?: number;
}) => {
  const client = getSupabase();
  const { data, error } = await client.rpc('get_teacher_list_with_stats', {
    p_company_id: companyId,
    p_page: page,
    p_limit: limit,
  });

  if (error) {
    console.error(`[API users] Error fetching teachers with stats:`, error.message);
    throw new Error(`Failed to fetch teacher list: ${error.message}`);
  }

  const mapRpcRowToTeacherWithStats = (row: any): TeacherWithStats => {
    return {
      id: row.id,
      role: 'teacher',
      firstName: row.first_name,
      lastName: row.last_name,
      nickname: row.nickname ?? undefined,
      status: row.status as UserStatus,
      avatarPath: row.avatar_path ?? null,
      companyId: row.company_id,

      studentCount: row.student_count || 0,
    };
  };

  const items: TeacherWithStats[] = (data || []).map(mapRpcRowToTeacherWithStats);

  const totalItems = data?.[0]?.total_count ?? 0;
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;

  return { items, totalPages, currentPage: page, totalItems };
};
