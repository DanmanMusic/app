import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ActivityIndicator } from 'react-native';
import { createAnnouncement } from '../../../api/announcements';
import { Announcement, AnnouncementType } from '../../../types/dataTypes';
import { colors } from '../../../styles/colors';
import { CreateAnnouncementModalProps } from '../../../types/componentProps';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';

const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({ visible, onClose }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AnnouncementType>('announcement');
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: createdAnnouncement => {
      console.log('Announcement created successfully via mutation:', createdAnnouncement);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Announcement created successfully.',
        position: 'bottom',
      });
    },
    onError: error => {
      console.error('Error creating announcement via mutation:', error);
      Toast.show({
        type: 'error',
        text1: 'Creation Failed',
        text2: error instanceof Error ? error.message : 'Could not create announcement.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  useEffect(() => {
    if (visible) {
      setTitle('');
      setMessage('');
      setType('announcement');
      mutation.reset();
    }
  }, [visible]);

  const handleCreate = () => {
    if (!title.trim()) {
      return;
    }
    if (!message.trim()) {
      return;
    }

    const newAnnouncementData: Omit<Announcement, 'id' | 'date'> = {
      title: title.trim(),
      message: message.trim(),
      type: type,
    };

    mutation.mutate(newAnnouncementData);
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Create New Announcement</Text>

          <Text style={commonSharedStyles.label}>Title:</Text>
          <TextInput
            style={commonSharedStyles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Announcement Title"
            placeholderTextColor={colors.textLight}
            maxLength={100}
            editable={!mutation.isPending}
          />

          <Text style={commonSharedStyles.label}>Message:</Text>
          <TextInput
            style={commonSharedStyles.textArea}
            value={message}
            onChangeText={setMessage}
            placeholder="Enter the full announcement message..."
            placeholderTextColor={colors.textLight}
            multiline={true}
            numberOfLines={4}
            editable={!mutation.isPending}
          />
          {mutation.isPending && (
            <View style={modalSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalSharedStyles.loadingText}>Creating Announcement...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Failed to create announcement'}
            </Text>
          )}
          <View style={modalSharedStyles.buttonContainer}>
            <Button
              title="Create Announcement"
              onPress={handleCreate}
              disabled={mutation.isPending}
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

export default CreateAnnouncementModal;
