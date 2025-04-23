// src/components/admin/modals/EditInstrumentModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Button,
  TextInput,
  Image, // Keep Image for preview
  ActivityIndicator, // Added
  Alert, // Added
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query'; // Added

// API & Types
import { updateInstrument } from '../../../api/instruments'; // Use API file
import { Instrument } from '../../../mocks/mockInstruments';
import { colors } from '../../../styles/colors';
import { getInstrumentIconSource } from '../../../utils/helpers';

// Interface updated: removed onEditConfirm prop
interface EditInstrumentModalProps {
  visible: boolean;
  instrumentToEdit: Instrument | null;
  onClose: () => void;
  // Removed: onEditConfirm: (instrumentId: string, instrumentData: Partial<Omit<Instrument, 'id'>>) => void;
}

const EditInstrumentModal: React.FC<EditInstrumentModalProps> = ({
  visible,
  instrumentToEdit,
  onClose,
}) => {
  // Form State
  const [name, setName] = useState('');

  const queryClient = useQueryClient();

  // --- TanStack Mutation ---
  const mutation = useMutation({
    mutationFn: updateInstrument, // API function: expects { instrumentId, updates }
    onSuccess: updatedInstrument => {
      console.log('Instrument updated successfully via mutation:', updatedInstrument);
      queryClient.invalidateQueries({ queryKey: ['instruments'] }); // Refetch list
      onClose(); // Close modal on success
    },
    onError: (error, variables) => {
      console.error(`Error updating instrument ${variables.instrumentId} via mutation:`, error);
    },
  });

  // Effect to populate form when instrumentToEdit changes or modal opens
  useEffect(() => {
    if (visible && instrumentToEdit) {
      setName(instrumentToEdit.name);
      mutation.reset();
    }
  }, [visible, instrumentToEdit]);

  const handleSave = () => {
    if (!instrumentToEdit) return;

    // Validate input
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    // Construct updates object (only name)
    const updates: Partial<Omit<Instrument, 'id'>> = {};
    if (trimmedName !== instrumentToEdit.name) {
      updates.name = trimmedName;
    }

    // Only mutate if there are changes
    if (Object.keys(updates).length === 0) {
      onClose(); // Close if no changes
      return;
    }

    // Trigger the mutation
    mutation.mutate({ instrumentId: instrumentToEdit.id, updates });
  };

  // Don't render if no instrument is selected
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
              source={getInstrumentIconSource(instrumentToEdit.name)} // Show original icon
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
            editable={!mutation.isPending} // Disable while loading
          />

          {/* Loading Indicator */}
          {mutation.isPending && (
            <View style={modalStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalStyles.loadingText}>Saving Changes...</Text>
            </View>
          )}

          {/* Error Message */}
          {mutation.isError && (
            <Text style={modalStyles.errorText}>
              Error: {mutation.error instanceof Error ? mutation.error.message : 'Failed to save changes'}
            </Text>
          )}

          <View style={modalStyles.buttonContainer}>
            <Button
              title="Save Changes"
              onPress={handleSave}
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