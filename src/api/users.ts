import { SimplifiedStudent } from '../types/dataTypes';
import { User, UserStatus } from '../types/userTypes';
import { getUserDisplayName } from '../utils/helpers';

interface StudentsApiResponse {
  items: User[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}
interface TeachersApiResponse {
  items: User[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}
interface ParentsApiResponse {
  items: User[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

interface FetchStudentsResult {
  students: SimplifiedStudent[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

export const fetchStudents = async ({
  page = 1,
  filter = 'active',
  searchTerm = '',
  teacherId, // <-- Add teacherId here
}: {
  page?: number;
  filter?: UserStatus | 'all';
  searchTerm?: string;
  teacherId?: string; // <-- Define the optional parameter type
}): Promise<FetchStudentsResult> => {
  // Update console log to include teacherId if present
  console.log(
    `[API] Fetching students: page=${page}, filter=${filter}, search='${searchTerm}'${teacherId ? `, teacherId=${teacherId}` : ''}`
  );
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('filter', filter);
  if (searchTerm) {
    params.append('search', searchTerm);
  }
  // Add teacherId to params if provided
  if (teacherId) {
    params.append('teacherId', teacherId);
  }
  const response = await fetch(`/api/students?${params.toString()}`);
  console.log(`[API] Students Response status: ${response.status}`);
  if (!response.ok) {
    console.error(`[API] Students Network response was not ok: ${response.statusText}`);
    throw new Error(`Failed to fetch students: ${response.statusText}`);
  }
  const data: StudentsApiResponse = await response.json();
  console.log(`[API] Received ${data.items?.length} raw students from API mock.`);
  // Keep the mapping logic as is - balance might need adjustment later if API provides it
  const simplifiedStudents = (data.items || []).map(student => ({
    id: student.id,
    name: getUserDisplayName(student),
    instrumentIds: student.instrumentIds,
    balance: 0, // Placeholder - might need updating if API returns balance
    isActive: student.status === 'active',
  }));
  return {
    students: simplifiedStudents,
    totalPages: data.totalPages,
    currentPage: data.currentPage,
    totalItems: data.totalItems,
  };
};

export const fetchTeachers = async ({
  page = 1,
}: {
  page?: number;
}): Promise<TeachersApiResponse> => {
  console.log(`[API] Fetching teachers: page=${page}`);
  const params = new URLSearchParams();
  params.append('page', String(page));
  const response = await fetch(`/api/teachers?${params.toString()}`);
  console.log(`[API] Teachers Response status: ${response.status}`);
  if (!response.ok) {
    console.error(`[API] Teachers Network response was not ok: ${response.statusText}`);
    throw new Error(`Failed to fetch teachers: ${response.statusText}`);
  }
  const data: TeachersApiResponse = await response.json();
  console.log(`[API] Received ${data.items?.length} teachers from API mock.`);
  return data;
};

export const fetchParents = async ({
  page = 1,
}: {
  page?: number;
}): Promise<ParentsApiResponse> => {
  console.log(`[API] Fetching parents: page=${page}`);
  const params = new URLSearchParams();
  params.append('page', String(page));
  const response = await fetch(`/api/parents?${params.toString()}`);
  console.log(`[API] Parents Response status: ${response.status}`);
  if (!response.ok) {
    console.error(`[API] Parents Network response was not ok: ${response.statusText}`);
    throw new Error(`Failed to fetch parents: ${response.statusText}`);
  }
  const data: ParentsApiResponse = await response.json();
  console.log(`[API] Received ${data.items?.length} parents from API mock.`);
  return data;
};

export const createUser = async (userData: Omit<User, 'id' | 'status'>): Promise<User> => {
  console.log('[API] Creating user:', userData.firstName, userData.lastName);
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  console.log(`[API] Create User Response status: ${response.status}`);
  if (!response.ok) {
    let errorMsg = `Failed to create user: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {
      console.log('[API] users try/catch error:', e);
    }
    console.error(`[API] Create User failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  const createdUser: User = await response.json();
  console.log(`[API] User created successfully (ID: ${createdUser.id})`);
  return createdUser;
};

export const updateUser = async ({
  userId,
  updates,
}: {
  userId: string;
  updates: Partial<Omit<User, 'id' | 'role' | 'status'>>;
}): Promise<User> => {
  console.log(`[API] Updating user ${userId}:`, updates);
  if ('role' in updates || 'status' in updates) {
    console.warn("[API] Attempting to send 'role' or 'status' in updateUser.");
  }
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  console.log(`[API] Update User Response status: ${response.status}`);
  if (!response.ok) {
    let errorMsg = `Failed to update user ${userId}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {
      console.log('[API] users try/catch error:', e);
    }
    console.error(`[API] Update User failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  const updatedUser: User = await response.json();
  console.log(`[API] User ${userId} updated successfully`);
  return updatedUser;
};

export const deleteUser = async (userId: string): Promise<void> => {
  console.log(`[API] Deleting user ${userId}`);
  const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
  console.log(`[API] Delete User Response status: ${response.status}`);
  if (!response.ok && response.status !== 204) {
    let errorMsg = `Failed to delete user ${userId}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {
      console.log('[API] users try/catch error:', e);
    }
    console.error(`[API] Delete User failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  if (response.status === 204) {
    console.log(`[API] User ${userId} deleted successfully (204 No Content).`);
  } else {
    console.log(`[API] User ${userId} deleted successfully (Status: ${response.status}).`);
  }
};

export const toggleUserStatus = async (userId: string): Promise<User> => {
  console.log(`[API] Toggling status for user ${userId}`);

  const response = await fetch(`/api/users/${userId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  console.log(`[API] Toggle Status Response status: ${response.status}`);

  if (!response.ok) {
    let errorMsg = `Failed to toggle status for user ${userId}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {
      console.log('[API] users try/catch error:', e);
    }
    console.error(`[API] Toggle Status failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const updatedUser: User = await response.json();
  console.log(`[API] User ${userId} status toggled successfully to ${updatedUser.status}`);
  return updatedUser;
};
