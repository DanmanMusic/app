// src/mocks/mockAssignedTasks.ts
// Note: Dates are represented as strings here for simplicity in mock data.
// In a real app, you might use Date objects or a specific date string format.

export type TaskVerificationStatus = 'pending' | 'verified' | 'partial' | 'incomplete' | undefined;

export interface AssignedTask {
  id: string;
  taskId: string; // Refers to TaskLibraryItem.id or a unique ID for a custom task
  studentId: string; // Refers to User.id
  assignedById: string; // Refers to User.id (Teacher or Admin)
  assignedDate: string; // ISO string or similar
  isComplete: boolean;
  completedDate?: string; // Optional, ISO string or similar
  verificationStatus?: TaskVerificationStatus; // 'pending' if isComplete is true, otherwise undefined/status
  verifiedById?: string; // Optional, Refers to User.id (Teacher or Admin)
  verifiedDate?: string; // Optional, ISO string or similar
  actualPointsAwarded?: number; // Optional, only set after verification
  reassignedTaskId?: string; // Optional, Refers to a new AssignedTask.id if this task was 'Verify & Re-assign'
  // Custom task details could go here if taskId is not from library, or linked via taskId
}

// Simulate tasks assigned to student-1 (Alice) with dates near 04/18/2025
export const mockAssignedTasksStudent1: AssignedTask[] = [
  {
    id: 'assigned-1',
    taskId: 'tasklib-1',
    studentId: 'student-1',
    assignedById: 'teacher-1',
    assignedDate: '2025-04-15T10:00:00Z',
    isComplete: true,
    completedDate: '2025-04-16T18:00:00Z',
    verificationStatus: 'verified',
    verifiedById: 'teacher-1',
    verifiedDate: '2025-04-17T09:00:00Z',
    actualPointsAwarded: 10,
  }, // Verified yesterday
  {
    id: 'assigned-2',
    taskId: 'tasklib-2',
    studentId: 'student-1',
    assignedById: 'teacher-1',
    assignedDate: '2025-04-14T10:00:00Z',
    isComplete: true,
    completedDate: '2025-04-15T09:00:00Z',
    verificationStatus: 'partial',
    verifiedById: 'teacher-1',
    verifiedDate: '2025-04-16T09:15:00Z',
    actualPointsAwarded: 15,
  }, // Verified two days ago
  {
    id: 'assigned-3',
    taskId: 'tasklib-1',
    studentId: 'student-1',
    assignedById: 'teacher-1',
    assignedDate: '2025-04-16T10:00:00Z',
    isComplete: true,
    completedDate: '2025-04-17T19:00:00Z',
    verificationStatus: 'pending',
  }, // Completed yesterday, pending verification
  {
    id: 'assigned-4',
    taskId: 'tasklib-3',
    studentId: 'student-1',
    assignedById: 'admin-1',
    assignedDate: '2025-04-08T10:00:00Z',
    isComplete: false,
  }, // Assigned a week ago, not complete
];

// Add more assigned tasks for other students as needed for mocking different views
export const mockAssignedTasksStudent2: AssignedTask[] = [
  {
    id: 'assigned-5',
    taskId: 'tasklib-1',
    studentId: 'student-2',
    assignedById: 'teacher-1',
    assignedDate: '2025-04-17T10:00:00Z',
    isComplete: false,
  }, // Assigned yesterday, not complete
];

export const mockAssignedTasksStudent3: AssignedTask[] = [
  {
    id: 'assigned-6',
    taskId: 'tasklib-1',
    studentId: 'student-3',
    assignedById: 'teacher-2',
    assignedDate: '2025-04-16T10:00:00Z',
    isComplete: true,
    completedDate: '2025-04-17T20:00:00Z',
    verificationStatus: 'pending',
  }, // Completed yesterday, pending verification
];

// Combine all assigned tasks for easy access in mocks
export const mockAllAssignedTasks: AssignedTask[] = [
  ...mockAssignedTasksStudent1,
  ...mockAssignedTasksStudent2,
  ...mockAssignedTasksStudent3,
];
