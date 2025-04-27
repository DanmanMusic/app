// src/components/admin/modals/CreateTaskLibraryModal.tsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ScrollView, ActivityIndicator } from 'react-native';

// Import the refactored API function
import { createTaskLibraryItem } from '../../../api/taskLibrary';

import { TaskLibraryItem } from '../../../types/dataTypes';
import { colors } from '../../../styles/colors';
import { CreateTaskLibraryModalProps } from '../../../types/componentProps';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';

const CreateTaskLibraryModal: React.FC<CreateTaskLibraryModalProps> = ({ visible, onClose }) => {
  // State for form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [baseTickets, setBaseTickets] = useState<number | ''>('');

  const queryClient = useQueryClient();

  // Mutation hook using the Supabase API function
  const mutation = useMutation({
    mutationFn: createTaskLibraryItem, // Point to the Supabase function
    onSuccess: createdTask => {
      console.log('[CreateTaskLibraryModal] Task library item created successfully via mutation:', createdTask);
      // Invalidate the query for the task library list so it refetches
      queryClient.invalidateQueries({ queryKey: ['task-library'] });
      onClose(); // Close modal on success
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Task library item created.',
        position: 'bottom',
      });
    },
    onError: error => {
      console.error('[CreateTaskLibraryModal] Error creating task library item via mutation:', error);
      Toast.show({
        type: 'error',
        text1: 'Creation Failed',
        // Display specific error message from the API function if available
        text2: error instanceof Error ? error.message : 'Could not create task library item.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  // Effect to reset form when modal visibility changes
  useEffect(() => {
    if (visible) {
      setTitle('');
      setDescription('');
      setBaseTickets('');
      mutation.reset(); // Reset mutation state (errors, loading)
    }
  }, [visible]);

  // Handler for the create button press
  const handleCreate = () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim(); // Description is optional now
    const numericTickets = typeof baseTickets === 'number' ? baseTickets : parseInt(String(baseTickets || '-1'), 10); // Use -1 to fail validation if empty

    // --- Basic Client-Side Validation ---
    if (!trimmedTitle) {
       Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Task Title cannot be empty.' });
      return;
    }
    // Description is optional based on current model, no strict validation needed here unless required
    // if (!trimmedDescription) {
    //   Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Description cannot be empty.' });
    //   return;
    // }
    if (isNaN(numericTickets) || numericTickets < 0 || !Number.isInteger(numericTickets)) {
        Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Base Tickets must be a whole number (0 or greater).' });
        return;
    }
    // --- End Validation ---

    // Prepare data in the format expected by the API function
    const newTaskData: Omit<TaskLibraryItem, 'id'> = {
      title: trimmedTitle,
      description: trimmedDescription, // Pass trimmed description (can be empty)
      baseTickets: numericTickets,
    };

    console.log('[CreateTaskLibraryModal] Calling mutation with data:', newTaskData);
    mutation.mutate(newTaskData); // Execute the mutation
  };

  // Determine if the create button should be disabled
  const isCreateDisabled = mutation.isPending || !title.trim() || baseTickets === '' || baseTickets < 0;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Create New Library Task</Text>
          {/* Use ScrollView in case content overflows on smaller screens */}
          <ScrollView style={modalSharedStyles.scrollView}>
            <Text style={commonSharedStyles.label}>Task Title:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Practice Scales"
              placeholderTextColor={colors.textLight}
              maxLength={100} // Example length limit
              editable={!mutation.isPending} // Disable during submission
            />

            <Text style={commonSharedStyles.label}>Base Tickets:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={String(baseTickets)} // Display state value as string
              onChangeText={text =>
                // Allow empty input, otherwise parse integer, default to 0 if parsing fails but not empty
                setBaseTickets(text === '' ? '' : parseInt(text.replace(/[^0-9]/g, ''), 10) ?? 0)
              }
              placeholder="e.g., 10"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              editable={!mutation.isPending}
            />

            <Text style={commonSharedStyles.label}>Description:</Text>
            <TextInput
              style={commonSharedStyles.textArea} // Use multi-line style
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the task requirements..."
              placeholderTextColor={colors.textLight}
              multiline={true}
              numberOfLines={3} // Suggest initial height
              editable={!mutation.isPending}
            />
          </ScrollView>

          {/* Loading Indicator */}
          {mutation.isPending && (
            <View style={modalSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalSharedStyles.loadingText}>Creating Task...</Text>
            </View>
          )}

          {/* Error Message Display */}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error: {mutation.error instanceof Error ? mutation.error.message : 'Failed to create task'}
            </Text>
          )}

          {/* Action Buttons */}
          <View style={modalSharedStyles.buttonContainer}>
            <Button
               title={mutation.isPending ? "Creating..." : "Create Task"}
               onPress={handleCreate}
               disabled={isCreateDisabled}
            />
          </View>
          <View style={modalSharedStyles.footerButton}>
            <Button
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={mutation.isPending} // Disable cancel while creating
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CreateTaskLibraryModal;