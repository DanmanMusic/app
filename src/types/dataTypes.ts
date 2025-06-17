// src/types/dataTypes.ts

export type AnnouncementType = 'announcement' | 'redemption_celebration' | 'streak_milestone';

export interface Announcement {
  id: string;
  type: AnnouncementType;
  title: string;
  message: string;
  date: string;
  relatedStudentId?: string;
  relatedStudentName?: string;
  relatedStudentAvatarPath?: string | null;
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
  assignerName?: string;
  verifierName?: string;
  studentStatus?: UserStatus | 'unknown';
  task_links: Url[];
  task_attachments: Attachment[];
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
  isGoalEligible: boolean;
}

export interface Url {
  id: string;
  url: string;
  label: string | null;
}

export interface Attachment {
  id: string;
  file_path: string;
  file_name: string;
}

export interface TaskLibraryItem {
  id: string;
  title: string;
  description: string | null;
  baseTickets: number;
  instrumentIds?: string[];
  createdById: string;
  canSelfAssign: boolean;
  journeyLocationId?: string | null;
  urls: Url[];
  attachments: Attachment[];
}

export type TransactionType =
  | 'task_award'
  | 'manual_add'
  | 'manual_subtract'
  | 'redemption'
  | 'streak_award';

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
  current_goal_reward_id?: string | null;
  status: UserStatus;
  avatarPath?: string | null; // NEW: Path to the user's avatar in storage
  companyId: string;
}

export interface SimplifiedStudent {
  id: string;
  name: string;
  instrumentIds?: string[];
  balance: number;
  isActive: boolean;
}

// This REPLACES the old StreakData type.
export interface StudentStreakDetails {
  has_logged_practice_today: boolean; // NEW
  current_streak: number;
  longest_streak: number;
  last_log_date: string | null; // as YYYY-MM-DD
}

// This is a NEW type for the company-wide stats.
export interface CompanyStreakStats {
  total_active_streaks: number;
  streaks_over_7_days: number;
  milestone_earners_this_month: number;
}
