import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { View, Text, ScrollView, Button, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchAssignedTasks, createAssignedTask, deleteAssignedTask } from '../api/assignedTasks';
import { fetchInstruments } from '../api/instruments';
import { fetchTaskLibrary } from '../api/taskLibrary';
import { fetchStudentBalance } from '../api/tickets';
import { fetchStudents } from '../api/users';
import { adminSharedStyles } from '../styles/adminSharedStyles';
import AssignTaskModal from '../components/common/AssignTaskModal';
import { useAuth } from '../contexts/AuthContext';
import { usePaginatedStudentHistory } from '../hooks/usePaginatedStudentHistory';
import { usePaginatedStudentTasks } from '../hooks/usePaginatedStudentTasks';
import { AssignedTask } from '../mocks/mockAssignedTasks';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';
import { TeacherViewProps } from '../types/componentProps';
import { SimplifiedStudent } from '../types/dataTypes';
import { User } from '../types/userTypes';
import { getUserDisplayName } from '../utils/helpers';
import { PendingVerificationItem } from '../components/common/PendingVerificationItem';
import { StudentListItem } from '../components/common/StudentListItem';
import { TaskLibraryItemTeacher } from '../components/common/TaskLibraryItemTeacher';
import { AdminStudentDetailView } from '../components/admin/AdminStudentDetailView';
import EditUserModal from '../components/common/EditUserModal';
import { Instrument } from '../mocks';

export const TeacherView: React.FC<TeacherViewProps> = ({ onInitiateVerificationModal }) => {
  const { currentUserId } = useAuth();
  const queryClient = useQueryClient();

  type TeacherSection = 'dashboard' | 'students' | 'tasks' | 'studentProfile';
  const [viewingSection, setViewingSection] = useState<TeacherSection>('dashboard');
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [isAssignTaskModalVisible, setIsAssignTaskModalVisible] = useState(false);
  const [assignTaskTargetStudentId, setAssignTaskTargetStudentId] = useState<string | null>(null);
  const [isEditStudentModalVisible, setIsEditStudentModalVisible] = useState(false);

  const { data: teacherUser, isLoading: teacherLoading } = useQuery<User, Error>({
    queryKey: ['user', currentUserId],
    queryFn: async () => {
      if (!currentUserId) throw new Error('No logged in user');
      const response = await fetch(`/api/users/${currentUserId}`);
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('API Error fetching teacher:', errorBody);
        throw new Error(`Teacher not found (status ${response.status})`);
      }
      const userData = await response.json();
      if (userData.role !== 'teacher') throw new Error('Logged in user is not a teacher');
      return userData;
    },
    enabled: !!currentUserId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allStudentsResult, isLoading: studentsLoading } = useQuery({
    queryKey: [
      'students',
      { filter: 'all', teacherId: currentUserId, context: 'teacherViewLookup' },
    ],
    queryFn: () => fetchStudents({ page: 1, filter: 'all', teacherId: currentUserId ?? undefined }),
    enabled: !!currentUserId,
    staleTime: 5 * 60 * 1000,
  });
  const allStudentsSimple: SimplifiedStudent[] = allStudentsResult?.students ?? [];

  const { data: allAssignedTasksResult, isLoading: assignedTasksLoading } = useQuery({
    queryKey: [
      'assigned-tasks',
      { assignmentStatus: 'pending', studentStatus: 'active', teacherId: currentUserId },
    ],
    queryFn: () =>
      fetchAssignedTasks({
        assignmentStatus: 'pending',
        studentStatus: 'active',
        teacherId: currentUserId ?? undefined,
      }),
    enabled: !!currentUserId,
    staleTime: 1 * 60 * 1000,
  });
  const assignedTasks: AssignedTask[] = allAssignedTasksResult?.items ?? [];

  const { data: taskLibrary = [], isLoading: libraryLoading } = useQuery({
    queryKey: ['task-library'],
    queryFn: fetchTaskLibrary,
    staleTime: 10 * 60 * 1000,
  });

  const { data: viewingStudentUser, isLoading: viewingStudentUserLoading } = useQuery<User, Error>({
    queryKey: ['user', viewingStudentId],
    queryFn: async () => {
      if (!viewingStudentId) throw new Error('No student ID to view');
      const response = await fetch(`/api/users/${viewingStudentId}`);
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('API Error fetching student:', errorBody);
        throw new Error(`Student not found (status ${response.status})`);
      }
      const userData = await response.json();
      return userData;
    },
    enabled: !!viewingStudentId && viewingSection === 'studentProfile',
    staleTime: 5 * 60 * 1000,
  });

  const { data: viewingStudentBalance = 0, isLoading: viewingStudentBalanceLoading } = useQuery({
    queryKey: ['balance', viewingStudentId],
    queryFn: () => fetchStudentBalance(viewingStudentId!),
    enabled: !!viewingStudentId && viewingSection === 'studentProfile',
    staleTime: 1 * 60 * 1000,
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
    tasks: paginatedTasks,
    currentPage: tasksCurrentPage,
    totalPages: tasksTotalPages,
    setPage: setTasksPage,
    isLoading: studentTasksLoading,
    isError: studentTasksError,
    error: studentTasksErrorObject,
    totalTasksCount,
  } = usePaginatedStudentTasks(viewingStudentId);

  const {
    history: paginatedHistory,
    isLoading: studentHistoryLoading,
    isError: studentHistoryError,
    totalItems: totalHistoryCount,
  } = usePaginatedStudentHistory(viewingStudentId);

  const assignTaskMutation = useMutation({
    mutationFn: createAssignedTask,
    onSuccess: createdAssignment => {
      console.log('Task assigned successfully via mutation:', createdAssignment);
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({
        queryKey: ['assigned-tasks', { studentId: createdAssignment.studentId }],
      });
      Alert.alert('Success', 'Task assigned!');
      handleAssignTaskModalClose();
    },
    onError: error => {
      console.error('Error assigning task:', error);
      Alert.alert(
        'Error',
        `Failed to assign task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteAssignedTask,
    onSuccess: (_, deletedAssignmentId) => {
      console.log(`Assigned task ${deletedAssignmentId} deleted successfully via mutation.`);
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      const studentId = queryClient
        .getQueryData<AssignedTask[]>(['assigned-tasks'])
        ?.find(t => t.id === deletedAssignmentId)?.studentId;
      if (studentId) {
        queryClient.invalidateQueries({ queryKey: ['assigned-tasks', { studentId: studentId }] });
      }
      Alert.alert('Success', 'Assigned task removed.');
    },
    onError: (error, deletedAssignmentId) => {
      console.error(`Error deleting assigned task ${deletedAssignmentId}:`, error);
      Alert.alert(
        'Error',
        `Failed to remove task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    },
  });

  const studentsLinkedToTeacher = useMemo(() => {
    return allStudentsSimple;
  }, [allStudentsSimple]);

  const pendingVerifications = useMemo(() => {
    return assignedTasks;
  }, [assignedTasks]);

  const handleViewProfile = (studentId: string) => {
    setViewingStudentId(studentId);
    setViewingSection('studentProfile');
  };
  const handleBackFromProfile = () => {
    setViewingStudentId(null);
    setViewingSection('students');
  };
  const handleInitiateAssignTaskForStudent = (studentId: string) => {
    setAssignTaskTargetStudentId(studentId);
    setIsAssignTaskModalVisible(true);
  };
  const handleEditStudentClick = () => {
    if (viewingStudentId) setIsEditStudentModalVisible(true);
  };
  const handleInitiateAssignTaskGeneral = () => {
    setAssignTaskTargetStudentId(null);
    setIsAssignTaskModalVisible(true);
  };
  const handleAssignTaskModalClose = () => {
    setIsAssignTaskModalVisible(false);
    setAssignTaskTargetStudentId(null);
  };
  const handleRemoveAssignedTask = (assignmentId: string) => {
    Alert.alert('Confirm Removal', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        onPress: () => deleteTaskMutation.mutate(assignmentId),
        style: 'destructive',
      },
    ]);
  };

  const isLoadingInitialData =
    teacherLoading ||
    studentsLoading ||
    assignedTasksLoading ||
    libraryLoading ||
    instrumentsLoading;

  if (isLoadingInitialData) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text>Loading Teacher Data...</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!teacherUser) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text style={appSharedStyles.textDanger}>Error: Could not load teacher data.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderMainContent = () => {
    if (viewingSection === 'studentProfile' && viewingStudentId) {
      const isLoadingProfile =
        viewingStudentUserLoading ||
        viewingStudentBalanceLoading ||
        studentTasksLoading ||
        studentHistoryLoading;

      return (
        <AdminStudentDetailView
          viewingStudentId={viewingStudentId}
          onInitiateVerification={onInitiateVerificationModal}
          onInitiateAssignTaskForStudent={handleInitiateAssignTaskForStudent}
          onInitiateEditStudent={handleEditStudentClick}
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
          <View>
            <Text style={appSharedStyles.sectionTitle}>
              Pending Verifications ({pendingVerifications.length})
            </Text>
            {assignedTasksLoading && (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
            )}
            {!assignedTasksLoading && pendingVerifications.length > 0 ? (
              <FlatList
                data={pendingVerifications.sort(
                  (a, b) =>
                    new Date(a.completedDate || a.assignedDate).getTime() -
                    new Date(b.completedDate || b.assignedDate).getTime()
                )}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                  const studentInfo = allStudentsSimple.find(s => s.id === item.studentId);
                  return (
                    <PendingVerificationItem
                      task={item}
                      studentName={studentInfo?.name ?? 'Unknown Student'}
                      onInitiateVerification={onInitiateVerificationModal}
                    />
                  );
                }}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            ) : !assignedTasksLoading ? (
              <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text>
            ) : null}
          </View>
        )}
        {viewingSection === 'students' && (
          <View>
            <Text style={appSharedStyles.sectionTitle}>
              My Students ({studentsLinkedToTeacher.length})
            </Text>
            {studentsLoading && (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
            )}
            {!studentsLoading && studentsLinkedToTeacher.length > 0 ? (
              <FlatList
                data={studentsLinkedToTeacher}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <StudentListItem
                    student={item}
                    mockInstruments={fetchedInstruments}
                    onViewProfile={handleViewProfile}
                    onAssignTask={handleInitiateAssignTaskForStudent}
                  />
                )}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            ) : !studentsLoading ? (
              <Text style={appSharedStyles.emptyListText}> No students linked to you. </Text>
            ) : null}
            <View style={{ marginTop: 20, alignItems: 'flex-start' }}>
              <Button
                title="View All Students (TODO)"
                onPress={() => alert('Implement view all students')}
              />
            </View>
          </View>
        )}
        {viewingSection === 'tasks' && (
          <View>
            <Text style={appSharedStyles.sectionTitle}>Task Management</Text>
            <View style={{ alignItems: 'flex-start', marginBottom: 20 }}>
              <Button
                title="Assign Task"
                onPress={handleInitiateAssignTaskGeneral}
                disabled={assignTaskMutation.isPending}
              />
            </View>
            <Text style={adminSharedStyles.sectionSubTitle}>
              Task Library ({taskLibrary.length})
            </Text>
            {libraryLoading && (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
            )}
            {!libraryLoading && taskLibrary.length > 0 ? (
              <FlatList
                data={taskLibrary.sort((a, b) => a.title.localeCompare(b.title))}
                keyExtractor={item => item.id}
                renderItem={({ item }) => <TaskLibraryItemTeacher item={item} />}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            ) : !libraryLoading ? (
              <Text style={appSharedStyles.emptyListText}>Task library is empty.</Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    );
  };

  const teacherDisplayName = getUserDisplayName(teacherUser);
  const showBackButton = viewingSection === 'studentProfile';

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.headerContainer}>
        {showBackButton ? (
          <View style={appSharedStyles.headerSideContainer}>
            <Button title="← Back" onPress={handleBackFromProfile} />
          </View>
        ) : (
          <View style={appSharedStyles.headerSideContainer} />
        )}
        <Text style={appSharedStyles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {viewingSection === 'studentProfile'
            ? viewingStudentUser
              ? getUserDisplayName(viewingStudentUser)
              : 'Loading...'
            : `Teacher: ${teacherDisplayName}`}
        </Text>
        <View style={appSharedStyles.headerSideContainer} />
      </View>

      {renderMainContent()}

      <AssignTaskModal
        visible={isAssignTaskModalVisible}
        onClose={handleAssignTaskModalClose}
        preselectedStudentId={assignTaskTargetStudentId}
      />
      {viewingStudentUser && (
        <EditUserModal
          visible={isEditStudentModalVisible}
          userToEdit={viewingStudentUser}
          onClose={() => setIsEditStudentModalVisible(false)}
          mockInstruments={fetchedInstruments}
        />
      )}
    </SafeAreaView>
  );
};
