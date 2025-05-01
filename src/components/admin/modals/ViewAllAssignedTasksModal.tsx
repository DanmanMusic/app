// src/components/admin/modals/ViewAllAssignedTasksModal.tsx
import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Modal, View, Text, Button, FlatList, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';

// Import API functions
import { fetchStudents, fetchTeachers, fetchAdmins, fetchUserProfile } from '../../../api/users';
import { deleteAssignedTask } from '../../../api/assignedTasks';

// Import Hooks
import { usePaginatedAssignedTasks } from '../../../hooks/usePaginatedAssignedTasks';

// Import Components
import { AssignedTaskDetailItem } from '../../common/AssignedTaskDetailItem';
import ConfirmationModal from '../../common/ConfirmationModal';
import PaginationControls from '../PaginationControls';

// Import Types
import { User } from '../../../types/dataTypes'; // Added UserRole
import { ViewAllAssignedTasksModalProps } from '../../../types/componentProps';

// Import Styles & Helpers
import { getUserDisplayName } from '../../../utils/helpers';
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';

export const ViewAllAssignedTasksModal: React.FC<ViewAllAssignedTasksModalProps> = ({
  visible,
  onClose,
  onInitiateVerification,
}) => {
  const queryClient = useQueryClient();
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);

  // Hook for paginated tasks
  const {
    tasks,
    currentPage,
    totalPages,
    totalItems,
    setPage,
    assignmentFilter,
    setAssignmentFilter,
    studentStatusFilter,
    setStudentStatusFilter,
    isLoading: isLoadingTasks,
    isFetching: isFetchingTasks,
    isError: isErrorTasks,
    error: errorTasks,
  } = usePaginatedAssignedTasks('pending', 'active'); // Default filters

  // --- Fetch all necessary user data for lookups when modal is visible ---

  // Fetch Students (Simplified initially, then fetch full profiles)
  const { data: allStudentsData, isLoading: isLoadingStudents } = useQuery<User[], Error>({
    queryKey: ['students', { filter: 'all', limit: 9999, context: 'allTasksModalLookup' }],
    queryFn: async () => {
      const result = await fetchStudents({ page: 1, limit: 9999, filter: 'all' });
      // Fetch full profiles for lookup - consider performance implications
      const students = await Promise.all((result?.students || []).map(s => fetchUserProfile(s.id)));
      return students.filter((u): u is User => u !== null); // Filter out any null results
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 mins
    enabled: visible, // Only run when modal is visible
  });

  // Fetch Teachers
  const { data: allTeachersData, isLoading: isLoadingTeachers } = useQuery<User[], Error>({
    queryKey: ['teachers', { limit: 9999, context: 'allTasksModalLookup' }],
    queryFn: async () => {
      const result = await fetchTeachers({ page: 1, limit: 9999 });
      return result?.items || [];
    },
    staleTime: 10 * 60 * 1000,
    enabled: visible,
  });

  // Fetch Admins
  const { data: allAdminsData, isLoading: isLoadingAdmins } = useQuery<User[], Error>({
    queryKey: ['admins', { limit: 9999, context: 'allTasksModalLookup' }],
    queryFn: async () => {
      const result = await fetchAdmins({ page: 1, limit: 9999 });
      return result?.items || [];
    },
    staleTime: 10 * 60 * 1000,
    enabled: visible,
  });

  // Create a lookup map for user names and statuses
  const userLookup = useMemo(() => {
    const lookup: Record<string, { name: string; status: 'active' | 'inactive' | 'unknown' }> = {};
    const allUsers = [
      ...(allStudentsData || []),
      ...(allTeachersData || []),
      ...(allAdminsData || []),
    ];
    allUsers.forEach(user => {
      if (user && user.id) {
        lookup[user.id] = {
          name: getUserDisplayName(user),
          status: user.status || 'unknown', // Handle potential missing status
        };
      }
    });
    return lookup;
  }, [allStudentsData, allTeachersData, allAdminsData]);

  // Combined loading state for all user lookups
  const isLoadingUsers = isLoadingStudents || isLoadingTeachers || isLoadingAdmins;

  // Mutation for deleting an assigned task
  const deleteMutation = useMutation({
    mutationFn: deleteAssignedTask,
    onSuccess: (_, deletedId) => {
      console.log(`Task ${deletedId} deleted from All Tasks modal.`);
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] }); // Invalidate relevant queries
      closeDeleteConfirmModal();
      Toast.show({ type: 'success', text1: 'Success', text2: 'Assigned task removed.' });
    },
    onError: error => {
      console.error('Error deleting task:', error);
      closeDeleteConfirmModal();
      Toast.show({
        type: 'error',
        text1: 'Removal Failed',
        text2: error instanceof Error ? error.message : 'Could not remove task.',
      });
    },
  });

  // Handlers
  const handleDeleteTask = (assignmentId: string) => {
    setTaskToDeleteId(assignmentId);
    setIsDeleteConfirmVisible(true);
  };
  const handleConfirmDeleteAction = () => {
    if (taskToDeleteId && !deleteMutation.isPending) {
      deleteMutation.mutate(taskToDeleteId);
    }
  };
  const closeDeleteConfirmModal = () => {
    setIsDeleteConfirmVisible(false);
    setTaskToDeleteId(null);
    deleteMutation.reset();
  };

  // Find the task object to show in the delete confirmation modal
  const taskToDeleteObject = tasks.find(task => task.id === taskToDeleteId);

  // Combined loading state for the main view
  const isDataLoading = isLoadingTasks || isLoadingUsers;

  return (
    <>
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={appSharedStyles.centeredView}>
          <View style={appSharedStyles.modalView}>
            {/* Header */}
            <View style={appSharedStyles.modalHeader}>
              <Text style={appSharedStyles.modalTitle}>Assigned Tasks ({totalItems})</Text>
              {isFetchingTasks && !isLoadingTasks && (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={{ position: 'absolute', right: 15, top: 15 }}
                />
              )}
            </View>

            {/* Filters */}
            <View style={appSharedStyles.filterSection}>
              <View style={appSharedStyles.filterRow}>
                <Text style={appSharedStyles.filterLabel}>Task Status:</Text>
                <Button
                  title="All"
                  onPress={() => setAssignmentFilter('all')}
                  color={assignmentFilter === 'all' ? colors.primary : colors.secondary}
                />
                <Button
                  title="Assigned"
                  onPress={() => setAssignmentFilter('assigned')}
                  color={assignmentFilter === 'assigned' ? colors.primary : colors.secondary}
                />
                <Button
                  title="Pending"
                  onPress={() => setAssignmentFilter('pending')}
                  color={assignmentFilter === 'pending' ? colors.warning : colors.secondary}
                />
                <Button
                  title="Completed"
                  onPress={() => setAssignmentFilter('completed')}
                  color={assignmentFilter === 'completed' ? colors.success : colors.secondary}
                />
              </View>
              <View style={appSharedStyles.filterRow}>
                <Text style={appSharedStyles.filterLabel}>Student Status:</Text>
                <Button
                  title="Active"
                  onPress={() => setStudentStatusFilter('active')}
                  color={studentStatusFilter === 'active' ? colors.success : colors.secondary}
                />
                <Button
                  title="Inactive"
                  onPress={() => setStudentStatusFilter('inactive')}
                  color={studentStatusFilter === 'inactive' ? colors.secondary : colors.secondary}
                />
                <Button
                  title="All"
                  onPress={() => setStudentStatusFilter('all')}
                  color={studentStatusFilter === 'all' ? colors.info : colors.secondary}
                />
              </View>
            </View>

            {/* Loading Indicator */}
            {isDataLoading && (
              <ActivityIndicator
                size="large"
                color={colors.primary}
                style={{ marginVertical: 30 }}
              />
            )}

            {/* Error Display */}
            {isErrorTasks && !isLoadingTasks && (
              <View style={commonSharedStyles.errorContainer}>
                <Text style={commonSharedStyles.errorText}>
                  Error loading tasks: {errorTasks?.message}
                </Text>
              </View>
            )}
            {/* Sub-loading indicator for user lookup */}
            {!isDataLoading && isLoadingUsers && (
              <Text
                style={[
                  appSharedStyles.textCenter,
                  { color: colors.textLight, marginVertical: 10 },
                ]}
              >
                Loading user details...
              </Text>
            )}

            {/* Task List */}
            {!isDataLoading && !isErrorTasks && (
              <FlatList
                style={appSharedStyles.modalListContainer}
                data={tasks}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                  const studentInfo = userLookup[item.studentId] || {
                    name: `ID: ${item.studentId}`,
                    status: 'unknown',
                  };
                  const assignerInfo = userLookup[item.assignedById] || {
                    name: `ID: ${item.assignedById}`,
                    status: 'unknown',
                  };
                  const verifierInfo = item.verifiedById ? userLookup[item.verifiedById] : null;

                  return (
                    <AssignedTaskDetailItem
                      item={item}
                      studentName={studentInfo.name}
                      assignerName={assignerInfo.name}
                      verifierName={verifierInfo?.name}
                      studentStatus={studentInfo.status}
                      onInitiateVerification={onInitiateVerification}
                      onDelete={handleDeleteTask}
                      disabled={deleteMutation.isPending && taskToDeleteId === item.id}
                    />
                  );
                }}
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
            <View style={appSharedStyles.footer}>
              {!isDataLoading && !isErrorTasks && totalPages > 1 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              )}
              <View style={{ marginTop: totalPages > 1 ? 10 : 0 }}>
                <Button
                  title="Close"
                  onPress={onClose}
                  color={colors.secondary}
                  disabled={deleteMutation.isPending} // Disable close if delete is happening? Or allow? Allowing for now.
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={isDeleteConfirmVisible}
        title="Confirm Removal"
        message={`Are you sure you want to remove the assigned task "${taskToDeleteObject?.taskTitle || 'selected task'}"? This cannot be undone.`}
        confirmText={deleteMutation.isPending ? 'Removing...' : 'Remove Task'}
        onConfirm={handleConfirmDeleteAction}
        onCancel={closeDeleteConfirmModal}
        confirmDisabled={deleteMutation.isPending}
      />
    </>
  );
};
