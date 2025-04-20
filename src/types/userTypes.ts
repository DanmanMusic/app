// src/types/userTypes.ts

// Define the possible roles
export type UserRole = 'admin' | 'teacher' | 'student' | 'parent'; // Keep parent role definition

// Define the detailed User interface
export interface User {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  nickname?: string; // Optional nickname (Can still exist, just not created in modal)

  // Role-specific optional fields
  instrumentIds?: string[]; // For Student (Refers to Instrument.id)
  // linkedStudentIds?: string[]; // For Teacher and Parent (REMOVED - Link managed on Student or implicitly for Parent)
  linkedTeacherIds?: string[]; // For Student (Refers to User.id where role='teacher')
  // parentLinkQrData?: string; // REMOVED - Tied to implicit parent link mechanism
  // --- Add field for Parent role if needed ---
  linkedStudentIds?: string[]; // For Parent ONLY (implicitly linked, not set via modal)
}