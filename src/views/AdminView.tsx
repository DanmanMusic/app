import React, { useState } from 'react';
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

import { fetchAssignedTasks } from '../api/assignedTasks';
import { fetchInstruments } from '../api/instruments';
import { fetchTaskLibrary, deleteTaskLibraryItem } from '../api/taskLibrary';
import { fetchTeachers, fetchParents, fetchStudents } from '../api/users';

import { AdminAnnouncementsSection } from '../components/admin/AdminAnnouncementsSection';
import { AdminDashboardSection } from '../components/admin/AdminDashboardSection';
import { AdminHistorySection } from '../components/admin/AdminHistorySection';
import { AdminInstrumentsSection } from '../components/admin/AdminInstrumentsSection';
import { AdminRewardsSection } from '../components/admin/AdminRewardsSection';
import { AdminStudentDetailView } from '../components/admin/AdminStudentDetailView';
import { AdminTasksSection } from '../components/admin/AdminTasksSection';
import { AdminUsersSection } from '../components/admin/AdminUsersSection';
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

import { useAuth } from '../contexts/AuthContext';
import { usePaginatedParents } from '../hooks/usePaginatedParents';
import { usePaginatedStudents } from '../hooks/usePaginatedStudents';
import { usePaginatedTeachers } from '../hooks/usePaginatedTeachers';

import { AssignedTask } from '../mocks/mockAssignedTasks';
import { Instrument } from '../mocks/mockInstruments';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { AdminViewProps, AdminTasksSectionProps } from '../types/componentProps';
import { User, UserRole } from '../types/userTypes';
import { SimplifiedStudent } from '../types/dataTypes';

import { getUserDisplayName } from '../utils/helpers';
import { adminSharedStyles } from '../styles/adminSharedStyles';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';

const AdminTeacherDetailView: React.FC<{ userId: string }> = ({ userId }) => (
  <View style={styles.placeholderView}>
    <Text style={styles.placeholderText}>Teacher Detail View Placeholder (ID: {userId})</Text>
    <Text>TODO: Add Teacher-specific details and actions.</Text>
  </View>
);

const AdminParentDetailView: React.FC<{ userId: string }> = ({ userId }) => (
  <View style={styles.placeholderView}>
    <Text style={styles.placeholderText}>Parent Detail View Placeholder (ID: {userId})</Text>
    <Text>TODO: Add Parent-specific details and actions.</Text>
  </View>
);

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
  const { currentUserId } = useAuth();
  const queryClient = useQueryClient();

  const [viewingSection, setViewingSection] = useState<AdminSection>('dashboard');
  const [activeUserTab, setActiveUserTab] = useState<UserTab>('students');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [viewingUserRole, setViewingUserRole] = useState<UserRole | null>(null);
  const [isCreateUserModalVisible, setIsCreateUserModalVisible] = useState(false);
  const [isAssignTaskModalVisible, setIsAssignTaskModalVisible] = useState(false);
  const [assignTaskTargetStudentId, setAssignTaskTargetStudentId] = useState<string | null>(null);
  const [isViewAllAssignedTasksModalVisible, setIsViewAllAssignedTasksModalVisible] =
    useState(false);
  const [isCreateTaskModalVisible, setIsCreateTaskModalVisible] = useState(false);
  const [isEditTaskModalVisible, setIsEditTaskModalVisible] = useState(false);
  const [isDeleteTaskModalVisible, setIsDeleteTaskModalVisible] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskLibraryItem | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskLibraryItem | null>(null);
  const [isEditUserModalVisible, setIsEditUserModalVisible] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [userToManage, setUserToManage] = useState<User | null>(null);
  const [isAdjustmentModalVisible, setIsAdjustmentModalVisible] = useState(false);
  const [isRedeemModalVisible, setIsRedeemModalVisible] = useState(false);

  const {
    data: adminUser,
    isLoading: adminLoading,
    isError: adminError,
  } = useQuery<User, Error>({
    queryKey: ['user', currentUserId, { role: 'admin' }],
    queryFn: async () => {
      if (!currentUserId) throw new Error('No admin user ID');
      const response = await fetch(`/api/users/${currentUserId}`);
      if (!response.ok) throw new Error('Failed to fetch admin user data');
      const userData = await response.json();
      if (userData.role !== 'admin') throw new Error('User is not admin');
      return userData;
    },
    enabled: !!currentUserId,
    staleTime: 15 * 60 * 1000,
  });

  const { data: viewedUserData, isLoading: viewedUserLoading } = useQuery<User, Error>({
    queryKey: ['user', viewingUserId, { role: viewingUserRole }],
    queryFn: async () => {
      if (!viewingUserId) throw new Error('No user ID to view');
      const response = await fetch(`/api/users/${viewingUserId}`);
      if (!response.ok) throw new Error(`Failed to fetch user ${viewingUserId}`);
      return response.json();
    },
    enabled: !!viewingUserId && !!viewingUserRole,
    staleTime: 5 * 60 * 1000,
  });

  const {
    students,
    currentPage: studentPage,
    totalPages: studentTotalPages,
    setPage: setStudentPage,
    currentFilter: studentFilter,
    setFilter: setStudentFilter,
    searchTerm: studentSearchTerm,
    setSearchTerm: setStudentSearchTerm,
    isLoading: isStudentListLoading,
    isFetching: isStudentListFetching,
    isError: isStudentListError,
    error: studentListError,
  } = usePaginatedStudents();

  const {
    teachers,
    currentPage: teacherPage,
    totalPages: teacherTotalPages,
    setPage: setTeacherPage,
    isLoading: isTeacherListLoading,
    isFetching: isTeacherListFetching,
    isError: isTeacherListError,
    error: teacherListError,
  } = usePaginatedTeachers();

  const {
    parents,
    currentPage: parentPage,
    totalPages: parentTotalPages,
    setPage: setParentPage,
    isLoading: isParentListLoading,
    isFetching: isParentListFetching,
    isError: isParentListError,
    error: parentListError,
  } = usePaginatedParents();

  const {
    data: taskLibrary = [],
    isLoading: libraryLoading,
    isError: libraryError,
    error: libraryErrorMsg,
  } = useQuery<TaskLibraryItem[], Error>({
    queryKey: ['task-library'],
    queryFn: fetchTaskLibrary,
    staleTime: 10 * 60 * 1000,
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
    data: assignedTasksResult,
    isLoading: assignedTasksLoading,
    isError: assignedTasksError,
    error: assignedTasksErrorMsg,
  } = useQuery({
    queryKey: ['assigned-tasks', { assignmentStatus: 'pending', studentStatus: 'active' }],
    queryFn: () =>
      fetchAssignedTasks({ assignmentStatus: 'pending', studentStatus: 'active', limit: 1000 }),
    staleTime: 1 * 60 * 1000,
  });
  const pendingTasks = assignedTasksResult?.items ?? [];
  const pendingVerifications = pendingTasks;

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTaskLibraryItem,
    onSuccess: (_, deletedTaskId) => {
      console.log(`Task library item ${deletedTaskId} deleted successfully via mutation.`);
      queryClient.invalidateQueries({ queryKey: ['task-library'] });
      handleCloseDeleteTaskModal();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Task library item deleted.',
        position: 'bottom',
      });
    },
    onError: (error, deletedTaskId) => {
      console.error(`Error deleting task library item ${deletedTaskId}:`, error);
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
        text2: error instanceof Error ? error.message : 'Could not delete task.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

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

  const handleInitiateCreateUser = () => {
    setIsCreateUserModalVisible(true);
  };

  const handleViewAllAssignedTasks = () => {
    setIsViewAllAssignedTasksModalVisible(true);
  };

  const handleViewAllAssignedTasksModalClose = () => {
    setIsViewAllAssignedTasksModalVisible(false);
  };

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
    console.log(`[AdminView] Deletion successful for ${deletedUserId}, resetting view.`);
    handleCloseStatusModal();
    handleBackFromDetailView();
  };

  const isLoadingCoreData = adminLoading || instrumentsLoading;
  if (isLoadingCoreData) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }
  if (!adminUser || adminError) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text style={appSharedStyles.textDanger}>Error loading Admin user data.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderMainContent = () => {
    if (viewingUserId && viewingUserRole) {
      if (viewedUserLoading) {
        return (
          <View style={styles.centered}>
            <ActivityIndicator size="large" />
          </View>
        );
      }
      if (!viewedUserData) {
        return (
          <View style={appSharedStyles.container}>
            <Text style={appSharedStyles.textDanger}>Error loading user details.</Text>
            <Button title="Back" onPress={handleBackFromDetailView} />
          </View>
        );
      }

      switch (viewingUserRole) {
        case 'student':
          return (
            <AdminStudentDetailView
              viewingStudentId={viewingUserId}
              onInitiateVerification={handleInternalInitiateVerificationModal}
              onInitiateAssignTaskForStudent={() =>
                handleInitiateAssignTaskForStudent(viewingUserId)
              }
              onInitiateEditStudent={() => handleInitiateEditUser(viewedUserData!)}
              onInitiateStatusUser={() => handleInitiateStatusUser(viewedUserData!)}
              onInitiateTicketAdjustment={() => handleInitiateTicketAdjustment(viewedUserData!)}
              onInitiateRedemption={() => handleInitiateRedemption(viewedUserData!)}
            />
          );
        case 'teacher':
          return <AdminTeacherDetailView userId={viewingUserId} />;
        case 'parent':
          return <AdminParentDetailView userId={viewingUserId} />;
        default:
          return (
            <View style={appSharedStyles.container}>
              <Text>Invalid user role selected.</Text>
              <Button title="Back" onPress={handleBackFromDetailView} />
            </View>
          );
      }
    }

    const isUsersLoading = isStudentListLoading || isTeacherListLoading || isParentListLoading;
    return (
      <ScrollView style={appSharedStyles.container}>
        <View style={adminSharedStyles.adminNav}>
          <Button
            title="Dashboard"
            onPress={() => setViewingSection('dashboard')}
            color={viewingSection === 'dashboard' ? colors.primary : colors.secondary}
          />
          <Button
            title="Users"
            onPress={() => setViewingSection('users')}
            color={viewingSection === 'users' ? colors.primary : colors.secondary}
          />
          <Button
            title="Tasks"
            onPress={() => setViewingSection('tasks')}
            color={viewingSection === 'tasks' ? colors.primary : colors.secondary}
          />
          <Button
            title="Rewards"
            onPress={() => setViewingSection('rewards')}
            color={viewingSection === 'rewards' ? colors.primary : colors.secondary}
          />
          <Button
            title="History"
            onPress={() => setViewingSection('history')}
            color={viewingSection === 'history' ? colors.primary : colors.secondary}
          />
          <Button
            title="Announcements"
            onPress={() => setViewingSection('announcements')}
            color={viewingSection === 'announcements' ? colors.primary : colors.secondary}
          />
          <Button
            title="Instruments"
            onPress={() => setViewingSection('instruments')}
            color={viewingSection === 'instruments' ? colors.primary : colors.secondary}
          />
        </View>

        {viewingSection === 'dashboard' && (
          <AdminDashboardSection
            onViewPendingVerifications={() => setViewingSection('dashboard-pending-verification')}
          />
        )}
        {viewingSection === 'dashboard-pending-verification' && (
          <View>
            <Text style={appSharedStyles.sectionTitle}>
              Pending Verifications ({pendingVerifications.length})
            </Text>
            {assignedTasksLoading && (
              <ActivityIndicator style={{ marginVertical: 10 }} color={colors.primary} />
            )}
            {assignedTasksError && (
              <Text style={[appSharedStyles.textDanger, { marginVertical: 10 }]}>
                Error loading tasks: {assignedTasksErrorMsg?.message}
              </Text>
            )}
            {!assignedTasksLoading && !assignedTasksError && (
              <>
                {pendingVerifications.length > 0 ? (
                  <FlatList
                    data={pendingVerifications.sort(
                      (a, b) =>
                        new Date(a.completedDate || a.assignedDate).getTime() -
                        new Date(b.completedDate || b.assignedDate).getTime()
                    )}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => {
                      const studentSimple: SimplifiedStudent | undefined = students.find(
                        s => s.id === item.studentId
                      );
                      return (
                        <PendingVerificationItem
                          task={item}
                          studentName={studentSimple?.name ?? 'Unknown Student'}
                          onInitiateVerification={handleInternalInitiateVerificationModal}
                        />
                      );
                    }}
                    scrollEnabled={false}
                    ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                  />
                ) : (
                  <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text>
                )}
                <Button title="Back to Dashboard" onPress={() => setViewingSection('dashboard')} />
              </>
            )}
          </View>
        )}
        {viewingSection === 'users' && (
          <AdminUsersSection
            displayData={
              activeUserTab === 'students'
                ? students
                : activeUserTab === 'teachers'
                  ? teachers
                  : parents
            }
            currentPage={
              activeUserTab === 'students'
                ? studentPage
                : activeUserTab === 'teachers'
                  ? teacherPage
                  : parentPage
            }
            totalPages={
              activeUserTab === 'students'
                ? studentTotalPages
                : activeUserTab === 'teachers'
                  ? teacherTotalPages
                  : parentTotalPages
            }
            setPage={
              activeUserTab === 'students'
                ? setStudentPage
                : activeUserTab === 'teachers'
                  ? setTeacherPage
                  : setParentPage
            }
            activeTab={activeUserTab}
            setActiveTab={setActiveUserTab}
            studentFilter={studentFilter}
            setStudentFilter={setStudentFilter}
            studentSearchTerm={studentSearchTerm}
            setStudentSearchTerm={setStudentSearchTerm}
            isLoading={isUsersLoading}
            isFetching={
              activeUserTab === 'students'
                ? isStudentListFetching
                : activeUserTab === 'teachers'
                  ? isTeacherListFetching
                  : isParentListFetching
            }
            isError={
              activeUserTab === 'students'
                ? isStudentListError
                : activeUserTab === 'teachers'
                  ? isTeacherListError
                  : isParentListError
            }
            error={
              activeUserTab === 'students'
                ? studentListError
                : activeUserTab === 'teachers'
                  ? teacherListError
                  : parentListError
            }
            mockInstruments={fetchedInstruments}
            onViewManageUser={handleViewManageUser}
            onInitiateAssignTaskForStudent={handleInitiateAssignTaskForStudent}
            onInitiateCreateUser={handleInitiateCreateUser}
          />
        )}
        {viewingSection === 'tasks' && (
          <AdminTasksSection
            taskLibrary={taskLibrary}
            isLoading={libraryLoading}
            isError={libraryError ?? false}
            error={libraryErrorMsg}
            onInitiateAssignTask={handleInitiateAssignTaskGeneral}
            onInitiateCreateTask={handleInitiateCreateTask}
            onInitiateEditTask={handleInitiateEditTask}
            onInitiateDeleteTask={handleInitiateDeleteTask}
            deleteTaskMutationPending={deleteTaskMutation.isPending}
          />
        )}
        {viewingSection === 'rewards' && <AdminRewardsSection />}
        {viewingSection === 'history' && <AdminHistorySection />}
        {viewingSection === 'announcements' && <AdminAnnouncementsSection />}
        {viewingSection === 'instruments' && <AdminInstrumentsSection />}

        {viewingSection === 'tasks' && (
          <View style={{ alignItems: 'flex-start', marginTop: 10, marginBottom: 20 }}>
            <Button title="View All Assigned Tasks" onPress={handleViewAllAssignedTasks} />
          </View>
        )}
      </ScrollView>
    );
  };

  const getHeaderTitle = () => {
    if (viewingUserId && viewingUserRole) {
      if (viewedUserLoading) return 'Loading User...';
      if (viewedUserData)
        return `${
          viewingUserRole.charAt(0).toUpperCase() + viewingUserRole.slice(1)
        }: ${getUserDisplayName(viewedUserData)}`;
      return 'Error Loading User';
    }
    return `Admin: ${getUserDisplayName(adminUser)}`;
  };

  const showBackButton = !!viewingUserId;
  const handleBackPress = () => {
    if (viewingUserId) {
      handleBackFromDetailView();
    } else {
      setViewingSection('dashboard');
    }
  };

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.headerContainer}>
        <View style={appSharedStyles.headerSideContainer}>
          {showBackButton ? (
            <Button title="← Back" onPress={handleBackPress} />
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>
        <Text style={appSharedStyles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {getHeaderTitle()}
        </Text>
        <View style={appSharedStyles.headerSideContainer} />
      </View>

      {renderMainContent()}

      <CreateUserModal
        visible={isCreateUserModalVisible}
        onClose={() => setIsCreateUserModalVisible(false)}
        mockInstruments={fetchedInstruments}
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
        message={`Are you sure you want to delete the library task "${
          taskToDelete?.title || ''
        }"? This cannot be undone.`}
        confirmText={deleteTaskMutation.isPending ? 'Deleting...' : 'Delete Task'}
        onConfirm={handleConfirmDeleteTask}
        onCancel={handleCloseDeleteTaskModal}
        confirmDisabled={deleteTaskMutation.isPending}
      />
      <EditUserModal
        visible={isEditUserModalVisible}
        userToEdit={userToManage}
        onClose={handleCloseEditUserModal}
        mockInstruments={fetchedInstruments}
      />
      <DeactivateOrDeleteUserModal
        visible={isStatusModalVisible}
        user={userToManage}
        onClose={handleCloseStatusModal}
        onDeletionSuccess={handleDeletionSuccess}
      />
      {userToManage?.role === 'student' && currentUserId && (
        <ManualTicketAdjustmentModal
          visible={isAdjustmentModalVisible}
          onClose={handleCloseAdjustmentModal}
          studentId={userToManage.id}
          studentName={getUserDisplayName(userToManage)}
          currentBalance={0}
        />
      )}
      {userToManage?.role === 'student' && currentUserId && (
        <RedeemRewardModal
          visible={isRedeemModalVisible}
          onClose={handleCloseRedeemModal}
          studentId={userToManage.id}
          studentName={getUserDisplayName(userToManage)}
          currentBalance={0}
          redeemerId={currentUserId}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  placeholderView: {
    alignItems: 'center',
    backgroundColor: colors.backgroundGrey,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    margin: 15,
    padding: 20,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
