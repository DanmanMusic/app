// src/components/admin/modals/CreateAnnouncementModal.tsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';

// Import the refactored API function
import { createAnnouncement } from '../../../api/announcements';

import { Announcement, AnnouncementType } from '../../../types/dataTypes';
import { colors } from '../../../styles/colors';
import { CreateAnnouncementModalProps } from '../../../types/componentProps';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';

// Define the available types for the picker
const ANNOUNCEMENT_TYPES: AnnouncementType[] = ['announcement', 'challenge', 'redemption_celebration'];

const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({ visible, onClose }) => {
  // State for form fields
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AnnouncementType>('announcement'); // Default type
  // Add state for relatedStudentId if you want to allow setting it during creation (optional)
  // const [relatedStudentId, setRelatedStudentId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Mutation hook using the Supabase API function
  const mutation = useMutation({
    mutationFn: createAnnouncement, // Point to the Supabase function
    onSuccess: createdAnnouncement => {
      console.log('[CreateAnnModal] Announcement created successfully:', createdAnnouncement);
      // Invalidate the query for announcements to refetch the list
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      onClose(); // Close modal on success
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

  // Effect to reset form when modal visibility changes
  useEffect(() => {
    if (visible) {
      setTitle('');
      setMessage('');
      setType('announcement'); // Reset to default type
      // setRelatedStudentId(null); // Reset if using this state
      mutation.reset();
    }
  }, [visible]);

  // Handler for the create button press
  const handleCreate = () => {
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
    // Type should always be selected due to Picker default
    // --- End Validation ---

    // Prepare data in the format expected by the API function (camelCase)
    const newAnnouncementData: Omit<Announcement, 'id' | 'date'> = {
      title: trimmedTitle,
      message: trimmedMessage,
      type: type,
      // relatedStudentId: relatedStudentId ?? undefined, // Include if using the state
    };

    console.log('[CreateAnnModal] Calling mutation with data:', newAnnouncementData);
    mutation.mutate(newAnnouncementData); // Execute the mutation
  };

  // Determine if the create button should be disabled
  const isCreateDisabled = mutation.isPending || !title.trim() || !message.trim();

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Create New Announcement</Text>

          <Text style={commonSharedStyles.label}>Type:</Text>
          {/* Use Picker for selecting the type */}
          <View style={commonSharedStyles.input} > {/* Wrap Picker in a View styled like input */}
             <Picker
                selectedValue={type}
                onValueChange={(itemValue) => setType(itemValue as AnnouncementType)}
                enabled={!mutation.isPending}
                style={{ height: 40, width: '100%'}} // Basic styling for Picker
                itemStyle={{ height: 40 }} // Needed for iOS height consistency
              >
                {ANNOUNCEMENT_TYPES.map((typeValue) => (
                  <Picker.Item key={typeValue} label={typeValue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} value={typeValue} />
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

          {/* Optional: Input for relatedStudentId if needed */}
          {/*
          <Text style={commonSharedStyles.label}>Related Student ID (Optional):</Text>
          <TextInput
            style={commonSharedStyles.input}
            value={relatedStudentId ?? ''}
            onChangeText={setRelatedStudentId}
            placeholder="Enter Student ID if applicable"
            placeholderTextColor={colors.textLight}
            editable={!mutation.isPending}
          />
          */}

          {/* Loading Indicator */}
          {mutation.isPending && (
            <View style={modalSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalSharedStyles.loadingText}>Creating Announcement...</Text>
            </View>
          )}

          {/* Error Message Display */}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error: {mutation.error instanceof Error ? mutation.error.message : 'Failed to create announcement'}
            </Text>
          )}

          {/* Action Buttons */}
          <View style={modalSharedStyles.buttonContainer}>
            <Button
               title={mutation.isPending ? "Creating..." : "Create Announcement"}
               onPress={handleCreate}
               disabled={isCreateDisabled}
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