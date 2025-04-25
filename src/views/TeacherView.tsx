import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { View, Text, ScrollView, Button, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchInstruments } from '../api/instruments';

import { TeacherDashboardSection } from '../components/teacher/TeacherDashboardSection';
import { TeacherStudentsSection } from '../components/teacher/TeacherStudentsSection';
import { TeacherTasksSection } from '../components/teacher/TeacherTasksSection';
import { AdminStudentDetailView } from '../components/admin/AdminStudentDetailView';

import AssignTaskModal from '../components/common/AssignTaskModal';
import TaskVerificationModal from '../components/common/TaskVerificationModal';
import EditUserModal from '../components/common/EditUserModal';

import { useAuth } from '../contexts/AuthContext';

import { AssignedTask } from '../mocks/mockAssignedTasks';
import { Instrument } from '../mocks/mockInstruments';
import { TeacherViewProps } from '../types/componentProps';
import { User } from '../types/userTypes';

import { getUserDisplayName } from '../utils/helpers';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';
import Toast from 'react-native-toast-message';

type TeacherSection = 'dashboard' | 'students' | 'tasks';

export const TeacherView: React.FC<TeacherViewProps> = () => {
  const { currentUserId } = useAuth();
  const queryClient = useQueryClient();

  const [viewingSection, setViewingSection] = useState<TeacherSection>('dashboard');
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [isAssignTaskModalVisible, setIsAssignTaskModalVisible] = useState(false);
  const [assignTaskTargetStudentId, setAssignTaskTargetStudentId] = useState<string | null>(null);
  const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
  const [taskToVerify, setTaskToVerify] = useState<AssignedTask | null>(null);
  const [isEditStudentModalVisible, setIsEditStudentModalVisible] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<User | null>(null);

  const {
    data: teacherUser,
    isLoading: teacherLoading,
    isError: teacherError,
  } = useQuery<User, Error>({
    queryKey: ['user', currentUserId, { role: 'teacher' }],
    queryFn: async () => {
      if (!currentUserId) throw new Error('No logged in teacher');
      const response = await fetch(`/api/users/${currentUserId}`);
      if (!response.ok) throw new Error(`Teacher not found`);
      const userData = await response.json();
      if (userData.role !== 'teacher') throw new Error('User is not a teacher');
      return userData;
    },
    enabled: !!currentUserId,
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

  const handleViewProfile = (studentId: string) => {
    setViewingStudentId(studentId);
  };

  const handleBackFromProfile = () => {
    setViewingStudentId(null);
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

  const handleInitiateVerification = (task: AssignedTask) => {
    setTaskToVerify(task);
    setIsVerificationModalVisible(true);
  };
  const handleCloseVerificationModal = () => {
    setIsVerificationModalVisible(false);
    setTaskToVerify(null);
  };

  const handleInitiateEditUser = (user: User) => {
    if (user.role === 'student') {
      setStudentToEdit(user);
      setIsEditStudentModalVisible(true);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Teachers can only edit student info via this flow.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    }
  };
  const handleCloseEditUserModal = () => {
    setIsEditStudentModalVisible(false);
    setStudentToEdit(null);
  };

  const isLoading = teacherLoading || instrumentsLoading;
  if (isLoading) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={[appSharedStyles.container, styles.centered]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!teacherUser || teacherError) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text style={appSharedStyles.textDanger}>Error loading Teacher data.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderMainContent = () => {
    if (viewingStudentId) {
      return (
        <AdminStudentDetailView
          viewingStudentId={viewingStudentId}
          onInitiateVerification={handleInitiateVerification}
          onInitiateAssignTaskForStudent={handleInitiateAssignTaskForStudent}
          onInitiateEditStudent={handleInitiateEditUser}
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
        </View>

        {viewingSection === 'dashboard' && (
          <TeacherDashboardSection onInitiateVerificationModal={handleInitiateVerification} />
        )}
        {viewingSection === 'students' && (
          <TeacherStudentsSection
            mockInstruments={fetchedInstruments}
            onViewProfile={handleViewProfile}
            onAssignTask={handleInitiateAssignTaskForStudent}
          />
        )}
        {viewingSection === 'tasks' && (
          <TeacherTasksSection onInitiateAssignTaskGeneral={handleInitiateAssignTaskGeneral} />
        )}
      </ScrollView>
    );
  };

  const getHeaderTitle = () => {
    if (viewingStudentId) {
      const student = queryClient.getQueryData<User>(['user', viewingStudentId]);
      return student ? getUserDisplayName(student) : `Student: ${viewingStudentId}`;
    }
    return `Teacher: ${getUserDisplayName(teacherUser)}`;
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

      <AssignTaskModal
        visible={isAssignTaskModalVisible}
        onClose={handleAssignTaskModalClose}
        preselectedStudentId={assignTaskTargetStudentId}
      />
      <TaskVerificationModal
        visible={isVerificationModalVisible}
        task={taskToVerify}
        onClose={handleCloseVerificationModal}
      />
      <EditUserModal
        visible={isEditStudentModalVisible}
        userToEdit={studentToEdit}
        onClose={handleCloseEditUserModal}
        mockInstruments={fetchedInstruments}
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
});
