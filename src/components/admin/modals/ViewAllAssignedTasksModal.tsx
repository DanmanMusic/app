import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Modal, View, Text, Button, FlatList, ActivityIndicator } from 'react-native';
import { fetchStudents, fetchTeachers, fetchParents } from '../../../api/users';
import { usePaginatedAssignedTasks } from '../../../hooks/usePaginatedAssignedTasks';
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { colors } from '../../../styles/colors';
import { ViewAllAssignedTasksModalProps } from '../../../types/componentProps';
import { User } from '../../../types/userTypes';
import ConfirmationModal from '../../common/ConfirmationModal';
import PaginationControls from '../PaginationControls';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import { AssignedTaskDetailItem } from '../../common/AssignedTaskDetailItem';

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

  const { data: studentData, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students', { page: 1, limit: 1000, filter: 'all' }],
    queryFn: () => fetchStudents({ page: 1, filter: 'all' }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: teacherData, isLoading: isLoadingTeachers } = useQuery({
    queryKey: ['teachers', { page: 1, limit: 1000 }],
    queryFn: () => fetchTeachers({ page: 1 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: parentData, isLoading: isLoadingParents } = useQuery({
    queryKey: ['parents', { page: 1, limit: 1000 }],
    queryFn: () => fetchParents({ page: 1 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: adminData, isLoading: isLoadingAdmins } = useQuery({
    queryKey: ['users', { role: 'admin' }],
    queryFn: async () => {
      const response = await fetch('/api/users?role=admin&limit=100');
      if (!response.ok) return [];
      const result = await response.json();
      return result.items || [];
    },
    staleTime: 15 * 60 * 1000,
  });

  const allUsers = useMemo(() => {
    const studentsForLookup = (studentData?.students ?? []).map(
      s => ({ ...s, role: 'student' }) as unknown as User
    );
    const teachersForLookup = teacherData?.items ?? [];
    const parentsForLookup = parentData?.items ?? [];
    const adminsForLookup = adminData ?? [];

    return [...studentsForLookup, ...teachersForLookup, ...parentsForLookup, ...adminsForLookup];
  }, [studentData, teacherData, parentData, adminData]);

  const isLoadingUsers =
    isLoadingStudents || isLoadingTeachers || isLoadingParents || isLoadingAdmins;

  const deleteMutation = useMutation({});

  const handleDeleteTask = (assignmentId: string) => {};
  const handleConfirmDeleteAction = () => {};
  const closeDeleteConfirmModal = () => {};
  const getErrorMessage = () => {};

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
                <Text style={commonSharedStyles.errorText}>Error</Text>
              </View>
            )}
            {!isDataLoading && !isErrorTasks && (
              <FlatList
                style={modalSharedStyles.modalListContainer}
                data={tasks}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <AssignedTaskDetailItem
                    item={item}
                    allUsers={allUsers}
                    onInitiateVerification={onInitiateVerification}
                    onDelete={handleDeleteTask}
                    disabled={deleteMutation.isPending && taskToDeleteId === item.id}
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
