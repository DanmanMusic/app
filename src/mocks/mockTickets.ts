// src/mocks/mockTickets.ts
// Note: Timestamps are strings here for simplicity in mock data.

export type TransactionType = 'task_award' | 'manual_add' | 'manual_subtract' | 'redemption';

export interface TicketTransaction {
  id: string;
  studentId: string; // Refers to User.id
  timestamp: string; // ISO string or similar
  amount: number; // Positive for gain, negative for loss/redemption
  type: TransactionType;
  sourceId: string; // Refers to AssignedTask.id, ManualAdjustment.id, or Redemption.id (mock IDs here)
  notes?: string; // Optional reason for manual adjustments/redemptions
}

// Current balances for each student (Student ID -> Balance)
export const mockTicketBalances: Record<string, number> = {
    'student-1': 5200,
    'student-2': 150,
    'student-3': 7500,
};

// Transaction history for all students with updated timestamps
export const mockTicketHistory: TicketTransaction[] = [
  { id: 'tx-1', studentId: 'student-1', timestamp: '2025-04-17T09:00:00Z', amount: 10, type: 'task_award', sourceId: 'assigned-1', notes: 'Task: Practice 15 minutes' },
  { id: 'tx-2', studentId: 'student-1', timestamp: '2025-04-16T09:15:00Z', amount: 15, type: 'task_award', sourceId: 'assigned-2', notes: 'Task: Learn Scale C Major (Partial)' },
  { id: 'tx-3', studentId: 'student-1', timestamp: '2025-01-10T11:00:00Z', amount: 5000, type: 'manual_add', sourceId: 'manual-adj-1-mock', notes: 'Initial onboarding 5000 physical tickets' },
  { id: 'tx-4', studentId: 'student-3', timestamp: '2025-02-15T15:00:00Z', amount: -2000, type: 'redemption', sourceId: 'redemption-1-mock', notes: 'Redeemed: Drumsticks' },
  { id: 'tx-5', studentId: 'student-3', timestamp: '2025-02-15T14:50:00Z', amount: 5000, type: 'manual_add', sourceId: 'manual-adj-2-mock', notes: 'Initial onboarding' },
  { id: 'tx-6', studentId: 'student-2', timestamp: '2025-03-20T10:00:00Z', amount: 150, type: 'manual_add', sourceId: 'manual-adj-3-mock', notes: 'Welcome Bonus' },
];