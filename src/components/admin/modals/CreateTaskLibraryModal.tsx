import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ScrollView, ActivityIndicator } from 'react-native';

import { createTaskLibraryItem } from '../../../api/taskLibrary';

import { TaskLibraryItem } from '../../../types/dataTypes';
import { colors } from '../../../styles/colors';
import { CreateTaskLibraryModalProps } from '../../../types/componentProps';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';
import { appSharedStyles } from '../../../styles/appSharedStyles';

const CreateTaskLibraryModal: React.FC<CreateTaskLibraryModalProps> = ({ visible, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [baseTickets, setBaseTickets] = useState<number | ''>('');

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createTaskLibraryItem,
    onSuccess: createdTask => {
      console.log(
        '[CreateTaskLibraryModal] Task library item created successfully via mutation:',
        createdTask
      );

      queryClient.invalidateQueries({ queryKey: ['task-library'] });
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Task library item created.',
        position: 'bottom',
      });
    },
    onError: error => {
      console.error(
        '[CreateTaskLibraryModal] Error creating task library item via mutation:',
        error
      );
      Toast.show({
        type: 'error',
        text1: 'Creation Failed',

        text2: error instanceof Error ? error.message : 'Could not create task library item.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  useEffect(() => {
    if (visible) {
      setTitle('');
      setDescription('');
      setBaseTickets('');
      mutation.reset();
    }
  }, [visible]);

  const handleCreate = () => {
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

    const newTaskData: Omit<TaskLibraryItem, 'id'> = {
      title: trimmedTitle,
      description: trimmedDescription,
      baseTickets: numericTickets,
    };

    console.log('[CreateTaskLibraryModal] Calling mutation with data:', newTaskData);
    mutation.mutate(newTaskData);
  };

  const isCreateDisabled =
    mutation.isPending || !title.trim() || baseTickets === '' || baseTickets < 0;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={appSharedStyles.centeredView}>
        <View style={appSharedStyles.modalView}>
          <Text style={appSharedStyles.modalTitle}>Create New Library Task</Text>
          <ScrollView style={appSharedStyles.scrollView}>
            <Text style={commonSharedStyles.label}>Task Title:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Practice Scales"
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
              placeholder="e.g., 10"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              editable={!mutation.isPending}
            />

            <Text style={commonSharedStyles.label}>Description:</Text>
            <TextInput
              style={commonSharedStyles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the task requirements..."
              placeholderTextColor={colors.textLight}
              multiline={true}
              numberOfLines={3}
              editable={!mutation.isPending}
            />
          </ScrollView>

          {mutation.isPending && (
            <View style={appSharedStyles.containerRowCentered}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={appSharedStyles.loadingText}>Creating Task...</Text>
            </View>
          )}

          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:{' '}
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to create task'}
            </Text>
          )}

          <View style={appSharedStyles.itemFull}>
            <Button
              title={mutation.isPending ? 'Creating...' : 'Create Task'}
              onPress={handleCreate}
              disabled={isCreateDisabled}
            />
          </View>
          <View style={appSharedStyles.footerButton}>
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

export default CreateTaskLibraryModal;
