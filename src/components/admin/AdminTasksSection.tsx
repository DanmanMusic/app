// src/components/admin/AdminTasksSection.tsx
import React, { useState } from 'react';
import { View, Text, Button, FlatList } from 'react-native'; // Removed Alert, Platform

// Mocks & Types
import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';
import { AssignedTask } from '../../mocks/mockAssignedTasks'; // Keep if needed for verification/delete props

// Components & Styles
import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import CreateTaskLibraryModal from './modals/CreateTaskLibraryModal';
import EditTaskLibraryModal from './modals/EditTaskLibraryModal';
import ConfirmationModal from '../common/ConfirmationModal';


// Interface updated: Removed onInitiateAssignTaskLibraryItem
interface AdminTasksSectionProps {
  taskLibrary: TaskLibraryItem[];
  onCreateTaskLibraryItem: (taskData: Omit<TaskLibraryItem, 'id'>) => void;
  onEditTaskLibraryItem: (taskId: string, taskData: Partial<Omit<TaskLibraryItem, 'id'>>) => void;
  onDeleteTaskLibraryItem: (taskId: string) => void;
  onInitiateAssignTask: () => void; // General assign task button trigger
  // Removed: onInitiateAssignTaskLibraryItem: (task: TaskLibraryItem) => void;
  onInitiateVerification?: (task: AssignedTask) => void; // Keep if used elsewhere
  onDeleteAssignment?: (taskId: string) => void; // Keep if used elsewhere
}

// Component updated: Removed Assign button and onTriggerAssignFlow prop
const AdminTaskLibraryItem = ({
  item,
  onEdit,
  onDelete,
  // Removed: onTriggerAssignFlow,
}: {
  item: TaskLibraryItem;
  onEdit: (task: TaskLibraryItem) => void;
  onDelete: (task: TaskLibraryItem) => void;
  // Removed: onTriggerAssignFlow: (task: TaskLibraryItem) => void;
}) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={appSharedStyles.itemTitle}>
      {item.title} ({item.baseTickets} pts)
    </Text>
    <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>
    <View style={adminSharedStyles.itemActions}>
      <Button title="Edit" onPress={() => onEdit(item)} />
      <Button title="Delete" onPress={() => onDelete(item)} color={colors.danger} />
      {/* Removed Assign button */}
      {/* <Button title="Assign" onPress={() => onTriggerAssignFlow(item)} /> */}
    </View>
  </View>
);

// Main component updated: Destructure props without onInitiateAssignTaskLibraryItem
export const AdminTasksSection: React.FC<AdminTasksSectionProps> = ({
  taskLibrary,
  onCreateTaskLibraryItem,
  onEditTaskLibraryItem,
  onDeleteTaskLibraryItem,
  onInitiateAssignTask, // General trigger remains
  // Removed: onInitiateAssignTaskLibraryItem,
  onInitiateVerification, // Keep if needed
  onDeleteAssignment, // Keep if needed
}) => {
  // State for CRUD modals remains the same
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskLibraryItem | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskLibraryItem | null>(null);

  // Handlers for CRUD modals remain the same
  const handleAddPress = () => setIsCreateModalVisible(true);
  const handleEditPress = (task: TaskLibraryItem) => { /* ... */
    setTaskToEdit(task);
    setIsEditModalVisible(true);
  };
  const handleDeletePress = (task: TaskLibraryItem) => { /* ... */
     setTaskToDelete(task);
    setIsDeleteModalVisible(true);
  };
  const closeCreateModal = () => setIsCreateModalVisible(false);
  const closeEditModal = () => { /* ... */
    setIsEditModalVisible(false);
    setTaskToEdit(null);
  };
  const closeDeleteModal = () => { /* ... */
    setIsDeleteModalVisible(false);
    setTaskToDelete(null);
  };
  const handleCreateConfirm = (taskData: Omit<TaskLibraryItem, 'id'>) => { /* ... */
    onCreateTaskLibraryItem(taskData);
    closeCreateModal();
  };
  const handleEditConfirm = (taskId: string, taskData: Partial<Omit<TaskLibraryItem, 'id'>>) => { /* ... */
     onEditTaskLibraryItem(taskId, taskData);
    closeEditModal();
  };
  const handleDeleteConfirm = () => { /* ... */
    if (taskToDelete) {
      onDeleteTaskLibraryItem(taskToDelete.id);
    }
    closeDeleteModal();
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
      {/* FlatList rendering AdminTaskLibraryItem (without assign button) */}
      <FlatList
        data={taskLibrary.sort((a, b) => a.title.localeCompare(b.title))} // Sort added for consistency
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <AdminTaskLibraryItem
            item={item}
            onEdit={handleEditPress}
            onDelete={handleDeletePress}
            // Removed onTriggerAssignFlow prop
          />
        )}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
        ListEmptyComponent={() => (
          <Text style={appSharedStyles.emptyListText}>No task library items found.</Text>
        )}
      />

      {/* CRUD Modals remain the same */}
      <CreateTaskLibraryModal
        visible={isCreateModalVisible}
        onClose={closeCreateModal}
        onCreateConfirm={handleCreateConfirm}
      />
      <EditTaskLibraryModal
        visible={isEditModalVisible}
        taskToEdit={taskToEdit}
        onClose={closeEditModal}
        onEditConfirm={handleEditConfirm}
      />
      <ConfirmationModal
        visible={isDeleteModalVisible}
        title="Confirm Delete"
        message={`Are you sure you want to delete the library task "${taskToDelete?.title || ''}"? This action is safe for previously assigned tasks.`} // Updated message
        confirmText="Delete Task"
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
      />
    </View>
  );
};