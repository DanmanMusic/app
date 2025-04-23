// src/components/admin/modals/CreateInstrumentModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Button,
  TextInput,
  ActivityIndicator, // Added
  Alert, // Added
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query'; // Added

// API & Types
import { createInstrument } from '../../../api/instruments'; // Use API file
import { Instrument } from '../../../mocks/mockInstruments';
import { colors } from '../../../styles/colors';

// Interface updated: removed onCreateConfirm prop
interface CreateInstrumentModalProps {
  visible: boolean;
  onClose: () => void;
  // Removed: onCreateConfirm: (instrumentData: Omit<Instrument, 'id'>) => void;
}

const CreateInstrumentModal: React.FC<CreateInstrumentModalProps> = ({ visible, onClose }) => {
  // Form State
  const [name, setName] = useState('');

  const queryClient = useQueryClient();

  // --- TanStack Mutation ---
  const mutation = useMutation({
    mutationFn: createInstrument, // API function to call
    onSuccess: createdInstrument => {
      console.log('Instrument created successfully via mutation:', createdInstrument);
      queryClient.invalidateQueries({ queryKey: ['instruments'] }); // Refetch list
      onClose(); // Close modal on success
    },
    onError: error => {
      console.error('Error creating instrument via mutation:', error);
    },
  });

  // Effect to reset form when modal visibility changes
  useEffect(() => {
    if (visible) {
      setName('');
      mutation.reset();
    }
  }, [visible]);

  const handleCreate = () => {
    // Validate input
    if (!name.trim()) {
      return;
    }

    const newInstrumentData: Omit<Instrument, 'id'> = {
      name: name.trim(),
    };

    // Trigger the mutation
    mutation.mutate(newInstrumentData);
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Add New Instrument</Text>

          <Text style={modalStyles.label}>Instrument Name:</Text>
          <TextInput
            style={modalStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Saxophone"
            placeholderTextColor={colors.textLight}
            autoCapitalize="words"
            editable={!mutation.isPending} // Disable while loading
          />

          {/* Loading Indicator */}
          {mutation.isPending && (
            <View style={modalStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalStyles.loadingText}>Creating Instrument...</Text>
            </View>
          )}

          {/* Error Message */}
          {mutation.isError && (
            <Text style={modalStyles.errorText}>
              Error: {mutation.error instanceof Error ? mutation.error.message : 'Failed to create instrument'}
            </Text>
          )}

          <View style={modalStyles.buttonContainer}>
            <Button
              title="Create Instrument"
              onPress={handleCreate}
              disabled={mutation.isPending} // Disable button while loading
            />
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

// --- Styles ---
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
    marginBottom: 15,
    textAlign: 'center',
    color: colors.textPrimary,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    paddingBottom: 10,
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

export default CreateInstrumentModal;