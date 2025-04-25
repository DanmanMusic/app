import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, Image, ActivityIndicator } from 'react-native';
import { updateInstrument } from '../../../api/instruments';
import { Instrument } from '../../../types/dataTypes';
import { colors } from '../../../styles/colors';
import { EditInstrumentModalProps } from '../../../types/componentProps';
import { getInstrumentIconSource } from '../../../utils/helpers';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';

const EditInstrumentModal: React.FC<EditInstrumentModalProps> = ({
  visible,
  instrumentToEdit,
  onClose,
}) => {
  const [name, setName] = useState('');

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateInstrument,
    onSuccess: updatedInstrument => {
      console.log('Instrument updated successfully via mutation:', updatedInstrument);
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Instrument updated successfully.',
        position: 'bottom',
      });
    },
    onError: (error, variables) => {
      console.error(`Error updating instrument ${variables.instrumentId} via mutation:`, error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error instanceof Error ? error.message : 'Could not update instrument.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  useEffect(() => {
    if (visible && instrumentToEdit) {
      setName(instrumentToEdit.name);
      mutation.reset();
    }
  }, [visible, instrumentToEdit]);

  const handleSave = () => {
    if (!instrumentToEdit) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    const updates: Partial<Omit<Instrument, 'id'>> = {};
    if (trimmedName !== instrumentToEdit.name) {
      updates.name = trimmedName;
    }

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    mutation.mutate({ instrumentId: instrumentToEdit.id, updates });
  };

  if (!instrumentToEdit) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Edit Instrument</Text>
          <Text style={modalSharedStyles.subTitle}>ID: {instrumentToEdit.id}</Text>
          <View style={modalSharedStyles.iconPreviewContainer}>
            <Text style={commonSharedStyles.label}>Current Icon (Mock):</Text>
            <Image
              source={getInstrumentIconSource(instrumentToEdit.name)}
              style={modalSharedStyles.iconPreview}
              resizeMode="contain"
            />
          </View>
          <Text style={commonSharedStyles.label}>Instrument Name:</Text>
          <TextInput
            style={commonSharedStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Saxophone"
            placeholderTextColor={colors.textLight}
            autoCapitalize="words"
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

export default EditInstrumentModal;
