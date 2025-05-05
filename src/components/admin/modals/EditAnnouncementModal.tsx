import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Modal, View, Text, Button, TextInput, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { updateAnnouncement } from '../../../api/announcements';

import { Announcement, AnnouncementType } from '../../../types/dataTypes';
import { colors } from '../../../styles/colors';
import { EditAnnouncementModalProps } from '../../../types/componentProps';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';

const ANNOUNCEMENT_TYPES: AnnouncementType[] = [
  'announcement',
  'challenge',
  'redemption_celebration',
];

const EditAnnouncementModal: React.FC<EditAnnouncementModalProps> = ({
  visible,
  announcementToEdit,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AnnouncementType>('announcement');

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateAnnouncement,
    onSuccess: updatedAnnouncement => {
      console.log('[EditAnnModal] Announcement updated successfully:', updatedAnnouncement);

      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Announcement updated successfully.',
        position: 'bottom',
      });
    },
    onError: (error, variables) => {
      console.error(
        `[EditAnnModal] Error updating announcement ${variables.announcementId}:`,
        error
      );
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error instanceof Error ? error.message : 'Could not update announcement.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  useEffect(() => {
    if (visible && announcementToEdit) {
      setTitle(announcementToEdit.title);
      setMessage(announcementToEdit.message);
      setType(announcementToEdit.type);

      mutation.reset();
    } else {
      setTitle('');
      setMessage('');
      setType('announcement');
    }
  }, [visible, announcementToEdit]);

  const handleSave = () => {
    if (!announcementToEdit) return;

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

    const updates: Partial<Omit<Announcement, 'id' | 'date'>> = {};
    let hasChanges = false;

    if (trimmedTitle !== announcementToEdit.title) {
      updates.title = trimmedTitle;
      hasChanges = true;
    }
    if (trimmedMessage !== announcementToEdit.message) {
      updates.message = trimmedMessage;
      hasChanges = true;
    }
    if (type !== announcementToEdit.type) {
      updates.type = type;
      hasChanges = true;
    }

    if (!hasChanges) {
      console.log('[EditAnnModal] No changes detected.');
      onClose();
      return;
    }

    console.log('[EditAnnModal] Calling mutation with updates:', updates);

    mutation.mutate({ announcementId: announcementToEdit.id, updates });
  };

  const isSaveDisabled = mutation.isPending || !title.trim() || !message.trim();

  if (!announcementToEdit) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Edit Announcement</Text>
          <Text style={commonSharedStyles.modalSubTitle}>ID: {announcementToEdit.id}</Text>

          <Text style={commonSharedStyles.label}>Type:</Text>
          <View>
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
            style={commonSharedStyles.picker}
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
              <Text style={commonSharedStyles.baseSecondaryText}>Saving Changes...</Text>
            </View>
          )}

          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:{' '}
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to save changes'}
            </Text>
          )}

          <View style={commonSharedStyles.full}>
            <Button
              title={mutation.isPending ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              disabled={isSaveDisabled}
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

export default EditAnnouncementModal;
