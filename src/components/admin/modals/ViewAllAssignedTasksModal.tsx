import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery, useQueries } from '@tanstack/react-query';
import { Modal, View, Text, Button, FlatList, ActivityIndicator } from 'react-native';

import { fetchStudents, fetchTeachers, fetchParents } from '../../../api/users';
import { deleteAssignedTask } from '../../../api/assignedTasks';
import { usePaginatedAssignedTasks } from '../../../hooks/usePaginatedAssignedTasks';

import ConfirmationModal from '../../common/ConfirmationModal';
import PaginationControls from '../PaginationControls';
import { AssignedTaskDetailItem } from '../../common/AssignedTaskDetailItem';

import { ViewAllAssignedTasksModalProps } from '../../../types/componentProps';
import { User } from '../../../types/userTypes';
import { AssignedTask } from '../../../mocks/mockAssignedTasks';
import { getUserDisplayName } from '../../../utils/helpers';

import { appSharedStyles } from '../../../styles/appSharedStyles';
import { colors } from '../../../styles/colors';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';

export const ViewAllAssignedTasksModal: React.FC<ViewAllAssignedTasksModalProps> = ({
  visible,
  onClose,
  onInitiateVerification,
}) => {
  const queryClient = useQueryClient();

  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);

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
  } = usePaginatedAssignedTasks('pending', 'active');

  const { data: allStudentsData, isLoading: isLoadingStudents } = useQuery<User[], Error>({
    queryKey: ['users', { role: 'student', limit: 9999, context: 'allTasksModal' }],
    queryFn: async () => {
      const result = await fetchStudents({ page: 1, limit: 9999, filter: 'all' });

      const studentResponses = await Promise.all(
        (result?.students || []).map(s =>
          fetch(`/api/users/${s.id}`).then(res => (res.ok ? res.json() : null))
        )
      );
      return studentResponses.filter(u => u !== null) as User[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: allTeachersData, isLoading: isLoadingTeachers } = useQuery<User[], Error>({
    queryKey: ['users', { role: 'teacher', limit: 9999, context: 'allTasksModal' }],
    queryFn: async () => {
      const result = await fetchTeachers({ page: 1 });

      return result?.items || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: allAdminsData, isLoading: isLoadingAdmins } = useQuery<User[], Error>({
    queryKey: ['users', { role: 'admin', limit: 9999, context: 'allTasksModal' }],
    queryFn: async () => {
      const response = await fetch('/api/users?role=admin&limit=1000');
      if (!response.ok) return [];
      const result = await response.json();
      return result.items || [];
    },
    staleTime: 10 * 60 * 1000,
  });

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
          status: user.status || 'unknown',
        };
      }
    });
    return lookup;
  }, [allStudentsData, allTeachersData, allAdminsData]);

  const isLoadingUsers = isLoadingStudents || isLoadingTeachers || isLoadingAdmins;

  const deleteMutation = useMutation({
    mutationFn: deleteAssignedTask,
    onSuccess: (_, deletedId) => {
      console.log(`Task ${deletedId} deleted from All Tasks modal.`);
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      closeDeleteConfirmModal();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Assigned task removed.',
        position: 'bottom',
      });
    },
    onError: error => {
      console.error('Error deleting task:', error);
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

  const taskToDeleteObject = tasks.find(task => task.id === taskToDeleteId);

  const isDataLoading = isLoadingTasks || isLoadingUsers;

  return (
    <>
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalSharedStyles.centeredView}>
          <View style={modalSharedStyles.modalView}>
            <View style={modalSharedStyles.modalHeader}>
              <Text style={modalSharedStyles.modalTitle}>Assigned Tasks ({totalItems})</Text>
              {isFetchingTasks && !isLoadingTasks && (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={{ position: 'absolute', right: 15, top: 15 }}
                />
              )}
            </View>
            <View style={modalSharedStyles.filterSection}>
              <View style={modalSharedStyles.filterRow}>
                <Text style={modalSharedStyles.filterLabel}>Task Status:</Text>
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
              <View style={modalSharedStyles.filterRow}>
                <Text style={modalSharedStyles.filterLabel}>Student Status:</Text>
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

            {isDataLoading && (
              <ActivityIndicator
                size="large"
                color={colors.primary}
                style={{ marginVertical: 30 }}
              />
            )}

            {isErrorTasks && !isLoadingTasks && (
              <View style={commonSharedStyles.errorContainer}>
                <Text style={commonSharedStyles.errorText}>
                  Error loading tasks: {errorTasks?.message}
                </Text>
              </View>
            )}

            {!isDataLoading && !isErrorTasks && (
              <FlatList
                style={modalSharedStyles.modalListContainer}
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

            <View style={modalSharedStyles.footer}>
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
                  disabled={deleteMutation.isPending}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
