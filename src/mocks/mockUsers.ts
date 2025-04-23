

import { User } from '../types/userTypes';

export const mockUsers: Record<string, User> = {
  'admin-1': {
    id: 'admin-1',
    role: 'admin',
    firstName: 'Dan',
    lastName: 'Lefler',
    status: 'active',
  },
  'teacher-1': {
    id: 'teacher-1',
    role: 'teacher',
    firstName: 'John',
    lastName: 'Smith',
    nickname: 'Mr. Smith',
    status: 'active',
  },
  'teacher-2': {
    id: 'teacher-2',
    role: 'teacher',
    firstName: 'Sarah',
    lastName: 'Jones',
    status: 'active',
  },
  'student-1': {
    id: 'student-1',
    role: 'student',
    firstName: 'Alice',
    lastName: 'Wonder',
    instrumentIds: ['inst-1', 'inst-5'], 
    linkedTeacherIds: ['teacher-1'],
    status: 'active',
  },
  'student-2': {
    id: 'student-2',
    role: 'student',
    firstName: 'Bob',
    lastName: 'Builder',
    nickname: 'Bobbie',
    instrumentIds: ['inst-2'], 
    linkedTeacherIds: ['teacher-1'],
    status: 'active',
  },
  'student-3': {
    id: 'student-3',
    role: 'student',
    firstName: 'Charlie',
    lastName: 'Chaplin', 
    instrumentIds: ['inst-3'], 
    linkedTeacherIds: ['teacher-2'],
    status: 'active',
  },
  'student-inactive': {
    id: 'student-inactive',
    role: 'student',
    firstName: 'Inactive',
    lastName: 'Student',
    instrumentIds: ['inst-1'], 
    linkedTeacherIds: ['teacher-1'],
    status: 'inactive',
  },
  
  'student-4': {
    id: 'student-4',
    role: 'student',
    firstName: 'Diana',
    lastName: 'Prince',
    instrumentIds: ['inst-7'], 
    linkedTeacherIds: ['teacher-2'],
    status: 'active',
  },
  'student-5': {
    id: 'student-5',
    role: 'student',
    firstName: 'Ethan',
    lastName: 'Hunt',
    instrumentIds: ['inst-2', 'inst-5'], 
    linkedTeacherIds: ['teacher-1'],
    status: 'active',
  },
  'student-6': {
    id: 'student-6',
    role: 'student',
    firstName: 'Fiona',
    lastName: 'Glenanne',
    instrumentIds: ['inst-4'], 
    linkedTeacherIds: ['teacher-2'],
    status: 'active',
  },
  
  'parent-1': {
    id: 'parent-1',
    role: 'parent',
    firstName: 'Mom',
    lastName: 'Wonder',
    linkedStudentIds: ['student-1'],
    status: 'active',
  },
  'parent-2': {
    id: 'parent-2',
    role: 'parent',
    firstName: 'Dad',
    lastName: 'Builder', 
    linkedStudentIds: ['student-2', 'student-3'], 
    status: 'active',
  },
  
  
  
  
  
  
  
  
  
};
