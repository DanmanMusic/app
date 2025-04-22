// src/types/userTypes.ts

export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

// Add export keyword here
export type UserStatus = 'active' | 'inactive'; // Define possible statuses

export interface User {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  nickname?: string;
  instrumentIds?: string[];
  linkedTeacherIds?: string[];
  linkedStudentIds?: string[];
  status: UserStatus; // Added: Defaults to 'active' for new users typically
}