import {
  Announcement,
  AssignedTask,
  Instrument,
  RewardItem,
  SimplifiedStudent,
  TaskLibraryItem,
  User,
  UserRole,
  UserStatus,
} from '../types/dataTypes';

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
  instruments: Instrument[];
}

export interface EditUserModalProps {
  visible: boolean;
  userToEdit: User | null;
  onClose: () => void;
  instruments: Instrument[];
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
  currentBalance: number;
}

type UserTab = 'students' | 'teachers' | 'parents';
type StudentFilter = UserStatus | 'all';

export interface AdminUsersSectionProps {
  displayData: Array<User | SimplifiedStudent>;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  isFetching?: boolean;
  isError: boolean;
  error: Error | null;
  instruments: Instrument[];
  activeTab: UserTab;
  setActiveTab: (tab: UserTab) => void;
  setPage: (page: number) => void;
  studentFilter?: StudentFilter;
  setStudentFilter?: (filter: StudentFilter) => void;
  studentSearchTerm?: string;
  setStudentSearchTerm?: (term: string) => void;
  onViewManageUser: (userId: string, role: UserRole) => void;
  onInitiateAssignTaskForStudent: (studentId: string) => void;
  onInitiateCreateUser: () => void;
}

export interface AdminDashboardSectionProps {
  onViewPendingVerifications: () => void;
}

export interface AdminTasksSectionProps {
  taskLibrary: TaskLibraryItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onInitiateAssignTask: () => void;
  onInitiateCreateTask: () => void;
  onInitiateEditTask: (task: TaskLibraryItem) => void;
  onInitiateDeleteTask: (task: TaskLibraryItem) => void;
  deleteTaskMutationPending: boolean;
}

export interface AdminStudentDetailViewProps {
  viewingStudentId: string;
  onInitiateVerification?: (task: AssignedTask) => void;
  onInitiateAssignTaskForStudent: (studentId: string) => void;
  onInitiateEditStudent: (user: User) => void;
  onInitiateStatusUser?: (user: User) => void;
  onInitiateTicketAdjustment?: (user: User) => void;
  onInitiateRedemption?: (user: User) => void;
  onInitiateDeleteTask?: (assignmentId: string) => void;
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
}

export interface TeacherStudentsSectionProps {
  instruments: Instrument[];
  onViewProfile: (studentId: string) => void;
  onAssignTask: (studentId: string) => void;
}

export interface TeacherTasksSectionProps {
  onInitiateAssignTaskGeneral: () => void;
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
  currentBalance: number;
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
}

export interface AdminParentDetailViewProps {
  viewingUserId: string;
  onInitiateEditUser: (user: User) => void;
  onInitiateStatusUser: (user: User) => void;
  onViewStudentProfile: (studentId: string) => void;
}
