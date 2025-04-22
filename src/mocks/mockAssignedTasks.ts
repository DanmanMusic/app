// src/mocks/mockAssignedTasks.ts

// --- Original Task Library (for reference when updating mocks) ---
// { id: 'tasklib-1', title: 'Practice 15 minutes', description: 'Daily practice on your instrument', baseTickets: 10 },
// { id: 'tasklib-2', title: 'Learn Scale C Major', description: 'Play the C Major scale ascending and descending', baseTickets: 25 },
// { id: 'tasklib-3', title: 'Perform at Recital', description: 'Participate in the quarterly student recital', baseTickets: 100 },
// { id: 'tasklib-4', title: 'Teach Buddy a Chord', description: 'Help a fellow student learn a new chord', baseTickets: 15 },
// ------------------------------------------------------------------

export type TaskVerificationStatus = 'pending' | 'verified' | 'partial' | 'incomplete' | undefined;

// Updated AssignedTask interface
export interface AssignedTask {
  id: string;
  // taskId: string; // Removed
  studentId: string;
  assignedById: string;
  assignedDate: string;

  // Added Fields
  taskTitle: string;
  taskDescription: string;
  taskBasePoints: number;

  isComplete: boolean;
  completedDate?: string;
  verificationStatus?: TaskVerificationStatus;
  verifiedById?: string;
  verifiedDate?: string;
  actualPointsAwarded?: number;
  // reassignedTaskId?: string; // Keeping this might be complex, let's remove for now. Reassign will create a new task record.
}

// Updated Mock Data
export const mockAssignedTasksStudent1: AssignedTask[] = [
  {
    id: 'assigned-1',
    // taskId: 'tasklib-1', // Removed
    studentId: 'student-1',
    assignedById: 'teacher-1',
    assignedDate: '2025-04-15T10:00:00Z',
    taskTitle: 'Practice 15 minutes', // Added
    taskDescription: 'Daily practice on your instrument', // Added
    taskBasePoints: 10, // Added
    isComplete: true,
    completedDate: '2025-04-16T18:00:00Z',
    verificationStatus: 'verified',
    verifiedById: 'teacher-1',
    verifiedDate: '2025-04-17T09:00:00Z',
    actualPointsAwarded: 10,
  },
  {
    id: 'assigned-2',
    // taskId: 'tasklib-2', // Removed
    studentId: 'student-1',
    assignedById: 'teacher-1',
    assignedDate: '2025-04-14T10:00:00Z',
    taskTitle: 'Learn Scale C Major', // Added
    taskDescription: 'Play the C Major scale ascending and descending', // Added
    taskBasePoints: 25, // Added
    isComplete: true,
    completedDate: '2025-04-15T09:00:00Z',
    verificationStatus: 'partial',
    verifiedById: 'teacher-1',
    verifiedDate: '2025-04-16T09:15:00Z',
    actualPointsAwarded: 15,
  },
  {
    id: 'assigned-3',
    // taskId: 'tasklib-1', // Removed
    studentId: 'student-1',
    assignedById: 'teacher-1',
    assignedDate: '2025-04-16T10:00:00Z',
    taskTitle: 'Practice 15 minutes', // Added
    taskDescription: 'Daily practice on your instrument', // Added
    taskBasePoints: 10, // Added
    isComplete: true,
    completedDate: '2025-04-17T19:00:00Z',
    verificationStatus: 'pending',
  },
  {
    id: 'assigned-4',
    // taskId: 'tasklib-3', // Removed
    studentId: 'student-1',
    assignedById: 'admin-1',
    assignedDate: '2025-04-08T10:00:00Z',
    taskTitle: 'Perform at Recital', // Added
    taskDescription: 'Participate in the quarterly student recital', // Added
    taskBasePoints: 100, // Added
    isComplete: false,
  },
];

export const mockAssignedTasksStudent2: AssignedTask[] = [
  {
    id: 'assigned-5',
    // taskId: 'tasklib-1', // Removed
    studentId: 'student-2',
    assignedById: 'teacher-1',
    assignedDate: '2025-04-17T10:00:00Z',
    taskTitle: 'Practice 15 minutes', // Added
    taskDescription: 'Daily practice on your instrument', // Added
    taskBasePoints: 10, // Added
    isComplete: false,
  },
];

export const mockAssignedTasksStudent3: AssignedTask[] = [
  {
    id: 'assigned-6',
    // taskId: 'tasklib-1', // Removed
    studentId: 'student-3',
    assignedById: 'teacher-2',
    assignedDate: '2025-04-16T10:00:00Z',
    taskTitle: 'Practice 15 minutes', // Added
    taskDescription: 'Daily practice on your instrument', // Added
    taskBasePoints: 10, // Added
    isComplete: true,
    completedDate: '2025-04-17T20:00:00Z',
    verificationStatus: 'pending',
  },
];

export const mockAllAssignedTasks: AssignedTask[] = [
  ...mockAssignedTasksStudent1,
  ...mockAssignedTasksStudent2,
  ...mockAssignedTasksStudent3,
];