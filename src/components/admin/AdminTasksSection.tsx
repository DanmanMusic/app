// src/components/admin/AdminTasksSection.tsx
import React, { useState } from 'react'; // Keep useState if needed for modals internal to section

import { View, Text, Button, FlatList, ActivityIndicator, StyleSheet, Alert } from 'react-native';

// Removed useQuery, useMutation, useQueryClient
// Import API functions only if mutations are handled *here* (they shouldn't be)
// import { deleteTaskLibraryItem } from '../../api/taskLibrary';
import { AssignedTask } from '../../mocks/mockAssignedTasks';
import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';

// Import styles
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';

// Import Modals IF they are triggered from this section directly
// import CreateTaskLibraryModal from './modals/CreateTaskLibraryModal';
// import EditTaskLibraryModal from './modals/EditTaskLibraryModal';
// import ConfirmationModal from '../common/ConfirmationModal';

// Import the props type
import { AdminTasksSectionProps } from '../../types/componentProps'; // Adjust path

import { adminSharedStyles } from './adminSharedStyles';

// Define sub-components like AdminTaskLibraryItem (or import if common)
const AdminTaskLibraryItem = ({
  item /* onEdit, onDelete, disabled */,
}: {
  item: TaskLibraryItem /* ... */;
}) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={appSharedStyles.itemTitle}>
      {' '}
      {item.title} ({item.baseTickets} pts){' '}
    </Text>
    <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>
    <View style={adminSharedStyles.itemActions}>
      {/* Buttons trigger callbacks or open modals managed by parent/local state */}
      <Button title="Edit (TODO)" onPress={() => alert(`TODO: Edit ${item.id}`)} />
      <Button
        title="Delete (TODO)"
        onPress={() => alert(`TODO: Delete ${item.id}`)}
        color={colors.danger}
      />
    </View>
  </View>
);

// Use the imported props type
export const AdminTasksSection: React.FC<AdminTasksSectionProps> = ({
  // Destructure props passed from AdminView
  taskLibrary,
  isLoading,
  isError,
  onInitiateAssignTask,
  onInitiateVerification, // Note: This prop isn't used directly here, but passed for consistency maybe?
}) => {
  // Remove internal state for modals if they are managed by AdminView
  // const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  // const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  // const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  // const [taskToEdit, setTaskToEdit] = useState<TaskLibraryItem | null>(null);
  // const [taskToDelete, setTaskToDelete] = useState<TaskLibraryItem | null>(null);

  // Remove internal mutations - actions should be handled via callbacks or parent-managed modals
  // const queryClient = useQueryClient();
  // const deleteMutation = useMutation({ ... });

  // Remove internal handlers for modals if managed by parent
  // const handleAddPress = () => setIsCreateModalVisible(true);
  // const handleEditPress = (task: TaskLibraryItem) => { ... };
  // const handleDeletePress = (task: TaskLibraryItem) => { ... };
  // const closeCreateModal = () => setIsCreateModalVisible(false);
  // ... etc ...

  // const handleDeleteConfirm = () => { ... deleteMutation.mutate(...) ... };

  // Error message formatting can stay if needed
  const getErrorMessage = () => {
    // if (!error) return 'An unknown error occurred.'; // Need error prop if displaying here
    // return `Error loading task library: ${error.message}`;
    return 'Error loading task library.'; // Simplified if error obj not passed
  };

  return (
    <View>
      <Text style={appSharedStyles.sectionTitle}>Task Management</Text>
      {/* Assign Task Button - uses prop callback */}
      <View style={{ alignItems: 'flex-start', marginBottom: 20, gap: 5 }}>
        <Button title="Assign Task to Student" onPress={onInitiateAssignTask} />
      </View>

      {/* Task Library Section Title */}
      <Text style={adminSharedStyles.sectionSubTitle}>Task Library ({taskLibrary.length})</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        {/* TODO: Create/Edit/Delete Modals likely need to be triggered from AdminView? Or handled locally? */}
        {/* If handled locally, need state/handlers back + TQ mutations */}
        <Button
          title="Create New Task Library Item (TODO)"
          onPress={() => alert('TODO: Open Create Task Modal')}
        />
      </View>

      {/* Loading Indicator */}
      {isLoading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
      )}

      {/* Error Display */}
      {isError && !isLoading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{getErrorMessage()}</Text>
        </View>
      )}

      {/* Task Library List */}
      {!isLoading && !isError && (
        <FlatList
          data={taskLibrary}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AdminTaskLibraryItem
              item={item}
              // Pass callbacks if Edit/Delete modals are managed here
              // onEdit={handleEditPress}
              // onDelete={handleDeletePress}
              // disabled={deleteMutation.isPending}
            />
          )}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No task library items found.</Text>
          )}
        />
      )}

      {/* Modals: Render modals here if managed locally, otherwise they are in AdminView */}
      {/* <CreateTaskLibraryModal visible={isCreateModalVisible} onClose={closeCreateModal} /> */}
      {/* <EditTaskLibraryModal visible={isEditModalVisible} taskToEdit={taskToEdit} onClose={closeEditModal} /> */}
      {/* <ConfirmationModal visible={isDeleteModalVisible} ... /> */}
    </View>
  );
};

// Add local styles if needed (e.g., for error container)
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
  errorText: { color: colors.danger, fontSize: 14, textAlign: 'center' },
});
