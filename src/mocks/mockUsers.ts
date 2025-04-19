// src/mocks/mockUsers.ts
// Updated to include instrumentIds for Pupil

export type UserRole = 'admin' | 'teacher' | 'pupil' | 'parent';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  // Specific fields for different roles:
  instrumentIds?: string[]; // For Pupil - Can play one or many instruments (Refers to Instrument.id)
  linkedStudentIds?: string[]; // For Teacher and Parent
  parentLinkQrData?: string; // For Pupil (representing the data embedded in their parent link QR)
  // Admin might have specific fields later, but none essential for mock UI
}

// Using 'as User' to assert the type for each user object
export const mockUsers: Record<string, User> = {
  'admin-1': { id: 'admin-1', role: 'admin', name: 'Dan Manager' } as User,
  'teacher-1': {
    id: 'teacher-1',
    role: 'teacher',
    name: 'Mr. Smith',
    linkedStudentIds: ['student-1', 'student-2'],
  } as User,
  'teacher-2': {
    id: 'teacher-2',
    role: 'teacher',
    name: 'Ms. Jones',
    linkedStudentIds: ['student-3'],
  } as User,
  'student-1': {
    id: 'student-1',
    role: 'pupil',
    name: 'Alice',
    instrumentIds: ['inst-1', 'inst-5'],
    parentLinkQrData: 'parent-link-for-alice-qr-data',
  } as User, // Alice plays Piano & Voice
  'student-2': {
    id: 'student-2',
    role: 'pupil',
    name: 'Bob',
    instrumentIds: ['inst-2'],
    parentLinkQrData: 'parent-link-for-bob-qr-data',
  } as User, // Bob plays Guitar
  'student-3': {
    id: 'student-3',
    role: 'pupil',
    name: 'Charlie',
    instrumentIds: ['inst-3'],
    parentLinkQrData: 'parent-link-for-charlie-qr-data',
  } as User, // Charlie plays Drums
  'parent-1': {
    id: 'parent-1',
    role: 'parent',
    name: "Alice's Mom",
    linkedStudentIds: ['student-1'],
  } as User,
  'parent-2': {
    id: 'parent-2',
    role: 'parent',
    name: "Bob & Charlie's Dad",
    linkedStudentIds: ['student-2', 'student-3'],
  } as User,
};
