import React, { useState, useEffect } from 'react';

import { Modal, View, Text, Button, TextInput, ActivityIndicator } from 'react-native';

import { Picker } from '@react-native-picker/picker';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import Toast from 'react-native-toast-message';

import { createAnnouncement } from '../../../api/announcements';
import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import { CreateAnnouncementModalProps } from '../../../types/componentProps';
import { Announcement, AnnouncementType } from '../../../types/dataTypes';

const ANNOUNCEMENT_TYPES: AnnouncementType[] = [
  'announcement',
  'challenge',
  'redemption_celebration',
];

const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({ visible, onClose }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AnnouncementType>('announcement');

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: createdAnnouncement => {
      console.log('[CreateAnnModal] Announcement created successfully:', createdAnnouncement);

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
      console.error('[CreateAnnModal] Error creating announcement:', error);
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
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();

    if (!trimmedTitle) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Title cannot be empty.',
        position: 'bottom',
      });
      return;
    }
    if (!trimmedMessage) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Message cannot be empty.',
        position: 'bottom',
      });
      return;
    }

    const newAnnouncementData: Omit<Announcement, 'id' | 'date'> = {
      title: trimmedTitle,
      message: trimmedMessage,
      type: type,
    };

    console.log('[CreateAnnModal] Calling mutation with data:', newAnnouncementData);
    mutation.mutate(newAnnouncementData);
  };

  const isCreateDisabled = mutation.isPending || !title.trim() || !message.trim();

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Create New Announcement</Text>

          <Text style={commonSharedStyles.label}>Type:</Text>
          <View style={commonSharedStyles.input}>
            <Picker
              selectedValue={type}
              onValueChange={itemValue => setType(itemValue as AnnouncementType)}
              enabled={!mutation.isPending}
              style={commonSharedStyles.picker}
              itemStyle={commonSharedStyles.pickerItem}
            >
              {ANNOUNCEMENT_TYPES.map(typeValue => (
                <Picker.Item
                  key={typeValue}
                  label={typeValue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  value={typeValue}
                />
              ))}
            </Picker>
          </View>

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
            <View style={commonSharedStyles.baseRowCentered}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={commonSharedStyles.baseSecondaryText}>Creating Announcement...</Text>
            </View>
          )}

          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:{' '}
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Failed to create announcement'}
            </Text>
          )}

          <View style={commonSharedStyles.full}>
            <Button
              title={mutation.isPending ? 'Creating...' : 'Create Announcement'}
              onPress={handleCreate}
              color={colors.primary}
              disabled={isCreateDisabled}
            />
          </View>
          <View style={[commonSharedStyles.full, { marginTop: 10 }]}>
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
