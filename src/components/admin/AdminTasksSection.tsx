
import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert, 
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; 


import {
  fetchTaskLibrary,
  deleteTaskLibraryItem, 
} from '../../api/taskLibrary'; 
import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';
import { AssignedTask } from '../../mocks/mockAssignedTasks'; 


import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import CreateTaskLibraryModal from './modals/CreateTaskLibraryModal';
import EditTaskLibraryModal from './modals/EditTaskLibraryModal';
import ConfirmationModal from '../common/ConfirmationModal';


interface AdminTasksSectionProps {
  onInitiateAssignTask: () => void; 
  
  onInitiateVerification?: (task: AssignedTask) => void;
  onDeleteAssignment?: (taskId: string) => void;
}


const AdminTaskLibraryItem = ({
  item,
  onEdit,
  onDelete,
  disabled, 
}: {
  item: TaskLibraryItem;
  onEdit: (task: TaskLibraryItem) => void;
  onDelete: (task: TaskLibraryItem) => void;
  disabled?: boolean; 
}) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={appSharedStyles.itemTitle}>
      {item.title} ({item.baseTickets} pts)
    </Text>
    <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>
    <View style={adminSharedStyles.itemActions}>
      <Button title="Edit" onPress={() => onEdit(item)} disabled={disabled} />
      <Button
        title="Delete"
        onPress={() => onDelete(item)}
        color={colors.danger}
        disabled={disabled}
      />
      {}
    </View>
  </View>
);


export const AdminTasksSection: React.FC<AdminTasksSectionProps> = ({
  onInitiateAssignTask, 
  onInitiateVerification, 
  onDeleteAssignment, 
}) => {
  
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskLibraryItem | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskLibraryItem | null>(null);

  const queryClient = useQueryClient();

  
  const {
    data: taskLibrary = [], 
    isLoading,
    isError,
    error,
  } = useQuery<TaskLibraryItem[], Error>({
    queryKey: ['task-library'], 
    queryFn: fetchTaskLibrary, 
    staleTime: 5 * 60 * 1000, 
    gcTime: 10 * 60 * 1000,
  });

  
  const deleteMutation = useMutation({
    mutationFn: deleteTaskLibraryItem, 
    onSuccess: (_, deletedTaskId) => {
      console.log(`Task library item ${deletedTaskId} deleted successfully via mutation.`);
      
      queryClient.invalidateQueries({ queryKey: ['task-library'] });
      closeDeleteModal(); 
    },
    onError: (err, deletedTaskId) => {
      console.error(`Error deleting task library item ${deletedTaskId}:`, err);
      
      closeDeleteModal();
    },
  });

  
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
    deleteMutation.reset(); 
  };

  
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
      {}
      <View style={{ alignItems: 'flex-start', marginBottom: 20, gap: 5 }}>
        <Button title="Assign Task to Student" onPress={onInitiateAssignTask} />
      </View>

      {}
      <Text style={adminSharedStyles.sectionSubTitle}>Task Library ({taskLibrary.length})</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button title="Create New Task Library Item" onPress={handleAddPress} />
      </View>

      {}
      {isLoading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
      )}

      {}
      {isError && !isLoading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{getErrorMessage()}</Text>
        </View>
      )}

      {}
      {!isLoading && !isError && (
        <FlatList
          data={taskLibrary} 
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AdminTaskLibraryItem
              item={item}
              onEdit={handleEditPress}
              onDelete={handleDeletePress}
              disabled={deleteMutation.isPending} 
            />
          )}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No task library items found.</Text>
          )}
        />
      )}

      {}
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
        
        confirmDisabled={deleteMutation.isPending}
      />
    </View>
  );
};


const styles = StyleSheet.create({
  errorContainer: {
    marginVertical: 20,
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#ffebee', 
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
