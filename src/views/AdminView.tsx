// src/views/AdminView.tsx
import React, { useState } from 'react';

import { View, Text, ScrollView, Button, ActivityIndicator } from 'react-native';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import {
  deleteAssignedTask,
  TaskAssignmentFilterStatusAPI,
  StudentTaskFilterStatusAPI,
} from '../api/assignedTasks';
import { fetchInstruments } from '../api/instruments';
import { deleteTaskLibraryItem } from '../api/taskLibrary';
import { fetchUserProfile } from '../api/users';
import { AdminAdminDetailView } from '../components/admin/AdminAdminDetailView';
import { AdminAnnouncementsSection } from '../components/admin/AdminAnnouncementsSection';
import { AdminDashboardSection } from '../components/admin/AdminDashboardSection';
import { AdminHistorySection } from '../components/admin/AdminHistorySection';
import { AdminInstrumentsSection } from '../components/admin/AdminInstrumentsSection';
import { AdminParentDetailView } from '../components/admin/AdminParentDetailView';
import { AdminRewardsSection } from '../components/admin/AdminRewardsSection';
import { AdminTasksSection } from '../components/admin/AdminTasksSection';
import { AdminTeacherDetailView } from '../components/admin/AdminTeacherDetailView';
import { AdminUsersSection } from '../components/admin/AdminUsersSection';
import CreateTaskLibraryModal from '../components/admin/modals/CreateTaskLibraryModal';
import CreateUserModal from '../components/admin/modals/CreateUserModal';
import EditTaskLibraryModal from '../components/admin/modals/EditTaskLibraryModal';
import ManualTicketAdjustmentModal from '../components/admin/modals/ManualTicketAdjustmentModal';
import RedeemRewardModal from '../components/admin/modals/RedeemRewardModal';
import AssignTaskModal from '../components/common/AssignTaskModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import DeactivateOrDeleteUserModal from '../components/common/DeactivateOrDeleteUserModal';
import EditMyInfoModal from '../components/common/EditMyInfoModal';
import EditUserModal from '../components/common/EditUserModal';
import GeneratePinModal from '../components/common/GeneratePinModal';
import { PaginatedTasksList } from '../components/common/PaginatedTasksList';
import SetEmailPasswordModal from '../components/common/SetEmailPasswordModal';
import { SharedHeader } from '../components/common/SharedHeader';
import { StudentDetailView } from '../components/common/StudentDetailView';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../styles/colors';
import { commonSharedStyles } from '../styles/commonSharedStyles';
import { AdminSection, AdminViewProps, UserTab } from '../types/componentProps';
import { AssignedTask, Instrument, TaskLibraryItem, User, UserRole } from '../types/dataTypes';
import { getUserDisplayName } from '../utils/helpers';

export const AdminView: React.FC<AdminViewProps> = ({ onInitiateVerificationModal }) => {
  const { currentUserId: adminUserId } = useAuth();
  const queryClient = useQueryClient();

  const [viewingSection, setViewingSection] = useState<AdminSection>('dashboard');
  const [activeUserTab, setActiveUserTab] = useState<UserTab>('students');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [viewingUserRole, setViewingUserRole] = useState<UserRole | null>(null);

  const [isEditInfoModalVisible, setIsEditInfoModalVisible] = useState(false);
  const [isCreateUserModalVisible, setIsCreateUserModalVisible] = useState(false);
  const [isAssignTaskModalVisible, setIsAssignTaskModalVisible] = useState(false);
  const [assignTaskTargetStudentId, setAssignTaskTargetStudentId] = useState<string | null>(null);
  const [isCreateTaskModalVisible, setIsCreateTaskModalVisible] = useState(false);
  const [isEditTaskModalVisible, setIsEditTaskModalVisible] = useState(false);
  const [isDeleteTaskLibModalVisible, setIsDeleteTaskLibModalVisible] = useState(false);
  const [isEditUserModalVisible, setIsEditUserModalVisible] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [isAdjustmentModalVisible, setIsAdjustmentModalVisible] = useState(false);
  const [isRedeemModalVisible, setIsRedeemModalVisible] = useState(false);
  const [isGeneratePinModalVisible, setIsGeneratePinModalVisible] = useState(false);
  const [isSetCredentialsModalVisible, setIsSetCredentialsModalVisible] = useState(false);

  const [isDeleteAssignedTaskConfirmVisible, setIsDeleteAssignedTaskConfirmVisible] =
    useState(false);
  const [assignedTaskToDelete, setAssignedTaskToDelete] = useState<AssignedTask | null>(null);

  const [taskToEdit, setTaskToEdit] = useState<TaskLibraryItem | null>(null);
  const [taskLibToDelete, setTaskLibToDelete] = useState<TaskLibraryItem | null>(null);

  const [userToManage, setUserToManage] = useState<User | null>(null);
  const [userForPin, setUserForPin] = useState<User | null>(null);

  const [adminTaskInitialFilters, setAdminTaskInitialFilters] = useState<{
    assignment: TaskAssignmentFilterStatusAPI;
    student: StudentTaskFilterStatusAPI;
  } | null>(null);

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

  const { data: detailUserData, isLoading: detailUserLoading } = useQuery<User | null, Error>({
    queryKey: ['userProfile', viewingUserId],
    queryFn: () => fetchUserProfile(viewingUserId!),
    enabled: !!viewingUserId,
    staleTime: 5 * 60 * 1000,
  });

  const deleteTaskLibMutation = useMutation({
    mutationFn: deleteTaskLibraryItem,
    onSuccess: (_, deletedTaskId) => {
      queryClient.invalidateQueries({ queryKey: ['task-library'] });
      handleCloseDeleteTaskLibModal();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Task library item deleted.',
        position: 'bottom',
      });
    },
    onError: (error: Error) => {
      handleCloseDeleteTaskLibModal();
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
        text2: error.message || 'Could not delete task.',
        position: 'bottom',
      });
    },
  });

  const deleteAssignedTaskMutation = useMutation({
    mutationFn: deleteAssignedTask,
    onSuccess: (_, deletedAssignmentId) => {
      console.log(`Assigned task ${deletedAssignmentId} removed successfully.`);
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      closeDeleteAssignedTaskConfirmModal();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Assigned task removed.',
        position: 'bottom',
      });
    },
    onError: (error: Error) => {
      closeDeleteAssignedTaskConfirmModal();
      Toast.show({
        type: 'error',
        text1: 'Removal Failed',
        text2: error.message || 'Could not remove assigned task.',
        position: 'bottom',
      });
    },
  });

  const handleCloseEditInfoModal = () => setIsEditInfoModalVisible(false);

  const handleViewManageUser = (userId: string, role: UserRole) => {
    setViewingUserId(userId);
    setViewingUserRole(role);
    setAdminTaskInitialFilters(null);
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
      Toast.show({
        type: 'error',
        text1: 'Setup Error',
        text2: 'Verification modal handler missing.',
        position: 'bottom',
      });
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
  const handleInitiateDeleteTaskLib = (task: TaskLibraryItem) => {
    setTaskLibToDelete(task);
    setIsDeleteTaskLibModalVisible(true);
  };
  const handleCloseDeleteTaskLibModal = () => {
    setIsDeleteTaskLibModalVisible(false);
    setTaskLibToDelete(null);
    deleteTaskLibMutation.reset();
  };
  const handleConfirmDeleteTaskLib = () => {
    if (taskLibToDelete && !deleteTaskLibMutation.isPending) {
      deleteTaskLibMutation.mutate(taskLibToDelete.id);
    }
  };

  const handleInitiateDeleteAssignedTask = (task: AssignedTask) => {
    setAssignedTaskToDelete(task);
    setIsDeleteAssignedTaskConfirmVisible(true);
  };

  const handleConfirmDeleteAssignedTaskAction = () => {
    if (assignedTaskToDelete && !deleteAssignedTaskMutation.isPending) {
      deleteAssignedTaskMutation.mutate(assignedTaskToDelete.id);
    }
  };

  const closeDeleteAssignedTaskConfirmModal = () => {
    setIsDeleteAssignedTaskConfirmVisible(false);
    setAssignedTaskToDelete(null);
    deleteAssignedTaskMutation.reset();
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
    setAdminTaskInitialFilters(null);
  };

  const handleViewVerifications = (pending: boolean) => {
    if (pending) {
      setAdminTaskInitialFilters({ assignment: 'pending', student: 'active' });
    } else {
      setAdminTaskInitialFilters(null);
    }
    setViewingSection('tasks-full');
  };

  const isLoadingCoreData = adminLoading || instrumentsLoading;
  if (isLoadingCoreData) {
    return (
      <SafeAreaView style={commonSharedStyles.flex1}>
        <View style={commonSharedStyles.baseCentered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={commonSharedStyles.baseSecondaryText}>Loading Admin Data...</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!adminUser || adminError) {
    return (
      <SafeAreaView style={commonSharedStyles.flex1}>
        <View style={commonSharedStyles.baseCentered}>
          <Text style={commonSharedStyles.errorText}>
            Error loading Admin user data: {adminErrorMsg?.message || 'Not found.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  if (adminUser.role !== 'admin') {
    return (
      <SafeAreaView style={commonSharedStyles.flex1}>
        <View style={commonSharedStyles.baseCentered}>
          <Text style={commonSharedStyles.errorText}>Error: User is not an Admin.</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (adminUser.status !== 'active') {
    return (
      <SafeAreaView style={commonSharedStyles.flex1}>
        <View style={commonSharedStyles.baseCentered}>
          <Text style={commonSharedStyles.baseHeaderText}>Account Inactive</Text>
          <Text style={commonSharedStyles.baseSubTitleText}>
            Your admin account is currently inactive.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderMainContent = () => {
    if (viewingUserId && viewingUserRole) {
      if (detailUserLoading) {
        return (
          <View style={commonSharedStyles.baseCentered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={commonSharedStyles.baseSecondaryText}>Loading User Details...</Text>
          </View>
        );
      }
      if (!detailUserData) {
        return (
          <View style={commonSharedStyles.flex1}>
            <Text style={commonSharedStyles.errorText}>
              Failed to load details for user ID: {viewingUserId}. User might have been deleted.
            </Text>
            <Button
              title="Back to List"
              onPress={handleBackFromDetailView}
              color={colors.primary}
            />
          </View>
        );
      }

      switch (viewingUserRole) {
        case 'student':
          return (
            <StudentDetailView
              viewingStudentId={viewingUserId}
              onInitiateVerification={handleInternalInitiateVerificationModal}
              onInitiateAssignTaskForStudent={handleInitiateAssignTaskForStudent}
              onInitiateEditStudent={handleInitiateEditUser}
              onInitiateStatusUser={handleInitiateStatusUser}
              onInitiateTicketAdjustment={handleInitiateTicketAdjustment}
              onInitiateRedemption={handleInitiateRedemption}
              onInitiatePinGeneration={handleInitiatePinGeneration}
              onInitiateDeleteTask={handleInitiateDeleteAssignedTask}
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
              onInitiatePinGeneration={handleInitiatePinGeneration}
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
          <View
            style={[
              commonSharedStyles.baseColumn,
              commonSharedStyles.baseGap,
              commonSharedStyles.baseSelfAlignStretch,
            ]}
          >
            <AdminDashboardSection
              onViewVerifications={handleViewVerifications}
              setActiveTab={setActiveUserTab}
              setViewingSection={setViewingSection}
              onInitiateCreateUser={handleInitiateCreateUser}
            />
            <View style={[commonSharedStyles.baseColumn, commonSharedStyles.baseGap]}>
              <Text
                style={[
                  commonSharedStyles.baseSubTitleText,
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
                <Button
                  title="Announcements"
                  onPress={() => {
                    setViewingSection('announcements');
                    setAdminTaskInitialFilters(null);
                  }}
                  color={colors.primary}
                />
                <Button
                  title="Instruments"
                  onPress={() => {
                    setViewingSection('instruments');
                    setAdminTaskInitialFilters(null);
                  }}
                  color={colors.primary}
                />
                <Button
                  title="Rewards"
                  onPress={() => {
                    setViewingSection('rewards');
                    setAdminTaskInitialFilters(null);
                  }}
                  color={colors.primary}
                />
              </View>
            </View>
          </View>
        );

      case 'users':
        return (
          <AdminUsersSection
            activeTab={activeUserTab}
            instruments={fetchedInstruments}
            onViewManageUser={handleViewManageUser}
            onInitiateAssignTaskForStudent={handleInitiateAssignTaskForStudent}
          />
        );
      case 'tasks':
        return (
          <AdminTasksSection
            onInitiateAssignTask={handleInitiateAssignTaskGeneral}
            onInitiateCreateTask={handleInitiateCreateTask}
            onInitiateEditTask={handleInitiateEditTask}
            onInitiateDeleteTask={handleInitiateDeleteTaskLib}
            onViewVerifications={handleViewVerifications}
            deleteTaskMutationPending={deleteTaskLibMutation.isPending}
          />
        );
      case 'tasks-full':
        return (
          <View style={commonSharedStyles.baseMargin}>
            <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifyCenter]}>
              <Text
                style={[
                  commonSharedStyles.baseTitleText,
                  commonSharedStyles.baseMarginTopBottom,
                  commonSharedStyles.bold,
                ]}
              >
                Assigned Tasks
              </Text>
            </View>
            <PaginatedTasksList
              key={JSON.stringify(adminTaskInitialFilters)}
              viewingRole="admin"
              initialAssignmentFilter={adminTaskInitialFilters?.assignment ?? 'all'}
              initialStudentStatusFilter={adminTaskInitialFilters?.student ?? 'all'}
              onInitiateVerification={handleInternalInitiateVerificationModal}
              onInitiateDelete={handleInitiateDeleteAssignedTask}
            />
          </View>
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
    <SafeAreaView style={commonSharedStyles.flex1}>
      <View
        style={[
          commonSharedStyles.baseRow,
          commonSharedStyles.baseAlignCenter,
          commonSharedStyles.justifySpaceBetween,
          commonSharedStyles.baseMargin,
        ]}
      >
        <SharedHeader
          onSetLoginPress={() => setIsSetCredentialsModalVisible(true)}
          onEditInfoPress={() => setIsEditInfoModalVisible(true)}
        />
      </View>

      {!viewingUserId ? (
        <ScrollView style={commonSharedStyles.flex1}>
          <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseMargin]}>
            <Button
              title="Dashboard"
              onPress={() => {
                setViewingSection('dashboard');
                setAdminTaskInitialFilters(null);
              }}
              color={colors.primary}
              disabled={viewingSection === 'dashboard'}
            />
          </View>
          {renderMainContent()}
        </ScrollView>
      ) : (
        <>
          {showBackButton && (
            <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseMargin]}>
              <Button title="← Back" onPress={handleBackFromDetailView} color={colors.primary} />
            </View>
          )}
          <View style={commonSharedStyles.flex1}>{renderMainContent()}</View>
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
        visible={isDeleteTaskLibModalVisible}
        title="Confirm Delete Task"
        message={`Delete library task "${taskLibToDelete?.title || ''}"? This cannot be undone.`}
        confirmText={deleteTaskLibMutation.isPending ? 'Deleting...' : 'Delete Task'}
        onConfirm={handleConfirmDeleteTaskLib}
        onCancel={handleCloseDeleteTaskLibModal}
        confirmDisabled={deleteTaskLibMutation.isPending}
      />
      <ConfirmationModal
        visible={isDeleteAssignedTaskConfirmVisible}
        title="Confirm Remove Task"
        message={`Are you sure you want to remove the assigned task "${assignedTaskToDelete?.taskTitle || 'selected task'}"? This cannot be undone.`}
        confirmText={deleteAssignedTaskMutation.isPending ? 'Removing...' : 'Remove Task'}
        onConfirm={handleConfirmDeleteAssignedTaskAction}
        onCancel={closeDeleteAssignedTaskConfirmModal}
        confirmDisabled={deleteAssignedTaskMutation.isPending}
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
          redeemerId={adminUserId}
        />
      )}
      <EditMyInfoModal visible={isEditInfoModalVisible} onClose={handleCloseEditInfoModal} />
      <SetEmailPasswordModal
        visible={isSetCredentialsModalVisible}
        onClose={handleCloseSetCredentialsModal}
      />
    </SafeAreaView>
  );
};
