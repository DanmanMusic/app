// src/views/TeacherView.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Added useMutation, useQueryClient
import { View, Text, ScrollView, Button, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// *** Import deleteAssignedTask ***
import { deleteAssignedTask } from '../api/assignedTasks';
import { fetchUserProfile } from '../api/users';

import { TeacherDashboardSection } from '../components/teacher/TeacherDashboardSection';
import { TeacherStudentsSection } from '../components/teacher/TeacherStudentsSection';
import { TeacherTasksSection } from '../components/teacher/TeacherTasksSection';
import { StudentDetailView } from '../components/common/StudentDetailView';
import SetEmailPasswordModal from '../components/common/SetEmailPasswordModal';
import AssignTaskModal from '../components/common/AssignTaskModal';
import EditUserModal from '../components/common/EditUserModal';
import GeneratePinModal from '../components/common/GeneratePinModal';
// *** Import ConfirmationModal and PaginatedTasksList ***
import ConfirmationModal from '../components/common/ConfirmationModal';
import { PaginatedTasksList } from '../components/common/PaginatedTasksList';
import { SharedHeader } from '../components/common/SharedHeader';

import { useAuth } from '../contexts/AuthContext';
// *** Update TeacherSection type ***
import { TeacherSection, TeacherViewProps } from '../types/componentProps';
// *** Import AssignedTask type ***
import { AssignedTask, Instrument, User } from '../types/dataTypes';

import { commonSharedStyles } from '../styles/commonSharedStyles';
import { colors } from '../styles/colors';
import { fetchInstruments } from '../api/instruments';

// *** Update TeacherSection type definition if not done in types file yet ***
// type TeacherSection = 'dashboard' | 'students' | 'tasks' | 'tasks-full';

export const TeacherView: React.FC<TeacherViewProps> = ({ onInitiateVerificationModal }) => {
  const { currentUserId: teacherId } = useAuth();
  const queryClient = useQueryClient(); // *** Add queryClient ***

  const [viewingSection, setViewingSection] = useState<TeacherSection>('dashboard');
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [isAssignTaskModalVisible, setIsAssignTaskModalVisible] = useState(false);
  const [assignTaskTargetStudentId, setAssignTaskTargetStudentId] = useState<string | null>(null);
  const [isEditStudentModalVisible, setIsEditStudentModalVisible] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<User | null>(null);
  const [isSetCredentialsModalVisible, setIsSetCredentialsModalVisible] = useState(false);
  const [isGeneratePinModalVisible, setIsGeneratePinModalVisible] = useState(false);
  const [userForPin, setUserForPin] = useState<User | null>(null);

  // *** State for Assigned Task Deletion ***
  const [isDeleteAssignedTaskConfirmVisible, setIsDeleteAssignedTaskConfirmVisible] =
    useState(false);
  const [assignedTaskToDelete, setAssignedTaskToDelete] = useState<AssignedTask | null>(null);

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

  const {
    data: fetchedInstruments = [],
    isLoading: instrumentsLoading,
    isError: instrumentsError,
    error: instrumentsErrorMsg,
  } = useQuery<Instrument[], Error>({
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
      if (!viewingStudentId) {
        console.warn('[TeacherView] studentDetailUser queryFn called without viewingStudentId.');
        return Promise.resolve(null);
      }
      console.log(`[TeacherView] Fetching profile for student: ${viewingStudentId}`);
      return fetchUserProfile(viewingStudentId);
    },
    enabled: !!viewingStudentId,
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // *** Mutation for Deleting Assigned Tasks ***
  const deleteAssignedTaskMutation = useMutation({
    mutationFn: deleteAssignedTask,
    onSuccess: (_, deletedAssignmentId) => {
      console.log(`Teacher removed assigned task ${deletedAssignmentId} successfully.`);
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] }); // Invalidate all task lists
      closeDeleteAssignedTaskConfirmModal();
      Toast.show({ type: 'success', text1: 'Success', text2: 'Assigned task removed.' });
    },
    onError: (error: Error) => {
      closeDeleteAssignedTaskConfirmModal();
      Toast.show({
        type: 'error',
        text1: 'Removal Failed',
        text2: error.message || 'Could not remove assigned task.',
      });
    },
  });

  // *** Handlers for Assigned Task Deletion ***
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

  // --- Other Handlers ---
  const handleViewProfile = (studentId: string) => setViewingStudentId(studentId);
  const handleBackFromProfile = () => setViewingStudentId(null);

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
      console.error('TeacherView: onInitiateVerificationModal prop is missing!');
      Toast.show({ type: 'error', text1: 'Error', text2: 'Verification handler not configured.' });
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
      console.warn('Attempted PIN generation before student detail loaded or for null user.');
      Toast.show({ type: 'info', text1: 'Info', text2: 'Loading student data...' });
    }
  };
  const handleClosePinGeneration = () => {
    setIsGeneratePinModalVisible(false);
    setUserForPin(null);
  };

  // *** Handler to switch to the full task view ***
  const handleViewAllTasks = () => {
    setViewingSection('tasks-full');
  };

  // --- Loading / Error States ---
  const isLoadingCore = teacherLoading || instrumentsLoading;

  if (isLoadingCore) {
    return (
      <SafeAreaView style={commonSharedStyles.flex1}>
        <View style={[commonSharedStyles.baseCentered]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={commonSharedStyles.baseSecondaryText}>Loading Teacher Data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (teacherError || !teacherUser) {
    // Error handling for teacher profile fetch
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
    // Role check
    return (
      <SafeAreaView style={commonSharedStyles.flex1}>
        <View style={commonSharedStyles.baseCentered}>
          <Text style={commonSharedStyles.errorText}>Error: Logged in user is not a teacher.</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (teacherUser.status === 'inactive') {
    // Status check
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
    // Viewing a specific student profile
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
          {/* Keep Back button */}
          <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseMargin]}>
            <Button title="← Back" onPress={handleBackFromProfile} />
          </View>
          <StudentDetailView
            viewingStudentId={viewingStudentId}
            onInitiateVerification={handleInternalInitiateVerification}
            onInitiateAssignTaskForStudent={handleInitiateAssignTaskForStudent}
            onInitiateEditStudent={handleInitiateEditUser}
            onInitiatePinGeneration={
              studentDetailUser ? () => handleInitiatePinGeneration(studentDetailUser) : undefined
            }
            // *** Pass delete handler ***
            onInitiateDeleteTask={handleInitiateDeleteAssignedTask}
          />
        </>
      );
    }

    // Main Teacher View (Not viewing specific student)
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
            setViewingSection={setViewingSection} // Pass setter if needed for navigation from dashboard
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
            onViewAllTasks={handleViewAllTasks} // Pass the handler
          />
        )}
        {/* *** Render Paginated Task List for 'tasks-full' section *** */}
        {viewingSection === 'tasks-full' && (
          <View style={commonSharedStyles.baseMargin}>
            <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifyCenter]}>
              <Text
                style={[
                  commonSharedStyles.baseTitleText,
                  commonSharedStyles.baseMarginTopBottom,
                  commonSharedStyles.bold,
                ]}
              >
                Assigned Tasks (My Students)
              </Text>
            </View>
            <PaginatedTasksList
              key={`teacher-tasks-${teacherId}`} // Add key for potential remount on teacher change (though unlikely here)
              viewingRole="teacher"
              teacherId={teacherId} // Filter by this teacher
              initialAssignmentFilter="all" // Or set different default
              initialStudentStatusFilter="active" // Or set different default
              onInitiateVerification={handleInternalInitiateVerification}
              onInitiateDelete={handleInitiateDeleteAssignedTask} // Pass delete handler
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
        <SharedHeader onSetLoginPress={() => setIsSetCredentialsModalVisible(true)} />
      </View>

      {renderMainContent()}

      {/* Modals */}
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
      {/* *** Add Assigned Task Deletion Modal *** */}
      <ConfirmationModal
        visible={isDeleteAssignedTaskConfirmVisible}
        title="Confirm Remove Task"
        message={`Are you sure you want to remove the assigned task "${assignedTaskToDelete?.taskTitle || 'selected task'}"? This cannot be undone.`}
        confirmText={deleteAssignedTaskMutation.isPending ? 'Removing...' : 'Remove Task'}
        onConfirm={handleConfirmDeleteAssignedTaskAction}
        onCancel={closeDeleteAssignedTaskConfirmModal}
        confirmDisabled={deleteAssignedTaskMutation.isPending}
      />
    </SafeAreaView>
  );
};
