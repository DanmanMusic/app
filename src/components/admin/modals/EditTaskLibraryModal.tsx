// src/components/admin/modals/EditTaskLibraryModal.tsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ScrollView, ActivityIndicator } from 'react-native';

// Import the refactored API function
import { updateTaskLibraryItem } from '../../../api/taskLibrary';

import { TaskLibraryItem } from '../../../types/dataTypes';
import { colors } from '../../../styles/colors';
import { EditTaskLibraryModalProps } from '../../../types/componentProps';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';

const EditTaskLibraryModal: React.FC<EditTaskLibraryModalProps> = ({
  visible,
  taskToEdit,
  onClose,
}) => {
  // State for form fields, initialized empty
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [baseTickets, setBaseTickets] = useState<number | ''>('');

  const queryClient = useQueryClient();

  // Mutation hook using the Supabase API function
  const mutation = useMutation({
    mutationFn: updateTaskLibraryItem, // Point to the Supabase function
    onSuccess: updatedTask => {
      console.log('[EditTaskLibraryModal] Task library item updated successfully via mutation:', updatedTask);
      // Invalidate the query for the task library list so it refetches
      queryClient.invalidateQueries({ queryKey: ['task-library'] });
      onClose(); // Close modal on success
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Task library item updated successfully.',
        position: 'bottom',
      });
    },
    onError: (error, variables) => {
      console.error(`[EditTaskLibraryModal] Error updating task library item ${variables.taskId} via mutation:`, error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        // Display specific error message from the API function if available
        text2: error instanceof Error ? error.message : 'Could not update task library item.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  // Effect to populate form fields when modal opens or taskToEdit changes
  useEffect(() => {
    if (visible && taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description); // Will be '' if description was empty
      setBaseTickets(taskToEdit.baseTickets);
      mutation.reset(); // Reset mutation state
    } else {
      // Clear fields if modal closes or no task provided
      setTitle('');
      setDescription('');
      setBaseTickets('');
    }
  }, [visible, taskToEdit]); // Depend on visibility and the task object

  // Handler for the save button press
  const handleSave = () => {
    if (!taskToEdit) return; // Should not happen if modal is visible with a task

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const numericTickets = typeof baseTickets === 'number' ? baseTickets : parseInt(String(baseTickets || '-1'), 10);

    // --- Basic Client-Side Validation ---
    if (!trimmedTitle) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Task Title cannot be empty.' });
      return;
    }
    if (isNaN(numericTickets) || numericTickets < 0 || !Number.isInteger(numericTickets)) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Base Tickets must be a whole number (0 or greater).' });
      return;
    }
    // --- End Validation ---

    // Build the updates object, only including fields that changed
    const updates: Partial<Omit<TaskLibraryItem, 'id'>> = {};
    let hasChanges = false;

    if (trimmedTitle !== taskToEdit.title) {
      updates.title = trimmedTitle;
      hasChanges = true;
    }
    if (trimmedDescription !== taskToEdit.description) {
      updates.description = trimmedDescription; // Send trimmed description (can be empty)
      hasChanges = true;
    }
    if (numericTickets !== taskToEdit.baseTickets) {
      updates.baseTickets = numericTickets;
      hasChanges = true;
    }

    // If nothing actually changed, just close the modal
    if (!hasChanges) {
      console.log('[EditTaskLibraryModal] No changes detected.');
      onClose();
      return;
    }

    console.log('[EditTaskLibraryModal] Calling mutation with updates:', updates);
    // Execute the mutation with the task ID and the changes
    mutation.mutate({ taskId: taskToEdit.id, updates });
  };

  // Determine if the save button should be disabled
  const isSaveDisabled = mutation.isPending || !title.trim() || baseTickets === '' || baseTickets < 0;

  // Conditional rendering if taskToEdit is somehow null while visible
  if (!taskToEdit) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Edit Library Task</Text>
          <Text style={modalSharedStyles.subTitle}>ID: {taskToEdit.id}</Text>
          <ScrollView style={modalSharedStyles.scrollView}>
            <Text style={commonSharedStyles.label}>Task Title:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={colors.textLight}
              maxLength={100}
              editable={!mutation.isPending}
            />

            <Text style={commonSharedStyles.label}>Base Tickets:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={String(baseTickets)}
              onChangeText={text =>
                setBaseTickets(text === '' ? '' : parseInt(text.replace(/[^0-9]/g, ''), 10) ?? 0)
              }
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              editable={!mutation.isPending}
            />

            <Text style={commonSharedStyles.label}>Description:</Text>
            <TextInput
              style={commonSharedStyles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholderTextColor={colors.textLight}
              multiline={true}
              numberOfLines={3}
              editable={!mutation.isPending}
            />
          </ScrollView>

          {/* Loading Indicator */}
          {mutation.isPending && (
            <View style={modalSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalSharedStyles.loadingText}>Saving Changes...</Text>
            </View>
          )}

          {/* Error Message Display */}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error: {mutation.error instanceof Error ? mutation.error.message : 'Failed to save changes'}
            </Text>
          )}

          {/* Action Buttons */}
          <View style={modalSharedStyles.buttonContainer}>
            <Button
              title={mutation.isPending ? "Saving..." : "Save Changes"}
              onPress={handleSave}
              disabled={isSaveDisabled} // Use combined disabled state
            />
          </View>
          <View style={modalSharedStyles.footerButton}>
            <Button
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={mutation.isPending} // Disable cancel while saving
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditTaskLibraryModal;