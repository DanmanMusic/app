import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ActivityIndicator } from 'react-native';
import { updateAnnouncement } from '../../../api/announcements';
import { Announcement, AnnouncementType } from '../../../mocks/mockAnnouncements';
import { colors } from '../../../styles/colors';
import { EditAnnouncementModalProps } from '../../../types/componentProps';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';

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
      console.log('Announcement updated successfully via mutation:', updatedAnnouncement);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      onClose();
    },
    onError: (error, variables) => {
      console.error(`Error updating announcement ${variables.announcementId} via mutation:`, error);
    },
  });
  useEffect(() => {
    if (visible && announcementToEdit) {
      setTitle(announcementToEdit.title);
      setMessage(announcementToEdit.message);
      setType(announcementToEdit.type);
      mutation.reset();
    }
  }, [visible, announcementToEdit, mutation]);
  const handleSave = () => {
    if (!announcementToEdit) return;

    if (!title.trim()) {
      return;
    }
    if (!message.trim()) {
      return;
    }

    const updates: Partial<Omit<Announcement, 'id' | 'date'>> = {};
    if (title.trim() !== announcementToEdit.title) updates.title = title.trim();
    if (message.trim() !== announcementToEdit.message) updates.message = message.trim();
    if (type !== announcementToEdit.type) updates.type = type;

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    mutation.mutate({ announcementId: announcementToEdit.id, updates });
  };

  if (!announcementToEdit) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Edit Announcement</Text>
          <Text style={modalSharedStyles.subTitle}>ID: {announcementToEdit.id}</Text>

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
              <Text style={modalSharedStyles.loadingText}>Saving Changes...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to save changes'}
            </Text>
          )}
          <View style={modalSharedStyles.buttonContainer}>
            <Button title="Save Changes" onPress={handleSave} disabled={mutation.isPending} />
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

export default EditAnnouncementModal;
