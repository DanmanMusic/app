import React, { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  View,
  Text,
  ScrollView,
  Button,
  FlatList,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { deleteAssignedTask } from '../../api/assignedTasks';
import { fetchInstruments } from '../../api/instruments';
import { fetchStudentBalance } from '../../api/tickets';
import { fetchTeachers } from '../../api/users';
import { usePaginatedStudentHistory } from '../../hooks/usePaginatedStudentHistory';
import { usePaginatedStudentTasks } from '../../hooks/usePaginatedStudentTasks';
import { AssignedTask } from '../../mocks/mockAssignedTasks';
import { Instrument } from '../../mocks/mockInstruments';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { AdminStudentDetailViewProps } from '../../types/componentProps';
import { User } from '../../types/userTypes';
import { getInstrumentNames, getUserDisplayName } from '../../utils/helpers';
import { TicketHistoryItem } from '../../views/StudentView';
import ConfirmationModal from '../common/ConfirmationModal';
import DeactivateOrDeleteUserModal from '../common/DeactivateOrDeleteUserModal';
import EditUserModal from '../common/EditUserModal';

import { adminSharedStyles } from './adminSharedStyles';
import ManualTicketAdjustmentModal from './modals/ManualTicketAdjustmentModal';
import PaginationControls from './PaginationControls';

export const AdminStudentDetailView: React.FC<AdminStudentDetailViewProps> = ({
  viewingStudentId,
  onBack,
  onInitiateVerification,
  onAssignTask,
}) => {
  const queryClient = useQueryClient();

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [isAdjustmentModalVisible, setIsAdjustmentModalVisible] = useState(false);
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
      if (!viewingStudentId) throw new Error('No student ID');
      const response = await fetch(`/api/users/${viewingStudentId}`);
      if (!response.ok) throw new Error(`Failed to fetch student ${viewingStudentId}`);
      const data = await response.json();
      if (data.role !== 'student') throw new Error('User is not a student');
      return data;
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
    queryKey: ['teachers', { page: 1, limit: 1000, status: 'active' }],
    queryFn: async () => {
      const response = await fetchTeachers({ page: 1 });
      return response.items.filter(t => t.status === 'active');
    },
    staleTime: 10 * 60 * 1000,
  });

  const {
    tasks: paginatedTasks,
    currentPage: tasksCurrentPage,
    totalPages: tasksTotalPages,
    setPage: setTasksPage,
    totalTasksCount,
    isLoading: studentTasksLoading,
    isError: studentTasksError,
    error: studentTasksErrorObject,
  } = usePaginatedStudentTasks(viewingStudentId);
  const {
    history: paginatedHistory,
    currentPage: historyCurrentPage,
    totalPages: historyTotalPages,
    setPage: setHistoryPage,
    totalItems: totalHistoryCount,
    isLoading: studentHistoryLoading,
    isError: studentHistoryError,
    error: studentHistoryErrorObject,
  } = usePaginatedStudentHistory(viewingStudentId);

  const deleteTaskMutation = useMutation({
    mutationFn: deleteAssignedTask,
    onSuccess: (_, _deletedAssignmentId) => {
      Alert.alert('Success', 'Task assignment removed.');
      queryClient.invalidateQueries({
        queryKey: ['assigned-tasks', { studentId: viewingStudentId }],
      });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      closeDeleteConfirmModal();
    },
    onError: error => {
      Alert.alert(
        'Error',
        `Failed to remove task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      closeDeleteConfirmModal();
    },
  });

  const studentDisplayName = student ? getUserDisplayName(student) : 'Loading...';
  const isStudentActive = student?.status === 'active';

  const handleEditStudent = () => {
    if (student) setIsEditModalVisible(true);
  };
  const handleManageStatus = () => {
    if (student) setIsStatusModalVisible(true);
  };
  const handleOpenAdjustmentModal = () => {
    if (student) setIsAdjustmentModalVisible(true);
  };
  const handleBackClick = () => {
    onBack();
  };
  const closeEditModal = () => {
    setIsEditModalVisible(false);
  };
  const closeStatusModal = () => {
    setIsStatusModalVisible(false);
  };
  const closeAdjustmentModal = () => {
    setIsAdjustmentModalVisible(false);
  };

  const handleDeleteAssignmentClick = (assignmentId: string) => {
    setTaskToDeleteId(assignmentId);
    setIsDeleteTaskConfirmVisible(true);
  };
  const closeDeleteConfirmModal = () => {
    setIsDeleteTaskConfirmVisible(false);
    setTaskToDeleteId(null);
    deleteTaskMutation.reset();
  };
  const handleConfirmDeleteTask = () => {
    if (taskToDeleteId && !deleteTaskMutation.isPending) {
      deleteTaskMutation.mutate(taskToDeleteId);
    }
  };

  const handleVerifyTaskClick = (task: AssignedTask) => {
    if (student && onInitiateVerification) onInitiateVerification(task);
  };
  const handleAssignTaskClick = () => {
    if (student) onAssignTask();
  };
  const handleLoginAsStudent = () => {
    if (student)
      alert(`Simulating QR Code Generation for ${studentDisplayName} (${student.id})...`);
  };
  const handleRedeemRewardClick = (rewardId: string) => {
    if (!student) return;
    Alert.alert('TODO', `Implement Redeem Reward flow for ${rewardId} for student ${student.id}`);
  };

  const isLoading =
    studentLoading ||
    balanceLoading ||
    instrumentsLoading ||
    teachersLoading ||
    studentTasksLoading ||
    studentHistoryLoading;
  if (isLoading && !student) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <ActivityIndicator size="large" />
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
          <Button title="Back" onPress={onBack} />
        </View>
      </SafeAreaView>
    );
  }
  if (!student) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text>Student not found.</Text>
          <Button title="Back" onPress={onBack} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={appSharedStyles.safeArea}>
        {}
        <View style={styles.headerContainer}>
          <Button title="← Back to Admin" onPress={handleBackClick} />
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            {studentDisplayName}&apos;s Details
          </Text>
          <View style={styles.headerActions}>
            <Button
              title="Login (QR)"
              onPress={handleLoginAsStudent}
              color={colors.info}
              disabled={!isStudentActive}
            />
            <Button title="Edit" onPress={handleEditStudent} color={colors.warning} />
            <Button title="Status" onPress={handleManageStatus} color={colors.secondary} />
          </View>
        </View>

        {}
        <ScrollView style={appSharedStyles.container}>
          {}
          <Text style={appSharedStyles.sectionTitle}>Viewing Student: {studentDisplayName}</Text>
          <Text style={appSharedStyles.itemDetailText}>ID: {student.id}</Text>
          <Text style={appSharedStyles.itemDetailText}>
            {' '}
            Status:{' '}
            <Text
              style={{
                fontWeight: 'bold',
                color: isStudentActive ? colors.success : colors.secondary,
              }}
            >
              {student.status}
            </Text>{' '}
          </Text>
          <Text style={appSharedStyles.itemDetailText}>
            {' '}
            Instrument(s): {getInstrumentNames(student.instrumentIds, fetchedInstruments)}{' '}
          </Text>
          {student.linkedTeacherIds && student.linkedTeacherIds.length > 0 && (
            <Text style={appSharedStyles.itemDetailText}>
              {' '}
              Linked Teachers:{' '}
              {student.linkedTeacherIds
                .map(id => getUserDisplayName(allTeachers.find(t => t.id === id)))
                .join(', ') || 'N/A'}{' '}
            </Text>
          )}
          {balanceLoading ? (
            <Text style={appSharedStyles.itemDetailText}>Balance: Loading...</Text>
          ) : balanceError ? (
            <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textDanger]}>
              Balance: Error
            </Text>
          ) : (
            <Text style={[appSharedStyles.itemDetailText, { fontWeight: 'bold' }]}>
              {' '}
              Balance: {balance} Tickets{' '}
            </Text>
          )}

          {}
          <View style={adminSharedStyles.adminStudentActions}>
            <Button
              title="Adjust Tickets"
              onPress={handleOpenAdjustmentModal}
              disabled={!isStudentActive || balanceLoading}
            />
            <Button
              title="Redeem Reward"
              onPress={() => handleRedeemRewardClick('reward-placeholder-id')}
              disabled={!isStudentActive}
            />
            <Button
              title="Assign Task"
              onPress={handleAssignTaskClick}
              disabled={!isStudentActive}
            />
          </View>

          {}
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
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const allowDelete =
                  (!item.isComplete || item.verificationStatus === 'pending') && isStudentActive;
                const allowVerify =
                  item.isComplete && item.verificationStatus === 'pending' && isStudentActive;
                const taskStatus = item.isComplete
                  ? item.verificationStatus === 'pending'
                    ? 'Complete (Pending Verification)'
                    : `Verified (${item.verificationStatus || 'status unknown'})`
                  : 'Assigned';
                return (
                  <View style={adminSharedStyles.taskItem}>
                    <Text style={adminSharedStyles.taskItemTitle}>{item.taskTitle}</Text>
                    <Text style={adminSharedStyles.taskItemStatus}>Status: {taskStatus}</Text>
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
                      <Text style={adminSharedStyles.pendingNote}>Awaiting verification...</Text>
                    )}
                    <View style={adminSharedStyles.assignedTaskActions}>
                      {onInitiateVerification && allowVerify && (
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

          {}
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
              keyExtractor={item => item.id}
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

      {}
      {}
      {student && (
        <>
          <DeactivateOrDeleteUserModal
            visible={isStatusModalVisible}
            user={student}
            onClose={closeStatusModal}
          />
          {}
          <EditUserModal
            visible={isEditModalVisible}
            userToEdit={student}
            onClose={closeEditModal}
            mockInstruments={fetchedInstruments}
            allTeachers={allTeachers}
          />
          <ManualTicketAdjustmentModal
            visible={isAdjustmentModalVisible}
            onClose={closeAdjustmentModal}
            studentId={student.id}
            studentName={studentDisplayName}
            currentBalance={balance}
          />
          <ConfirmationModal
            visible={isDeleteTaskConfirmVisible}
            title="Confirm Remove Task"
            message={`Are you sure you want to remove this assigned task? This cannot be undone.`}
            confirmText={deleteTaskMutation.isPending ? 'Removing...' : 'Remove Task'}
            onConfirm={handleConfirmDeleteTask}
            onCancel={closeDeleteConfirmModal}
            confirmDisabled={deleteTaskMutation.isPending}
          />
          {}
        </>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    backgroundColor: colors.backgroundPrimary,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginHorizontal: 5,
  },
  headerActions: { flexDirection: 'row', gap: 10 },
});
