import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ScrollView, ActivityIndicator } from 'react-native';

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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [baseTickets, setBaseTickets] = useState<number | ''>('');

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateTaskLibraryItem,
    onSuccess: updatedTask => {
      console.log(
        '[EditTaskLibraryModal] Task library item updated successfully via mutation:',
        updatedTask
      );

      queryClient.invalidateQueries({ queryKey: ['task-library'] });
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Task library item updated successfully.',
        position: 'bottom',
      });
    },
    onError: (error, variables) => {
      console.error(
        `[EditTaskLibraryModal] Error updating task library item ${variables.taskId} via mutation:`,
        error
      );
      Toast.show({
        type: 'error',
        text1: 'Update Failed',

        text2: error instanceof Error ? error.message : 'Could not update task library item.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  useEffect(() => {
    if (visible && taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description);
      setBaseTickets(taskToEdit.baseTickets);
      mutation.reset();
    } else {
      setTitle('');
      setDescription('');
      setBaseTickets('');
    }
  }, [visible, taskToEdit]);

  const handleSave = () => {
    if (!taskToEdit) return;

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const numericTickets =
      typeof baseTickets === 'number' ? baseTickets : parseInt(String(baseTickets || '-1'), 10);

    if (!trimmedTitle) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Task Title cannot be empty.',
      });
      return;
    }
    if (isNaN(numericTickets) || numericTickets < 0 || !Number.isInteger(numericTickets)) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Base Tickets must be a whole number (0 or greater).',
      });
      return;
    }

    const updates: Partial<Omit<TaskLibraryItem, 'id'>> = {};
    let hasChanges = false;

    if (trimmedTitle !== taskToEdit.title) {
      updates.title = trimmedTitle;
      hasChanges = true;
    }
    if (trimmedDescription !== taskToEdit.description) {
      updates.description = trimmedDescription;
      hasChanges = true;
    }
    if (numericTickets !== taskToEdit.baseTickets) {
      updates.baseTickets = numericTickets;
      hasChanges = true;
    }

    if (!hasChanges) {
      console.log('[EditTaskLibraryModal] No changes detected.');
      onClose();
      return;
    }

    console.log('[EditTaskLibraryModal] Calling mutation with updates:', updates);

    mutation.mutate({ taskId: taskToEdit.id, updates });
  };

  const isSaveDisabled =
    mutation.isPending || !title.trim() || baseTickets === '' || baseTickets < 0;

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
                setBaseTickets(text === '' ? '' : (parseInt(text.replace(/[^0-9]/g, ''), 10) ?? 0))
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

          {}
          {mutation.isPending && (
            <View style={modalSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalSharedStyles.loadingText}>Saving Changes...</Text>
            </View>
          )}

          {}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:{' '}
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to save changes'}
            </Text>
          )}

          {}
          <View style={modalSharedStyles.buttonContainer}>
            <Button
              title={mutation.isPending ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              disabled={isSaveDisabled}
            />
          </View>
          <View style={modalSharedStyles.footerButton}>
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

export default EditTaskLibraryModal;
