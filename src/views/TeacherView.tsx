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
import PaginationControls from '../components/admin/PaginationControls';
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
import { getUserDisplayName, getInstrumentNames } from '../utils/helpers';
import { commonSharedStyles } from '../styles/commonSharedStyles';
import { PendingVerificationItem } from '../components/common/PendingVerificationItem';
import { StudentListItem } from '../components/common/StudentListItem';
import { TicketHistoryItem } from '../components/common/TicketHistoryItem';
import { TaskLibraryItemTeacher } from '../components/common/TaskLibraryItemTeacher';

export const TeacherView: React.FC<TeacherViewProps> = ({ onInitiateVerificationModal }) => {
  const { currentUserId } = useAuth();
  const queryClient = useQueryClient();

  type TeacherSection = 'dashboard' | 'students' | 'tasks' | 'studentProfile';
  const [viewingSection, setViewingSection] = useState<TeacherSection>('dashboard');
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [isAssignTaskModalVisible, setIsAssignTaskModalVisible] = useState(false);
  const [assignTaskTargetStudentId, setAssignTaskTargetStudentId] = useState<string | null>(null);

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
    queryKey: ['students', { page: 1, filter: 'all' }],
    queryFn: () => fetchStudents({ page: 1, filter: 'all' }),
    staleTime: 5 * 60 * 1000,
  });
  const allStudentsSimple: SimplifiedStudent[] = allStudentsResult?.students ?? [];

  const { data: allAssignedTasksResult, isLoading: assignedTasksLoading } = useQuery({
    queryKey: ['assigned-tasks', { assignmentStatus: 'pending', studentStatus: 'active' }],
    queryFn: () => fetchAssignedTasks({ assignmentStatus: 'pending', studentStatus: 'active' }),
    staleTime: 1 * 60 * 1000,
  });
  const assignedTasks: AssignedTask[] = allAssignedTasksResult?.items ?? [];

  const { data: taskLibrary = [], isLoading: libraryLoading } = useQuery({
    queryKey: ['task-library'],
    queryFn: fetchTaskLibrary,
    staleTime: 10 * 60 * 1000,
  });

  const { data: instruments = [], isLoading: instrumentsLoading } = useQuery({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
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
    if (!teacherUser || !allStudentsSimple) return [];
    console.warn('[TeacherView] Filtering students based on placeholder logic. Needs fixing.');
    return allStudentsSimple;
  }, [teacherUser, allStudentsSimple]);

  const pendingVerifications = useMemo(() => {
    if (!teacherUser) return [];
    console.warn('[TeacherView] Filtering pending tasks based on placeholder logic. Needs fixing.');
    return assignedTasks.filter(task => task.isComplete && task.verificationStatus === 'pending');
  }, [assignedTasks, teacherUser]);

  const handleViewProfile = (studentId: string) => {
    setViewingStudentId(studentId);
    setViewingSection('studentProfile');
  };
  const handleBackFromProfile = () => {
    setViewingStudentId(null);
    setViewingSection('students');
  };
  const handleInitiateAssignTaskForStudent = (studentId: string) => {
    console.log('yo2');
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

  if (viewingSection === 'studentProfile' && viewingStudentId) {
    const isLoadingProfile =
      viewingStudentUserLoading ||
      viewingStudentBalanceLoading ||
      studentTasksLoading ||
      studentHistoryLoading;
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.headerContainer}>
          <Button title="← Back" onPress={handleBackFromProfile} />
          <Text style={appSharedStyles.header} numberOfLines={1} ellipsizeMode="tail">
            {viewingStudentUser ? getUserDisplayName(viewingStudentUser) : 'Loading...'}
          </Text>
          <View style={{ width: 50 }} />
        </View>
        {isLoadingProfile && (
          <View style={appSharedStyles.container}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        {!isLoadingProfile && viewingStudentUser && (
          <ScrollView style={appSharedStyles.container}>
            <Text style={appSharedStyles.sectionTitle}>Student Details</Text>
            <Text>Name: {getUserDisplayName(viewingStudentUser)}</Text>
            <Text>Status: {viewingStudentUser.status}</Text>
            <Text>
              Instrument(s): {getInstrumentNames(viewingStudentUser.instrumentIds, instruments)}
            </Text>
            <Text>Balance: {viewingStudentBalance} Tickets</Text>
            <View style={{ marginTop: 20, marginBottom: 20, alignItems: 'flex-start' }}>
              <Button
                title={`Assign Task to ${getUserDisplayName(viewingStudentUser)}`}
                onPress={() => handleInitiateAssignTaskForStudent(viewingStudentUser.id)}
                disabled={viewingStudentUser.status !== 'active' || assignTaskMutation.isPending}
              />
            </View>

            <Text style={appSharedStyles.sectionTitle}> Assigned Tasks ({totalTasksCount}) </Text>
            {studentTasksError && (
              <Text style={appSharedStyles.textDanger}>
                Error loading tasks: {studentTasksErrorObject?.message}
              </Text>
            )}
            {!studentTasksError && (
              <FlatList
                data={paginatedTasks}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                  const isStudentActive = viewingStudentUser.status === 'active';
                  const allowDelete =
                    (!item.isComplete || item.verificationStatus === 'pending') && isStudentActive;
                  const allowVerify =
                    item.isComplete && item.verificationStatus === 'pending' && isStudentActive;
                  const taskStatus = item.isComplete
                    ? item.verificationStatus === 'pending'
                      ? 'Complete (Pending)'
                      : `Verified (${item.verificationStatus})`
                    : 'Assigned';
                  return (
                    <View style={adminSharedStyles.taskItem}>
                      <Text>
                        {item.taskTitle} ({taskStatus})
                      </Text>
                      {item.completedDate && (
                        <Text style={appSharedStyles.itemDetailText}>
                          Completed: {new Date(item.completedDate).toLocaleDateString()}
                        </Text>
                      )}
                      {item.verifiedDate && item.verificationStatus !== 'pending' && (
                        <Text style={appSharedStyles.itemDetailText}>
                          Verified: {new Date(item.verifiedDate).toLocaleDateString()}
                        </Text>
                      )}
                      {item.actualPointsAwarded !== undefined &&
                        item.verificationStatus !== 'pending' && (
                          <Text style={adminSharedStyles.taskItemTickets}>
                            Awarded: {item.actualPointsAwarded ?? 0} Tickets
                          </Text>
                        )}
                      {item.isComplete && item.verificationStatus === 'pending' && (
                        <Text style={commonSharedStyles.pendingNote}>Awaiting verification...</Text>
                      )}
                      <View style={adminSharedStyles.assignedTaskActions}>
                        {allowVerify && (
                          <Button
                            title="Verify Task"
                            onPress={() => onInitiateVerificationModal(item)}
                            disabled={
                              deleteTaskMutation.isPending &&
                              deleteTaskMutation.variables === item.id
                            }
                          />
                        )}
                        {allowDelete && (
                          <Button
                            title={
                              deleteTaskMutation.isPending &&
                              deleteTaskMutation.variables === item.id
                                ? 'Removing...'
                                : 'Remove'
                            }
                            onPress={() => handleRemoveAssignedTask(item.id)}
                            color={colors.danger}
                            disabled={deleteTaskMutation.isPending}
                          />
                        )}
                      </View>
                    </View>
                  );
                }}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={
                  <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text>
                }
                ListFooterComponent={
                  tasksTotalPages > 1 ? (
                    <PaginationControls
                      currentPage={tasksCurrentPage}
                      totalPages={tasksTotalPages}
                      onPageChange={setTasksPage}
                    />
                  ) : null
                }
                contentContainerStyle={{ paddingBottom: 10 }}
              />
            )}

            <Text style={appSharedStyles.sectionTitle}>
              History (Recent - {totalHistoryCount} Total)
            </Text>
            {studentHistoryError && (
              <Text style={appSharedStyles.textDanger}>Error loading history.</Text>
            )}
            {!studentHistoryError && paginatedHistory.length > 0 ? (
              <FlatList
                data={paginatedHistory}
                keyExtractor={item => `hist-${item.id}`}
                renderItem={({ item }) => <TicketHistoryItem item={item} />}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
              />
            ) : !studentHistoryError ? (
              <Text style={appSharedStyles.emptyListText}>No history found.</Text>
            ) : null}
            {!studentHistoryError && totalHistoryCount > paginatedHistory.length && (
              <Button
                title="View Full History (TODO)"
                onPress={() => alert('Implement full history view')}
              />
            )}

            <View style={{ marginTop: 20, marginBottom: 20 }}>
              <Button
                title="View Rewards Catalog (TODO)"
                onPress={() => alert('Implement rewards view')}
              />
            </View>
          </ScrollView>
        )}
        {!isLoadingProfile && !viewingStudentUser && (
          <View style={appSharedStyles.container}>
            <Text style={appSharedStyles.textDanger}>Error loading student profile.</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  const teacherDisplayName = getUserDisplayName(teacherUser);
  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.headerContainer}>
        <Text style={appSharedStyles.header}>Teacher: {teacherDisplayName}</Text>
      </View>
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
                  const studentInfo = studentsLinkedToTeacher.find(s => s.id === item.studentId);
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
                    mockInstruments={instruments}
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

      <AssignTaskModal
        visible={isAssignTaskModalVisible}
        onClose={handleAssignTaskModalClose}
        preselectedStudentId={assignTaskTargetStudentId}
      />
    </SafeAreaView>
  );
};
