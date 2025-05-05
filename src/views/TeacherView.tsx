// src/views/TeacherView.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { View, Text, ScrollView, Button, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { deleteAssignedTask } from '../api/assignedTasks';
import { fetchUserProfile } from '../api/users';
import { deleteTaskLibraryItem } from '../api/taskLibrary'; // Import Task Library API
import { fetchInstruments } from '../api/instruments';

import { TeacherDashboardSection } from '../components/teacher/TeacherDashboardSection';
import { TeacherStudentsSection } from '../components/teacher/TeacherStudentsSection';
import { TeacherTasksSection } from '../components/teacher/TeacherTasksSection';
import { StudentDetailView } from '../components/common/StudentDetailView';
import SetEmailPasswordModal from '../components/common/SetEmailPasswordModal';
import AssignTaskModal from '../components/common/AssignTaskModal';
import EditUserModal from '../components/common/EditUserModal';
import GeneratePinModal from '../components/common/GeneratePinModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { PaginatedTasksList } from '../components/common/PaginatedTasksList';
import { SharedHeader } from '../components/common/SharedHeader';
import CreateTaskLibraryModal from '../components/admin/modals/CreateTaskLibraryModal';
import EditTaskLibraryModal from '../components/admin/modals/EditTaskLibraryModal'; // Import Edit modal

import { useAuth } from '../contexts/AuthContext';
import { TeacherSection, TeacherViewProps } from '../types/componentProps';
import { AssignedTask, Instrument, User, TaskLibraryItem } from '../types/dataTypes'; // Import TaskLibraryItem

import { commonSharedStyles } from '../styles/commonSharedStyles';
import { colors } from '../styles/colors';
import EditMyInfoModal from '../components/common/EditMyInfoModal';

export const TeacherView: React.FC<TeacherViewProps> = ({ onInitiateVerificationModal }) => {
  const { currentUserId: teacherId } = useAuth();
  const queryClient = useQueryClient();

  const [viewingSection, setViewingSection] = useState<TeacherSection>('dashboard');
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [isAssignTaskModalVisible, setIsAssignTaskModalVisible] = useState(false);
  const [assignTaskTargetStudentId, setAssignTaskTargetStudentId] = useState<string | null>(null);
  const [isEditStudentModalVisible, setIsEditStudentModalVisible] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<User | null>(null);
  const [isEditInfoModalVisible, setIsEditInfoModalVisible] = useState(false);
  const [isSetCredentialsModalVisible, setIsSetCredentialsModalVisible] = useState(false);
  const [isGeneratePinModalVisible, setIsGeneratePinModalVisible] = useState(false);
  const [userForPin, setUserForPin] = useState<User | null>(null);
  const [isDeleteAssignedTaskConfirmVisible, setIsDeleteAssignedTaskConfirmVisible] =
    useState(false);
  const [assignedTaskToDelete, setAssignedTaskToDelete] = useState<AssignedTask | null>(null);
  const [isCreateTaskModalVisible, setIsCreateTaskModalVisible] = useState(false);
  const [isEditTaskLibModalVisible, setIsEditTaskLibModalVisible] = useState(false);
  const [taskLibToEdit, setTaskLibToEdit] = useState<TaskLibraryItem | null>(null);
  const [isDeleteTaskLibConfirmVisible, setIsDeleteTaskLibConfirmVisible] = useState(false);
  const [taskLibToDelete, setTaskLibToDelete] = useState<TaskLibraryItem | null>(null);

  // --- Queries ---
  const {
    data: teacherUser,
    isLoading: teacherLoading,
    isError: teacherError,
    error: teacherErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', teacherId],
    queryFn: () => (teacherId ? fetchUserProfile(teacherId) : Promise.resolve(null)),
    enabled: !!teacherId,
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
    data: studentDetailUser,
    isLoading: studentDetailLoading,
    isError: studentDetailError,
    error: studentDetailErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', viewingStudentId],
    queryFn: () => {
      if (!viewingStudentId) return Promise.resolve(null);
      return fetchUserProfile(viewingStudentId);
    },
    enabled: !!viewingStudentId,
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // --- Mutations ---
  const deleteAssignedTaskMutation = useMutation({
    mutationFn: deleteAssignedTask,
    onSuccess: (_, deletedAssignmentId) => {
      console.log(`Teacher removed assigned task ${deletedAssignmentId} successfully.`);
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

  const deleteTaskLibMutation = useMutation({
    mutationFn: deleteTaskLibraryItem,
    onSuccess: (_, deletedTaskId) => {
      console.log(`Teacher deleted task library item ${deletedTaskId} successfully.`);
      queryClient.invalidateQueries({ queryKey: ['task-library'] });
      closeDeleteTaskLibConfirmModal();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Task library item deleted.',
        position: 'bottom',
      });
    },
    onError: (error: Error) => {
      closeDeleteTaskLibConfirmModal();
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
        text2: error.message || 'Could not delete task library item.',
        position: 'bottom',
      });
    },
  });

  // --- Handlers ---
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

  const handleViewProfile = (studentId: string) => setViewingStudentId(studentId);
  const handleBackFromProfile = () => setViewingStudentId(null);
  const handleViewAllTasks = () => setViewingSection('tasks-full');

  const handleCloseEditInfoModal = () => setIsEditInfoModalVisible(false);

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

  const handleInternalInitiateVerification = (task: AssignedTask) => {
    if (onInitiateVerificationModal) {
      onInitiateVerificationModal(task);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Verification handler not configured.',
        position: 'bottom',
      });
    }
  };

  const handleInitiateEditUser = (user: User) => {
    if (user.role === 'student') {
      setStudentToEdit(user);
      setIsEditStudentModalVisible(true);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Invalid Action',
        text2: 'Cannot edit non-student users here.',
        position: 'bottom',
      });
    }
  };
  const handleCloseEditUserModal = () => {
    setIsEditStudentModalVisible(false);
    setStudentToEdit(null);
  };

  const handleInitiatePinGeneration = (user: User | null) => {
    if (user) {
      setUserForPin(user);
      setIsGeneratePinModalVisible(true);
    } else {
      Toast.show({
        type: 'info',
        text1: 'Info',
        text2: 'Loading student data...',
        position: 'bottom',
      });
    }
  };
  const handleClosePinGeneration = () => {
    setIsGeneratePinModalVisible(false);
    setUserForPin(null);
  };

  const handleInitiateCreateTask = () => setIsCreateTaskModalVisible(true);
  const handleCloseCreateTaskModal = () => setIsCreateTaskModalVisible(false);

  const handleInitiateEditTaskLib = (task: TaskLibraryItem) => {
    setTaskLibToEdit(task);
    setIsEditTaskLibModalVisible(true);
  };
  const handleCloseEditTaskLibModal = () => {
    setIsEditTaskLibModalVisible(false);
    setTaskLibToEdit(null);
  };

  const handleInitiateDeleteTaskLib = (task: TaskLibraryItem) => {
    setTaskLibToDelete(task);
    setIsDeleteTaskLibConfirmVisible(true);
  };
  const handleConfirmDeleteTaskLibAction = () => {
    if (taskLibToDelete && !deleteTaskLibMutation.isPending) {
      deleteTaskLibMutation.mutate(taskLibToDelete.id);
    }
  };
  const closeDeleteTaskLibConfirmModal = () => {
    setIsDeleteTaskLibConfirmVisible(false);
    setTaskLibToDelete(null);
    deleteTaskLibMutation.reset();
  };

  // --- Loading / Error States ---
  const isLoadingCore = teacherLoading || instrumentsLoading;

  if (isLoadingCore) {
    return (
      <SafeAreaView style={commonSharedStyles.flex1}>
        <View style={commonSharedStyles.baseCentered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={commonSharedStyles.baseSecondaryText}>Loading Teacher Data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (teacherError || !teacherUser) {
    return (
      <SafeAreaView style={commonSharedStyles.flex1}>
        <View style={commonSharedStyles.baseCentered}>
          <Text style={commonSharedStyles.errorText}>
            Error loading teacher data: {teacherErrorMsg?.message || 'Not found.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  if (teacherUser.role !== 'teacher') {
    return (
      <SafeAreaView style={commonSharedStyles.flex1}>
        <View style={commonSharedStyles.baseCentered}>
          <Text style={commonSharedStyles.errorText}>Error: Logged in user is not a teacher.</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (teacherUser.status === 'inactive') {
    return (
      <SafeAreaView style={commonSharedStyles.flex1}>
        <View style={commonSharedStyles.baseCentered}>
          <Text style={commonSharedStyles.baseHeaderText}>Account Inactive</Text>
          <Text style={commonSharedStyles.baseSubTitleText}>
            Your teacher account is currently inactive.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderMainContent = () => {
    if (viewingStudentId) {
      if (studentDetailLoading) {
        return (
          <View style={commonSharedStyles.baseCentered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={commonSharedStyles.baseSecondaryText}>Loading Student Details...</Text>
          </View>
        );
      }
      if (studentDetailError || !studentDetailUser) {
        return (
          <View style={commonSharedStyles.baseCentered}>
            <Text style={commonSharedStyles.errorText}>
              Error loading student details:{' '}
              {studentDetailErrorMsg?.message || 'Student not found or error occurred.'}
            </Text>
            <Button title="Back to My Students" onPress={handleBackFromProfile} />
          </View>
        );
      }
      return (
        <>
          <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseMargin]}>
            <Button title="← Back" onPress={handleBackFromProfile} />
          </View>
          <StudentDetailView
            viewingStudentId={viewingStudentId}
            onInitiateVerification={handleInternalInitiateVerification}
            onInitiateAssignTaskForStudent={handleInitiateAssignTaskForStudent}
            onInitiateEditStudent={handleInitiateEditUser}
            onInitiatePinGeneration={() => handleInitiatePinGeneration(studentDetailUser)}
            onInitiateDeleteTask={handleInitiateDeleteAssignedTask}
          />
        </>
      );
    }

    return (
      <ScrollView style={commonSharedStyles.flex1}>
        <View
          style={[
            commonSharedStyles.baseRow,
            commonSharedStyles.baseMargin,
            commonSharedStyles.baseGap,
          ]}
        >
          <Button
            title="Dashboard"
            onPress={() => setViewingSection('dashboard')}
            disabled={viewingSection === 'dashboard'}
          />
        </View>

        {viewingSection === 'dashboard' && (
          <TeacherDashboardSection
            onInitiateVerificationModal={handleInternalInitiateVerification}
            setViewingSection={setViewingSection}
          />
        )}
        {viewingSection === 'students' && (
          <TeacherStudentsSection
            instruments={fetchedInstruments}
            onViewProfile={handleViewProfile}
            onAssignTask={handleInitiateAssignTaskForStudent}
          />
        )}
        {viewingSection === 'tasks' && (
          <TeacherTasksSection
            onInitiateAssignTaskGeneral={handleInitiateAssignTaskGeneral}
            onViewAllTasks={handleViewAllTasks}
            onInitiateCreateTask={handleInitiateCreateTask}
            onInitiateEditTask={handleInitiateEditTaskLib}
            onInitiateDeleteTask={handleInitiateDeleteTaskLib}
            deleteTaskMutationPending={deleteTaskLibMutation.isPending}
          />
        )}
        {viewingSection === 'tasks-full' && (
          <View style={commonSharedStyles.baseMargin}>
            <Text
              style={[commonSharedStyles.baseTitleText, commonSharedStyles.baseMarginTopBottom]}
            >
              Assigned Tasks (My Students)
            </Text>
            <PaginatedTasksList
              key={`teacher-tasks-${teacherId}`}
              viewingRole="teacher"
              teacherId={teacherId}
              initialAssignmentFilter="all"
              initialStudentStatusFilter="active"
              onInitiateVerification={handleInternalInitiateVerification}
              onInitiateDelete={handleInitiateDeleteAssignedTask}
            />
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[commonSharedStyles.flex1]}>
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

      {renderMainContent()}

      <EditMyInfoModal visible={isEditInfoModalVisible} onClose={handleCloseEditInfoModal} />
      <SetEmailPasswordModal
        visible={isSetCredentialsModalVisible}
        onClose={() => setIsSetCredentialsModalVisible(false)}
      />
      <AssignTaskModal
        visible={isAssignTaskModalVisible}
        onClose={handleAssignTaskModalClose}
        preselectedStudentId={assignTaskTargetStudentId}
      />
      <EditUserModal
        visible={isEditStudentModalVisible}
        userToEdit={studentToEdit}
        onClose={handleCloseEditUserModal}
      />
      <GeneratePinModal
        visible={isGeneratePinModalVisible}
        user={userForPin}
        onClose={handleClosePinGeneration}
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
      <CreateTaskLibraryModal
        visible={isCreateTaskModalVisible}
        onClose={handleCloseCreateTaskModal}
      />
      <EditTaskLibraryModal
        visible={isEditTaskLibModalVisible}
        taskToEdit={taskLibToEdit}
        onClose={handleCloseEditTaskLibModal}
      />
      <ConfirmationModal
        visible={isDeleteTaskLibConfirmVisible}
        title="Confirm Delete Library Task"
        message={`Are you sure you want to delete the library task "${taskLibToDelete?.title || ''}"? This cannot be undone.`}
        confirmText={deleteTaskLibMutation.isPending ? 'Deleting...' : 'Delete Task'}
        onConfirm={handleConfirmDeleteTaskLibAction}
        onCancel={closeDeleteTaskLibConfirmModal}
        confirmDisabled={deleteTaskLibMutation.isPending}
      />
    </SafeAreaView>
  );
};
