// src/components/admin/modals/EditAnnouncementModal.tsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
// Import Platform for Picker styling and Picker itself
import { Modal, View, Text, Button, TextInput, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';

// Import the refactored API function
import { updateAnnouncement } from '../../../api/announcements';

import { Announcement, AnnouncementType } from '../../../types/dataTypes';
import { colors } from '../../../styles/colors';
import { EditAnnouncementModalProps } from '../../../types/componentProps';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';
import { adminSharedStyles } from '../../../styles/adminSharedStyles';

// Define the available types for the picker
const ANNOUNCEMENT_TYPES: AnnouncementType[] = ['announcement', 'challenge', 'redemption_celebration'];

const EditAnnouncementModal: React.FC<EditAnnouncementModalProps> = ({
  visible,
  announcementToEdit,
  onClose,
}) => {
  // State for form fields
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AnnouncementType>('announcement'); // Default type
  // Add state for relatedStudentId if needed for editing
  // const [relatedStudentId, setRelatedStudentId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Mutation hook using the Supabase API function
  const mutation = useMutation({
    mutationFn: updateAnnouncement, // Point to the Supabase function
    onSuccess: updatedAnnouncement => {
      console.log('[EditAnnModal] Announcement updated successfully:', updatedAnnouncement);
      // Invalidate the query for announcements to refetch the list
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      onClose(); // Close modal on success
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Announcement updated successfully.',
        position: 'bottom',
      });
    },
    onError: (error, variables) => {
      console.error(`[EditAnnModal] Error updating announcement ${variables.announcementId}:`, error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error instanceof Error ? error.message : 'Could not update announcement.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  // Effect to populate form when modal opens or announcementToEdit changes
  useEffect(() => {
    if (visible && announcementToEdit) {
      setTitle(announcementToEdit.title);
      setMessage(announcementToEdit.message);
      setType(announcementToEdit.type);
      // setRelatedStudentId(announcementToEdit.relatedStudentId ?? null); // Populate if used
      mutation.reset(); // Reset mutation state
    } else {
      // Clear fields if modal is closed or no announcement provided
      setTitle('');
      setMessage('');
      setType('announcement');
      // setRelatedStudentId(null);
    }
  }, [visible, announcementToEdit]); // Dependencies

  // Handler for the save button press
  const handleSave = () => {
    if (!announcementToEdit) return; // Should not happen if modal is visible

    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();

    // --- Basic Client-Side Validation ---
    if (!trimmedTitle) {
       Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Title cannot be empty.' });
      return;
    }
    if (!trimmedMessage) {
        Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Message cannot be empty.' });
      return;
    }
    // Type is handled by Picker, always valid
    // --- End Validation ---

    // Build the updates object, only including fields that changed
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
    // Example if editing relatedStudentId:
    // const currentRelatedId = announcementToEdit.relatedStudentId ?? null;
    // if (relatedStudentId !== currentRelatedId) {
    //   updates.relatedStudentId = relatedStudentId ?? undefined; // API expects undefined or string
    //   hasChanges = true;
    // }

    // If nothing actually changed, just close the modal
    if (!hasChanges) {
      console.log('[EditAnnModal] No changes detected.');
      onClose();
      return;
    }

    console.log('[EditAnnModal] Calling mutation with updates:', updates);
    // Execute the mutation with the announcement ID and the changes
    mutation.mutate({ announcementId: announcementToEdit.id, updates });
  };

  // Determine if the save button should be disabled
  const isSaveDisabled = mutation.isPending || !title.trim() || !message.trim();

  // Conditional rendering safeguard
  if (!announcementToEdit) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Edit Announcement</Text>
          <Text style={modalSharedStyles.subTitle}>ID: {announcementToEdit.id}</Text>

          <Text style={commonSharedStyles.label}>Type:</Text>
          <View style={adminSharedStyles.pickerContainer}>
             <Picker
                selectedValue={type}
                onValueChange={(itemValue) => setType(itemValue as AnnouncementType)}
                enabled={!mutation.isPending}
                style={adminSharedStyles.picker}
                itemStyle={adminSharedStyles.pickerItem}
              >
                {ANNOUNCEMENT_TYPES.map((typeValue) => (
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

          {/* Optional: Input/Selector for relatedStudentId if editing is needed */}

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

export default EditAnnouncementModal;