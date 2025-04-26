// src/components/admin/modals/CreateInstrumentModal.tsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ActivityIndicator } from 'react-native';
// --- Make sure we import the refactored API function ---
import { createInstrument } from '../../../api/instruments';
// ------------------------------------------------------
import { Instrument } from '../../../types/dataTypes';
import { colors } from '../../../styles/colors';
import { CreateInstrumentModalProps } from '../../../types/componentProps';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';

const CreateInstrumentModal: React.FC<CreateInstrumentModalProps> = ({ visible, onClose }) => {
  const [name, setName] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    // --- Ensure mutationFn points to the correct API function ---
    mutationFn: createInstrument,
    // ----------------------------------------------------------
    onSuccess: (createdInstrument) => {
      // Invalidate the query for the instruments list so it refetches
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
      onClose(); // Close modal on success
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `Instrument "${createdInstrument.name}" created successfully.`,
        position: 'bottom',
      });
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: 'Creation Failed',
        text2: error instanceof Error ? error.message : 'Could not create instrument.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  useEffect(() => {
    if (visible) {
      setName('');
      mutation.reset(); // Reset mutation state when modal opens
    }
  }, [visible]);

  const handleCreate = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Toast.show({ // Provide user feedback for validation
          type: 'error',
          text1: 'Validation Error',
          text2: 'Instrument name cannot be empty.',
          position: 'bottom',
      });
      return; // Prevent submission if name is empty
    }

    // Prepare the data expected by the refactored createInstrument (just name for now)
    const newInstrumentData: Pick<Instrument, 'name'> = {
      name: trimmedName,
    };
    // --- TODO: Later, add image file handling here ---
    // If an image was picked:
    // 1. Upload image to Supabase Storage, get path
    // 2. Add 'image_path' to newInstrumentData
    // 3. Call mutation.mutate(newInstrumentData)
    // For now, just mutate with the name:
    mutation.mutate(newInstrumentData);
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Add New Instrument</Text>

          <Text style={commonSharedStyles.label}>Instrument Name:</Text>
          <TextInput
            style={commonSharedStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Saxophone"
            placeholderTextColor={colors.textLight}
            autoCapitalize="words"
            editable={!mutation.isPending} // Disable input while submitting
          />
          {/* --- TODO: Add Image Picker button here later --- */}

          {mutation.isPending && (
            <View style={modalSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalSharedStyles.loadingText}>Creating Instrument...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error: {mutation.error instanceof Error ? mutation.error.message : 'Failed to create instrument'}
            </Text>
          )}
          <View style={modalSharedStyles.buttonContainer}>
            <Button
              title={mutation.isPending ? "Creating..." : "Create Instrument"}
              onPress={handleCreate}
              disabled={mutation.isPending || !name.trim()} // Disable if pending or name is empty
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

export default CreateInstrumentModal;