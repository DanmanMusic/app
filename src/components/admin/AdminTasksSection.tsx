// src/components/admin/AdminTasksSection.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert, // Added Alert
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Added TQ imports

// API & Types
import {
  fetchTaskLibrary,
  deleteTaskLibraryItem, // Import delete function
} from '../../api/taskLibrary'; // Use new API file
import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';
import { AssignedTask } from '../../mocks/mockAssignedTasks'; // Keep if needed for other props

// Components & Styles
import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import CreateTaskLibraryModal from './modals/CreateTaskLibraryModal';
import EditTaskLibraryModal from './modals/EditTaskLibraryModal';
import ConfirmationModal from '../common/ConfirmationModal';

// Interface updated: Removed taskLibrary and CRUD props
interface AdminTasksSectionProps {
  onInitiateAssignTask: () => void; // General assign task button trigger
  // Props related to Assigned Tasks (kept for now)
  onInitiateVerification?: (task: AssignedTask) => void;
  onDeleteAssignment?: (taskId: string) => void;
}

// Task Library Item Component (No changes needed structurally, but remove assign button logic if not already done)
const AdminTaskLibraryItem = ({
  item,
  onEdit,
  onDelete,
  disabled, // Added disabled prop
}: {
  item: TaskLibraryItem;
  onEdit: (task: TaskLibraryItem) => void;
  onDelete: (task: TaskLibraryItem) => void;
  disabled?: boolean; // Disable buttons during delete
}) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={appSharedStyles.itemTitle}>
      {item.title} ({item.baseTickets} pts)
    </Text>
    <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>
    <View style={adminSharedStyles.itemActions}>
      <Button title="Edit" onPress={() => onEdit(item)} disabled={disabled} />
      <Button title="Delete" onPress={() => onDelete(item)} color={colors.danger} disabled={disabled} />
      {/* Removed Assign button previously */}
    </View>
  </View>
);

// Main component updated to use useQuery and useMutation for delete
export const AdminTasksSection: React.FC<AdminTasksSectionProps> = ({
  onInitiateAssignTask, // General trigger remains
  onInitiateVerification, // Keep if needed
  onDeleteAssignment, // Keep if needed
}) => {
  // State for Modals (Create, Edit, Delete Confirmation)
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskLibraryItem | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskLibraryItem | null>(null);

  const queryClient = useQueryClient();

  // --- TanStack Query Hook for fetching data ---
  const {
    data: taskLibrary = [], // Default to empty array
    isLoading,
    isError,
    error,
  } = useQuery<TaskLibraryItem[], Error>({
    queryKey: ['task-library'], // Unique key for this query
    queryFn: fetchTaskLibrary, // Function to fetch data
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  // --- TanStack Mutation Hook for Deleting ---
  const deleteMutation = useMutation({
    mutationFn: deleteTaskLibraryItem, // API function: expects taskId
    onSuccess: (_, deletedTaskId) => {
      console.log(`Task library item ${deletedTaskId} deleted successfully via mutation.`);
      // Invalidate the query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['task-library'] });
      closeDeleteModal(); // Close confirmation modal on success
    },
    onError: (err, deletedTaskId) => {
      console.error(`Error deleting task library item ${deletedTaskId}:`, err);
      // Keep delete confirmation modal open on error? Or close? Closing for now.
      closeDeleteModal();
    },
  });

  // Handlers for Modals
  const handleAddPress = () => setIsCreateModalVisible(true);
  const handleEditPress = (task: TaskLibraryItem) => {
    setTaskToEdit(task);
    setIsEditModalVisible(true);
  };
  const handleDeletePress = (task: TaskLibraryItem) => {
    setTaskToDelete(task);
    setIsDeleteModalVisible(true);
  };
  const closeCreateModal = () => setIsCreateModalVisible(false);
  const closeEditModal = () => {
    setIsEditModalVisible(false);
    setTaskToEdit(null);
  };
  const closeDeleteModal = () => {
    setIsDeleteModalVisible(false);
    setTaskToDelete(null);
    deleteMutation.reset(); // Reset mutation state when closing
  };

  // Confirmation handler calls the mutation
  const handleDeleteConfirm = () => {
    if (taskToDelete && !deleteMutation.isPending) {
      deleteMutation.mutate(taskToDelete.id);
    }
  };

  const getErrorMessage = () => {
    if (!error) return 'An unknown error occurred.';
    return `Error loading task library: ${error.message}`;
  };

  return (
    <View>
      <Text style={appSharedStyles.sectionTitle}>Task Management</Text>
      {/* General Assign Task Button */}
      <View style={{ alignItems: 'flex-start', marginBottom: 20, gap: 5 }}>
        <Button title="Assign Task to Student" onPress={onInitiateAssignTask} />
      </View>

      {/* Task Library Section */}
      <Text style={adminSharedStyles.sectionSubTitle}>Task Library ({taskLibrary.length})</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button title="Create New Task Library Item" onPress={handleAddPress} />
      </View>

      {/* Loading State */}
      {isLoading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{getErrorMessage()}</Text>
        </View>
      )}

      {/* Data List */}
      {!isLoading && !isError && (
        <FlatList
          data={taskLibrary} // Use data from useQuery
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AdminTaskLibraryItem
              item={item}
              onEdit={handleEditPress}
              onDelete={handleDeletePress}
              disabled={deleteMutation.isPending} // Disable row buttons if delete is happening
            />
          )}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No task library items found.</Text>
          )}
        />
      )}

      {/* Modals (Pass only necessary props) */}
      <CreateTaskLibraryModal visible={isCreateModalVisible} onClose={closeCreateModal} />
      <EditTaskLibraryModal
        visible={isEditModalVisible}
        taskToEdit={taskToEdit}
        onClose={closeEditModal}
      />
      <ConfirmationModal
        visible={isDeleteModalVisible}
        title="Confirm Delete"
        message={`Are you sure you want to delete the library task "${
          taskToDelete?.title || ''
        }"? This action is safe for previously assigned tasks.`}
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete Task'}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
        // Disable confirm button while deleting
        confirmDisabled={deleteMutation.isPending}
      />
    </View>
  );
};

// Add local styles if needed, e.g., for error display
const styles = StyleSheet.create({
  errorContainer: {
    marginVertical: 20,
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#ffebee', // Light red background
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 5,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
});