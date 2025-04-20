// src/mocks/mockUsers.ts

// Import the refined types
import { User, UserRole } from '../types/userTypes';

export const mockUsers: Record<string, User> = {
  'admin-1': {
    id: 'admin-1',
    role: 'admin',
    firstName: 'Dan',
    lastName: 'Lefler',
  } as User,
  'teacher-1': {
    id: 'teacher-1',
    role: 'teacher',
    firstName: 'John',
    lastName: 'Smith',
    nickname: 'Mr. Smith', // Nickname can still exist
    // linkedStudentIds: ['student-1', 'student-2'], // REMOVED from teacher creation/mock default
  } as User,
  'teacher-2': {
    id: 'teacher-2',
    role: 'teacher',
    firstName: 'Sarah',
    lastName: 'Jones',
    // linkedStudentIds: ['student-3'], // REMOVED from teacher creation/mock default
  } as User,
  'student-1': {
    id: 'student-1',
    role: 'pupil',
    firstName: 'Alice',
    lastName: 'Wonder',
    instrumentIds: ['inst-1', 'inst-5'],
    linkedTeacherIds: ['teacher-1'], // ADDED
    // parentLinkQrData: 'parent-link-for-alice-qr-data', // REMOVED
  } as User,
  'student-2': {
    id: 'student-2',
    role: 'pupil',
    firstName: 'Bob',
    lastName: 'Builder',
    nickname: 'Bobbie',
    instrumentIds: ['inst-2'],
    linkedTeacherIds: ['teacher-1'], // ADDED
    // parentLinkQrData: 'parent-link-for-bob-qr-data', // REMOVED
  } as User,
  'student-3': {
    id: 'student-3',
    role: 'pupil',
    firstName: 'Charlie',
    lastName: 'Builder',
    instrumentIds: ['inst-3'],
    linkedTeacherIds: ['teacher-2'], // ADDED
    // parentLinkQrData: 'parent-link-for-charlie-qr-data', // REMOVED
  } as User,
  // Keep Parent roles as existing entities, demonstrating the link field
  'parent-1': {
    id: 'parent-1',
    role: 'parent',
    firstName: 'Mom',
    lastName: 'Wonder',
    linkedStudentIds: ['student-1'], // This field is now specific to Parents
  } as User,
  'parent-2': {
    id: 'parent-2',
    role: 'parent',
    firstName: 'Dad',
    lastName: 'Builder',
    linkedStudentIds: ['student-2', 'student-3'], // This field is now specific to Parents
  } as User,
};