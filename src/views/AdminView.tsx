import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { View, Text, ScrollView, Button, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// API Imports (keep as is)
import { fetchAssignedTasks } from '../api/assignedTasks';
import { fetchInstruments } from '../api/instruments';
import { deleteTaskLibraryItem } from '../api/taskLibrary';
import { fetchUserProfile, fetchStudents } from '../api/users';

// Component Imports (Add SharedHeader, remove unused things if needed)
import { AdminAnnouncementsSection } from '../components/admin/AdminAnnouncementsSection';
import { AdminDashboardSection } from '../components/admin/AdminDashboardSection';
import { AdminHistorySection } from '../components/admin/AdminHistorySection';
import { AdminInstrumentsSection } from '../components/admin/AdminInstrumentsSection';
import { AdminRewardsSection } from '../components/admin/AdminRewardsSection';
import { AdminTasksSection } from '../components/admin/AdminTasksSection';
import { AdminUsersSection } from '../components/admin/AdminUsersSection';
import { AdminStudentDetailView } from '../components/admin/AdminStudentDetailView';
import { AdminTeacherDetailView } from '../components/admin/AdminTeacherDetailView';
import { AdminParentDetailView } from '../components/admin/AdminParentDetailView';
import { AdminAdminDetailView } from '../components/admin/AdminAdminDetailView'; // Keep
import { PendingVerificationItem } from '../components/common/PendingVerificationItem';
import CreateUserModal from '../components/admin/modals/CreateUserModal';
import CreateTaskLibraryModal from '../components/admin/modals/CreateTaskLibraryModal';
import EditTaskLibraryModal from '../components/admin/modals/EditTaskLibraryModal';
import ManualTicketAdjustmentModal from '../components/admin/modals/ManualTicketAdjustmentModal';
import RedeemRewardModal from '../components/admin/modals/RedeemRewardModal';
import AssignTaskModal from '../components/common/AssignTaskModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import EditUserModal from '../components/common/EditUserModal';
import DeactivateOrDeleteUserModal from '../components/common/DeactivateOrDeleteUserModal';
import GeneratePinModal from '../components/common/GeneratePinModal';
import SetEmailPasswordModal from '../components/common/SetEmailPasswordModal'; // Keep
import { SharedHeader } from '../components/common/SharedHeader'; // *** IMPORT NEW HEADER ***

// Context & Type Imports (keep as is)
import { useAuth } from '../contexts/AuthContext';
import {
  AssignedTask,
  Instrument,
  TaskLibraryItem,
  User,
  UserRole,
  UserStatus,
} from '../types/dataTypes';
import { AdminSection, AdminViewProps, UserTab } from '../types/componentProps';

// Style & Helper Imports (keep as is)
import { getUserDisplayName } from '../utils/helpers';
import { appSharedStyles } from '../styles/appSharedStyles';
import { commonSharedStyles } from '../styles/commonSharedStyles';
import { colors } from '../styles/colors';
// Removed StyledButton import as it's not used here directly anymore

export const AdminView: React.FC<AdminViewProps> = ({ onInitiateVerificationModal }) => {
  const { currentUserId: adminUserId } = useAuth(); // Keep useAuth
  const queryClient = useQueryClient();

  // Keep existing state
  const [viewingSection, setViewingSection] = useState<AdminSection>('dashboard');
  const [activeUserTab, setActiveUserTab] = useState<UserTab>('students');
  const [studentFilter, setStudentFilter] = useState<UserStatus | 'all'>('active');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [viewingUserRole, setViewingUserRole] = useState<UserRole | null>(null);
  const [isCreateUserModalVisible, setIsCreateUserModalVisible] = useState(false);
  const [isAssignTaskModalVisible, setIsAssignTaskModalVisible] = useState(false);
  const [assignTaskTargetStudentId, setAssignTaskTargetStudentId] = useState<string | null>(null);
  const [isCreateTaskModalVisible, setIsCreateTaskModalVisible] = useState(false);
  const [isEditTaskModalVisible, setIsEditTaskModalVisible] = useState(false);
  const [isDeleteTaskModalVisible, setIsDeleteTaskModalVisible] = useState(false);
  const [isEditUserModalVisible, setIsEditUserModalVisible] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [isAdjustmentModalVisible, setIsAdjustmentModalVisible] = useState(false);
  const [isRedeemModalVisible, setIsRedeemModalVisible] = useState(false);
  const [isGeneratePinModalVisible, setIsGeneratePinModalVisible] = useState(false);
  const [isSetCredentialsModalVisible, setIsSetCredentialsModalVisible] = useState(false); // Keep state for the modal
  const [taskToEdit, setTaskToEdit] = useState<TaskLibraryItem | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskLibraryItem | null>(null);
  const [userToManage, setUserToManage] = useState<User | null>(null);
  const [userForPin, setUserForPin] = useState<User | null>(null);

  // Keep existing queries
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

  const { data: fetchedInstruments = [], isLoading: instrumentsLoading } = useQuery<
    Instrument[],
    Error
  >({
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
    queryKey: [
      'assigned-tasks',
      { assignmentStatus: 'pending', studentStatus: 'active', scope: 'dashboard-preview' },
    ],
    queryFn: () =>
      fetchAssignedTasks({ assignmentStatus: 'pending', studentStatus: 'active', limit: 1000 }),
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
    (allStudentsResult?.students ?? []).forEach(s => {
      lookup[s.id] = s.name;
    });
    return lookup;
  }, [allStudentsResult]);

  const { data: detailUserData, isLoading: detailUserLoading } = useQuery<User | null, Error>({
    queryKey: ['userProfile', viewingUserId],
    queryFn: () => fetchUserProfile(viewingUserId!),
    enabled: !!viewingUserId,
    staleTime: 5 * 60 * 1000,
  });

  // Keep mutations
  const deleteTaskMutation = useMutation({
    mutationFn: deleteTaskLibraryItem,
    onSuccess: (_, deletedTaskId) => {
      queryClient.invalidateQueries({ queryKey: ['task-library'] });
      handleCloseDeleteTaskModal();
      Toast.show({ type: 'success', text1: 'Success', text2: 'Task library item deleted.' });
    },
    onError: (error: Error, deletedTaskId) => {
      handleCloseDeleteTaskModal();
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
        text2: error.message || 'Could not delete task.',
      });
    },
  });

  // Keep handlers
  const handleViewManageUser = (userId: string, role: UserRole) => {
    setViewingUserId(userId);
    setViewingUserRole(role);
  };
  const handleBackFromDetailView = () => {
    setViewingUserId(null);
    setViewingUserRole(null);
  };
  const handleInternalInitiateVerificationModal = (task: AssignedTask) => {
    if (onInitiateVerificationModal) {
      onInitiateVerificationModal(task);
    } else {
      console.warn('[AdminView] onInitiateVerificationModal not provided.');
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
    setUserToManage(user);
    setIsAdjustmentModalVisible(true);
  };
  const handleInitiateRedemption = (user: User) => {
    setUserToManage(user);
    setIsRedeemModalVisible(true);
  };
  const handleInitiatePinGeneration = (user: User) => {
    setUserForPin(user);
    setIsGeneratePinModalVisible(true);
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
  const handleClosePinGeneration = () => {
    setIsGeneratePinModalVisible(false);
    setUserForPin(null);
  };
  const handleCloseSetCredentialsModal = () => setIsSetCredentialsModalVisible(false);
  const handleDeletionSuccess = (deletedUserId: string) => {
    handleCloseStatusModal();
    if (viewingUserId === deletedUserId) {
      handleBackFromDetailView();
    }
  };
  const handleViewStudentProfileFromParentOrTeacher = (studentId: string) => {
    setViewingUserId(studentId);
    setViewingUserRole('student');
  };

  // Keep loading/error checks
  const isLoadingCoreData = adminLoading || instrumentsLoading;
  if (isLoadingCoreData) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={appSharedStyles.loadingText}>Loading Admin Data...</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!adminUser || adminError) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.containerBase}>
          <Text style={commonSharedStyles.errorText}>
            Error loading Admin user data: {adminErrorMsg?.message || 'Not found.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  if (adminUser.role !== 'admin') {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.containerBase}>
          <Text style={commonSharedStyles.errorText}>Error: User is not an Admin.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Keep main content rendering logic
  const renderMainContent = () => {
    // ... (Keep the existing switch/case logic for viewingUserId and viewingSection) ...
    if (viewingUserId && viewingUserRole) {
      if (detailUserLoading) {
        return (
          <View style={appSharedStyles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={appSharedStyles.loadingText}>Loading User Details...</Text>
          </View>
        );
      }

      if (!detailUserData) {
        // Handled user deleted case in handleDeletionSuccess, this is for fetch errors
        return (
          <View style={appSharedStyles.containerBase}>
            <Text style={commonSharedStyles.errorText}>
              Failed to load details for user ID: {viewingUserId}. User might have been deleted.
            </Text>
            <Button title="Back to List" onPress={handleBackFromDetailView} />
          </View>
        );
      }

      switch (viewingUserRole) {
        case 'student':
          return (
            <AdminStudentDetailView
              viewingStudentId={viewingUserId}
              onInitiateVerification={handleInternalInitiateVerificationModal}
              onInitiateAssignTaskForStudent={handleInitiateAssignTaskForStudent}
              onInitiateEditStudent={handleInitiateEditUser}
              onInitiateStatusUser={handleInitiateStatusUser}
              onInitiateTicketAdjustment={handleInitiateTicketAdjustment}
              onInitiateRedemption={handleInitiateRedemption}
              onInitiatePinGeneration={handleInitiatePinGeneration}
            />
          );
        case 'teacher':
          return (
            <AdminTeacherDetailView
              viewingUserId={viewingUserId}
              onInitiateEditUser={handleInitiateEditUser}
              onInitiateStatusUser={handleInitiateStatusUser}
              onViewStudentProfile={handleViewStudentProfileFromParentOrTeacher}
              onInitiatePinGeneration={handleInitiatePinGeneration}
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
        case 'admin':
          return (
            <AdminAdminDetailView
              viewingUserId={viewingUserId}
              onInitiateStatusUser={handleInitiateStatusUser}
              onInitiatePinGeneration={handleInitiatePinGeneration}
            />
          );

        default:
          console.error('Invalid user role in renderMainContent:', viewingUserRole);
          return <Text>Invalid user role selected for detail view.</Text>;
      }
    }

    switch (viewingSection) {
      case 'dashboard':
        return (
          <View style={[commonSharedStyles.baseColumn, commonSharedStyles.baseGap]}>
            <AdminDashboardSection
              onViewPendingVerifications={() => setViewingSection('dashboard-pending-verification')}
              setActiveTab={setActiveUserTab}
              setViewingSection={setViewingSection}
              onInitiateCreateUser={handleInitiateCreateUser}
            />
            <View style={[commonSharedStyles.baseColumn, commonSharedStyles.baseGap]}>
              <Text
                style={[
                  commonSharedStyles.baseSubTitle,
                  commonSharedStyles.bold,
                  commonSharedStyles.baseMargin,
                ]}
              >
                Entities
              </Text>
              <View
                style={[
                  commonSharedStyles.baseRow,
                  commonSharedStyles.baseMargin,
                  commonSharedStyles.baseGap,
                ]}
              >
                <Button title="Announcements" onPress={() => setViewingSection('announcements')} />
                <Button title="Instruments" onPress={() => setViewingSection('instruments')} />
                <Button title="Rewards" onPress={() => setViewingSection('rewards')} />
              </View>
            </View>
          </View>
        );
      case 'dashboard-pending-verification':
        return (
          <View>
            <Text style={appSharedStyles.sectionTitle}>
              Pending Verifications ({pendingVerifications.length})
            </Text>
            {pendingTasksLoading || allStudentsLoading ? (
              <ActivityIndicator style={{ marginVertical: 10 }} color={colors.primary} />
            ) : pendingTasksError ? (
              <Text style={commonSharedStyles.errorText}>
                Error loading tasks: {pendingTasksErrorMsg?.message}
              </Text>
            ) : pendingVerifications.length > 0 ? (
              <FlatList
                data={pendingVerifications.sort(
                  (a, b) =>
                    new Date(a.completedDate || 0).getTime() -
                    new Date(b.completedDate || 0).getTime()
                )}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <PendingVerificationItem
                    task={item}
                    studentName={
                      studentNameLookup[item.studentId] ||
                      `ID: ${item.studentId.substring(0, 6)}...`
                    }
                    onInitiateVerification={handleInternalInitiateVerificationModal}
                  />
                )}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            ) : (
              <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text>
            )}
          </View>
        );
      case 'users':
        return (
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
            onInitiateAssignTask={handleInitiateAssignTaskGeneral}
            onInitiateCreateTask={handleInitiateCreateTask}
            onInitiateEditTask={handleInitiateEditTask}
            onInitiateDeleteTask={handleInitiateDeleteTask}
            handleInternalInitiateVerificationModal={handleInternalInitiateVerificationModal}
            deleteTaskMutationPending={deleteTaskMutation.isPending}
          />
        );
      case 'rewards':
        return <AdminRewardsSection />;
      case 'history':
        return <AdminHistorySection />;
      case 'announcements':
        return <AdminAnnouncementsSection />;
      case 'instruments':
        return <AdminInstrumentsSection />;
      default:
        console.error('Invalid section in renderMainContent:', viewingSection);
        return <Text>Unknown section selected.</Text>;
    }
  };

  const showBackButton = !!viewingUserId;

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseAlign, commonSharedStyles.spaceBetween, commonSharedStyles.baseMargin]}>
        <SharedHeader onSetLoginPress={() => setIsSetCredentialsModalVisible(true)} />
      </View>

      {!viewingUserId ? (
        <ScrollView style={appSharedStyles.contentArea}>
          <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseMargin]}>
            <Button
              title="Dashboard"
              onPress={() => setViewingSection('dashboard')}
              disabled={viewingSection === 'dashboard'}
            />
          </View>
          {renderMainContent()}
        </ScrollView>
      ) : (
        <>
          {showBackButton && (
            <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseMargin]}>
              <Button title="← Back" onPress={handleBackFromDetailView} />
            </View>
          )}
          <View style={appSharedStyles.contentArea}>{renderMainContent()}</View>
        </>
      )}

      <CreateUserModal
        visible={isCreateUserModalVisible}
        onClose={() => setIsCreateUserModalVisible(false)}
      />
      <AssignTaskModal
        visible={isAssignTaskModalVisible}
        onClose={handleAssignTaskModalClose}
        preselectedStudentId={assignTaskTargetStudentId}
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
        message={`Delete library task "${taskToDelete?.title || ''}"?`}
        confirmText={deleteTaskMutation.isPending ? 'Deleting...' : 'Delete Task'}
        onConfirm={handleConfirmDeleteTask}
        onCancel={handleCloseDeleteTaskModal}
        confirmDisabled={deleteTaskMutation.isPending}
      />
      <EditUserModal
        visible={isEditUserModalVisible}
        userToEdit={userToManage}
        onClose={handleCloseEditUserModal}
      />
      <DeactivateOrDeleteUserModal
        visible={isStatusModalVisible}
        user={userToManage}
        onClose={handleCloseStatusModal}
        onDeletionSuccess={handleDeletionSuccess}
      />
      <GeneratePinModal
        visible={isGeneratePinModalVisible}
        user={userForPin}
        onClose={handleClosePinGeneration}
      />
      {userToManage?.role === 'student' && adminUserId && (
        <ManualTicketAdjustmentModal
          visible={isAdjustmentModalVisible}
          onClose={handleCloseAdjustmentModal}
          studentId={userToManage.id}
          studentName={getUserDisplayName(userToManage)}
        />
      )}
      {userToManage?.role === 'student' && adminUserId && (
        <RedeemRewardModal
          visible={isRedeemModalVisible}
          onClose={handleCloseRedeemModal}
          studentId={userToManage.id}
          studentName={getUserDisplayName(userToManage)}
          redeemerId={adminUserId} // Keep passing adminId here for now
        />
      )}
      <SetEmailPasswordModal
        visible={isSetCredentialsModalVisible}
        onClose={handleCloseSetCredentialsModal}
      />
    </SafeAreaView>
  );
};
