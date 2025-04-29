// src/views/AdminView.tsx
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  ScrollView,
  Button,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// Import API functions
import { fetchAssignedTasks, deleteAssignedTask } from '../api/assignedTasks';
import { fetchInstruments } from '../api/instruments';
import { deleteTaskLibraryItem } from '../api/taskLibrary';
import { fetchUserProfile, fetchStudents } from '../api/users';

// Import Admin Section Components
import { AdminAnnouncementsSection } from '../components/admin/AdminAnnouncementsSection';
import { AdminDashboardSection } from '../components/admin/AdminDashboardSection';
import { AdminHistorySection } from '../components/admin/AdminHistorySection';
import { AdminInstrumentsSection } from '../components/admin/AdminInstrumentsSection';
import { AdminRewardsSection } from '../components/admin/AdminRewardsSection';
import { AdminTasksSection } from '../components/admin/AdminTasksSection';
import { AdminUsersSection } from '../components/admin/AdminUsersSection';

// Import Detail View Components
import { AdminStudentDetailView } from '../components/admin/AdminStudentDetailView';
import { AdminTeacherDetailView } from '../components/admin/AdminTeacherDetailView';
import { AdminParentDetailView } from '../components/admin/AdminParentDetailView';

// Import Common Components & Modals
import { PendingVerificationItem } from '../components/common/PendingVerificationItem';
import CreateUserModal from '../components/admin/modals/CreateUserModal';
import CreateTaskLibraryModal from '../components/admin/modals/CreateTaskLibraryModal';
import EditTaskLibraryModal from '../components/admin/modals/EditTaskLibraryModal';
import { ViewAllAssignedTasksModal } from '../components/admin/modals/ViewAllAssignedTasksModal';
import ManualTicketAdjustmentModal from '../components/admin/modals/ManualTicketAdjustmentModal';
import RedeemRewardModal from '../components/admin/modals/RedeemRewardModal';
import AssignTaskModal from '../components/common/AssignTaskModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import EditUserModal from '../components/common/EditUserModal';
import DeactivateOrDeleteUserModal from '../components/common/DeactivateOrDeleteUserModal';
import GeneratePinModal from '../components/common/GeneratePinModal';

// Import Hooks & Context
import { useAuth } from '../contexts/AuthContext';
// Import hook for student name lookup if still needed
// import { usePaginatedStudents } from '../hooks/usePaginatedStudents';

// Import Types and Props
import { AssignedTask, Instrument, TaskLibraryItem, User, UserRole, SimplifiedStudent, UserStatus } from '../types/dataTypes';
import { AdminViewProps } from '../types/componentProps';

// Import Styles and Helpers
import { getUserDisplayName } from '../utils/helpers';
import { adminSharedStyles } from '../styles/adminSharedStyles';
import { appSharedStyles } from '../styles/appSharedStyles';
import { commonSharedStyles } from '../styles/commonSharedStyles';
import { colors } from '../styles/colors';
import { StyledButton } from '../components/common/StyledButton';

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
type UserTab = 'students' | 'teachers' | 'parents';

export const AdminView: React.FC<AdminViewProps> = ({ onInitiateVerificationModal }) => {
  const { currentUserId: adminUserId } = useAuth();
  const queryClient = useQueryClient();

  // --- State Management ---
  const [viewingSection, setViewingSection] = useState<AdminSection>('dashboard');
  const [activeUserTab, setActiveUserTab] = useState<UserTab>('students');
  const [studentFilter, setStudentFilter] = useState<UserStatus | 'all'>('active');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [viewingUserRole, setViewingUserRole] = useState<UserRole | null>(null);
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
  const [isGeneratePinModalVisible, setIsGeneratePinModalVisible] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskLibraryItem | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskLibraryItem | null>(null);
  const [userToManage, setUserToManage] = useState<User | null>(null);
  const [userForPin, setUserForPin] = useState<User | null>(null);

  // --- Data Fetching ---
  const {
    data: adminUser,
    isLoading: adminLoading,
    isError: adminError,
    error: adminErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', adminUserId],
    queryFn: () => fetchUserProfile(adminUserId!),
    enabled: !!adminUserId,
    staleTime: 15 * 60 * 1000,
  });

  const {
    data: fetchedInstruments = [],
    isLoading: instrumentsLoading,
  } = useQuery<Instrument[], Error>({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
  });

  const {
    data: pendingTasksResult,
    isLoading: pendingTasksLoading,
    isError: pendingTasksError,
    error: pendingTasksErrorMsg,
  } = useQuery({
    queryKey: ['assigned-tasks', { assignmentStatus: 'pending', studentStatus: 'active', scope: 'dashboard-preview' }],
    queryFn: () => fetchAssignedTasks({ assignmentStatus: 'pending', studentStatus: 'active', limit: 1000 }),
    staleTime: 1 * 60 * 1000,
  });
  const pendingVerifications = useMemo(() => pendingTasksResult?.items ?? [], [pendingTasksResult]);

  const { data: allStudentsResult, isLoading: allStudentsLoading } = useQuery({
      queryKey: ['students', { filter: 'all', limit: 9999, context: 'pending-verification-lookup' }],
      queryFn: () => fetchStudents({ page: 1, limit: 9999, filter: 'all' }),
      staleTime: 5 * 60 * 1000,
      enabled: viewingSection === 'dashboard-pending-verification',
  });
  const studentNameLookup = useMemo(() => {
      const lookup: Record<string, string> = {};
      (allStudentsResult?.students ?? []).forEach(s => { lookup[s.id] = s.name; });
      return lookup;
  }, [allStudentsResult]);

  const { data: detailUserData, isLoading: detailUserLoading } = useQuery<User | null, Error>({
      queryKey: ['userProfile', viewingUserId],
      queryFn: () => fetchUserProfile(viewingUserId!),
      enabled: !!viewingUserId,
      staleTime: 5 * 60 * 1000,
  });

  // --- Mutations ---
  const deleteTaskMutation = useMutation({
    mutationFn: deleteTaskLibraryItem,
    onSuccess: (_, deletedTaskId) => {
      queryClient.invalidateQueries({ queryKey: ['task-library'] });
      handleCloseDeleteTaskModal();
      Toast.show({ type: 'success', text1: 'Success', text2: 'Task library item deleted.' });
    },
    onError: (error: Error, deletedTaskId) => {
      handleCloseDeleteTaskModal();
      Toast.show({ type: 'error', text1: 'Deletion Failed', text2: error.message || 'Could not delete task.' });
    },
  });

  // --- Modal Visibility Handlers ---
  const handleViewManageUser = (userId: string, role: UserRole) => { setViewingUserId(userId); setViewingUserRole(role); };
  const handleBackFromDetailView = () => { setViewingUserId(null); setViewingUserRole(null); };
  const handleInternalInitiateVerificationModal = (task: AssignedTask) => { if (onInitiateVerificationModal) { onInitiateVerificationModal(task); } else { console.warn("[AdminView] onInitiateVerificationModal not provided."); } };
  const handleInitiateAssignTaskForStudent = (studentId: string) => { setAssignTaskTargetStudentId(studentId); setIsAssignTaskModalVisible(true); };
  const handleInitiateAssignTaskGeneral = () => { setAssignTaskTargetStudentId(null); setIsAssignTaskModalVisible(true); };
  const handleAssignTaskModalClose = () => { setIsAssignTaskModalVisible(false); setAssignTaskTargetStudentId(null); };
  const handleInitiateCreateUser = () => setIsCreateUserModalVisible(true);
  const handleViewAllAssignedTasks = () => setIsViewAllAssignedTasksModalVisible(true);
  const handleViewAllAssignedTasksModalClose = () => setIsViewAllAssignedTasksModalVisible(false);
  const handleInitiateCreateTask = () => setIsCreateTaskModalVisible(true);
  const handleCloseCreateTaskModal = () => setIsCreateTaskModalVisible(false);
  const handleInitiateEditTask = (task: TaskLibraryItem) => { setTaskToEdit(task); setIsEditTaskModalVisible(true); };
  const handleCloseEditTaskModal = () => { setIsEditTaskModalVisible(false); setTaskToEdit(null); };
  const handleInitiateDeleteTask = (task: TaskLibraryItem) => { setTaskToDelete(task); setIsDeleteTaskModalVisible(true); };
  const handleCloseDeleteTaskModal = () => { setIsDeleteTaskModalVisible(false); setTaskToDelete(null); deleteTaskMutation.reset(); };
  const handleConfirmDeleteTask = () => { if (taskToDelete && !deleteTaskMutation.isPending) { deleteTaskMutation.mutate(taskToDelete.id); } };
  const handleInitiateEditUser = (user: User) => { setUserToManage(user); setIsEditUserModalVisible(true); };
  const handleInitiateStatusUser = (user: User) => { setUserToManage(user); setIsStatusModalVisible(true); };
  const handleInitiateTicketAdjustment = (user: User) => { setUserToManage(user); setIsAdjustmentModalVisible(true); };
  const handleInitiateRedemption = (user: User) => { setUserToManage(user); setIsRedeemModalVisible(true); };
  const handleInitiatePinGeneration = (user: User) => { setUserForPin(user); setIsGeneratePinModalVisible(true); };
  const handleCloseEditUserModal = () => { setIsEditUserModalVisible(false); setUserToManage(null); };
  const handleCloseStatusModal = () => { setIsStatusModalVisible(false); setUserToManage(null); };
  const handleCloseAdjustmentModal = () => { setIsAdjustmentModalVisible(false); setUserToManage(null); };
  const handleCloseRedeemModal = () => { setIsRedeemModalVisible(false); setUserToManage(null); };
   const handleClosePinGeneration = () => { setIsGeneratePinModalVisible(false); setUserForPin(null); };
  const handleDeletionSuccess = (deletedUserId: string) => { handleCloseStatusModal(); if (viewingUserId === deletedUserId) { handleBackFromDetailView(); } };
  const handleViewStudentProfileFromParentOrTeacher = (studentId: string) => { setViewingUserId(studentId); setViewingUserRole('student'); };


  // --- Loading / Error States ---
  // Check core data needed to render the main AdminView shell
  const isLoadingCoreData = adminLoading || instrumentsLoading;
  if (isLoadingCoreData) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary}/>
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
          {/* Maybe add a retry button or more info here */}
        </View>
      </SafeAreaView>
    );
  }

  // --- Render Logic ---
  const renderMainContent = () => {
    // Render Detail View
    if (viewingUserId && viewingUserRole) {
        if (detailUserLoading) {
            return ( <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /><Text>Loading User Details...</Text></View> );
        }
        if (!detailUserData) {
             return ( <View style={appSharedStyles.container}><Text style={commonSharedStyles.errorText}>Failed to load user details for ID: {viewingUserId}.</Text><Button title="Back to List" onPress={handleBackFromDetailView} /></View> );
        }

      switch (viewingUserRole) {
        case 'student':
            return ( <AdminStudentDetailView viewingStudentId={viewingUserId} onInitiateVerification={handleInternalInitiateVerificationModal} onInitiateAssignTaskForStudent={handleInitiateAssignTaskForStudent} onInitiateEditStudent={handleInitiateEditUser} onInitiateStatusUser={handleInitiateStatusUser} onInitiateTicketAdjustment={handleInitiateTicketAdjustment} onInitiateRedemption={handleInitiateRedemption} onInitiatePinGeneration={handleInitiatePinGeneration} /> );
        case 'teacher':
            return ( <AdminTeacherDetailView viewingUserId={viewingUserId} onInitiateEditUser={handleInitiateEditUser} onInitiateStatusUser={handleInitiateStatusUser} onViewStudentProfile={handleViewStudentProfileFromParentOrTeacher} onInitiatePinGeneration={handleInitiatePinGeneration} /> );
        case 'parent':
            return ( <AdminParentDetailView viewingUserId={viewingUserId} onInitiateEditUser={handleInitiateEditUser} onInitiateStatusUser={handleInitiateStatusUser} onViewStudentProfile={handleViewStudentProfileFromParentOrTeacher} /> );
        default:
          // This should ideally not be reachable if viewingUserRole is typed correctly
          console.error("Invalid user role in renderMainContent:", viewingUserRole);
          return <Text>Invalid user role selected for detail view.</Text>;
      }
    }

    // Render Sections
    switch (viewingSection) {
        case 'dashboard':
            return <AdminDashboardSection onViewPendingVerifications={() => setViewingSection('dashboard-pending-verification')} />;
        case 'dashboard-pending-verification':
            // Use a fragment or View to return multiple elements
            return (
              <View>
                <Text style={appSharedStyles.sectionTitle}>Pending Verifications ({pendingVerifications.length})</Text>
                {pendingTasksLoading || allStudentsLoading ? (
                  <ActivityIndicator style={{ marginVertical: 10 }} color={colors.primary} />
                ) : pendingTasksError ? (
                  <Text style={commonSharedStyles.errorText}>Error loading tasks: {pendingTasksErrorMsg?.message}</Text>
                ) : pendingVerifications.length > 0 ? (
                  <FlatList
                    data={pendingVerifications}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                      <PendingVerificationItem
                        task={item}
                        studentName={studentNameLookup[item.studentId] || 'Unknown Student'}
                        onInitiateVerification={handleInternalInitiateVerificationModal}
                      />
                    )}
                    scrollEnabled={false} // Important if inside ScrollView
                    ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                  />
                ) : (
                  <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text>
                )}
                <Button title="Back to Dashboard" onPress={() => setViewingSection('dashboard')} />
              </View>
            );
        case 'users':
            return ( <AdminUsersSection activeTab={activeUserTab} setActiveTab={setActiveUserTab} studentFilter={studentFilter} setStudentFilter={setStudentFilter} studentSearchTerm={studentSearchTerm} setStudentSearchTerm={setStudentSearchTerm} instruments={fetchedInstruments} onViewManageUser={handleViewManageUser} onInitiateAssignTaskForStudent={handleInitiateAssignTaskForStudent} onInitiateCreateUser={handleInitiateCreateUser} /> );
        case 'tasks':
            return ( <AdminTasksSection onInitiateAssignTask={handleInitiateAssignTaskGeneral} onInitiateCreateTask={handleInitiateCreateTask} onInitiateEditTask={handleInitiateEditTask} onInitiateDeleteTask={handleInitiateDeleteTask} deleteTaskMutationPending={deleteTaskMutation.isPending} /> );
        case 'rewards':
            return <AdminRewardsSection />;
        case 'history':
            return <AdminHistorySection />;
        case 'announcements':
            return <AdminAnnouncementsSection />;
        case 'instruments':
            return <AdminInstrumentsSection />;
        default:
            console.error("Invalid section in renderMainContent:", viewingSection);
            return <Text>Unknown section selected.</Text>;
    }
  }; // end renderMainContent

  const getHeaderTitle = () => {
    if (viewingUserId && viewingUserRole) {
        const detailTitle = viewingUserRole.charAt(0).toUpperCase() + viewingUserRole.slice(1);
        // Consider showing loaded name if available: getUserDisplayName(detailUserData) || `View ${detailTitle}`
        return `View ${detailTitle}`;
    }
    // Use adminUser data safely
    return `Admin: ${getUserDisplayName(adminUser)}`;
  };

  const showBackButton = !!viewingUserId;

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      {/* Header */}
      <View style={appSharedStyles.headerContainer}>
        <View style={appSharedStyles.headerSideContainer}>
          {showBackButton ? ( <Button title="← Back" onPress={handleBackFromDetailView} /> ) : ( <View style={{ width: 60 }} /> )}
        </View>
        <Text style={appSharedStyles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {getHeaderTitle()}
        </Text>
        <View style={appSharedStyles.headerSideContainer} />
      </View>

      {/* Main Content Area */}
      {!viewingUserId ? (
          <ScrollView style={appSharedStyles.contentArea}>
              {/* Section Navigation Buttons */}
              <View style={adminSharedStyles.adminNav}>
                  <StyledButton title="Dashboard" onPress={() => setViewingSection('dashboard')} color={viewingSection === 'dashboard' ? colors.primary : colors.secondary} />
                   <StyledButton title="Users" onPress={() => setViewingSection('users')} color={viewingSection === 'users' ? colors.primary : colors.secondary} />
                   <StyledButton title="Tasks" onPress={() => setViewingSection('tasks')} color={viewingSection === 'tasks' ? colors.primary : colors.secondary} />
                   <StyledButton title="Rewards" onPress={() => setViewingSection('rewards')} color={viewingSection === 'rewards' ? colors.primary : colors.secondary} />
                   <StyledButton title="History" onPress={() => setViewingSection('history')} color={viewingSection === 'history' ? colors.primary : colors.secondary} />
                   <StyledButton title="Announcements" onPress={() => setViewingSection('announcements')} color={viewingSection === 'announcements' ? colors.primary : colors.secondary} />
                   <StyledButton title="Instruments" onPress={() => setViewingSection('instruments')} color={viewingSection === 'instruments' ? colors.primary : colors.secondary} />
              </View>
              {/* Render the selected section */}
              {renderMainContent()}
              {/* Button specific to Tasks section */}
              {viewingSection === 'tasks' && (
                  <View style={{ alignItems: 'flex-start', marginTop: 10, marginBottom: 20, paddingHorizontal: 15 }}>
                      <Button title="View All Assigned Tasks" onPress={handleViewAllAssignedTasks} />
                  </View>
              )}
              <View style={{ height: 40 }} /> {/* Bottom padding */}
          </ScrollView>
      ) : (
         // Render Detail View directly (no ScrollView wrapper needed here, detail view handles its own scroll)
         <View style={appSharedStyles.contentArea}>
            {renderMainContent()}
         </View>
      )}

      {/* All Modals Rendered at the bottom */}
      <CreateUserModal visible={isCreateUserModalVisible} onClose={() => setIsCreateUserModalVisible(false)} />
      <AssignTaskModal visible={isAssignTaskModalVisible} onClose={handleAssignTaskModalClose} preselectedStudentId={assignTaskTargetStudentId} />
      <ViewAllAssignedTasksModal visible={isViewAllAssignedTasksModalVisible} onClose={handleViewAllAssignedTasksModalClose} onInitiateVerification={handleInternalInitiateVerificationModal} />
      <CreateTaskLibraryModal visible={isCreateTaskModalVisible} onClose={handleCloseCreateTaskModal} />
      <EditTaskLibraryModal visible={isEditTaskModalVisible} taskToEdit={taskToEdit} onClose={handleCloseEditTaskModal} />
      <ConfirmationModal visible={isDeleteTaskModalVisible} title="Confirm Delete Task" message={`Delete library task "${taskToDelete?.title || ''}"?`} confirmText={deleteTaskMutation.isPending ? 'Deleting...' : 'Delete Task'} onConfirm={handleConfirmDeleteTask} onCancel={handleCloseDeleteTaskModal} confirmDisabled={deleteTaskMutation.isPending} />
      <EditUserModal visible={isEditUserModalVisible} userToEdit={userToManage} onClose={handleCloseEditUserModal} />
      <DeactivateOrDeleteUserModal visible={isStatusModalVisible} user={userToManage} onClose={handleCloseStatusModal} onDeletionSuccess={handleDeletionSuccess} />
       <GeneratePinModal visible={isGeneratePinModalVisible} user={userForPin} onClose={handleClosePinGeneration} />
      {/* Conditionally render modals requiring userToManage and role check */}
      {userToManage?.role === 'student' && adminUserId && ( <ManualTicketAdjustmentModal visible={isAdjustmentModalVisible} onClose={handleCloseAdjustmentModal} studentId={userToManage.id} studentName={getUserDisplayName(userToManage)} /> )}
      {userToManage?.role === 'student' && adminUserId && ( <RedeemRewardModal visible={isRedeemModalVisible} onClose={handleCloseRedeemModal} studentId={userToManage.id} studentName={getUserDisplayName(userToManage)} redeemerId={adminUserId} /> )}
    </SafeAreaView>
  );
};

// Local styles
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20, // Added padding for centering message/indicator
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