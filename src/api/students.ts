// src/api/students.ts (or src/api/index.ts)
import { User, UserStatus } from '../types/userTypes';
import { SimplifiedStudent } from '../types/dataTypes';
import { getUserDisplayName } from '../utils/helpers';

// --- API Response Interfaces ---
interface StudentsApiResponse { items: User[]; totalPages: number; currentPage: number; totalItems: number; }
interface TeachersApiResponse { items: User[]; totalPages: number; currentPage: number; totalItems: number; }
interface ParentsApiResponse { items: User[]; totalPages: number; currentPage: number; totalItems: number; }

// --- Hook Result Interfaces ---
interface FetchStudentsResult { students: SimplifiedStudent[]; totalPages: number; currentPage: number; totalItems: number; }

// --- Fetch Functions ---

export const fetchStudents = async ({ page = 1, filter = 'active', searchTerm = '' }: { page?: number; filter?: UserStatus | 'all'; searchTerm?: string; }): Promise<FetchStudentsResult> => {
    console.log(`[API] Fetching students: page=${page}, filter=${filter}, search='${searchTerm}'`);
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('filter', filter);
    if (searchTerm) { params.append('search', searchTerm); }
    const response = await fetch(`/api/students?${params.toString()}`);
    console.log(`[API] Students Response status: ${response.status}`);
    if (!response.ok) { console.error(`[API] Students Network response was not ok: ${response.statusText}`); throw new Error(`Failed to fetch students: ${response.statusText}`); }
    const data: StudentsApiResponse = await response.json();
    console.log(`[API] Received ${data.items?.length} raw students from API mock.`);
    const simplifiedStudents = (data.items || []).map(student => ({ id: student.id, name: getUserDisplayName(student), instrumentIds: student.instrumentIds, balance: 0, isActive: student.status === 'active', }));
    return { students: simplifiedStudents, totalPages: data.totalPages, currentPage: data.currentPage, totalItems: data.totalItems, };
};

export const fetchTeachers = async ({ page = 1 }: { page?: number; }): Promise<TeachersApiResponse> => {
    console.log(`[API] Fetching teachers: page=${page}`);
    const params = new URLSearchParams();
    params.append('page', String(page));
    const response = await fetch(`/api/teachers?${params.toString()}`);
    console.log(`[API] Teachers Response status: ${response.status}`);
    if (!response.ok) { console.error(`[API] Teachers Network response was not ok: ${response.statusText}`); throw new Error(`Failed to fetch teachers: ${response.statusText}`); }
    const data: TeachersApiResponse = await response.json();
    console.log(`[API] Received ${data.items?.length} teachers from API mock.`);
    return data;
};

export const fetchParents = async ({ page = 1 }: { page?: number; }): Promise<ParentsApiResponse> => {
    console.log(`[API] Fetching parents: page=${page}`);
    const params = new URLSearchParams();
    params.append('page', String(page));
    const response = await fetch(`/api/parents?${params.toString()}`);
    console.log(`[API] Parents Response status: ${response.status}`);
    if (!response.ok) { console.error(`[API] Parents Network response was not ok: ${response.statusText}`); throw new Error(`Failed to fetch parents: ${response.statusText}`); }
    const data: ParentsApiResponse = await response.json();
    console.log(`[API] Received ${data.items?.length} parents from API mock.`);
    return data;
};

// --- Mutation Functions ---

export const createUser = async (userData: Omit<User, 'id' | 'status'>): Promise<User> => {
    console.log('[API] Creating user:', userData.firstName, userData.lastName);
    const response = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify(userData), });
    console.log(`[API] Create User Response status: ${response.status}`);
    if (!response.ok) { let errorMsg = `Failed to create user: ${response.statusText}`; try { const errorBody = await response.json(); errorMsg = errorBody.message || errorBody.error || errorMsg; } catch (e) { /* Ignore */ } console.error(`[API] Create User failed: ${errorMsg}`); throw new Error(errorMsg); }
    const createdUser: User = await response.json();
    console.log(`[API] User created successfully (ID: ${createdUser.id})`);
    return createdUser;
};

export const updateUser = async ({ userId, updates }: { userId: string; updates: Partial<Omit<User, 'id' | 'role' | 'status'>> }): Promise<User> => {
    console.log(`[API] Updating user ${userId}:`, updates);
    if ('role' in updates || 'status' in updates) { console.warn("[API] Attempting to send 'role' or 'status' in updateUser."); }
    const response = await fetch(`/api/users/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify(updates), });
    console.log(`[API] Update User Response status: ${response.status}`);
    if (!response.ok) { let errorMsg = `Failed to update user ${userId}: ${response.statusText}`; try { const errorBody = await response.json(); errorMsg = errorBody.message || errorBody.error || errorMsg; } catch (e) { /* Ignore */ } console.error(`[API] Update User failed: ${errorMsg}`); throw new Error(errorMsg); }
    const updatedUser: User = await response.json();
    console.log(`[API] User ${userId} updated successfully`);
    return updatedUser;
};

export const deleteUser = async (userId: string): Promise<void> => {
    console.log(`[API] Deleting user ${userId}`);
    const response = await fetch(`/api/users/${userId}`, { method: 'DELETE', });
    console.log(`[API] Delete User Response status: ${response.status}`);
    if (!response.ok && response.status !== 204) { let errorMsg = `Failed to delete user ${userId}: ${response.statusText}`; try { const errorBody = await response.json(); errorMsg = errorBody.message || errorBody.error || errorMsg; } catch (e) { /* Ignore */ } console.error(`[API] Delete User failed: ${errorMsg}`); throw new Error(errorMsg); }
    if(response.status === 204) { console.log(`[API] User ${userId} deleted successfully (204 No Content).`); } else { console.log(`[API] User ${userId} deleted successfully (Status: ${response.status}).`); }
};

// New function for toggling user status
export const toggleUserStatus = async (userId: string): Promise<User> => { // Returns updated user
    console.log(`[API] Toggling status for user ${userId}`);

    // We don't need to send a body for this specific toggle endpoint
    const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json', // Still good practice
        },
        // No body needed, the endpoint implies the action
    });

    console.log(`[API] Toggle Status Response status: ${response.status}`);

    if (!response.ok) {
        let errorMsg = `Failed to toggle status for user ${userId}: ${response.statusText}`;
        try {
            const errorBody = await response.json();
            errorMsg = errorBody.message || errorBody.error || errorMsg;
        } catch (e) { /* Ignore */ }
        console.error(`[API] Toggle Status failed: ${errorMsg}`);
        throw new Error(errorMsg);
    }

    const updatedUser: User = await response.json(); // API returns the user with the new status
    console.log(`[API] User ${userId} status toggled successfully to ${updatedUser.status}`);
    return updatedUser;
};