// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

// User Mocks & Helpers
import { mockUsers } from './mockUsers';
import { User, UserStatus } from '../types/userTypes';
import { getUserDisplayName } from '../utils/helpers';

// Task Library Mocks & Types
import { initialMockTaskLibrary, TaskLibraryItem } from './mockTaskLibrary';

// Rewards Mocks & Types
import { initialMockRewardsCatalog, RewardItem } from './mockRewards';

// Announcements Mocks & Types
import { mockAnnouncements as initialMockAnnouncements, Announcement } from './mockAnnouncements';

// Instruments Mocks & Types
import { mockInstruments as initialMockInstruments, Instrument } from './mockInstruments';

// Assigned Tasks Mocks & Types
import {
  mockAllAssignedTasks,
  AssignedTask,
  TaskVerificationStatus,
} from './mockAssignedTasks';
import { TaskAssignmentFilterStatusAPI, StudentTaskFilterStatusAPI } from '../api/assignedTasks';

// Ticket Mocks & Types (Needed for verification logic AND new handlers)
import { mockTicketBalances, mockTicketHistory, TicketTransaction, TransactionType } from './mockTickets';

const ITEMS_PER_PAGE = 5; // User/Teacher/Parent list page size
const ASSIGNED_TASKS_PAGE_LIMIT = 10; // Assigned tasks page size
const HISTORY_PAGE_LIMIT = 15; // History page size

// --- Mutable Mock Data ---
let currentMockUsers = { ...mockUsers };
let mockTaskLibraryData: TaskLibraryItem[] = [...initialMockTaskLibrary];
let mockRewardsData: RewardItem[] = [...initialMockRewardsCatalog];
let mockAnnouncementsData: Announcement[] = [...initialMockAnnouncements];
let mockInstrumentsData: Instrument[] = [...initialMockInstruments];
let mockAssignedTasksData: AssignedTask[] = [...mockAllAssignedTasks];
let mockTicketBalancesData = { ...mockTicketBalances };
let mockTicketHistoryData: TicketTransaction[] = [...mockTicketHistory];

// --- User Helpers ---
const getFilteredStudents = (filter: UserStatus | 'all', searchTerm: string): User[] => {
  const termLower = searchTerm.toLowerCase();
  return Object.values(currentMockUsers).filter(user => user.role === 'student').filter(student => { if (filter !== 'all' && student.status !== filter) { return false; } if (termLower && !getUserDisplayName(student).toLowerCase().includes(termLower)) { return false; } return true; }).sort((a, b) => { if (a.status === 'active' && b.status === 'inactive') return -1; if (a.status === 'inactive' && b.status === 'active') return 1; const lastNameComparison = a.lastName.localeCompare(b.lastName); if (lastNameComparison !== 0) return lastNameComparison; return a.firstName.localeCompare(b.firstName); });
};
const getSortedTeachers = (): User[] => {
  return Object.values(currentMockUsers).filter(user => user.role === 'teacher').sort((a, b) => { const lastNameComparison = a.lastName.localeCompare(b.lastName); if (lastNameComparison !== 0) return lastNameComparison; return a.firstName.localeCompare(b.firstName); });
};
const getSortedParents = (): User[] => {
  return Object.values(currentMockUsers).filter(user => user.role === 'parent').sort((a, b) => { const lastNameA = a.lastName || ''; const lastNameB = b.lastName || ''; const firstNameA = a.firstName || ''; const firstNameB = b.firstName || ''; const lastNameComparison = lastNameA.localeCompare(lastNameB); if (lastNameComparison !== 0) return lastNameComparison; return firstNameA.localeCompare(firstNameB); });
};

// --- Handlers Array ---
export const handlers = [
  // --- User Handlers ---
  http.get('/api/students', ({ request }) => { const url = new URL(request.url); const page = parseInt(url.searchParams.get('page') || '1', 10); const filter = (url.searchParams.get('filter') as UserStatus | 'all') || 'all'; const searchTerm = url.searchParams.get('search') || ''; const filteredStudents = getFilteredStudents(filter, searchTerm); const totalItems = filteredStudents.length; const totalPages = totalItems > 0 ? Math.ceil(totalItems / ITEMS_PER_PAGE) : 1; const startIndex = (page - 1) * ITEMS_PER_PAGE; const paginatedItems = filteredStudents.slice(startIndex, startIndex + ITEMS_PER_PAGE); return HttpResponse.json({ items: paginatedItems, totalPages, currentPage: page, totalItems }); }),
  http.get('/api/teachers', ({ request }) => { const url = new URL(request.url); const page = parseInt(url.searchParams.get('page') || '1', 10); const sortedTeachers = getSortedTeachers(); const totalItems = sortedTeachers.length; const totalPages = totalItems > 0 ? Math.ceil(totalItems / ITEMS_PER_PAGE) : 1; const startIndex = (page - 1) * ITEMS_PER_PAGE; const paginatedItems = sortedTeachers.slice(startIndex, startIndex + ITEMS_PER_PAGE); return HttpResponse.json({ items: paginatedItems, totalPages, currentPage: page, totalItems }); }),
  http.get('/api/parents', ({ request }) => { const url = new URL(request.url); const page = parseInt(url.searchParams.get('page') || '1', 10); const sortedParents = getSortedParents(); const totalItems = sortedParents.length; const totalPages = totalItems > 0 ? Math.ceil(totalItems / ITEMS_PER_PAGE) : 1; const startIndex = (page - 1) * ITEMS_PER_PAGE; const paginatedItems = sortedParents.slice(startIndex, startIndex + ITEMS_PER_PAGE); return HttpResponse.json({ items: paginatedItems, totalPages, currentPage: page, totalItems }); }),
  http.post('/api/users', async ({ request }) => { try { const d = (await request.json()) as Omit<User, 'id'|'status'>; if (!d || !d.firstName || !d.lastName || !d.role) return new HttpResponse('Invalid data', { status: 400 }); const i = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`; const n: User = { ...d, id: i, status: 'active' }; currentMockUsers[i] = n; return HttpResponse.json(n, { status: 201 }); } catch (e) { return new HttpResponse('Bad request', { status: 400 }); } }),
  http.patch('/api/users/:id', async ({ request, params }) => { const { id } = params; if (typeof id !== 'string') return new HttpResponse('Invalid ID', { status: 400 }); const u = currentMockUsers[id]; if (!u) return new HttpResponse('Not found', { status: 404 }); try { const upd = (await request.json()) as Partial<Omit<User, 'id'|'role'|'status'>>; let v = { ...upd }; if ('role' in v || 'status' in v) { delete (v as any).role; delete (v as any).status; } currentMockUsers[id] = { ...u, ...v }; return HttpResponse.json(currentMockUsers[id]); } catch (e) { return new HttpResponse('Bad request', { status: 400 }); } }),
  http.delete('/api/users/:id', ({ params }) => { const { id } = params; if (typeof id !== 'string') return new HttpResponse('Invalid ID', { status: 400 }); if (currentMockUsers[id]) { delete currentMockUsers[id]; return new HttpResponse(null, { status: 204 }); } else { return new HttpResponse('Not found', { status: 404 }); } }),
  http.patch('/api/users/:id/status', ({ params }) => { const { id } = params; if (typeof id !== 'string') return new HttpResponse('Invalid ID', { status: 400 }); const u = currentMockUsers[id]; if (!u) return new HttpResponse('Not found', { status: 404 }); u.status = u.status === 'active' ? 'inactive' : 'active'; return HttpResponse.json(u); }),

  // --- Task Library Handlers ---
  http.get('/api/task-library', () => { const d = [...mockTaskLibraryData].sort((a, b) => a.title.localeCompare(b.title)); return HttpResponse.json(d); }),
  http.post('/api/task-library', async ({ request }) => { try { const d = (await request.json()) as Omit<TaskLibraryItem, 'id'>; if (!d || !d.title || !d.description || d.baseTickets == null || typeof d.baseTickets !== 'number' || d.baseTickets < 0) return new HttpResponse('Invalid data', { status: 400 }); const i = `tasklib-${Date.now()}-${Math.random().toString(36).substring(7)}`; const n = { ...d, id: i }; mockTaskLibraryData.push(n); return HttpResponse.json(n, { status: 201 }); } catch (e) { return new HttpResponse('Bad request', { status: 400 }); } }),
  http.patch('/api/task-library/:id', async ({ request, params }) => { const { id } = params; if (typeof id !== 'string') return new HttpResponse('Invalid ID', { status: 400 }); const idx = mockTaskLibraryData.findIndex(t => t.id === id); if (idx === -1) return new HttpResponse('Not found', { status: 404 }); try { const u = (await request.json()) as Partial<Omit<TaskLibraryItem, 'id'>>; if (u.baseTickets != null && (typeof u.baseTickets !== 'number' || u.baseTickets < 0)) return new HttpResponse('Invalid points', { status: 400 }); const n = { ...mockTaskLibraryData[idx], ...u }; mockTaskLibraryData[idx] = n; return HttpResponse.json(n); } catch (e) { return new HttpResponse('Bad request', { status: 400 }); } }),
  http.delete('/api/task-library/:id', ({ params }) => { const { id } = params; if (typeof id !== 'string') return new HttpResponse('Invalid ID', { status: 400 }); const idx = mockTaskLibraryData.findIndex(t => t.id === id); if (idx === -1) return new HttpResponse('Not found', { status: 404 }); mockTaskLibraryData.splice(idx, 1); return new HttpResponse(null, { status: 204 }); }),

  // --- Rewards Handlers ---
  http.get('/api/rewards', () => { const d = [...mockRewardsData].sort((a, b) => a.cost - b.cost); return HttpResponse.json(d); }),
  http.post('/api/rewards', async ({ request }) => { try { const d = (await request.json()) as Omit<RewardItem, 'id'>; if (!d || !d.name || d.cost == null || typeof d.cost !== 'number' || d.cost < 0 || !d.imageUrl) return new HttpResponse('Invalid data', { status: 400 }); const i = `reward-${Date.now()}-${Math.random().toString(36).substring(7)}`; const n = { ...d, id: i }; mockRewardsData.push(n); return HttpResponse.json(n, { status: 201 }); } catch (e) { return new HttpResponse('Bad request', { status: 400 }); } }),
  http.patch('/api/rewards/:id', async ({ request, params }) => { const { id } = params; if (typeof id !== 'string') return new HttpResponse('Invalid ID', { status: 400 }); const idx = mockRewardsData.findIndex(r => r.id === id); if (idx === -1) return new HttpResponse('Not found', { status: 404 }); try { const u = (await request.json()) as Partial<Omit<RewardItem, 'id'>>; if (u.cost != null && (typeof u.cost !== 'number' || u.cost < 0)) return new HttpResponse('Invalid cost', { status: 400 }); if (u.imageUrl === '') return new HttpResponse('Image URL empty', { status: 400 }); const n = { ...mockRewardsData[idx], ...u }; mockRewardsData[idx] = n; return HttpResponse.json(n); } catch (e) { return new HttpResponse('Bad request', { status: 400 }); } }),
  http.delete('/api/rewards/:id', ({ params }) => { const { id } = params; if (typeof id !== 'string') return new HttpResponse('Invalid ID', { status: 400 }); const idx = mockRewardsData.findIndex(r => r.id === id); if (idx === -1) return new HttpResponse('Not found', { status: 404 }); mockRewardsData.splice(idx, 1); return new HttpResponse(null, { status: 204 }); }),

  // --- Announcements Handlers ---
  http.get('/api/announcements', () => { const d = [...mockAnnouncementsData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); return HttpResponse.json(d); }),
  http.post('/api/announcements', async ({ request }) => { try { const d = (await request.json()) as Omit<Announcement, 'id'|'date'>; if (!d || !d.title || !d.message || !d.type) return new HttpResponse('Invalid data', { status: 400 }); const i = `ann-${Date.now()}-${Math.random().toString(36).substring(7)}`; const n = { ...d, id: i, date: new Date().toISOString() }; mockAnnouncementsData.unshift(n); return HttpResponse.json(n, { status: 201 }); } catch (e) { return new HttpResponse('Bad request', { status: 400 }); } }),
  http.patch('/api/announcements/:id', async ({ request, params }) => { const { id } = params; if (typeof id !== 'string') return new HttpResponse('Invalid ID', { status: 400 }); const idx = mockAnnouncementsData.findIndex(a => a.id === id); if (idx === -1) return new HttpResponse('Not found', { status: 404 }); try { const u = (await request.json()) as Partial<Omit<Announcement, 'id'|'date'>>; const n = { ...mockAnnouncementsData[idx], ...u }; mockAnnouncementsData[idx] = n; return HttpResponse.json(n); } catch (e) { return new HttpResponse('Bad request', { status: 400 }); } }),
  http.delete('/api/announcements/:id', ({ params }) => { const { id } = params; if (typeof id !== 'string') return new HttpResponse('Invalid ID', { status: 400 }); const idx = mockAnnouncementsData.findIndex(a => a.id === id); if (idx === -1) return new HttpResponse('Not found', { status: 404 }); mockAnnouncementsData.splice(idx, 1); return new HttpResponse(null, { status: 204 }); }),

  // --- Instruments Handlers ---
  http.get('/api/instruments', () => { const d = [...mockInstrumentsData].sort((a, b) => a.name.localeCompare(b.name)); return HttpResponse.json(d); }),
  http.post('/api/instruments', async ({ request }) => { try { const d = (await request.json()) as Omit<Instrument, 'id'>; if (!d || !d.name || !d.name.trim()) return new HttpResponse('Invalid data', { status: 400 }); const i = `inst-${Date.now()}-${Math.random().toString(36).substring(7)}`; const n = { name: d.name.trim(), id: i }; mockInstrumentsData.push(n); return HttpResponse.json(n, { status: 201 }); } catch (e) { return new HttpResponse('Bad request', { status: 400 }); } }),
  http.patch('/api/instruments/:id', async ({ request, params }) => { const { id } = params; if (typeof id !== 'string') return new HttpResponse('Invalid ID', { status: 400 }); const idx = mockInstrumentsData.findIndex(i => i.id === id); if (idx === -1) return new HttpResponse('Not found', { status: 404 }); try { const u = (await request.json()) as Partial<Omit<Instrument, 'id'>>; if (u.name != null && !u.name.trim()) return new HttpResponse('Name empty', { status: 400 }); const n = { ...mockInstrumentsData[idx], ...u }; if (u.name) n.name = u.name.trim(); mockInstrumentsData[idx] = n; return HttpResponse.json(n); } catch (e) { return new HttpResponse('Bad request', { status: 400 }); } }),
  http.delete('/api/instruments/:id', ({ params }) => { const { id } = params; if (typeof id !== 'string') return new HttpResponse('Invalid ID', { status: 400 }); const idx = mockInstrumentsData.findIndex(i => i.id === id); if (idx === -1) return new HttpResponse('Not found', { status: 404 }); mockInstrumentsData.splice(idx, 1); return new HttpResponse(null, { status: 204 }); }),

  // --- Assigned Tasks Handlers ---
  http.get('/api/assigned-tasks', ({ request }) => { const url = new URL(request.url); const page = parseInt(url.searchParams.get('page') || '1', 10); const limit = parseInt(url.searchParams.get('limit') || String(ASSIGNED_TASKS_PAGE_LIMIT), 10); const assignmentStatus = (url.searchParams.get('assignmentStatus') as TaskAssignmentFilterStatusAPI) || 'all'; const studentStatus = (url.searchParams.get('studentStatus') as StudentTaskFilterStatusAPI) || 'all'; const studentIdParam = url.searchParams.get('studentId'); const filtered = mockAssignedTasksData.filter(t => { if (studentIdParam && t.studentId !== studentIdParam) return false; let aM = false; switch (assignmentStatus) { case 'assigned': aM = !t.isComplete; break; case 'pending': aM = t.isComplete && t.verificationStatus === 'pending'; break; case 'completed': aM = t.isComplete && t.verificationStatus !== 'pending' && t.verificationStatus !== undefined; break; default: aM = true; break; } if (!aM) return false; const s = currentMockUsers[t.studentId]; if (!s) return false; let sM = false; switch (studentStatus) { case 'active': sM = s.status === 'active'; break; case 'inactive': sM = s.status === 'inactive'; break; default: sM = true; break; } return sM; }); const sorted = filtered.sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime()); const totalItems = sorted.length; const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1; const startIndex = (page - 1) * limit; const paginatedItems = sorted.slice(startIndex, startIndex + limit); return HttpResponse.json({ items: paginatedItems, totalPages, currentPage: page, totalItems }); }),
  http.post('/api/assigned-tasks', async ({ request }) => { try { const d = (await request.json()) as Omit<AssignedTask, 'id'|'isComplete'|'verificationStatus'|'assignedDate'> & { assignedById: string }; if (!d.studentId || !d.taskTitle || !d.taskDescription || d.taskBasePoints == null || d.assignedById == null) return new HttpResponse('Invalid data', { status: 400 }); if (!currentMockUsers[d.studentId]) return new HttpResponse('Student not found', { status: 404 }); const i = `assigned-${Date.now()}-${Math.random().toString(16).slice(2)}`; const n = { ...d, id: i, assignedDate: new Date().toISOString(), isComplete: false, verificationStatus: undefined }; mockAssignedTasksData.push(n); return HttpResponse.json(n, { status: 201 }); } catch (e) { return new HttpResponse('Bad request', { status: 400 }); } }),
  http.patch('/api/assigned-tasks/:id', async ({ request, params }) => { const { id } = params; if (typeof id !== 'string') return new HttpResponse('Invalid ID', { status: 400 }); const idx = mockAssignedTasksData.findIndex(t => t.id === id); if (idx === -1) return new HttpResponse('Not found', { status: 404 }); try { const u = (await request.json()) as Partial<AssignedTask>; const e = mockAssignedTasksData[idx]; let n = { ...e }; if (u.isComplete === true && !e.isComplete) { n.isComplete = true; n.completedDate = new Date().toISOString(); n.verificationStatus = 'pending'; } if (u.verificationStatus && e.isComplete && e.verificationStatus === 'pending') { const { verificationStatus: vS, verifiedById: vBI, actualPointsAwarded: aPA } = u; if (!vBI) return new HttpResponse('Verifier ID required', { status: 400 }); if (vS !== 'incomplete' && (aPA == null || aPA < 0)) return new HttpResponse('Valid points required', { status: 400 }); n.verificationStatus = vS; n.verifiedById = vBI; n.verifiedDate = new Date().toISOString(); n.actualPointsAwarded = (vS === 'verified' || vS === 'partial') ? aPA : undefined; if (n.actualPointsAwarded != null && n.actualPointsAwarded > 0) { const sId = n.studentId; const t = n.actualPointsAwarded; mockTicketBalancesData[sId] = (mockTicketBalancesData[sId] || 0) + t; mockTicketHistoryData.unshift({ id: `tx-${Date.now()}`, studentId: sId, timestamp: n.verifiedDate, amount: t, type: 'task_award', sourceId: n.id, notes: `Task: ${n.taskTitle} (${vS})` }); console.log(`[MSW] Awarded ${t} tickets to ${sId} for task ${id}. Balance: ${mockTicketBalancesData[sId]}`); } } mockAssignedTasksData[idx] = n; return HttpResponse.json(n); } catch (e) { return new HttpResponse('Bad request', { status: 400 }); } }),
  http.delete('/api/assigned-tasks/:id', ({ params }) => { const { id } = params; if (typeof id !== 'string') return new HttpResponse('Invalid ID', { status: 400 }); const idx = mockAssignedTasksData.findIndex(t => t.id === id); if (idx === -1) return new HttpResponse('Not found', { status: 404 }); mockAssignedTasksData.splice(idx, 1); return new HttpResponse(null, { status: 204 }); }),

  // --- NEW: Ticket History/Balance Handlers ---
  http.get('/api/ticket-history', ({ request }) => {
    console.log('[MSW] Intercepted GET /api/ticket-history');
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || String(HISTORY_PAGE_LIMIT), 10);
    const studentId = url.searchParams.get('studentId');

    let history = studentId
        ? mockTicketHistoryData.filter(tx => tx.studentId === studentId)
        : [...mockTicketHistoryData];

    // Sort most recent first (already sorted in mock, but good practice)
    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Paginate
    const totalItems = history.length;
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;
    const startIndex = (page - 1) * limit;
    const paginatedItems = history.slice(startIndex, startIndex + limit);

    console.log(`[MSW] Responding with ${paginatedItems.length} history items for page ${page}. Total: ${totalItems}`);
    return HttpResponse.json({ items: paginatedItems, totalPages, currentPage: page, totalItems });
  }),

  http.get('/api/students/:id/balance', ({ params }) => {
    const { id } = params;
    console.log(`[MSW] Intercepted GET /api/students/${id}/balance`);
    if (typeof id !== 'string' || !currentMockUsers[id] || currentMockUsers[id].role !== 'student') {
      return new HttpResponse('Student not found', { status: 404 });
    }
    const balance = mockTicketBalancesData[id] || 0;
    console.log(`[MSW] Responding with balance ${balance} for student ${id}`);
    return HttpResponse.json({ balance });
  }),

  http.post('/api/ticket-adjustments', async ({ request }) => {
    console.log('[MSW] Intercepted POST /api/ticket-adjustments');
    try {
        const { studentId, amount, notes, adjusterId } = (await request.json()) as { studentId: string; amount: number; notes: string; adjusterId: string };

        if (!studentId || amount == null || !notes || !adjusterId) {
            return new HttpResponse('Missing required fields', { status: 400 });
        }
        if (!currentMockUsers[studentId] || currentMockUsers[studentId].role !== 'student') {
            return new HttpResponse('Student not found', { status: 404 });
        }
        // Basic validation for amount
        if (typeof amount !== 'number') {
            return new HttpResponse('Invalid amount', { status: 400 });
        }

        // Perform adjustment
        const currentBalance = mockTicketBalancesData[studentId] || 0;
        const newBalance = currentBalance + amount;
        mockTicketBalancesData[studentId] = newBalance; // Mutate balance

        // Create transaction record
        const transaction: TicketTransaction = {
            id: `tx-${Date.now()}`,
            studentId: studentId,
            timestamp: new Date().toISOString(),
            amount: amount,
            type: amount > 0 ? 'manual_add' : 'manual_subtract',
            sourceId: `manual-${adjusterId}-${Date.now()}`,
            notes: `Manual Adjustment by ${adjusterId}: ${notes}`,
        };
        mockTicketHistoryData.unshift(transaction); // Add to history

        console.log(`[MSW] Adjusted tickets for ${studentId} by ${amount}. New Balance: ${newBalance}. Tx: ${transaction.id}`);
        return HttpResponse.json(transaction, { status: 201 }); // Return the created transaction

    } catch (error) {
      console.error('[MSW] Error processing ticket adjustment:', error);
      return new HttpResponse('Failed to process request', { status: 400 });
    }
  }),

  http.post('/api/reward-redemptions', async ({ request }) => {
    console.log('[MSW] Intercepted POST /api/reward-redemptions');
    try {
        const { studentId, rewardId, redeemerId } = (await request.json()) as { studentId: string; rewardId: string; redeemerId: string };

        if (!studentId || !rewardId || !redeemerId) {
            return new HttpResponse('Missing required fields', { status: 400 });
        }
        const student = currentMockUsers[studentId];
        if (!student || student.role !== 'student') {
            return new HttpResponse('Student not found', { status: 404 });
        }
        const reward = mockRewardsData.find(r => r.id === rewardId);
        if (!reward) {
            return new HttpResponse('Reward not found', { status: 404 });
        }

        const currentBalance = mockTicketBalancesData[studentId] || 0;
        if (currentBalance < reward.cost) {
            return new HttpResponse('Insufficient balance', { status: 400 });
        }

        // Perform redemption
        const newBalance = currentBalance - reward.cost;
        mockTicketBalancesData[studentId] = newBalance; // Mutate balance

        // Create transaction record
        const transaction: TicketTransaction = {
            id: `tx-${Date.now()}`,
            studentId: studentId,
            timestamp: new Date().toISOString(),
            amount: -reward.cost, // Negative amount for redemption
            type: 'redemption',
            sourceId: rewardId,
            notes: `Redeemed: ${reward.name} (by ${redeemerId})`,
        };
        mockTicketHistoryData.unshift(transaction); // Add to history

        // Optionally create a redemption announcement (can be complex to manage here)
        // const ann: Announcement = { ... }; mockAnnouncementsData.unshift(ann);

        console.log(`[MSW] Redeemed ${reward.name} for ${studentId}. Cost: ${reward.cost}. New Balance: ${newBalance}. Tx: ${transaction.id}`);
        return HttpResponse.json(transaction, { status: 201 }); // Return the created transaction

    } catch (error) {
        console.error('[MSW] Error processing reward redemption:', error);
        return new HttpResponse('Failed to process request', { status: 400 });
    }
  }),

];