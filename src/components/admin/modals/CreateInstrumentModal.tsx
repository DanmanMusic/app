import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ActivityIndicator } from 'react-native';
import { createInstrument } from '../../../api/instruments';
import { Instrument } from '../../../mocks/mockInstruments';
import { colors } from '../../../styles/colors';
import { CreateInstrumentModalProps } from '../../../types/componentProps';
import { modalSharedStyles } from '../../../styles/modalSharedStyles'
import { commonSharedStyles } from '../../../styles/commonSharedStyles'

const CreateInstrumentModal: React.FC<CreateInstrumentModalProps> = ({ visible, onClose }) => {
  const [name, setName] = useState('');

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createInstrument,
    onSuccess: createdInstrument => {
      console.log('Instrument created successfully via mutation:', createdInstrument);
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
      onClose();
    },
    onError: error => {
      console.error('Error creating instrument via mutation:', error);
    },
  });

  useEffect(() => {
    if (visible) {
      setName('');
      mutation.reset();
    }
  }, [visible, mutation]);

  const handleCreate = () => {
    if (!name.trim()) {
      return;
    }

    const newInstrumentData: Omit<Instrument, 'id'> = {
      name: name.trim(),
    };

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
            editable={!mutation.isPending}
          />

          {}
          {mutation.isPending && (
            <View style={modalSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalSharedStyles.loadingText}>Creating Instrument...</Text>
            </View>
          )}

          {}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:{' '}
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Failed to create instrument'}
            </Text>
          )}

          <View style={modalSharedStyles.buttonContainer}>
            <Button
              title="Create Instrument"
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

export default CreateInstrumentModal;
