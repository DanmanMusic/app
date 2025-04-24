import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Modal,
  View,
  Text,
  Button,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { createTaskLibraryItem } from '../../../api/taskLibrary';
import { TaskLibraryItem } from '../../../mocks/mockTaskLibrary';
import { colors } from '../../../styles/colors';
import { CreateTaskLibraryModalProps } from '../../../types/componentProps';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';

const CreateTaskLibraryModal: React.FC<CreateTaskLibraryModalProps> = ({ visible, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [baseTickets, setBaseTickets] = useState<number | ''>('');

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createTaskLibraryItem,
    onSuccess: createdTask => {
      console.log('Task library item created successfully via mutation:', createdTask);

      queryClient.invalidateQueries({ queryKey: ['task-library'] });
      onClose();
    },
    onError: error => {
      console.error('Error creating task library item via mutation:', error);
    },
  });

  useEffect(() => {
    if (visible) {
      setTitle('');
      setDescription('');
      setBaseTickets('');
      mutation.reset();
    }
  }, [visible, mutation]);

  const handleCreate = () => {
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

    const newTaskData: Omit<TaskLibraryItem, 'id'> = {
      title: title.trim(),
      description: description.trim(),
      baseTickets: numericTickets,
    };

    mutation.mutate(newTaskData);
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Create New Library Task</Text>
          <ScrollView style={modalSharedStyles.scrollView}>
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
                setBaseTickets(text === '' ? '' : parseInt(text.replace(/[^0-9]/g, ''), 10) || 0)
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
            <View style={modalSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalSharedStyles.loadingText}>Creating Task...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:{' '}
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to create task'}
            </Text>
          )}
          <View style={modalSharedStyles.buttonContainer}>
            <Button title="Create Task" onPress={handleCreate} disabled={mutation.isPending} />
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

export default CreateTaskLibraryModal;
