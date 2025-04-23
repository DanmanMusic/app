export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  nickname?: string;
  instrumentIds?: string[];
  linkedTeacherIds?: string[];
  linkedStudentIds?: string[];
  status: UserStatus;
}
