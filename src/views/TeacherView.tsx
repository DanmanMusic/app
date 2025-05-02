// src/views/TeacherView.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { View, Text, ScrollView, Button, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { fetchUserProfile } from '../api/users';

import { TeacherDashboardSection } from '../components/teacher/TeacherDashboardSection';
import { TeacherStudentsSection } from '../components/teacher/TeacherStudentsSection';
import { TeacherTasksSection } from '../components/teacher/TeacherTasksSection';
import { AdminStudentDetailView } from '../components/common/StudentDetailView';
import SetEmailPasswordModal from '../components/common/SetEmailPasswordModal';
import AssignTaskModal from '../components/common/AssignTaskModal';
import EditUserModal from '../components/common/EditUserModal';
import GeneratePinModal from '../components/common/GeneratePinModal';

import { useAuth } from '../contexts/AuthContext';
import { TeacherSection, TeacherViewProps } from '../types/componentProps';
import { AssignedTask, Instrument, User } from '../types/dataTypes';

import { commonSharedStyles } from '../styles/commonSharedStyles';
import { colors } from '../styles/colors';
import { fetchInstruments } from '../api/instruments';
import { SharedHeader } from '../components/common/SharedHeader';

export const TeacherView: React.FC<TeacherViewProps> = ({ onInitiateVerificationModal }) => {
  const { currentUserId: teacherId } = useAuth();

  const [viewingSection, setViewingSection] = useState<TeacherSection>('dashboard');
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [isAssignTaskModalVisible, setIsAssignTaskModalVisible] = useState(false);
  const [assignTaskTargetStudentId, setAssignTaskTargetStudentId] = useState<string | null>(null);
  const [isEditStudentModalVisible, setIsEditStudentModalVisible] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<User | null>(null);
  const [isSetCredentialsModalVisible, setIsSetCredentialsModalVisible] = useState(false);
  const [isGeneratePinModalVisible, setIsGeneratePinModalVisible] = useState(false);
  const [userForPin, setUserForPin] = useState<User | null>(null);

  const {
    data: teacherUser,
    isLoading: teacherLoading,
    isError: teacherError,
    error: teacherErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', teacherId],
    queryFn: () => (teacherId ? fetchUserProfile(teacherId) : Promise.resolve(null)), // Fetch only if teacherId exists
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
          <AdminStudentDetailView
            viewingStudentId={viewingStudentId}
            onInitiateVerification={handleInternalInitiateVerification}
            onInitiateAssignTaskForStudent={handleInitiateAssignTaskForStudent}
            onInitiateEditStudent={handleInitiateEditUser}
            onInitiatePinGeneration={
              studentDetailUser ? () => handleInitiatePinGeneration(studentDetailUser) : undefined
            }
          />
        </>
      );
    }

    return (
      <ScrollView style={commonSharedStyles.flex1}>
        {!viewingStudentId && (
          <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseMargin]}>
            <Button
              title="Dashboard"
              onPress={() => setViewingSection('dashboard')}
              disabled={viewingSection === 'dashboard'}
            />
          </View>
        )}
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
          <TeacherTasksSection onInitiateAssignTaskGeneral={handleInitiateAssignTaskGeneral} />
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
    </SafeAreaView>
  );
};
