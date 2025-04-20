// src/types/userTypes.ts

// Define the possible roles
export type UserRole = 'admin' | 'teacher' | 'pupil' | 'parent';

// Define the detailed User interface
export interface User {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  nickname?: string; // Optional nickname

  // Role-specific optional fields
  instrumentIds?: string[]; // For Pupil (Refers to Instrument.id)
  linkedStudentIds?: string[]; // For Teacher and Parent
  parentLinkQrData?: string; // For Pupil (mock data placeholder)
}