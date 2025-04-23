import React, { useState, useEffect } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  Modal,
  View,
  Text,
  StyleSheet,
  Button,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { updateInstrument } from '../../../api/instruments';
import { Instrument } from '../../../mocks/mockInstruments';
import { colors } from '../../../styles/colors';
import { getInstrumentIconSource } from '../../../utils/helpers';
import { EditInstrumentModalProps } from '../../../types/componentProps';

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
    },
    onError: (error, variables) => {
      console.error(`Error updating instrument ${variables.instrumentId} via mutation:`, error);
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
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Edit Instrument</Text>
          <Text style={modalStyles.subTitle}>ID: {instrumentToEdit.id}</Text>

          <View style={modalStyles.iconPreviewContainer}>
            <Text style={modalStyles.label}>Current Icon (Mock):</Text>
            <Image
              source={getInstrumentIconSource(instrumentToEdit.name)}
              style={modalStyles.iconPreview}
              resizeMode="contain"
            />
          </View>

          <Text style={modalStyles.label}>Instrument Name:</Text>
          <TextInput
            style={modalStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Saxophone"
            placeholderTextColor={colors.textLight}
            autoCapitalize="words"
            editable={!mutation.isPending}
          />

          {}
          {mutation.isPending && (
            <View style={modalStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalStyles.loadingText}>Saving Changes...</Text>
            </View>
          )}

          {}
          {mutation.isError && (
            <Text style={modalStyles.errorText}>
              Error:{' '}
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to save changes'}
            </Text>
          )}

          <View style={modalStyles.buttonContainer}>
            <Button title="Save Changes" onPress={handleSave} disabled={mutation.isPending} />
          </View>
          <View style={modalStyles.footerButton}>
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

const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalView: {
    margin: 20,
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '95%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
    color: colors.textPrimary,
    width: '100%',
  },
  subTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 15,
    textAlign: 'center',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    paddingBottom: 10,
  },
  iconPreviewContainer: {
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSecondary,
    width: '100%',
  },
  iconPreview: {
    width: 60,
    height: 60,
    marginBottom: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    color: colors.textPrimary,
    alignSelf: 'flex-start',
    width: '100%',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundPrimary,
    marginBottom: 15,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 5,
    height: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 5,
    fontSize: 14,
    minHeight: 18,
  },
  buttonContainer: { flexDirection: 'column', width: '100%', marginTop: 10, gap: 10 },
  footerButton: { width: '100%', marginTop: 10 },
});

export default EditInstrumentModal;
