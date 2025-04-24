// src/components/admin/AdminStudentDetailView.tsx

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
  Alert,
} from 'react-native';
import { deleteAssignedTask } from '../../api/assignedTasks';
import { fetchInstruments } from '../../api/instruments';
import { fetchStudentBalance } from '../../api/tickets';
import { fetchTeachers } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext'; // Import useAuth
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
import { adminSharedStyles } from '../../styles/adminSharedStyles';
import ManualTicketAdjustmentModal from './modals/ManualTicketAdjustmentModal';
import RedeemRewardModal from './modals/RedeemRewardModal'; // Import the new modal
import PaginationControls from './PaginationControls';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const AdminStudentDetailView: React.FC<AdminStudentDetailViewProps> = ({
  viewingStudentId,
  onInitiateVerification,
  onInitiateAssignTaskForStudent,
}) => {
  const { currentUserId: adminUserId } = useAuth(); // Get the admin's ID
  const queryClient = useQueryClient();

  // --- State for Modals specific to this view ---
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [isAdjustmentModalVisible, setIsAdjustmentModalVisible] = useState(false);
  const [isDeleteTaskConfirmVisible, setIsDeleteTaskConfirmVisible] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  const [isRedeemModalVisible, setIsRedeemModalVisible] = useState(false); // State for new modal

  // --- Queries for Detail View Content ---
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

  // --- Mutations ---
  const deleteTaskMutation = useMutation({
     mutationFn: deleteAssignedTask,
     onSuccess: (_, deletedAssignmentId) => {
         Alert.alert('Success', 'Task assignment removed.');
         queryClient.invalidateQueries({ queryKey: ['assigned-tasks', { studentId: viewingStudentId }] });
         queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
         closeDeleteConfirmModal();
     },
     onError: (error) => {
         Alert.alert('Error', `Failed to remove task: ${error instanceof Error ? error.message : 'Unknown error'}`);
         closeDeleteConfirmModal();
     },
  });

  // --- Event Handlers specific to this view ---
  const handleEditStudent = () => setIsEditModalVisible(true);
  const handleManageStatus = () => setIsStatusModalVisible(true);
  const handleLoginAsStudent = () => { if (student) alert(`Simulating QR Code for ${getUserDisplayName(student)}...`); };
  const handleOpenAdjustmentModal = () => setIsAdjustmentModalVisible(true);
  const handleOpenRedeemModal = () => setIsRedeemModalVisible(true); // Handler to open the modal

  // Modal close handlers
  const closeEditModal = () => setIsEditModalVisible(false);
  const closeStatusModal = () => setIsStatusModalVisible(false);
  const closeAdjustmentModal = () => setIsAdjustmentModalVisible(false);
  const closeDeleteConfirmModal = () => { setIsDeleteTaskConfirmVisible(false); setTaskToDeleteId(null); deleteTaskMutation.reset(); };
  const handleCloseRedeemModal = () => setIsRedeemModalVisible(false); // Handler to close the modal


  // Task specific handlers
  const handleDeleteAssignmentClick = (assignmentId: string) => { setTaskToDeleteId(assignmentId); setIsDeleteTaskConfirmVisible(true); };
  const handleConfirmDeleteTask = () => { if (taskToDeleteId && !deleteTaskMutation.isPending) deleteTaskMutation.mutate(taskToDeleteId); };
  const handleVerifyTaskClick = (task: AssignedTask) => { if (student && onInitiateVerification) onInitiateVerification(task); };
  const handleAssignTaskClick = () => { if (student) onInitiateAssignTaskForStudent(student.id); }; // Use passed prop


  // --- Loading and Error States ---
  const isLoading = studentLoading || instrumentsLoading || teachersLoading;
  if (isLoading) {
      return (
          <SafeAreaView style={appSharedStyles.safeArea}>
              <View style={[appSharedStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
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

  // --- Main Render ---
  const studentDisplayName = getUserDisplayName(student);
  const isStudentActive = student.status === 'active';

  return (
    <>
      <SafeAreaView style={appSharedStyles.safeArea}>
        <ScrollView style={appSharedStyles.container}>
          {/* Student Info Section */}
          <Text style={appSharedStyles.sectionTitle}>Student Details</Text>
          <Text style={appSharedStyles.itemDetailText}>Name: {studentDisplayName}</Text>
          <Text style={appSharedStyles.itemDetailText}>ID: {student.id}</Text>
          <Text style={appSharedStyles.itemDetailText}>
            Status: <Text style={{ fontWeight: 'bold', color: isStudentActive ? colors.success : colors.secondary }}>{student.status}</Text>
          </Text>
          <Text style={appSharedStyles.itemDetailText}>
            Instrument(s): {getInstrumentNames(student.instrumentIds, fetchedInstruments)}
          </Text>
          {teachersLoading ? (
             <Text style={appSharedStyles.itemDetailText}>Linked Teachers: Loading...</Text>
          ) : student.linkedTeacherIds && student.linkedTeacherIds.length > 0 ? (
            <Text style={appSharedStyles.itemDetailText}>
              Linked Teachers: {student.linkedTeacherIds.map(id => getUserDisplayName(allTeachers.find(t => t.id === id))).join(', ') || 'N/A'}
            </Text>
          ) : (
             <Text style={appSharedStyles.itemDetailText}>Linked Teachers: None</Text>
          )}

          {balanceLoading ? (
            <Text style={[appSharedStyles.itemDetailText, { fontWeight: 'bold' }]}>Balance: Loading...</Text>
          ) : balanceError ? (
            <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textDanger]}>Balance: Error</Text>
          ) : (
            <Text style={[appSharedStyles.itemDetailText, { fontWeight: 'bold' }]}>Balance: {balance} Tickets</Text>
          )}

          {/* Action Buttons Section */}
          <View style={[adminSharedStyles.adminStudentActions, commonSharedStyles.actionButtonsContainer]}>
            <Button title="Adjust Tickets" onPress={handleOpenAdjustmentModal} disabled={!isStudentActive || balanceLoading} />
            <Button
              title="Redeem Reward"
              onPress={handleOpenRedeemModal} // Use the new handler
              disabled={!isStudentActive || balance <= 0}
              color={colors.success}
            />
            <Button title="Assign Task" onPress={handleAssignTaskClick} disabled={!isStudentActive} />
            <Button title="Edit Info" onPress={handleEditStudent} color={colors.warning} />
            <Button title="Manage Status" onPress={handleManageStatus} color={colors.secondary} />
            <Button title="Login (QR)" onPress={handleLoginAsStudent} color={colors.info} disabled={!isStudentActive} />
          </View>

          {/* Assigned Tasks Section */}
          <Text style={appSharedStyles.sectionTitle}>Assigned Tasks ({totalTasksCount})</Text>
          {studentTasksLoading && <ActivityIndicator />}
          {studentTasksError && <Text style={appSharedStyles.textDanger}>Error loading tasks: {studentTasksErrorObject?.message}</Text>}
          {!studentTasksLoading && !studentTasksError && (
            <FlatList
              data={paginatedTasks}
              keyExtractor={item => `task-${item.id}`}
              renderItem={({ item }) => {
                  const allowDelete = (!item.isComplete || item.verificationStatus === 'pending') && isStudentActive;
                  const allowVerify = item.isComplete && item.verificationStatus === 'pending' && isStudentActive;
                  const taskStatus = item.isComplete
                      ? item.verificationStatus === 'pending' ? 'Complete (Pending Verification)'
                      : `Verified (${item.verificationStatus || 'status unknown'})`
                      : 'Assigned';
                  return (
                      <View style={adminSharedStyles.taskItem}>
                          <Text style={adminSharedStyles.taskItemTitle}>{item.taskTitle}</Text>
                          <Text style={adminSharedStyles.taskItemStatus}>Status: {taskStatus}</Text>
                          {item.completedDate && <Text style={appSharedStyles.itemDetailText}>Completed: {new Date(item.completedDate).toLocaleDateString()}</Text>}
                          {item.verifiedDate && item.verificationStatus !== 'pending' && <Text style={appSharedStyles.itemDetailText}>Verified: {new Date(item.verifiedDate).toLocaleDateString()}</Text>}
                          {item.actualPointsAwarded !== undefined && item.verificationStatus !== 'pending' && <Text style={adminSharedStyles.taskItemTickets}>Awarded: {item.actualPointsAwarded ?? 0} Tickets</Text>}
                          {item.isComplete && item.verificationStatus === 'pending' && <Text style={commonSharedStyles.pendingNote}>Awaiting verification...</Text>}
                          <View style={adminSharedStyles.assignedTaskActions}>
                              {onInitiateVerification && allowVerify && (
                                  <Button title="Verify" onPress={() => handleVerifyTaskClick(item)} disabled={deleteTaskMutation.isPending}/>
                              )}
                              {allowDelete && (
                                  <Button
                                      title={deleteTaskMutation.isPending && deleteTaskMutation.variables === item.id ? 'Removing...' : 'Remove'}
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
              ListEmptyComponent={() => <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text>}
              ListFooterComponent={tasksTotalPages > 1 ? <PaginationControls currentPage={tasksCurrentPage} totalPages={tasksTotalPages} onPageChange={setTasksPage} /> : null}
              contentContainerStyle={{ paddingBottom: 10 }}
            />
          )}

          {/* History Section */}
          <Text style={appSharedStyles.sectionTitle}>History ({totalHistoryCount})</Text>
          {studentHistoryLoading && <ActivityIndicator />}
          {studentHistoryError && <Text style={appSharedStyles.textDanger}>Error loading history: {studentHistoryErrorObject?.message}</Text>}
          {!studentHistoryLoading && !studentHistoryError && (
             <FlatList
                data={paginatedHistory}
                keyExtractor={item => `history-${item.id}`}
                renderItem={({ item }) => <TicketHistoryItem item={item} />}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                ListEmptyComponent={() => <Text style={appSharedStyles.emptyListText}>No history yet.</Text>}
                ListFooterComponent={historyTotalPages > 1 ? <PaginationControls currentPage={historyCurrentPage} totalPages={historyTotalPages} onPageChange={setHistoryPage} /> : null}
                contentContainerStyle={{ paddingBottom: 10 }}
            />
          )}

           <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Modals managed by this detail view */}
      {student && adminUserId && (
        <>
          <DeactivateOrDeleteUserModal
            visible={isStatusModalVisible}
            user={student}
            onClose={closeStatusModal}
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
          {/* Render the RedeemRewardModal here */}
          <RedeemRewardModal
            visible={isRedeemModalVisible}
            onClose={handleCloseRedeemModal}
            studentId={student.id}
            studentName={studentDisplayName}
            currentBalance={balance}
            redeemerId={adminUserId} // Pass the admin's ID
          />
        </>
      )}
    </>
  );
};