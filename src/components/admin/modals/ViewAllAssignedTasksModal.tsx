// src/components/admin/modals/ViewAllAssignedTasksModal.tsx
import React, { useState } from 'react'; // Added useState
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Button,
  FlatList,
  ActivityIndicator,
  Alert, // Keep Alert for non-confirmation messages for now
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Hooks & API
import {
  usePaginatedAssignedTasks,
  TaskAssignmentFilterStatus,
  StudentTaskFilterStatus,
} from '../../../hooks/usePaginatedAssignedTasks';
import { deleteAssignedTask } from '../../../api/assignedTasks';

// Components
import PaginationControls from '../PaginationControls';
import ConfirmationModal from '../../common/ConfirmationModal'; // Import ConfirmationModal

// Mocks & Types
import { AssignedTask } from '../../../mocks/mockAssignedTasks';
import { User } from '../../../types/userTypes';

// Utils & Styles
import { getUserDisplayName } from '../../../utils/helpers';
import { colors } from '../../../styles/colors';
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { adminSharedStyles } from '../adminSharedStyles';

// --- Modal Styles --- (Keep styles as they are)
const modalStyles = StyleSheet.create({
  centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', },
  modalView: { margin: 10, backgroundColor: colors.backgroundSecondary, borderRadius: 10, padding: 0, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '95%', maxHeight: '90%', },
  modalHeader: { width: '100%', padding: 15, borderBottomWidth: 1, borderBottomColor: colors.borderPrimary, backgroundColor: colors.backgroundPrimary, borderTopLeftRadius: 10, borderTopRightRadius: 10, alignItems: 'center', },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  filterSection: { width: '100%', backgroundColor: colors.backgroundPrimary, borderBottomWidth: 1, borderBottomColor: colors.borderSecondary, paddingBottom: 10, },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 5, gap: 8, alignItems: 'center', },
  filterLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginRight: 5, },
  listContainer: { width: '100%', flex: 1, paddingHorizontal: 10, paddingTop: 10 },
  footer: { width: '100%', paddingBottom: 10, paddingTop: 5, borderTopWidth: 1, borderTopColor: colors.borderPrimary, backgroundColor: colors.backgroundPrimary, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, alignItems: 'center' },
  errorContainer: { marginVertical: 20, padding: 15, alignItems: 'center', backgroundColor: '#ffebee', borderColor: colors.danger, borderWidth: 1, borderRadius: 5, },
  errorText: { color: colors.danger, fontSize: 14, textAlign: 'center', },
});

// --- Assigned Task Detail Item Component ---
// No changes needed here, still expects onDelete(id)
const AssignedTaskDetailItem = ({
  item,
  allUsers,
  onInitiateVerification,
  onDelete,
  disabled,
}: {
  item: AssignedTask;
  allUsers: User[];
  onInitiateVerification?: (task: AssignedTask) => void;
  onDelete: (assignmentId: string) => void; // Function expects ID
  disabled?: boolean;
}) => {
  const student = allUsers.find(u => u.id === item.studentId);
  const assigner = allUsers.find(u => u.id === item.assignedById);
  const verifier = item.verifiedById ? allUsers.find(u => u.id === item.verifiedById) : null;

  const getStatusText = () => { /* ... */ if (item.isComplete) { if (item.verificationStatus === 'pending') return 'Complete (Pending Verification)'; if (item.verificationStatus) return `Verified (${item.verificationStatus})`; return 'Completed (Unknown Status)'; } return 'Assigned'; };

  const allowDelete = (!item.isComplete || item.verificationStatus === 'pending') && student?.status === 'active';
  const allowVerify = item.isComplete && item.verificationStatus === 'pending' && student?.status === 'active';

  return (
    <View style={adminSharedStyles.taskItem}>
      <Text style={adminSharedStyles.taskItemTitle}>{item.taskTitle}</Text>
      <Text style={appSharedStyles.itemDetailText}>
        Student: {student ? getUserDisplayName(student) : item.studentId}
        {student && ` (${student.status})`}
      </Text>
      <Text style={adminSharedStyles.taskItemStatus}>Status: {getStatusText()}</Text>
      <Text style={appSharedStyles.itemDetailText}>
        Assigned: {new Date(item.assignedDate).toLocaleDateString()} by{' '}
        {assigner ? getUserDisplayName(assigner) : item.assignedById}
      </Text>
      {item.completedDate && ( <Text style={appSharedStyles.itemDetailText}> Completed: {new Date(item.completedDate).toLocaleDateString()} </Text> )}
      {item.verifiedDate && item.verificationStatus !== 'pending' && ( <Text style={appSharedStyles.itemDetailText}> Verified: {new Date(item.verifiedDate).toLocaleDateString()} by{' '} {verifier ? getUserDisplayName(verifier) : item.verifiedById} </Text> )}
      {item.actualPointsAwarded !== undefined && item.verificationStatus !== 'pending' && ( <Text style={adminSharedStyles.taskItemTickets}> Awarded: {item.actualPointsAwarded ?? 0} Tickets </Text> )}
      {item.isComplete && item.verificationStatus === 'pending' && ( <Text style={adminSharedStyles.pendingNote}>Awaiting verification...</Text> )}
      <View style={adminSharedStyles.assignedTaskActions}>
        {allowVerify && onInitiateVerification && (
          <Button
            title="Verify"
            onPress={() => onInitiateVerification(item)}
            disabled={disabled}
          />
        )}
        {allowDelete && (
          <Button
            title="Remove"
            onPress={() => onDelete(item.id)} // Trigger confirmation flow
            color={colors.danger}
            disabled={!allowDelete || disabled}
          />
        )}
      </View>
    </View>
  );
};

// --- Main Modal Component ---
interface ViewAllAssignedTasksModalProps {
  visible: boolean;
  onClose: () => void;
  allUsers: User[];
  onInitiateVerification?: (task: AssignedTask) => void;
}

const ViewAllAssignedTasksModal: React.FC<ViewAllAssignedTasksModalProps> = ({
  visible,
  onClose,
  allUsers,
  onInitiateVerification,
}) => {
  const queryClient = useQueryClient();

  // --- State for Delete Confirmation ---
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);

  // Hook for pagination/filtering
  const {
    tasks, currentPage, totalPages, totalItems, setPage,
    assignmentFilter, setAssignmentFilter, studentStatusFilter, setStudentStatusFilter,
    isLoading, isFetching, isError, error,
  } = usePaginatedAssignedTasks('pending', 'active');

  // Mutation for Deleting
  const deleteMutation = useMutation({
    mutationFn: deleteAssignedTask,
    onSuccess: (_, deletedAssignmentId) => {
      console.log(`Assigned task ${deletedAssignmentId} deleted successfully via mutation.`);
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      closeDeleteConfirmModal(); // Close confirmation modal
    },
    onError: (err, deletedAssignmentId) => {
      console.error(`Error deleting assigned task ${deletedAssignmentId}:`, err);
      closeDeleteConfirmModal(); // Close confirmation modal even on error
    },
  });

  // --- Handlers ---
  // Initiate delete confirmation
  const handleDeleteTask = (assignmentId: string) => {
    setTaskToDeleteId(assignmentId);
    setIsDeleteConfirmVisible(true);
  };

  // Action from confirmation modal
  const handleConfirmDeleteAction = () => {
    if (taskToDeleteId && !deleteMutation.isPending) {
        deleteMutation.mutate(taskToDeleteId);
    }
    // Keep confirm modal open until mutation finishes (handled by onSuccess/onError)
  };

  // Close confirmation modal
  const closeDeleteConfirmModal = () => {
    setIsDeleteConfirmVisible(false);
    setTaskToDeleteId(null);
    deleteMutation.reset(); // Reset mutation state if modal is closed manually
  };


  const getErrorMessage = () => {
    if (!error) return 'An unknown error occurred.';
    return `Error loading assigned tasks: ${error.message}`;
  };

  // Find the task object to show its title in the confirmation modal
  const taskToDeleteObject = tasks.find(task => task.id === taskToDeleteId);

  return (
    <>
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            {/* Header */}
            <View style={modalStyles.modalHeader}>
              <Text style={modalStyles.modalTitle}>Assigned Tasks ({totalItems})</Text>
              {isFetching && !isLoading && (
                  <ActivityIndicator size="small" color={colors.primary} style={{ position: 'absolute', right: 15, top: 15 }}/>
              )}
            </View>

            {/* Filters */}
            <View style={modalStyles.filterSection}>
              <View style={modalStyles.filterRow}>
                <Text style={modalStyles.filterLabel}>Task Status:</Text>
                <Button title="All" onPress={() => setAssignmentFilter('all')} color={assignmentFilter === 'all' ? colors.primary : colors.secondary} />
                <Button title="Assigned" onPress={() => setAssignmentFilter('assigned')} color={assignmentFilter === 'assigned' ? colors.primary : colors.secondary} />
                <Button title="Pending" onPress={() => setAssignmentFilter('pending')} color={assignmentFilter === 'pending' ? colors.warning : colors.secondary} />
                <Button title="Completed" onPress={() => setAssignmentFilter('completed')} color={assignmentFilter === 'completed' ? colors.success : colors.secondary} />
              </View>
              <View style={modalStyles.filterRow}>
                <Text style={modalStyles.filterLabel}>Student Status:</Text>
                <Button title="Active" onPress={() => setStudentStatusFilter('active')} color={studentStatusFilter === 'active' ? colors.success : colors.secondary} />
                <Button title="Inactive" onPress={() => setStudentStatusFilter('inactive')} color={studentStatusFilter === 'inactive' ? colors.secondary : colors.secondary} />
                <Button title="All" onPress={() => setStudentStatusFilter('all')} color={studentStatusFilter === 'all' ? colors.info : colors.secondary} />
              </View>
            </View>

            {/* Loading State */}
            {isLoading && (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }}/>
            )}

            {/* Error State */}
            {isError && !isLoading && (
                <View style={modalStyles.errorContainer}>
                    <Text style={modalStyles.errorText}>{getErrorMessage()}</Text>
                </View>
            )}

            {/* List */}
            {!isLoading && !isError && (
              <FlatList
                style={modalStyles.listContainer}
                data={tasks}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <AssignedTaskDetailItem
                    item={item}
                    allUsers={allUsers}
                    onInitiateVerification={onInitiateVerification}
                    onDelete={handleDeleteTask} // Calls function to show confirmation
                    disabled={deleteMutation.isPending && taskToDeleteId === item.id} // Disable specific item during delete
                  />
                )}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={
                  <Text style={[appSharedStyles.emptyListText, { padding: 20 }]}>
                    No tasks match the current filters.
                  </Text>
                }
                contentContainerStyle={{ paddingBottom: 10 }}
              />
            )}

            {/* Footer with Pagination and Close Button */}
            <View style={modalStyles.footer}>
              {!isLoading && !isError && totalPages > 1 && (
                <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
              )}
              <View style={{ marginTop: totalPages > 1 ? 10 : 0 }}>
                <Button title="Close" onPress={onClose} color={colors.secondary} disabled={deleteMutation.isPending}/>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal Instance */}
      <ConfirmationModal
        visible={isDeleteConfirmVisible}
        title="Confirm Removal"
        message={`Are you sure you want to remove the assigned task "${taskToDeleteObject?.taskTitle || 'selected task'}"? This cannot be undone.`}
        confirmText={deleteMutation.isPending ? "Removing..." : "Remove Task"}
        onConfirm={handleConfirmDeleteAction}
        onCancel={closeDeleteConfirmModal}
        confirmDisabled={deleteMutation.isPending} // Disable confirm button during mutation
      />
    </>
  );
};

export default ViewAllAssignedTasksModal;