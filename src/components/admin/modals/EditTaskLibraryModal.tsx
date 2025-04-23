// src/components/admin/modals/EditTaskLibraryModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Button,
  TextInput,
  ScrollView,
  ActivityIndicator, // Added
  Alert, // Added
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query'; // Added

// API & Types
import { updateTaskLibraryItem } from '../../../api/taskLibrary'; // Use new API file
import { TaskLibraryItem } from '../../../mocks/mockTaskLibrary';
import { colors } from '../../../styles/colors';

// Interface updated: removed onEditConfirm prop
interface EditTaskLibraryModalProps {
  visible: boolean;
  taskToEdit: TaskLibraryItem | null;
  onClose: () => void;
  // Removed: onEditConfirm: (taskId: string, taskData: Partial<Omit<TaskLibraryItem, 'id'>>) => void;
}

const EditTaskLibraryModal: React.FC<EditTaskLibraryModalProps> = ({
  visible,
  taskToEdit,
  onClose,
}) => {
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [baseTickets, setBaseTickets] = useState<number | ''>('');

  const queryClient = useQueryClient();

  // --- TanStack Mutation ---
  const mutation = useMutation({
    mutationFn: updateTaskLibraryItem, // API function: expects { taskId, updates }
    onSuccess: updatedTask => {
      console.log('Task library item updated successfully via mutation:', updatedTask);
      // Invalidate the task library query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['task-library'] });
      onClose(); // Close modal on success
    },
    onError: (error, variables) => {
      console.error(`Error updating task library item ${variables.taskId} via mutation:`, error);
    },
  });

  // Effect to populate form when taskToEdit changes or modal opens
  useEffect(() => {
    if (visible && taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description);
      setBaseTickets(taskToEdit.baseTickets);
      mutation.reset(); // Reset mutation state
    }
    // Optional: Clear form when modal closes?
    // else if (!visible) {
    //   setTitle('');
    //   setDescription('');
    //   setBaseTickets('');
    // }
  }, [visible, taskToEdit]);

  const handleSave = () => {
    if (!taskToEdit) return;

    // Validate input
    const numericTickets =
      typeof baseTickets === 'number' ? baseTickets : parseInt(String(baseTickets || '0'), 10);
    if (!title.trim()) {
      return;
    }
    if (!description.trim()) {
      return;
    }
    if (isNaN(numericTickets) || numericTickets < 0) {
      return;
    }

    // Construct the updates object - only include changed fields
    const updates: Partial<Omit<TaskLibraryItem, 'id'>> = {};
    if (title.trim() !== taskToEdit.title) updates.title = title.trim();
    if (description.trim() !== taskToEdit.description) updates.description = description.trim();
    if (numericTickets !== taskToEdit.baseTickets) updates.baseTickets = numericTickets;

    // Only mutate if there are actual changes
    if (Object.keys(updates).length === 0) {
      onClose(); // Close if no changes
      return;
    }

    // Trigger the mutation
    mutation.mutate({ taskId: taskToEdit.id, updates });
  };

  // Don't render if no task is selected
  if (!taskToEdit) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Edit Library Task</Text>
          <Text style={modalStyles.subTitle}>ID: {taskToEdit.id}</Text>
          <ScrollView style={modalStyles.scrollView}>
            <Text style={modalStyles.label}>Task Title:</Text>
            <TextInput
              style={modalStyles.input}
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={colors.textLight}
              maxLength={100}
              editable={!mutation.isPending} // Disable input while loading
            />

            <Text style={modalStyles.label}>Base Tickets:</Text>
            <TextInput
              style={modalStyles.input}
              value={String(baseTickets)}
              onChangeText={text =>
                setBaseTickets(text === '' ? '' : parseInt(text.replace(/[^0-9]/g, ''), 10) || 0)
              }
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              editable={!mutation.isPending}
            />

            <Text style={modalStyles.label}>Description:</Text>
            <TextInput
              style={modalStyles.textArea}
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
            <View style={modalStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalStyles.loadingText}>Saving Changes...</Text>
            </View>
          )}

          {/* Error Message */}
          {mutation.isError && (
            <Text style={modalStyles.errorText}>
              Error: {mutation.error instanceof Error ? mutation.error.message : 'Failed to save changes'}
            </Text>
          )}

          <View style={modalStyles.buttonContainer}>
            <Button
              title="Save Changes"
              onPress={handleSave}
              disabled={mutation.isPending} // Disable button while loading
            />
          </View>
          <View style={modalStyles.footerButton}>
            <Button
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={mutation.isPending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// --- Styles ---
const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalView: {
    margin: 20,
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '95%',
    maxWidth: 450,
    maxHeight: '85%',
  },
  scrollView: { width: '100%', marginBottom: 15 },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
    color: colors.textPrimary,
    width: '100%',
  },
  subTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 15,
    textAlign: 'center',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    paddingBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    color: colors.textPrimary,
    alignSelf: 'flex-start',
    width: '100%',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundPrimary,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 5,
    height: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 5,
    fontSize: 14,
    minHeight: 18,
  },
  buttonContainer: { flexDirection: 'column', width: '100%', marginTop: 10, gap: 10 },
  footerButton: { width: '100%', marginTop: 10 },
});

export default EditTaskLibraryModal;