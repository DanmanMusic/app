// src/components/admin/AdminStudentDetailView.tsx
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  ScrollView,
  Button,
  FlatList,
  SafeAreaView, // Keep SafeAreaView for consistency if needed at component level
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Toast from 'react-native-toast-message';

// Import API functions
import { deleteAssignedTask } from '../../api/assignedTasks';
import { fetchInstruments } from '../../api/instruments';
import { fetchStudentBalance } from '../../api/tickets';
import { fetchUserProfile, fetchTeachers } from '../../api/users'; // Need fetchTeachers for lookup

// Import Hooks
import { useAuth } from '../../contexts/AuthContext';
import { usePaginatedStudentHistory } from '../../hooks/usePaginatedStudentHistory';
import { usePaginatedStudentTasks } from '../../hooks/usePaginatedStudentTasks';

// Import Common Components
import { TicketHistoryItem } from '../common/TicketHistoryItem';
import ConfirmationModal from '../common/ConfirmationModal';
import PaginationControls from '../admin/PaginationControls'; // Use correct path

// Import Types and Props
import { AssignedTask, Instrument, User } from '../../types/dataTypes';
// Update Props Interface to accept onInitiatePinGeneration

// Import Helpers and Styles
import { getInstrumentNames, getUserDisplayName } from '../../utils/helpers';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { adminSharedStyles } from '../../styles/adminSharedStyles';
import { colors } from '../../styles/colors';
import { AdminStudentDetailViewProps } from '../../types/componentProps';

export const AdminStudentDetailView: React.FC<AdminStudentDetailViewProps> = ({
  viewingStudentId,
  onInitiateVerification,
  onInitiateAssignTaskForStudent,
  onInitiateEditStudent,
  onInitiateStatusUser,
  onInitiateTicketAdjustment,
  onInitiateRedemption,
  onInitiatePinGeneration, // Receive PIN generation handler
}) => {
  const { currentUserId: adminUserId } = useAuth();
  const queryClient = useQueryClient();

  const [isDeleteTaskConfirmVisible, setIsDeleteTaskConfirmVisible] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<AssignedTask | null>(null);

  // --- Data Fetching ---
  // Fetch the student's profile
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

  // Fetch student's balance
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

  // Fetch all instruments (for displaying names)
  const {
    data: fetchedInstruments = [],
    isLoading: instrumentsLoading,
  } = useQuery<Instrument[], Error>({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
  });

  // Fetch all active teachers (for displaying names)
  const {
    data: activeTeachers = [],
    isLoading: teachersLoading,
  } = useQuery<User[], Error>({
    queryKey: ['teachers', { status: 'active', context: 'studentDetailLookup' }],
    queryFn: async () => {
      const result = await fetchTeachers({ page: 1, limit: 1000 });
      return (result?.items || []).filter(t => t.status === 'active');
    },
    enabled: !!student, // Only fetch if student profile is loaded
    staleTime: 10 * 60 * 1000,
  });

  // Fetch paginated tasks for this student
  const {
    tasks: paginatedTasks,
    currentPage: tasksCurrentPage,
    totalPages: tasksTotalPages,
    setPage: setTasksPage,
    isLoading: studentTasksLoading,
    isFetching: studentTasksFetching,
    isError: studentTasksError,
    error: studentTasksErrorObject,
    totalItems: totalTasksCount,
  } = usePaginatedStudentTasks(viewingStudentId);

  // Fetch paginated history for this student
  const {
    history: paginatedHistory,
    currentPage: historyCurrentPage,
    totalPages: historyTotalPages,
    setPage: setHistoryPage,
    isLoading: studentHistoryLoading,
    isFetching: studentHistoryFetching,
    isError: studentHistoryError,
    error: historyErrorObject,
    totalItems: totalHistoryCount,
  } = usePaginatedStudentHistory(viewingStudentId);

  // --- Mutations ---
  const deleteTaskMutation = useMutation({
    mutationFn: deleteAssignedTask,
    onSuccess: (_, deletedAssignmentId) => {
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks', { studentId: viewingStudentId }] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] }); // Invalidate global query too
      closeDeleteConfirmModal();
      Toast.show({ type: 'success', text1: 'Success', text2: 'Task removed successfully.' });
    },
    onError: (error: Error, deletedAssignmentId) => {
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
       // Find teacher names from the fetched activeTeachers list
       return student.linkedTeacherIds
           .map(id => {
               const teacher = activeTeachers.find(t => t.id === id);
               return teacher ? getUserDisplayName(teacher) : `Unknown (${id.substring(0, 6)}...)`;
           })
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
     if (student && onInitiateStatusUser) { // Check if handler exists
         onInitiateStatusUser(student);
     }
  };
  const handleAdjustmentClick = () => {
    if (student && !balanceLoading && onInitiateTicketAdjustment) { // Check if handler exists
      onInitiateTicketAdjustment(student);
    } else if (balanceLoading) {
        Toast.show({ type: 'info', text1: 'Loading balance...', position: 'bottom' });
    }
  };
  const handleRedemptionClick = () => {
    if (student && !balanceLoading && onInitiateRedemption) { // Check if handler exists
       onInitiateRedemption(student);
    } else if (balanceLoading) {
        Toast.show({ type: 'info', text1: 'Loading balance...', position: 'bottom' });
    }
  };
  const handlePinGenerationClick = () => { // Handler for the new button
      if (student && onInitiatePinGeneration) { // Check if handler exists
          onInitiatePinGeneration(student);
      }
  };


  // --- Loading & Error States ---
  // Combine loading states relevant for the initial view
  const isLoading = studentLoading || instrumentsLoading || teachersLoading;

  if (isLoading) {
    return (
      // Use View instead of SafeAreaView as it's already inside AdminView's SafeAreaView
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Loading Student Details...</Text>
      </View>
    );
  }
  if (studentError || !student) {
    return (
      <View style={appSharedStyles.container}>
        <Text style={commonSharedStyles.errorText}>
          Error loading student: {studentErrorMsg?.message || 'Student not found.'}
        </Text>
      </View>
    );
  }
   if (student.role !== 'student') {
       return (
           <View style={appSharedStyles.container}>
               <Text style={commonSharedStyles.errorText}>Error: User is not a student.</Text>
           </View>
        );
   }
   // Note: Inactive student state might be handled here or passed up

  // --- Render Logic ---
  return (
    <>
      {/* Use ScrollView as content will likely exceed screen height */}
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
          {onInitiateTicketAdjustment && <Button title="Adjust Tickets" onPress={handleAdjustmentClick} disabled={!isStudentActive || balanceLoading} />}
          {onInitiateRedemption && <Button title="Redeem Reward" onPress={handleRedemptionClick} disabled={!isStudentActive || balance <= 0 || balanceLoading} color={colors.success} />}
          <Button title="Assign Task" onPress={handleAssignTaskClick} disabled={!isStudentActive} />
          <Button title="Edit Info" onPress={handleEditClick} color={colors.warning} />
          {onInitiateStatusUser && <Button title="Manage Status" onPress={handleStatusClick} color={colors.secondary} />}
          {/* Add the Login (PIN) button */}
          {onInitiatePinGeneration && (
              <Button
                  title="Login (PIN)"
                  onPress={handlePinGenerationClick} // Call the specific handler
                  color={colors.info}
                  disabled={!isStudentActive} // Only for active students
              />
          )}
        </View>

        {/* Assigned Tasks Section */}
        <Text style={appSharedStyles.sectionTitle}>Assigned Tasks ({totalTasksCount})</Text>
        {studentTasksLoading && <ActivityIndicator style={styles.listLoader}/>}
        {studentTasksError && (<Text style={commonSharedStyles.errorText}>Error loading tasks: {studentTasksErrorObject?.message}</Text>)}
        {!studentTasksLoading && !studentTasksError && (
          <FlatList
            data={paginatedTasks}
            keyExtractor={item => `task-${item.id}`}
            renderItem={({ item }) => {
              const allowVerify = onInitiateVerification && item.isComplete && item.verificationStatus === 'pending' && isStudentActive;
              const allowDelete = !item.isComplete || item.verificationStatus === 'pending'; // Admin can delete pending/incomplete
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
            scrollEnabled={false} // Contained within ScrollView
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
        {studentHistoryError && (<Text style={commonSharedStyles.errorText}>Error loading history: {historyErrorObject?.message}</Text>)}
        {!studentHistoryLoading && !studentHistoryError && (
          <FlatList
            data={paginatedHistory}
            keyExtractor={item => `history-${item.id}`}
            renderItem={({ item }) => <TicketHistoryItem item={item} />}
            scrollEnabled={false} // Contained within ScrollView
            ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
            ListEmptyComponent={<Text style={appSharedStyles.emptyListText}>No history yet.</Text>}
            ListHeaderComponent={studentHistoryFetching && !studentHistoryLoading ? <ActivityIndicator size="small" color={colors.secondary} /> : null}
            ListFooterComponent={ historyTotalPages > 1 ? <PaginationControls currentPage={historyCurrentPage} totalPages={historyTotalPages} onPageChange={setHistoryPage} /> : null }
            contentContainerStyle={{ paddingBottom: 10 }}
          />
        )}
         <View style={{ height: 30 }} />{/* Bottom padding */}
      </ScrollView>

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