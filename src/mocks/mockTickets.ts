

export type TransactionType = 'task_award' | 'manual_add' | 'manual_subtract' | 'redemption';

export interface TicketTransaction {
  id: string;
  studentId: string;
  timestamp: string;
  amount: number;
  type: TransactionType;
  sourceId: string;
  notes?: string;
}

export const mockTicketBalances: Record<string, number> = {
  'student-1': 5200,
  'student-2': 150,
  'student-3': 7500,
  'student-inactive': 50, 
  
  'student-4': 250,
  'student-5': 1200,
  'student-6': 80,
  
};

export const mockTicketHistory: TicketTransaction[] = [
  
  {
    id: 'tx-1',
    studentId: 'student-1',
    timestamp: '2025-04-17T09:00:00Z',
    amount: 10,
    type: 'task_award',
    sourceId: 'assigned-1',
    notes: 'Task: Practice 15 minutes',
  },
  {
    id: 'tx-2',
    studentId: 'student-1',
    timestamp: '2025-04-16T09:15:00Z',
    amount: 15,
    type: 'task_award',
    sourceId: 'assigned-2',
    notes: 'Task: Learn Scale C Major (Partial)',
  },
  {
    id: 'tx-3',
    studentId: 'student-1',
    timestamp: '2025-01-10T11:00:00Z',
    amount: 5000,
    type: 'manual_add',
    sourceId: 'manual-adj-1-mock',
    notes: 'Initial onboarding 5000 physical tickets',
  },
  {
    id: 'tx-4',
    studentId: 'student-3',
    timestamp: '2025-02-15T15:00:00Z',
    amount: -2000,
    type: 'redemption',
    sourceId: 'redemption-1-mock',
    notes: 'Redeemed: Drumsticks',
  },
  {
    id: 'tx-5',
    studentId: 'student-3',
    timestamp: '2025-02-15T14:50:00Z',
    amount: 5000,
    type: 'manual_add',
    sourceId: 'manual-adj-2-mock',
    notes: 'Initial onboarding',
  },
  {
    id: 'tx-6',
    studentId: 'student-2',
    timestamp: '2025-03-20T10:00:00Z',
    amount: 150,
    type: 'manual_add',
    sourceId: 'manual-adj-3-mock',
    notes: 'Welcome Bonus',
  },
  
  {
    id: 'tx-7',
    studentId: 'student-4',
    timestamp: '2025-04-01T10:00:00Z',
    amount: 250,
    type: 'manual_add',
    sourceId: 'manual-adj-4-mock',
    notes: 'Onboarding',
  },
  {
    id: 'tx-8',
    studentId: 'student-5',
    timestamp: '2025-04-02T11:00:00Z',
    amount: 1200,
    type: 'manual_add',
    sourceId: 'manual-adj-5-mock',
    notes: 'Initial Transfer',
  },
  {
    id: 'tx-9',
    studentId: 'student-6',
    timestamp: '2025-04-03T12:00:00Z',
    amount: 80,
    type: 'manual_add',
    sourceId: 'manual-adj-6-mock',
    notes: 'Starter tickets',
  },
  {
    id: 'tx-10',
    studentId: 'student-inactive',
    timestamp: '2025-01-05T10:00:00Z',
    amount: 50,
    type: 'manual_add',
    sourceId: 'manual-adj-inactive-mock',
    notes: 'Initial balance',
  },
  
];
