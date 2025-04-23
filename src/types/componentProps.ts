// src/types/componentProps.ts
import { Announcement } from '../mocks/mockAnnouncements';
import { AssignedTask, TaskVerificationStatus } from '../mocks/mockAssignedTasks';
import { Instrument } from '../mocks/mockInstruments';
import { RewardItem } from '../mocks/mockRewards';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';

import { SimplifiedStudent } from './dataTypes';
import { User, UserRole, UserStatus } from './userTypes';

// --- View Props ---

export interface AdminViewProps {
  onInitiateVerificationModal?: (task: AssignedTask) => void;
}

export interface TeacherViewProps {
  onInitiateVerificationModal: (task: AssignedTask) => void;
}

export interface StudentViewProps {
  studentIdToView?: string;
}

export interface ParentViewProps {
  // Currently empty, but could add props if needed
}

export interface PublicViewProps {
  // Currently empty
}

// --- Modal Props ---

export interface TaskVerificationModalProps {
  visible: boolean;
  task: AssignedTask | null;
  onClose: () => void;
  // Removed onVerifyTask, onReassignTaskMock
}

export interface AssignTaskModalProps {
  visible: boolean;
  onClose: () => void;
  preselectedStudentId?: string | null; // Optional pre-selection
}

export interface CreateUserModalProps {
  visible: boolean;
  onClose: () => void;
  mockInstruments: Instrument[]; // List of available instruments
}

export interface EditUserModalProps {
  visible: boolean;
  userToEdit: User | null;
  onClose: () => void;
  mockInstruments: Instrument[];
}

export interface DeactivateOrDeleteUserModalProps {
  visible: boolean;
  user: User | null; // User being managed
  onClose: () => void;
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
  currentBalance: number;
}

export interface ViewAllAssignedTasksModalProps {
  visible: boolean;
  onClose: () => void;
  // Removed allUsers - modal fetches if needed
  onInitiateVerification?: (task: AssignedTask) => void;
}

// --- Admin Section Props ---

type UserTab = 'students' | 'teachers' | 'parents'; // Keep local types with components or move here too
type StudentFilter = UserStatus | 'all';

export interface AdminUsersSectionProps {
  displayData: Array<User | SimplifiedStudent>;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  isFetching?: boolean;
  isError: boolean;
  error: Error | null;
  mockInstruments: Instrument[];
  activeTab: UserTab;
  setActiveTab: (tab: UserTab) => void;
  setPage: (page: number) => void;
  studentFilter?: StudentFilter;
  setStudentFilter?: (filter: StudentFilter) => void;
  studentSearchTerm?: string;
  setStudentSearchTerm?: (term: string) => void;
  onViewManageUser: (userId: string, role: UserRole) => void;
  onInitiateAssignTaskForStudent: (studentId: string) => void;
}

export interface AdminDashboardSectionProps {
  onViewPendingVerifications: () => void;
}

export interface AdminTasksSectionProps {
  taskLibrary: TaskLibraryItem[];
  isLoading: boolean; // Loading state for task library query
  isError: boolean; // Error state for task library query
  onInitiateAssignTask: () => void; // Callback to open the general assign task modal
  onInitiateVerification?: (task: AssignedTask) => void;
}

export interface AdminRewardsSectionProps {}

export interface AdminHistorySectionProps {}

export interface AdminAnnouncementsSectionProps {}

export interface AdminInstrumentsSectionProps {}

export interface AdminStudentDetailViewProps {
  viewingStudentId: string;
  adminUserName: string;
  onAssignTask: () => void;
  onBack: () => void;
  onInitiateVerification?: (task: AssignedTask) => void;
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
  pendingVerifications: AssignedTask[];
  isLoading: boolean;
  isError: boolean;
  onInitiateVerificationModal: (task: AssignedTask) => void;
}

export interface TeacherStudentsSectionProps {
  mockInstruments: Instrument[]; // Keep instruments list passed down
  onViewProfile: (studentId: string) => void; // Callback for navigation
  onAssignTask: (studentId: string) => void; // Callback to trigger assign task modal
}

export interface TeacherTasksSectionProps {
  assignTaskMutationPending: boolean;
  onInitiateAssignTaskGeneral: () => void;
}

export interface ParentStudentListItemProps {
  student: User;
  onSelectStudent: (studentId: string) => void;
}