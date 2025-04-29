import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { View, Text, ScrollView, Button, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { fetchInstruments } from '../api/instruments';
import { fetchUserProfile } from '../api/users';

import { TeacherDashboardSection } from '../components/teacher/TeacherDashboardSection';
import { TeacherStudentsSection } from '../components/teacher/TeacherStudentsSection';
import { TeacherTasksSection } from '../components/teacher/TeacherTasksSection';

import { AdminStudentDetailView } from '../components/admin/AdminStudentDetailView';

import SetEmailPasswordModal from '../components/common/SetEmailPasswordModal';
import AssignTaskModal from '../components/common/AssignTaskModal';

import EditUserModal from '../components/common/EditUserModal';
import GeneratePinModal from '../components/common/GeneratePinModal';

import { useAuth } from '../contexts/AuthContext';
import { TeacherViewProps } from '../types/componentProps';
import { AssignedTask, Instrument, User } from '../types/dataTypes';

import { getUserDisplayName } from '../utils/helpers';
import { appSharedStyles } from '../styles/appSharedStyles';
import { commonSharedStyles } from '../styles/commonSharedStyles';
import { colors } from '../styles/colors';

type TeacherSection = 'dashboard' | 'students' | 'tasks';

export const TeacherView: React.FC<TeacherViewProps> = ({ onInitiateVerificationModal }) => {
  const { currentUserId: teacherId } = useAuth();
  const queryClient = useQueryClient();

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
    queryFn: () => fetchUserProfile(teacherId!),
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

  const teacherDisplayName = useMemo(
    () => (teacherUser ? getUserDisplayName(teacherUser) : 'Loading...'),
    [teacherUser]
  );

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

  const handleInitiatePinGeneration = (user: User) => {
    setUserForPin(user);
    setIsGeneratePinModalVisible(true);
  };
  const handleClosePinGeneration = () => {
    setIsGeneratePinModalVisible(false);
    setUserForPin(null);
  };

  const isLoading = teacherLoading || instrumentsLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Teacher Data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (teacherError || !teacherUser) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text style={commonSharedStyles.errorText}>
            Error loading teacher data: {teacherErrorMsg?.message || 'Not found.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  if (teacherUser.role !== 'teacher') {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text style={commonSharedStyles.errorText}>Error: Logged in user is not a teacher.</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (teacherUser.status === 'inactive') {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text style={appSharedStyles.header}>Account Inactive</Text>
          <Text style={commonSharedStyles.textCenter}>
            Your teacher account is currently inactive.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderMainContent = () => {
    if (viewingStudentId) {
      const { data: studentDetailUser } = useQuery<User | null, Error>({
        queryKey: ['userProfile', viewingStudentId],
        enabled: !!viewingStudentId && isGeneratePinModalVisible,
        staleTime: 5 * 60 * 1000,
      });
      return (
        <AdminStudentDetailView
          viewingStudentId={viewingStudentId}
          onInitiateVerification={handleInternalInitiateVerification}
          onInitiateAssignTaskForStudent={handleInitiateAssignTaskForStudent}
          onInitiateEditStudent={handleInitiateEditUser}
          onInitiatePinGeneration={studentDetailUser ? handleInitiatePinGeneration : undefined}
        />
      );
    }

    return (
      <ScrollView style={appSharedStyles.container}>
        <View style={appSharedStyles.teacherNav}>
          <Button
            title="Dashboard"
            onPress={() => setViewingSection('dashboard')}
            color={viewingSection === 'dashboard' ? colors.primary : colors.secondary}
          />
          <Button
            title="My Students"
            onPress={() => setViewingSection('students')}
            color={viewingSection === 'students' ? colors.primary : colors.secondary}
          />
          <Button
            title="Tasks"
            onPress={() => setViewingSection('tasks')}
            color={viewingSection === 'tasks' ? colors.primary : colors.secondary}
          />
          <Button
            title="Set Email/Password"
            onPress={() => setIsSetCredentialsModalVisible(true)}
            color={colors.info}
          />
        </View>

        {viewingSection === 'dashboard' && (
          <TeacherDashboardSection
            onInitiateVerificationModal={handleInternalInitiateVerification}
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

  const getHeaderTitle = () => {
    if (viewingStudentId) {
      return `Viewing Student`;
    }
    return `Teacher: ${teacherDisplayName}`;
  };

  const showBackButton = !!viewingStudentId;

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.headerContainer}>
        <View style={appSharedStyles.headerSideContainer}>
          {showBackButton ? (
            <Button title="← Back" onPress={handleBackFromProfile} />
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

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: colors.textSecondary,
  },
});
