export type AnnouncementType = 'announcement' | 'challenge' | 'redemption_celebration';

export interface Announcement {
  id: string;
  type: AnnouncementType;
  title: string;
  message: string;
  date: string;
  relatedStudentId?: string;
}

export type TaskVerificationStatus = 'pending' | 'verified' | 'partial' | 'incomplete' | undefined;

export interface AssignedTask {
  id: string;

  studentId: string;
  assignedById: string;
  assignedDate: string;

  taskTitle: string;
  taskDescription: string;
  taskBasePoints: number;

  isComplete: boolean;
  completedDate?: string;
  verificationStatus?: TaskVerificationStatus;
  verifiedById?: string;
  verifiedDate?: string;
  actualPointsAwarded?: number;
}

export interface Instrument {
  id: string;
  name: string;
  image_path?: string | null;
}

export interface RewardItem {
  id: string;
  name: string;
  cost: number;
  imageUrl: string;
  description?: string;
}

export interface TaskLibraryItem {
  id: string;
  title: string;
  description: string;
  baseTickets: number;
}

export type TransactionType = 'task_award' | 'manual_add' | 'manual_subtract' | 'redemption';

export interface TicketTransaction {
  id: string;
  studentId: string;
  timestamp: string;
  amount: number;
  type: TransactionType;
  sourceId: string;
  notes?: string;
}

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

export interface SimplifiedStudent {
  id: string;
  name: string;
  instrumentIds?: string[];
  balance: number;
  isActive: boolean;
}

export interface StudentProfileData {
  user: User;
  balance: number;
  assignedTasks: AssignedTask[];
  history: TicketTransaction[];
  rewardsCatalog: RewardItem[];
  announcements: Announcement[];
  taskLibrary: TaskLibraryItem[];
  instruments: Instrument[];
  onMarkTaskComplete?: (taskId: string) => void;
}
