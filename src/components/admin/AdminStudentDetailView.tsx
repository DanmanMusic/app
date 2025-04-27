// src/components/admin/AdminStudentDetailView.tsx
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  ScrollView,
  Button,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Toast from 'react-native-toast-message';

// Import API functions
import { deleteAssignedTask } from '../../api/assignedTasks';
import { fetchInstruments } from '../../api/instruments';
import { fetchStudentBalance } from '../../api/tickets';
import { fetchUserProfile, fetchTeachers } from '../../api/users';

// Import Hooks
import { useAuth } from '../../contexts/AuthContext';
import { usePaginatedStudentHistory } from '../../hooks/usePaginatedStudentHistory';
import { usePaginatedStudentTasks } from '../../hooks/usePaginatedStudentTasks';

// Import Common Components
import { TicketHistoryItem } from '../common/TicketHistoryItem';
import ConfirmationModal from '../common/ConfirmationModal';
import PaginationControls from './PaginationControls';

// Import Types and Props
import { AssignedTask, Instrument, User } from '../../types/dataTypes';
import { AdminStudentDetailViewProps } from '../../types/componentProps';

// Import Helpers and Styles
import { getInstrumentNames, getUserDisplayName } from '../../utils/helpers';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { adminSharedStyles } from '../../styles/adminSharedStyles';
import { colors } from '../../styles/colors';

export const AdminStudentDetailView: React.FC<AdminStudentDetailViewProps> = ({
  viewingStudentId,
  onInitiateVerification,
  onInitiateAssignTaskForStudent,
  onInitiateEditStudent,
  onInitiateStatusUser,
  onInitiateTicketAdjustment,
  onInitiateRedemption,
}) => {
  const { currentUserId: adminUserId } = useAuth(); // Keep adminId if needed for redemption logic later
  const queryClient = useQueryClient();

  const [isDeleteTaskConfirmVisible, setIsDeleteTaskConfirmVisible] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<AssignedTask | null>(null);

  // --- Data Fetching ---
  const {
    data: student,
    isLoading: studentLoading,
    isError: studentError,
    error: studentErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', viewingStudentId],
    queryFn: () => fetchUserProfile(viewingStudentId),
    enabled: !!viewingStudentId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: balance = 0,
    isLoading: balanceLoading,
    isError: balanceError,
    error: balanceErrorMsg,
  } = useQuery<number, Error>({
    queryKey: ['balance', viewingStudentId],
    queryFn: () => fetchStudentBalance(viewingStudentId),
    enabled: !!student && student.status === 'active',
    staleTime: 1 * 60 * 1000,
  });

  const {
    data: fetchedInstruments = [],
    isLoading: instrumentsLoading,
  } = useQuery<Instrument[], Error>({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
  });

  const {
    data: activeTeachers = [],
    isLoading: teachersLoading,
  } = useQuery<User[], Error>({
    queryKey: ['teachers', { status: 'active', context: 'studentDetailLookup' }],
    queryFn: async () => {
      const result = await fetchTeachers({ page: 1, limit: 1000 });
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
    isFetching: studentTasksFetching,
    isError: studentTasksError,
    error: studentTasksErrorObject, // Correct variable name used below
    totalItems: totalTasksCount,
  } = usePaginatedStudentTasks(viewingStudentId);

  const {
    history: paginatedHistory,
    currentPage: historyCurrentPage,
    totalPages: historyTotalPages,
    setPage: setHistoryPage,
    isLoading: studentHistoryLoading,
    isFetching: studentHistoryFetching,
    isError: studentHistoryError,
    error: historyErrorObject, // Corrected variable name used below
    totalItems: totalHistoryCount,
  } = usePaginatedStudentHistory(viewingStudentId);

  // --- Mutations ---
  const deleteTaskMutation = useMutation({
    mutationFn: deleteAssignedTask,
    onSuccess: (_, deletedAssignmentId) => {
      console.log(`[AdminStudentDetail] Task ${deletedAssignmentId} removed successfully.`);
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks', { studentId: viewingStudentId }] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      closeDeleteConfirmModal();
      Toast.show({ type: 'success', text1: 'Success', text2: 'Task removed successfully.' });
    },
    onError: (error: Error, deletedAssignmentId) => {
      console.error(`[AdminStudentDetail] Error removing task ${deletedAssignmentId}:`, error);
      closeDeleteConfirmModal();
      Toast.show({ type: 'error', text1: 'Removal Failed', text2: error.message || 'Could not remove task.' });
    },
  });

  // --- Local State & Memos ---
  const isStudentActive = useMemo(() => student?.status === 'active', [student]);
  const studentDisplayName = useMemo(() => student ? getUserDisplayName(student) : 'Loading...', [student]);
  const instrumentNames = useMemo(() => student ? getInstrumentNames(student.instrumentIds, fetchedInstruments) : 'Loading...', [student, fetchedInstruments]);
  const teacherNames = useMemo(() => {
       if (!student || !student.linkedTeacherIds || student.linkedTeacherIds.length === 0) return 'None';
       if (teachersLoading) return 'Loading...';
       return student.linkedTeacherIds
           .map(id => getUserDisplayName(activeTeachers.find(t => t.id === id)))
           .filter(name => name !== 'Unknown User')
           .join(', ') || 'N/A';
   }, [student, activeTeachers, teachersLoading]);

  // --- Event Handlers ---
  const closeDeleteConfirmModal = () => {
    setIsDeleteTaskConfirmVisible(false);
    setTaskToDelete(null);
    deleteTaskMutation.reset();
  };

  const handleInitiateDeleteTaskClick = (task: AssignedTask) => {
    setTaskToDelete(task);
    setIsDeleteTaskConfirmVisible(true);
  };

  const handleConfirmDeleteTaskAction = () => {
    if (taskToDelete && !deleteTaskMutation.isPending) {
      deleteTaskMutation.mutate(taskToDelete.id);
    }
  };

  const handleVerifyTaskClick = (task: AssignedTask) => {
    onInitiateVerification?.(task);
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
     if (student) {
         onInitiateStatusUser?.(student);
     }
  };

  const handleAdjustmentClick = () => {
    // CORRECTED: Pass only the student object as per current prop type
    if (student && !balanceLoading && onInitiateTicketAdjustment) {
      onInitiateTicketAdjustment(student);
    } else if (balanceLoading) {
        Toast.show({ type: 'info', text1: 'Loading balance...', position: 'bottom' });
    }
  };

  const handleRedemptionClick = () => {
    // CORRECTED: Pass only the student object as per current prop type
    if (student && !balanceLoading && onInitiateRedemption) {
       onInitiateRedemption(student);
    } else if (balanceLoading) {
        Toast.show({ type: 'info', text1: 'Loading balance...', position: 'bottom' });
    }
  };

  // --- Loading & Error States ---
  const isLoading = studentLoading || instrumentsLoading || teachersLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text>Loading Student Details...</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (studentError || !student) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text style={commonSharedStyles.errorText}>
            Error loading student: {studentErrorMsg?.message || 'Student not found.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }
   if (student.role !== 'student') {
       return (
          <SafeAreaView style={appSharedStyles.safeArea}>
             <View style={appSharedStyles.container}>
                 <Text style={commonSharedStyles.errorText}>Error: User is not a student.</Text>
             </View>
           </SafeAreaView>
        );
   }

  // --- Render Logic ---
  return (
    <>
      <SafeAreaView style={appSharedStyles.safeArea}>
        <ScrollView style={appSharedStyles.container}>
          {/* Student Details Section */}
          <Text style={appSharedStyles.sectionTitle}>Student Details</Text>
          <Text style={appSharedStyles.itemDetailText}>Name: {studentDisplayName}</Text>
          <Text style={appSharedStyles.itemDetailText}>ID: {student.id}</Text>
          <Text style={appSharedStyles.itemDetailText}>
            Status:{' '}
            <Text style={isStudentActive ? styles.activeStatus : styles.inactiveStatus}>
              {student.status}
            </Text>
          </Text>
          <Text style={appSharedStyles.itemDetailText}>Instrument(s): {instrumentNames}</Text>
          <Text style={appSharedStyles.itemDetailText}>Linked Teachers: {teacherNames}</Text>
          {balanceLoading ? (
            <Text style={[appSharedStyles.itemDetailText, styles.balanceText]}>Balance: Loading...</Text>
          ) : balanceError ? (
            <Text style={[appSharedStyles.itemDetailText, styles.balanceText, commonSharedStyles.errorText]}>Balance: Error</Text>
          ) : (
            <Text style={[appSharedStyles.itemDetailText, styles.balanceText]}>Balance: {balance} Tickets</Text>
          )}

          {/* Action Buttons */}
          <View style={[adminSharedStyles.adminStudentActions, commonSharedStyles.actionButtonsContainer]}>
            <Button title="Adjust Tickets" onPress={handleAdjustmentClick} disabled={!isStudentActive || balanceLoading} />
            <Button title="Redeem Reward" onPress={handleRedemptionClick} disabled={!isStudentActive || balance <= 0 || balanceLoading} color={colors.success} />
            <Button title="Assign Task" onPress={handleAssignTaskClick} disabled={!isStudentActive} />
            <Button title="Edit Info" onPress={handleEditClick} color={colors.warning} />
            {onInitiateStatusUser && (
                <Button title="Manage Status" onPress={handleStatusClick} color={colors.secondary} />
            )}
            <Button title="Login (QR)" onPress={() => alert(`Simulating QR Code for ${studentDisplayName}...`)} color={colors.info} disabled={!isStudentActive} />
          </View>

          {/* Assigned Tasks Section */}
          <Text style={appSharedStyles.sectionTitle}>Assigned Tasks ({totalTasksCount})</Text>
          {studentTasksLoading && <ActivityIndicator style={styles.listLoader}/>}
          {studentTasksError && (
            <Text style={commonSharedStyles.errorText}>
              {/* CORRECTED: Use correct variable name */}
              Error loading tasks: {studentTasksErrorObject?.message}
            </Text>
          )}
          {!studentTasksLoading && !studentTasksError && (
            <FlatList
              data={paginatedTasks}
              keyExtractor={item => `task-${item.id}`}
              renderItem={({ item }) => {
                const allowVerify = onInitiateVerification && item.isComplete && item.verificationStatus === 'pending' && isStudentActive;
                const allowDelete = !item.isComplete || item.verificationStatus === 'pending';
                const taskStatus = item.isComplete
                  ? item.verificationStatus === 'pending'
                    ? 'Complete (Pending)'
                    : `Verified (${item.verificationStatus || '?'})`
                  : 'Assigned';

                return (
                  <View style={adminSharedStyles.taskItem}>
                    <Text style={adminSharedStyles.taskItemTitle}>{item.taskTitle}</Text>
                    <Text style={commonSharedStyles.taskItemStatus}>Status: {taskStatus}</Text>
                    {item.completedDate && <Text style={appSharedStyles.itemDetailText}>Completed: {new Date(item.completedDate).toLocaleDateString()}</Text>}
                    {item.verifiedDate && item.verificationStatus !== 'pending' && <Text style={appSharedStyles.itemDetailText}>Verified: {new Date(item.verifiedDate).toLocaleDateString()}</Text>}
                    {item.actualPointsAwarded !== undefined && item.verificationStatus !== 'pending' && <Text style={adminSharedStyles.taskItemTickets}>Awarded: {item.actualPointsAwarded ?? 0} Tickets</Text>}
                    {item.isComplete && item.verificationStatus === 'pending' && <Text style={commonSharedStyles.pendingNote}>Awaiting verification...</Text>}

                    <View style={adminSharedStyles.assignedTaskActions}>
                      {allowVerify && <Button title="Verify" onPress={() => handleVerifyTaskClick(item)} disabled={deleteTaskMutation.isPending} />}
                      {allowDelete && <Button title={deleteTaskMutation.isPending && taskToDelete?.id === item.id ? 'Removing...' : 'Remove'} onPress={() => handleInitiateDeleteTaskClick(item)} color={colors.danger} disabled={deleteTaskMutation.isPending} />}
                    </View>
                  </View>
                );
              }}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              ListEmptyComponent={<Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text>}
              ListHeaderComponent={studentTasksFetching && !studentTasksLoading ? <ActivityIndicator size="small" color={colors.secondary} /> : null}
              ListFooterComponent={ tasksTotalPages > 1 ? <PaginationControls currentPage={tasksCurrentPage} totalPages={tasksTotalPages} onPageChange={setTasksPage} /> : null }
              contentContainerStyle={{ paddingBottom: 10 }}
            />
          )}

          {/* History Section */}
          <Text style={appSharedStyles.sectionTitle}>History ({totalHistoryCount})</Text>
          {studentHistoryLoading && <ActivityIndicator style={styles.listLoader}/>}
          {studentHistoryError && (
            <Text style={commonSharedStyles.errorText}>
               {/* CORRECTED: Use correct variable name */}
              Error loading history: {historyErrorObject?.message}
            </Text>
          )}
          {!studentHistoryLoading && !studentHistoryError && (
            <FlatList
              data={paginatedHistory}
              keyExtractor={item => `history-${item.id}`}
              renderItem={({ item }) => <TicketHistoryItem item={item} />}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
              ListEmptyComponent={<Text style={appSharedStyles.emptyListText}>No history yet.</Text>}
              ListHeaderComponent={studentHistoryFetching && !studentHistoryLoading ? <ActivityIndicator size="small" color={colors.secondary} /> : null}
              ListFooterComponent={ historyTotalPages > 1 ? <PaginationControls currentPage={historyCurrentPage} totalPages={historyTotalPages} onPageChange={setHistoryPage} /> : null }
              contentContainerStyle={{ paddingBottom: 10 }}
            />
          )}
           <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Confirmation Modal for Deleting Task */}
      <ConfirmationModal
        visible={isDeleteTaskConfirmVisible}
        title="Confirm Remove Task"
        message={`Are you sure you want to remove the assigned task "${taskToDelete?.taskTitle || 'selected task'}"? This cannot be undone.`}
        confirmText={deleteTaskMutation.isPending ? 'Removing...' : 'Remove Task'}
        onConfirm={handleConfirmDeleteTaskAction}
        onCancel={closeDeleteConfirmModal}
        confirmDisabled={deleteTaskMutation.isPending}
      />
    </>
  );
};

// Local styles
const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeStatus: {
        fontWeight: 'bold',
        color: colors.success,
    },
    inactiveStatus: {
         fontWeight: 'bold',
         color: colors.secondary,
    },
    balanceText: {
        fontWeight: 'bold',
        color: colors.gold,
        marginTop: 5,
    },
    listLoader: {
        marginVertical: 20,
    }
});