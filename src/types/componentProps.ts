// src/types/componentProps.ts
import {
  Announcement,
  AssignedTask,
  Instrument,
  RewardItem,
  TaskLibraryItem,
  User,
  UserRole,
} from '../types/dataTypes';

import { StudentTaskFilterStatusAPI, TaskAssignmentFilterStatusAPI } from '../api/assignedTasks';

export interface AdminViewProps {
  onInitiateVerificationModal?: (task: AssignedTask) => void;
}
export interface TeacherViewProps {
  onInitiateVerificationModal: (task: AssignedTask) => void;
}

export interface StudentViewProps {
  studentIdToView?: string;
}

export interface TaskVerificationModalProps {
  visible: boolean;
  task: AssignedTask | null;
  onClose: () => void;
}

export interface AssignTaskModalProps {
  visible: boolean;
  onClose: () => void;
  preselectedStudentId?: string | null;
}

export interface CreateUserModalProps {
  visible: boolean;
  onClose: () => void;
}

export interface EditUserModalProps {
  visible: boolean;
  userToEdit: User | null;
  onClose: () => void;
}

export interface DeactivateOrDeleteUserModalProps {
  visible: boolean;
  user: User | null;
  onClose: () => void;
  onDeletionSuccess?: (deletedUserId: string) => void;
}

export interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface SetGoalModalProps {
  visible: boolean;
  onClose: () => void;
  currentBalance: number;
  currentGoalId: string | null;
  onSetGoal: (goalId: string | null) => void;
}

export interface CreateAnnouncementModalProps {
  visible: boolean;
  onClose: () => void;
}

export interface EditAnnouncementModalProps {
  visible: boolean;
  announcementToEdit: Announcement | null;
  onClose: () => void;
}

export interface CreateInstrumentModalProps {
  visible: boolean;
  onClose: () => void;
}

export interface EditInstrumentModalProps {
  visible: boolean;
  instrumentToEdit: Instrument | null;
  onClose: () => void;
}
export interface CreateRewardModalProps {
  visible: boolean;
  onClose: () => void;
}

export interface EditRewardModalProps {
  visible: boolean;
  rewardToEdit: RewardItem | null;
  onClose: () => void;
}

export interface CreateTaskLibraryModalProps {
  visible: boolean;
  onClose: () => void;
}

export interface EditTaskLibraryModalProps {
  visible: boolean;
  taskToEdit: TaskLibraryItem | null;
  onClose: () => void;
}

export interface ManualTicketAdjustmentModalProps {
  visible: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
}

export type UserTab = 'students' | 'teachers' | 'parents' | 'admins';
export type TeacherSection = 'dashboard' | 'students' | 'tasks' | 'tasks-full' | 'announcements';
export type AdminSection =
  | 'dashboard'
  | 'tasks-full'
  | 'users'
  | 'tasks'
  | 'rewards'
  | 'history'
  | 'journey'
  | 'announcements'
  | 'instruments';

export interface AdminUsersSectionProps {
  instruments: Instrument[];
  activeTab: UserTab;
  onViewManageUser: (userId: string, role: UserRole) => void;
  onInitiateAssignTaskForStudent: (studentId: string) => void;
}

export interface AdminDashboardSectionProps {
  onViewVerifications: (pending: boolean) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<UserTab>>;
  setViewingSection: React.Dispatch<React.SetStateAction<AdminSection>>;
  onInitiateCreateUser: () => void;
}

export interface AdminTasksSectionProps {
  onInitiateAssignTask: () => void;
  onInitiateCreateTask: () => void;
  onInitiateEditTask: (task: TaskLibraryItem) => void;
  onInitiateDeleteTask: (task: TaskLibraryItem) => void;
  onViewVerifications: (pending: boolean) => void;
  deleteTaskMutationPending: boolean;
}

export interface StudentDetailViewProps {
  viewingStudentId: string;
  onInitiateVerification?: (task: AssignedTask) => void;
  onInitiateAssignTaskForStudent: (studentId: string) => void;
  onInitiateEditStudent: (user: User) => void;
  onInitiateStatusUser?: (user: User) => void;
  onInitiateTicketAdjustment?: (user: User) => void;
  onInitiateRedemption?: (user: User) => void;
  onInitiatePinGeneration: (user: User) => void;
  onInitiateDeleteTask: (task: AssignedTask) => void;
}

export interface ViewAllAssignedTasksModalProps {
  visible: boolean;
  onClose: () => void;
  onInitiateVerification?: (task: AssignedTask) => void;
}

export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export interface TeacherDashboardSectionProps {
  onInitiateVerificationModal: (task: AssignedTask) => void;
  setViewingSection: React.Dispatch<React.SetStateAction<TeacherSection>>;
}

export interface TeacherStudentsSectionProps {
  instruments: Instrument[];
  onViewProfile: (studentId: string) => void;
  onAssignTask: (studentId: string) => void;
}

export interface TeacherTasksSectionProps {
  onInitiateAssignTaskGeneral: () => void;
  onViewAllTasks: () => void;
  onInitiateCreateTask: () => void;
  onInitiateEditTask: (task: TaskLibraryItem) => void;
  onInitiateDeleteTask: (task: TaskLibraryItem) => void;
  deleteTaskMutationPending?: boolean;
}

export interface ParentStudentListItemProps {
  student: User;
  onSelectStudent: (studentId: string) => void;
}

export interface RedeemRewardModalProps {
  visible: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  redeemerId: string;
}

export interface AdminTaskLibraryItemProps {
  item: TaskLibraryItem;
  onEdit: (task: TaskLibraryItem) => void;
  onDelete: (task: TaskLibraryItem) => void;
  disabled?: boolean;
}

export interface AdminTeacherDetailViewProps {
  viewingUserId: string;
  onInitiateEditUser: (user: User) => void;
  onInitiateStatusUser: (user: User) => void;
  onViewStudentProfile: (studentId: string) => void;
  onInitiatePinGeneration?: (user: User) => void;
}

export interface AdminParentDetailViewProps {
  viewingUserId: string;
  onInitiateEditUser: (user: User) => void;
  onInitiateStatusUser: (user: User) => void;
  onViewStudentProfile: (studentId: string) => void;
  onInitiatePinGeneration?: (user: User) => void;
}

export interface AdminInstrumentItemProps {
  item: Instrument;
  onEdit: (instrument: Instrument) => void;
  onDelete: (instrument: Instrument) => void;
  disabled?: boolean;
}

export interface AdminAdminDetailViewProps {
  viewingUserId: string;
  onInitiateStatusUser: (user: User) => void;
  onInitiatePinGeneration?: (user: User) => void;
}

export interface PaginatedTasksListProps {
  viewingRole: 'admin' | 'teacher';
  teacherId?: string;
  initialAssignmentFilter?: TaskAssignmentFilterStatusAPI;
  initialStudentStatusFilter?: StudentTaskFilterStatusAPI;
  onInitiateVerification: (task: AssignedTask) => void;
  onInitiateDelete: (task: AssignedTask) => void;
}
