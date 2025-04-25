import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  ScrollView,
  Button,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';

import { deleteAssignedTask, updateAssignedTask } from '../../api/assignedTasks';
import { fetchInstruments } from '../../api/instruments';
import { fetchStudentBalance } from '../../api/tickets';
import { fetchTeachers } from '../../api/users';

import { useAuth } from '../../contexts/AuthContext';
import { usePaginatedStudentHistory } from '../../hooks/usePaginatedStudentHistory';
import { usePaginatedStudentTasks } from '../../hooks/usePaginatedStudentTasks';

import { TicketHistoryItem } from '../common/TicketHistoryItem';
import ConfirmationModal from '../common/ConfirmationModal';
import PaginationControls from './PaginationControls';

import { AssignedTask } from '../../mocks/mockAssignedTasks';
import { Instrument } from '../../mocks/mockInstruments';
import { AdminStudentDetailViewProps } from '../../types/componentProps';
import { User } from '../../types/userTypes';

import { getInstrumentNames, getUserDisplayName } from '../../utils/helpers';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { adminSharedStyles } from '../../styles/adminSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';

export const AdminStudentDetailView: React.FC<AdminStudentDetailViewProps> = ({
  viewingStudentId,

  onInitiateVerification,
  onInitiateAssignTaskForStudent,
  onInitiateEditStudent,
  onInitiateStatusUser,
  onInitiateTicketAdjustment,
  onInitiateRedemption,
  onInitiateDeleteTask,
}) => {
  const { currentUserId: viewingUserId } = useAuth();
  const queryClient = useQueryClient();

  const [isDeleteTaskConfirmVisible, setIsDeleteTaskConfirmVisible] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);

  const {
    data: student,
    isLoading: studentLoading,
    isError: studentError,
    error: studentErrorMsg,
  } = useQuery<User, Error>({
    queryKey: ['user', viewingStudentId],
    queryFn: async () => {
      if (!viewingStudentId) throw new Error('No student ID provided');
      const response = await fetch(`/api/users/${viewingStudentId}`);
      if (!response.ok) throw new Error(`Failed to fetch student ${viewingStudentId}`);
      const userData = await response.json();
      if (userData.role !== 'student') throw new Error('User is not a student');
      return userData;
    },
    enabled: !!viewingStudentId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: balance = 0,
    isLoading: balanceLoading,
    isError: balanceError,
  } = useQuery({
    queryKey: ['balance', viewingStudentId],
    queryFn: () => fetchStudentBalance(viewingStudentId),
    enabled: !!student,
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

  const { data: allTeachers = [], isLoading: teachersLoading } = useQuery<User[], Error>({
    queryKey: ['teachers', { status: 'active', context: 'studentDetailLookup' }],
    queryFn: async () => {
      const result = await fetchTeachers({ page: 1 });

      return (result?.items || []).filter(t => t.status === 'active');
    },
    enabled: !!student,
    staleTime: 10 * 60 * 1000,
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
    currentPage: historyCurrentPage,
    totalPages: historyTotalPages,
    setPage: setHistoryPage,
    isLoading: studentHistoryLoading,
    isError: studentHistoryError,
    error: studentHistoryErrorObject,
    totalItems: totalHistoryCount,
  } = usePaginatedStudentHistory(viewingStudentId);

  const deleteTaskMutation = useMutation({
    mutationFn: deleteAssignedTask,
    onSuccess: (_, deletedAssignmentId) => {
      queryClient.invalidateQueries({
        queryKey: ['assigned-tasks', { studentId: viewingStudentId }],
      });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      closeDeleteConfirmModal();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Task removed successfully.',
        position: 'bottom',
      });
    },
    onError: error => {
      closeDeleteConfirmModal();
      Toast.show({
        type: 'error',
        text1: 'Removal Failed',
        text2: error instanceof Error ? error.message : 'Could not remove task.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  const closeDeleteConfirmModal = () => {
    setIsDeleteTaskConfirmVisible(false);
    setTaskToDeleteId(null);
    deleteTaskMutation.reset();
  };

  const handleDeleteAssignmentClick = (assignmentId: string) => {
    if (onInitiateDeleteTask) {
      setTaskToDeleteId(assignmentId);
      setIsDeleteTaskConfirmVisible(true);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Re-assign Failed',
        text2: 'Permission Denied - You cannot remove assigned tasks.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    }
  };

  const handleConfirmDeleteTask = () => {
    if (taskToDeleteId && !deleteTaskMutation.isPending && onInitiateDeleteTask) {
      deleteTaskMutation.mutate(taskToDeleteId);
    }
  };

  const handleVerifyTaskClick = (task: AssignedTask) => {
    if (student && onInitiateVerification) {
      onInitiateVerification(task);
    }
  };

  const handleAssignTaskClick = () => {
    if (student) {
      onInitiateAssignTaskForStudent(student.id);
    }
  };

  const handleEditClick = () => {
    if (student) {
      onInitiateEditStudent(student);
    }
  };

  const handleStatusClick = () => {
    if (student && onInitiateStatusUser) {
      onInitiateStatusUser(student);
    }
  };

  const handleAdjustmentClick = () => {
    if (student && onInitiateTicketAdjustment) {
      onInitiateTicketAdjustment(student);
    }
  };

  const handleRedemptionClick = () => {
    if (student && onInitiateRedemption) {
      onInitiateRedemption(student);
    }
  };

  const isLoading = studentLoading || instrumentsLoading || teachersLoading;
  if (isLoading) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View
          style={[appSharedStyles.container, { justifyContent: 'center', alignItems: 'center' }]}
        >
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }
  if (studentError) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text style={appSharedStyles.textDanger}>
            Error loading student: {studentErrorMsg?.message}
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!student) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text>Student not found or loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const studentDisplayName = getUserDisplayName(student);
  const isStudentActive = student.status === 'active';
  const taskToDeleteObject = paginatedTasks.find(task => task.id === taskToDeleteId);

  return (
    <>
      <SafeAreaView style={appSharedStyles.safeArea}>
        <ScrollView style={appSharedStyles.container}>
          <Text style={appSharedStyles.sectionTitle}>Student Details</Text>
          <Text style={appSharedStyles.itemDetailText}>Name: {studentDisplayName}</Text>
          <Text style={appSharedStyles.itemDetailText}>ID: {student.id}</Text>
          <Text style={appSharedStyles.itemDetailText}>
            Status:{' '}
            <Text
              style={{
                fontWeight: 'bold',
                color: isStudentActive ? colors.success : colors.secondary,
              }}
            >
              {student.status}
            </Text>
          </Text>
          <Text style={appSharedStyles.itemDetailText}>
            Instrument(s): {getInstrumentNames(student.instrumentIds, fetchedInstruments)}
          </Text>
          {teachersLoading ? (
            <Text style={appSharedStyles.itemDetailText}>Linked Teachers: Loading...</Text>
          ) : student.linkedTeacherIds && student.linkedTeacherIds.length > 0 ? (
            <Text style={appSharedStyles.itemDetailText}>
              Linked Teachers:{' '}
              {student.linkedTeacherIds
                .map(id => getUserDisplayName(allTeachers.find(t => t.id === id)))
                .join(', ') || 'N/A'}
            </Text>
          ) : (
            <Text style={appSharedStyles.itemDetailText}>Linked Teachers: None</Text>
          )}
          {balanceLoading ? (
            <Text style={[appSharedStyles.itemDetailText, { fontWeight: 'bold' }]}>
              Balance: Loading...
            </Text>
          ) : balanceError ? (
            <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textDanger]}>
              Balance: Error
            </Text>
          ) : (
            <Text style={[appSharedStyles.itemDetailText, { fontWeight: 'bold' }]}>
              Balance: {balance} Tickets
            </Text>
          )}
          <View
            style={[
              adminSharedStyles.adminStudentActions,
              commonSharedStyles.actionButtonsContainer,
            ]}
          >
            {onInitiateTicketAdjustment && (
              <Button
                title="Adjust Tickets"
                onPress={handleAdjustmentClick}
                disabled={!isStudentActive || balanceLoading}
              />
            )}
            {onInitiateRedemption && (
              <Button
                title="Redeem Reward"
                onPress={handleRedemptionClick}
                disabled={!isStudentActive || balance <= 0}
                color={colors.success}
              />
            )}
            <Button
              title="Assign Task"
              onPress={handleAssignTaskClick}
              disabled={!isStudentActive}
            />
            <Button title="Edit Info" onPress={handleEditClick} color={colors.warning} />
            {onInitiateStatusUser && (
              <Button title="Manage Status" onPress={handleStatusClick} color={colors.secondary} />
            )}
            <Button
              title="Login (QR)"
              onPress={() => alert(`Simulating QR Code for ${studentDisplayName}...`)}
              color={colors.info}
              disabled={!isStudentActive}
            />
          </View>
          <Text style={appSharedStyles.sectionTitle}>Assigned Tasks ({totalTasksCount})</Text>
          {studentTasksLoading && <ActivityIndicator />}
          {studentTasksError && (
            <Text style={appSharedStyles.textDanger}>
              Error loading tasks: {studentTasksErrorObject?.message}
            </Text>
          )}
          {!studentTasksLoading && !studentTasksError && (
            <FlatList
              data={paginatedTasks}
              keyExtractor={item => `task-${item.id}`}
              renderItem={({ item }) => {
                const allowVerify =
                  onInitiateVerification &&
                  item.isComplete &&
                  item.verificationStatus === 'pending' &&
                  isStudentActive;
                const allowDelete =
                  onInitiateDeleteTask &&
                  (!item.isComplete || item.verificationStatus === 'pending') &&
                  isStudentActive;
                const taskStatus = item.isComplete
                  ? item.verificationStatus === 'pending'
                    ? 'Complete (Pending Verification)'
                    : `Verified (${item.verificationStatus || 'status unknown'})`
                  : 'Assigned';

                return (
                  <View style={adminSharedStyles.taskItem}>
                    <Text style={adminSharedStyles.taskItemTitle}>{item.taskTitle}</Text>
                    <Text style={commonSharedStyles.taskItemStatus}>Status: {taskStatus}</Text>
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
                          title="Verify"
                          onPress={() => handleVerifyTaskClick(item)}
                          disabled={deleteTaskMutation.isPending}
                        />
                      )}
                      {allowDelete && (
                        <Button
                          title={
                            deleteTaskMutation.isPending && deleteTaskMutation.variables === item.id
                              ? 'Removing...'
                              : 'Remove'
                          }
                          onPress={() => handleDeleteAssignmentClick(item.id)}
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
              ListEmptyComponent={() => (
                <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text>
              )}
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
          <Text style={appSharedStyles.sectionTitle}>History ({totalHistoryCount})</Text>
          {studentHistoryLoading && <ActivityIndicator />}
          {studentHistoryError && (
            <Text style={appSharedStyles.textDanger}>
              Error loading history: {studentHistoryErrorObject?.message}
            </Text>
          )}
          {!studentHistoryLoading && !studentHistoryError && (
            <FlatList
              data={paginatedHistory}
              keyExtractor={item => `history-${item.id}`}
              renderItem={({ item }) => <TicketHistoryItem item={item} />}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
              ListEmptyComponent={() => (
                <Text style={appSharedStyles.emptyListText}>No history yet.</Text>
              )}
              ListFooterComponent={
                historyTotalPages > 1 ? (
                  <PaginationControls
                    currentPage={historyCurrentPage}
                    totalPages={historyTotalPages}
                    onPageChange={setHistoryPage}
                  />
                ) : null
              }
              contentContainerStyle={{ paddingBottom: 10 }}
            />
          )}
        </ScrollView>
      </SafeAreaView>
      <ConfirmationModal
        visible={isDeleteTaskConfirmVisible}
        title="Confirm Remove Task"
        message={`Are you sure you want to remove the assigned task "${taskToDeleteObject?.taskTitle || 'selected task'}"? This cannot be undone.`}
        confirmText={deleteTaskMutation.isPending ? 'Removing...' : 'Remove Task'}
        onConfirm={handleConfirmDeleteTask}
        onCancel={closeDeleteConfirmModal}
        confirmDisabled={deleteTaskMutation.isPending}
      />
    </>
  );
};
