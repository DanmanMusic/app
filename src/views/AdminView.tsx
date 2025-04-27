// src/views/AdminView.tsx
import React, { useState, useMemo } from 'react'; // Added useMemo
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  ScrollView,
  Button,
  FlatList, // Keep for pending verification list
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// Import API functions (some Supabase, some pending)
import { fetchAssignedTasks, deleteAssignedTask } from '../api/assignedTasks'; // deleteAssignedTask might still be MSW
import { fetchInstruments } from '../api/instruments';       // Supabase
import { deleteTaskLibraryItem, fetchTaskLibrary } from '../api/taskLibrary'; // Supabase
import { fetchUserProfile, fetchStudents } from '../api/users'; // Supabase fetchers

// Import Admin Section Components
import { AdminAnnouncementsSection } from '../components/admin/AdminAnnouncementsSection';
import { AdminDashboardSection } from '../components/admin/AdminDashboardSection';
import { AdminHistorySection } from '../components/admin/AdminHistorySection';
import { AdminInstrumentsSection } from '../components/admin/AdminInstrumentsSection';
import { AdminRewardsSection } from '../components/admin/AdminRewardsSection';
import { AdminTasksSection } from '../components/admin/AdminTasksSection';
import { AdminUsersSection } from '../components/admin/AdminUsersSection'; // Now uses internal hooks

// Import Detail View Components (now fetch their own data)
import { AdminStudentDetailView } from '../components/admin/AdminStudentDetailView';
import { AdminTeacherDetailView } from '../components/admin/AdminTeacherDetailView';
import { AdminParentDetailView } from '../components/admin/AdminParentDetailView';

// Import Common Components & Modals
import { PendingVerificationItem } from '../components/common/PendingVerificationItem';
import CreateUserModal from '../components/admin/modals/CreateUserModal'; // Uses deferred createUser API
import CreateTaskLibraryModal from '../components/admin/modals/CreateTaskLibraryModal'; // Uses Supabase
import EditTaskLibraryModal from '../components/admin/modals/EditTaskLibraryModal';     // Uses Supabase
import { ViewAllAssignedTasksModal } from '../components/admin/modals/ViewAllAssignedTasksModal'; // Uses Supabase fetch
import ManualTicketAdjustmentModal from '../components/admin/modals/ManualTicketAdjustmentModal'; // Uses deferred API
import RedeemRewardModal from '../components/admin/modals/RedeemRewardModal';             // Uses deferred API
import AssignTaskModal from '../components/common/AssignTaskModal';                 // Uses Supabase fetch
import ConfirmationModal from '../components/common/ConfirmationModal';
import EditUserModal from '../components/common/EditUserModal';                     // Uses Supabase update (partial)
import DeactivateOrDeleteUserModal from '../components/common/DeactivateOrDeleteUserModal'; // Uses Supabase toggle/deferred delete

// Import Hooks & Context
import { useAuth } from '../contexts/AuthContext';
// No longer need pagination hooks here, they are in AdminUsersSection
// import { usePaginatedParents } from '../hooks/usePaginatedParents';
// import { usePaginatedStudents } from '../hooks/usePaginatedStudents';
// import { usePaginatedTeachers } from '../hooks/usePaginatedTeachers';
// Import student hook specifically for pending verification name lookup
import { usePaginatedStudents } from '../hooks/usePaginatedStudents';


// Import Types and Props
import { AssignedTask, Instrument, TaskLibraryItem, User, UserRole, SimplifiedStudent, UserStatus } from '../types/dataTypes';
import { AdminViewProps } from '../types/componentProps'; // Keep this if needed for top-level props like onInitiateVerificationModal

// Import Styles and Helpers
import { getUserDisplayName } from '../utils/helpers';
import { adminSharedStyles } from '../styles/adminSharedStyles';
import { appSharedStyles } from '../styles/appSharedStyles';
import { commonSharedStyles } from '../styles/commonSharedStyles';
import { colors } from '../styles/colors';

// Define Section Types
type AdminSection =
  | 'dashboard'
  | 'dashboard-pending-verification'
  | 'users'
  | 'tasks'
  | 'rewards'
  | 'history'
  | 'announcements'
  | 'instruments';
type UserTab = 'students' | 'teachers' | 'parents'; // For AdminUsersSection state

export const AdminView: React.FC<AdminViewProps> = ({ onInitiateVerificationModal }) => {
  const { currentUserId: adminUserId } = useAuth(); // Get admin ID
  const queryClient = useQueryClient();

  // --- State Management ---
  // Main view state
  const [viewingSection, setViewingSection] = useState<AdminSection>('dashboard');
  // State for AdminUsersSection tabs and filters (passed down)
  const [activeUserTab, setActiveUserTab] = useState<UserTab>('students');
  // Student filter/search state (managed here, passed to AdminUsersSection -> usePaginatedStudents)
  const [studentFilter, setStudentFilter] = useState<UserStatus | 'all'>('active');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  // State for detail view navigation
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [viewingUserRole, setViewingUserRole] = useState<UserRole | null>(null);
  // Modal visibility states
  const [isCreateUserModalVisible, setIsCreateUserModalVisible] = useState(false);
  const [isAssignTaskModalVisible, setIsAssignTaskModalVisible] = useState(false);
  const [assignTaskTargetStudentId, setAssignTaskTargetStudentId] = useState<string | null>(null);
  const [isViewAllAssignedTasksModalVisible, setIsViewAllAssignedTasksModalVisible] = useState(false);
  const [isCreateTaskModalVisible, setIsCreateTaskModalVisible] = useState(false);
  const [isEditTaskModalVisible, setIsEditTaskModalVisible] = useState(false);
  const [isDeleteTaskModalVisible, setIsDeleteTaskModalVisible] = useState(false);
  const [isEditUserModalVisible, setIsEditUserModalVisible] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [isAdjustmentModalVisible, setIsAdjustmentModalVisible] = useState(false);
  const [isRedeemModalVisible, setIsRedeemModalVisible] = useState(false);
  // State to hold objects for modals
  const [taskToEdit, setTaskToEdit] = useState<TaskLibraryItem | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskLibraryItem | null>(null);
  const [userToManage, setUserToManage] = useState<User | null>(null); // Used for Edit/Status/Adjust/Redeem modals

  // --- Data Fetching ---
  // Fetch admin profile (needed for display name)
  const {
    data: adminUser,
    isLoading: adminLoading,
    isError: adminError,
    error: adminErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', adminUserId], // Use profile key
    queryFn: () => fetchUserProfile(adminUserId!), // Use profile fetcher
    enabled: !!adminUserId,
    staleTime: 15 * 60 * 1000,
  });

  // Fetch instruments (needed for modals and student item display)
  const {
    data: fetchedInstruments = [],
    isLoading: instrumentsLoading,
    // error handling if needed
  } = useQuery<Instrument[], Error>({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
  });

  // Fetch pending tasks for the dashboard badge/link
  // Note: This fetches potentially *all* pending tasks just for the count/list.
  // Consider using fetchPendingTaskCount API for just the count later.
  const {
    data: pendingTasksResult,
    isLoading: pendingTasksLoading, // Loading state for the pending list
    isError: pendingTasksError,
    error: pendingTasksErrorMsg,
  } = useQuery({
    queryKey: ['assigned-tasks', { assignmentStatus: 'pending', studentStatus: 'active', scope: 'dashboard-preview' }],
    queryFn: () => fetchAssignedTasks({ assignmentStatus: 'pending', studentStatus: 'active', limit: 1000 }), // Fetch many for list preview
    staleTime: 1 * 60 * 1000,
  });
  const pendingVerifications = useMemo(() => pendingTasksResult?.items ?? [], [pendingTasksResult]);

  // Fetch *all* students (unpaginated for now) to resolve names for pending tasks quickly.
  // This is inefficient but simpler than fetching each student individually.
  // Ideally, fetchAssignedTasks could join and return student names.
  const { data: allStudentsResult, isLoading: allStudentsLoading } = useQuery({
      queryKey: ['students', { filter: 'all', limit: 9999, context: 'pending-verification-lookup' }],
      queryFn: () => fetchStudents({ page: 1, limit: 9999, filter: 'all' }),
      staleTime: 5 * 60 * 1000, // Cache student list
      enabled: viewingSection === 'dashboard-pending-verification', // Only fetch when needed
  });
  const studentNameLookup = useMemo(() => {
      const lookup: Record<string, string> = {};
      (allStudentsResult?.students ?? []).forEach(s => {
          lookup[s.id] = s.name;
      });
      return lookup;
  }, [allStudentsResult]);


  // --- Mutations ---
  // Task Library Delete Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: deleteTaskLibraryItem, // Uses Supabase
    onSuccess: (_, deletedTaskId) => {
      console.log(`[AdminView] Task library item ${deletedTaskId} deleted.`);
      queryClient.invalidateQueries({ queryKey: ['task-library'] });
      handleCloseDeleteTaskModal(); // Close confirmation
      Toast.show({ type: 'success', text1: 'Success', text2: 'Task library item deleted.' });
    },
    onError: (error: Error, deletedTaskId) => {
      console.error(`[AdminView] Error deleting task library item ${deletedTaskId}:`, error);
      handleCloseDeleteTaskModal();
      Toast.show({ type: 'error', text1: 'Deletion Failed', text2: error.message || 'Could not delete task.' });
    },
  });

  // --- Modal Visibility Handlers --- (Mostly remain the same)
  const handleViewManageUser = (userId: string, role: UserRole) => {
    setViewingUserId(userId);
    setViewingUserRole(role);
    setViewingSection('users'); // Ensure users section is active conceptually
  };
  const handleBackFromDetailView = () => {
    setViewingUserId(null);
    setViewingUserRole(null);
    // No need to force section back to 'users', user might want to go elsewhere
  };
  const handleInternalInitiateVerificationModal = (task: AssignedTask) => {
    if (onInitiateVerificationModal) { // Use prop if passed from App.tsx
      onInitiateVerificationModal(task);
    } else {
        console.warn("[AdminView] onInitiateVerificationModal not provided from parent.");
        // Potentially handle directly or show error
    }
  };
  const handleInitiateAssignTaskForStudent = (studentId: string) => {
    setAssignTaskTargetStudentId(studentId);
    setIsAssignTaskModalVisible(true);
  };
  const handleInitiateAssignTaskGeneral = () => {
    setAssignTaskTargetStudentId(null);
    setIsAssignTaskModalVisible(true);
  };
  const handleAssignTaskModalClose = () => {
    setIsAssignTaskModalVisible(false);
    setAssignTaskTargetStudentId(null);
  };
  const handleInitiateCreateUser = () => setIsCreateUserModalVisible(true);
  const handleViewAllAssignedTasks = () => setIsViewAllAssignedTasksModalVisible(true);
  const handleViewAllAssignedTasksModalClose = () => setIsViewAllAssignedTasksModalVisible(false);
  const handleInitiateCreateTask = () => setIsCreateTaskModalVisible(true);
  const handleCloseCreateTaskModal = () => setIsCreateTaskModalVisible(false);
  const handleInitiateEditTask = (task: TaskLibraryItem) => {
    setTaskToEdit(task);
    setIsEditTaskModalVisible(true);
  };
  const handleCloseEditTaskModal = () => {
    setIsEditTaskModalVisible(false);
    setTaskToEdit(null);
  };
  const handleInitiateDeleteTask = (task: TaskLibraryItem) => {
    setTaskToDelete(task);
    setIsDeleteTaskModalVisible(true);
  };
  const handleCloseDeleteTaskModal = () => {
    setIsDeleteTaskModalVisible(false);
    setTaskToDelete(null);
    deleteTaskMutation.reset();
  };
  const handleConfirmDeleteTask = () => {
    if (taskToDelete && !deleteTaskMutation.isPending) {
      deleteTaskMutation.mutate(taskToDelete.id);
    }
  };
  const handleInitiateEditUser = (user: User) => {
    setUserToManage(user);
    setIsEditUserModalVisible(true);
  };
  const handleInitiateStatusUser = (user: User) => {
    setUserToManage(user);
    setIsStatusModalVisible(true);
  };
  const handleInitiateTicketAdjustment = (user: User) => {
    setUserToManage(user); // Pass the user object which now includes balance from detail view fetch
    setIsAdjustmentModalVisible(true);
  };
  const handleInitiateRedemption = (user: User) => {
    setUserToManage(user); // Pass the user object
    setIsRedeemModalVisible(true);
  };
  const handleCloseEditUserModal = () => {
    setIsEditUserModalVisible(false);
    setUserToManage(null);
  };
  const handleCloseStatusModal = () => {
    setIsStatusModalVisible(false);
    setUserToManage(null);
  };
  const handleCloseAdjustmentModal = () => {
    setIsAdjustmentModalVisible(false);
    setUserToManage(null);
  };
  const handleCloseRedeemModal = () => {
    setIsRedeemModalVisible(false);
    setUserToManage(null);
  };
  const handleDeletionSuccess = (deletedUserId: string) => {
    console.log(`[AdminView] Deletion successful for ${deletedUserId}, closing modals/detail view.`);
    handleCloseStatusModal(); // Close the status/delete modal
    if (viewingUserId === deletedUserId) { // If we were viewing the deleted user
        handleBackFromDetailView(); // Go back from detail view
    }
    // No need to invalidate queries here, the mutation should handle it
  };
  const handleViewStudentProfileFromParentOrTeacher = (studentId: string) => {
    setViewingUserId(studentId);
    setViewingUserRole('student');
    // Optionally set viewingSection to 'users' if desired, or let it stay
  };


  // --- Loading / Error States ---
  const isLoadingCoreData = adminLoading || instrumentsLoading;
  if (isLoadingCoreData) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text>Loading Admin Data...</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!adminUser || adminError) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text style={commonSharedStyles.errorText}>
            Error loading Admin user data: {adminErrorMsg?.message || "Not found."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Render Logic ---

  // Function to render the main content based on section or detail view
  const renderMainContent = () => {
    // If viewing a specific user's detail
    if (viewingUserId && viewingUserRole) {
      switch (viewingUserRole) {
        case 'student':
          return (
            // Pass necessary handlers down
            <AdminStudentDetailView
              viewingStudentId={viewingUserId}
              onInitiateVerification={handleInternalInitiateVerificationModal}
              onInitiateAssignTaskForStudent={handleInitiateAssignTaskForStudent}
              onInitiateEditStudent={handleInitiateEditUser}
              onInitiateStatusUser={handleInitiateStatusUser}
              onInitiateTicketAdjustment={handleInitiateTicketAdjustment}
              onInitiateRedemption={handleInitiateRedemption}
              // onDeleteTask prop maybe not needed if handled internally? Pass if required.
            />
          );
        case 'teacher':
          return (
            <AdminTeacherDetailView
              viewingUserId={viewingUserId}
              onInitiateEditUser={handleInitiateEditUser}
              onInitiateStatusUser={handleInitiateStatusUser}
              onViewStudentProfile={handleViewStudentProfileFromParentOrTeacher}
            />
          );
        case 'parent':
          return (
            <AdminParentDetailView
              viewingUserId={viewingUserId}
              onInitiateEditUser={handleInitiateEditUser}
              onInitiateStatusUser={handleInitiateStatusUser}
              onViewStudentProfile={handleViewStudentProfileFromParentOrTeacher}
            />
          );
        default: // Should not happen
          return <Text>Invalid user role selected for detail view.</Text>;
      }
    }

    // Otherwise, render the selected Admin Section
    switch (viewingSection) {
      case 'dashboard':
        return <AdminDashboardSection
                    onViewPendingVerifications={() => setViewingSection('dashboard-pending-verification')}
                 />;
      case 'dashboard-pending-verification':
        return (
          <View>
            <Text style={appSharedStyles.sectionTitle}>Pending Verifications ({pendingVerifications.length})</Text>
            {pendingTasksLoading || allStudentsLoading ? (
              <ActivityIndicator style={{ marginVertical: 10 }} color={colors.primary} />
            ) : pendingTasksError ? (
              <Text style={commonSharedStyles.errorText}>Error loading tasks: {pendingTasksErrorMsg?.message}</Text>
            ) : pendingVerifications.length > 0 ? (
              <FlatList
                data={pendingVerifications} // Already sorted by API if needed
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <PendingVerificationItem
                    task={item}
                    // Use lookup map for student name
                    studentName={studentNameLookup[item.studentId] || 'Unknown Student'}
                    onInitiateVerification={handleInternalInitiateVerificationModal}
                  />
                )}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            ) : (
              <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text>
            )}
            <Button title="Back to Dashboard" onPress={() => setViewingSection('dashboard')} />
          </View>
        );
      case 'users':
        return (
            // Pass down tab state and student filter/search state & setters
            <AdminUsersSection
                activeTab={activeUserTab}
                setActiveTab={setActiveUserTab}
                studentFilter={studentFilter}
                setStudentFilter={setStudentFilter}
                studentSearchTerm={studentSearchTerm}
                setStudentSearchTerm={setStudentSearchTerm}
                instruments={fetchedInstruments}
                onViewManageUser={handleViewManageUser}
                onInitiateAssignTaskForStudent={handleInitiateAssignTaskForStudent}
                onInitiateCreateUser={handleInitiateCreateUser}
            />
        );
      case 'tasks':
        return (
            <AdminTasksSection
                // Task library data fetched internally now
                onInitiateAssignTask={handleInitiateAssignTaskGeneral}
                onInitiateCreateTask={handleInitiateCreateTask}
                onInitiateEditTask={handleInitiateEditTask}
                onInitiateDeleteTask={handleInitiateDeleteTask}
                deleteTaskMutationPending={deleteTaskMutation.isPending}
            />
        );
      case 'rewards':
        return <AdminRewardsSection />; // Uses internal fetching
      case 'history':
        return <AdminHistorySection />; // Uses internal fetching
      case 'announcements':
        return <AdminAnnouncementsSection />; // Uses internal fetching
      case 'instruments':
        return <AdminInstrumentsSection />; // Uses internal fetching
      default:
        return <Text>Unknown section selected.</Text>;
    }
  };


  // Determine Header Title
  const getHeaderTitle = () => {
    if (viewingUserId && viewingUserRole) {
      // Title is now handled within the detail views based on their fetched data
      // We can provide a generic loading title here if needed
      // return `Viewing User: ${viewingUserId}`; // Or fetch name here if preferred, but detail view does it
        const detailTitle = viewingUserRole.charAt(0).toUpperCase() + viewingUserRole.slice(1);
        return `View ${detailTitle}`; // Generic title while detail loads
    }
    // Default Admin title
    return `Admin: ${getUserDisplayName(adminUser)}`;
  };

  const showBackButton = !!viewingUserId;

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      {/* Header */}
      <View style={appSharedStyles.headerContainer}>
        <View style={appSharedStyles.headerSideContainer}>
          {showBackButton ? (
            <Button title="← Back" onPress={handleBackFromDetailView} />
          ) : (
            <View style={{ width: 60 }} /> // Placeholder for alignment
          )}
        </View>
        <Text style={appSharedStyles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {getHeaderTitle()}
        </Text>
        {/* Add logout or settings icon later if needed */}
        <View style={appSharedStyles.headerSideContainer} />
      </View>

      {/* Render main content area (ScrollView or Detail View) */}
      {/* Wrap sections in ScrollView only when not showing detail view */}
      {!viewingUserId ? (
          <ScrollView style={appSharedStyles.contentArea}>
              {renderMainContent()}
              {/* Extra space at bottom */}
               {viewingSection === 'tasks' && (
                    <View style={{ alignItems: 'flex-start', marginTop: 10, marginBottom: 20 }}>
                      <Button title="View All Assigned Tasks" onPress={handleViewAllAssignedTasks} />
                    </View>
                )}
                <View style={{ height: 40 }} />
          </ScrollView>
      ) : (
         <View style={appSharedStyles.contentArea}>
            {renderMainContent()}
         </View>
      )}


      {/* All Modals */}
      <CreateUserModal
        visible={isCreateUserModalVisible}
        onClose={() => setIsCreateUserModalVisible(false)}
        instruments={fetchedInstruments}
      />
      <AssignTaskModal
        visible={isAssignTaskModalVisible}
        onClose={handleAssignTaskModalClose}
        preselectedStudentId={assignTaskTargetStudentId}
      />
      <ViewAllAssignedTasksModal
        visible={isViewAllAssignedTasksModalVisible}
        onClose={handleViewAllAssignedTasksModalClose}
        onInitiateVerification={handleInternalInitiateVerificationModal}
      />
      <CreateTaskLibraryModal
        visible={isCreateTaskModalVisible}
        onClose={handleCloseCreateTaskModal}
      />
      <EditTaskLibraryModal
        visible={isEditTaskModalVisible}
        taskToEdit={taskToEdit}
        onClose={handleCloseEditTaskModal}
      />
      <ConfirmationModal
        visible={isDeleteTaskModalVisible}
        title="Confirm Delete Task"
        message={`Are you sure you want to delete the library task "${taskToDelete?.title || ''}"? This cannot be undone.`}
        confirmText={deleteTaskMutation.isPending ? 'Deleting...' : 'Delete Task'}
        onConfirm={handleConfirmDeleteTask}
        onCancel={handleCloseDeleteTaskModal}
        confirmDisabled={deleteTaskMutation.isPending}
      />
      <EditUserModal
        visible={isEditUserModalVisible}
        userToEdit={userToManage}
        onClose={handleCloseEditUserModal}
        instruments={fetchedInstruments}
      />
      <DeactivateOrDeleteUserModal
        visible={isStatusModalVisible}
        user={userToManage}
        onClose={handleCloseStatusModal}
        onDeletionSuccess={handleDeletionSuccess}
      />
      {/* Conditionally render adjustment/redeem modals only if userToManage is set and is a student */}
      {userToManage?.role === 'student' && adminUserId && (
        <ManualTicketAdjustmentModal
          visible={isAdjustmentModalVisible}
          onClose={handleCloseAdjustmentModal}
          studentId={userToManage.id}
          studentName={getUserDisplayName(userToManage)}
          // Pass balance fetched within detail view or refetch here
          currentBalance={0} // Placeholder - Detail view needs to pass balance or modal refetches
        />
      )}
      {userToManage?.role === 'student' && adminUserId && (
        <RedeemRewardModal
          visible={isRedeemModalVisible}
          onClose={handleCloseRedeemModal}
          studentId={userToManage.id}
          studentName={getUserDisplayName(userToManage)}
          currentBalance={0} // Placeholder - Detail view needs to pass balance or modal refetches
          redeemerId={adminUserId} // Pass the admin's ID
        />
      )}
    </SafeAreaView>
  );
};

// Local styles
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
   activeStatus: {
        fontWeight: 'bold',
        color: colors.success,
    },
    inactiveStatus: {
         fontWeight: 'bold',
         color: colors.secondary,
    },
});