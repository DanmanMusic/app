// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import { mockUsers } from './mockUsers';
import { User, UserStatus } from '../types/userTypes';
import { getUserDisplayName } from '../utils/helpers';

const ITEMS_PER_PAGE = 5;

// Helper for students
const getFilteredStudents = (
    filter: UserStatus | 'all',
    searchTerm: string
): User[] => {
    const termLower = searchTerm.toLowerCase();
    return Object.values(mockUsers)
        .filter((user) => user.role === 'student')
        .filter((student) => {
            if (filter !== 'all' && student.status !== filter) {
                return false;
            }
            if (termLower && !getUserDisplayName(student).toLowerCase().includes(termLower)) {
                return false;
            }
            return true;
        })
        .sort((a, b) => {
            if (a.status === 'active' && b.status === 'inactive') return -1;
            if (a.status === 'inactive' && b.status === 'active') return 1;
            const lastNameComparison = a.lastName.localeCompare(b.lastName);
            if (lastNameComparison !== 0) return lastNameComparison;
            return a.firstName.localeCompare(b.firstName);
        });
};

// Helper for teachers
const getSortedTeachers = (): User[] => {
    return Object.values(mockUsers)
        .filter(user => user.role === 'teacher')
        .sort((a, b) => {
            const lastNameComparison = a.lastName.localeCompare(b.lastName);
            if (lastNameComparison !== 0) return lastNameComparison;
            return a.firstName.localeCompare(b.firstName);
        });
};

// Helper for parents
const getSortedParents = (): User[] => {
    return Object.values(mockUsers)
        .filter(user => user.role === 'parent')
        .sort((a, b) => {
            const lastNameA = a.lastName || '';
            const lastNameB = b.lastName || '';
            const firstNameA = a.firstName || '';
            const firstNameB = b.firstName || '';
            const lastNameComparison = lastNameA.localeCompare(lastNameB);
            if (lastNameComparison !== 0) return lastNameComparison;
            return firstNameA.localeCompare(firstNameB);
        });
};


export const handlers = [
    // --- GET Handlers ---
    http.get('/api/students', ({ request }) => {
        console.log('[MSW] Intercepted GET /api/students');
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const filter = (url.searchParams.get('filter') as UserStatus | 'all') || 'all';
        const searchTerm = url.searchParams.get('search') || '';
        console.log(`[MSW] Params: page=${page}, filter=${filter}, search='${searchTerm}'`);
        const filteredStudents = getFilteredStudents(filter, searchTerm);
        const totalItems = filteredStudents.length;
        const totalPages = totalItems > 0 ? Math.ceil(totalItems / ITEMS_PER_PAGE) : 1;
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const paginatedItems = filteredStudents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        console.log(`[MSW] Responding with ${paginatedItems.length} students for page ${page}. Total items: ${totalItems}, Total pages: ${totalPages}`);
        return HttpResponse.json({
            items: paginatedItems,
            totalPages: totalPages,
            currentPage: page,
            totalItems: totalItems,
        });
    }),
    http.get('/api/teachers', ({ request }) => {
        console.log('[MSW] Intercepted GET /api/teachers');
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        console.log(`[MSW] Params: page=${page}`);
        const sortedTeachers = getSortedTeachers();
        const totalItems = sortedTeachers.length;
        const totalPages = totalItems > 0 ? Math.ceil(totalItems / ITEMS_PER_PAGE) : 1;
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const paginatedItems = sortedTeachers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        console.log(`[MSW] Responding with ${paginatedItems.length} teachers for page ${page}. Total items: ${totalItems}, Total pages: ${totalPages}`);
        return HttpResponse.json({
            items: paginatedItems,
            totalPages: totalPages,
            currentPage: page,
            totalItems: totalItems,
        });
    }),
    http.get('/api/parents', ({ request }) => {
        console.log('[MSW] Intercepted GET /api/parents');
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        console.log(`[MSW] Params: page=${page}`);
        const sortedParents = getSortedParents();
        const totalItems = sortedParents.length;
        const totalPages = totalItems > 0 ? Math.ceil(totalItems / ITEMS_PER_PAGE) : 1;
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const paginatedItems = sortedParents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        console.log(`[MSW] Responding with ${paginatedItems.length} parents for page ${page}. Total items: ${totalItems}, Total pages: ${totalPages}`);
        return HttpResponse.json({
            items: paginatedItems,
            totalPages: totalPages,
            currentPage: page,
            totalItems: totalItems,
        });
    }),

    // --- POST/PATCH/DELETE Handlers ---
    http.post('/api/users', async ({ request }) => {
        console.log('[MSW] Intercepted POST /api/users');
        try {
            const newUserData = await request.json() as Omit<User, 'id' | 'status'>;
            if (!newUserData || !newUserData.firstName || !newUserData.lastName || !newUserData.role) {
                 console.error('[MSW] Invalid user data received:', newUserData);
                 return new HttpResponse('Invalid user data provided', { status: 400 });
            }
            const newId = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const newUser: User = { ...newUserData, id: newId, status: 'active' };
            mockUsers[newId] = newUser;
            console.log(`[MSW] Created user: ${getUserDisplayName(newUser)} (ID: ${newId})`);
            return HttpResponse.json(newUser, { status: 201 });
        } catch (error) {
            console.error('[MSW] Error parsing request body for POST /api/users:', error);
            return new HttpResponse('Failed to parse request body', { status: 400 });
        }
    }),
    http.patch('/api/users/:id', async ({ request, params }) => {
        const { id } = params;
        console.log(`[MSW] Intercepted PATCH /api/users/${id}`);
        if (typeof id !== 'string') { return new HttpResponse('Invalid user ID', { status: 400 }); }
        const existingUser = mockUsers[id];
        if (!existingUser) { return new HttpResponse('User not found', { status: 404 }); }
        try {
            const updates = await request.json() as Partial<Omit<User, 'id' | 'role' | 'status'>>;
            let validUpdates = { ...updates };
            if ('role' in validUpdates || 'status' in validUpdates) {
                 console.warn('[MSW] Attempted to update role or status via PATCH /api/users. Ignoring these fields.');
                 delete (validUpdates as any).role;
                 delete (validUpdates as any).status;
            }
            mockUsers[id] = { ...existingUser, ...validUpdates };
            console.log(`[MSW] Updated user ${id}:`, mockUsers[id]);
            return HttpResponse.json(mockUsers[id], { status: 200 });
        } catch (error) {
            console.error(`[MSW] Error parsing request body for PATCH /api/users/${id}:`, error);
            return new HttpResponse('Failed to parse request body', { status: 400 });
        }
    }),
    http.delete('/api/users/:id', ({ params }) => {
        const { id } = params;
        console.log(`[MSW] Intercepted DELETE /api/users/${id}`);
        if (typeof id !== 'string') { return new HttpResponse('Invalid user ID', { status: 400 }); }
        if (mockUsers[id]) {
            const deletedUserName = getUserDisplayName(mockUsers[id]);
            delete mockUsers[id];
            console.log(`[MSW] Deleted user ${id} (${deletedUserName}).`);
            return new HttpResponse(null, { status: 204 });
        } else {
            console.log(`[MSW] User ${id} not found for deletion.`);
            return new HttpResponse('User not found', { status: 404 });
        }
    }),

    // --- Toggle User Status PATCH Handler (New) ---
    // Using a separate endpoint is cleaner for a specific action like this
    http.patch('/api/users/:id/status', ({ params }) => {
        const { id } = params;
        console.log(`[MSW] Intercepted PATCH /api/users/${id}/status`);

        if (typeof id !== 'string') {
             return new HttpResponse('Invalid user ID', { status: 400 });
        }

        const user = mockUsers[id];
        if (!user) {
            console.log(`[MSW] User ${id} not found for status toggle.`);
            return new HttpResponse('User not found', { status: 404 });
        }

        // Toggle status
        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        // MUTATING MOCK DATA
        user.status = newStatus;

        console.log(`[MSW] Toggled status for user ${id} to ${newStatus}.`);
        // Return the *entire* updated user object
        return HttpResponse.json(user, { status: 200 });
    }),
];