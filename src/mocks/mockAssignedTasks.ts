export const mockAssignedTasksStudent1: AssignedTask[] = [
  {
    id: 'assigned-1',

    studentId: 'student-1',
    assignedById: 'teacher-1',
    assignedDate: '2025-04-15T10:00:00Z',
    taskTitle: 'Practice 15 minutes',
    taskDescription: 'Daily practice on your instrument',
    taskBasePoints: 10,
    isComplete: true,
    completedDate: '2025-04-16T18:00:00Z',
    verificationStatus: 'verified',
    verifiedById: 'teacher-1',
    verifiedDate: '2025-04-17T09:00:00Z',
    actualPointsAwarded: 10,
  },
  {
    id: 'assigned-2',

    studentId: 'student-1',
    assignedById: 'teacher-1',
    assignedDate: '2025-04-14T10:00:00Z',
    taskTitle: 'Learn Scale C Major',
    taskDescription: 'Play the C Major scale ascending and descending',
    taskBasePoints: 25,
    isComplete: true,
    completedDate: '2025-04-15T09:00:00Z',
    verificationStatus: 'partial',
    verifiedById: 'teacher-1',
    verifiedDate: '2025-04-16T09:15:00Z',
    actualPointsAwarded: 15,
  },
  {
    id: 'assigned-3',

    studentId: 'student-1',
    assignedById: 'teacher-1',
    assignedDate: '2025-04-16T10:00:00Z',
    taskTitle: 'Practice 15 minutes',
    taskDescription: 'Daily practice on your instrument',
    taskBasePoints: 10,
    isComplete: true,
    completedDate: '2025-04-17T19:00:00Z',
    verificationStatus: 'pending',
  },
  {
    id: 'assigned-4',

    studentId: 'student-1',
    assignedById: 'admin-1',
    assignedDate: '2025-04-08T10:00:00Z',
    taskTitle: 'Perform at Recital',
    taskDescription: 'Participate in the quarterly student recital',
    taskBasePoints: 100,
    isComplete: false,
  },
];

export const mockAssignedTasksStudent2: AssignedTask[] = [
  {
    id: 'assigned-5',

    studentId: 'student-2',
    assignedById: 'teacher-1',
    assignedDate: '2025-04-17T10:00:00Z',
    taskTitle: 'Practice 15 minutes',
    taskDescription: 'Daily practice on your instrument',
    taskBasePoints: 10,
    isComplete: false,
  },
];

export const mockAssignedTasksStudent3: AssignedTask[] = [
  {
    id: 'assigned-6',

    studentId: 'student-3',
    assignedById: 'teacher-2',
    assignedDate: '2025-04-16T10:00:00Z',
    taskTitle: 'Practice 15 minutes',
    taskDescription: 'Daily practice on your instrument',
    taskBasePoints: 10,
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
