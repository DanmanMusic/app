// src/components/admin/modals/EditAnnouncementModal.tsx
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
import { updateAnnouncement } from '../../../api/announcements'; // Use API file
import { Announcement, AnnouncementType } from '../../../mocks/mockAnnouncements';
import { colors } from '../../../styles/colors';

// Interface updated: removed onEditConfirm prop
interface EditAnnouncementModalProps {
  visible: boolean;
  announcementToEdit: Announcement | null;
  onClose: () => void;
  // Removed: onEditConfirm: ( announcementId: string, announcementData: Partial<Omit<Announcement, 'id' | 'date'>> ) => void;
}

const EditAnnouncementModal: React.FC<EditAnnouncementModalProps> = ({
  visible,
  announcementToEdit,
  onClose,
}) => {
  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AnnouncementType>('announcement'); // Keep track of type

  const queryClient = useQueryClient();

  // --- TanStack Mutation ---
  const mutation = useMutation({
    mutationFn: updateAnnouncement, // API function: expects { announcementId, updates }
    onSuccess: updatedAnnouncement => {
      console.log('Announcement updated successfully via mutation:', updatedAnnouncement);
      queryClient.invalidateQueries({ queryKey: ['announcements'] }); // Refetch list
      onClose(); // Close modal on success
    },
    onError: (error, variables) => {
      console.error(`Error updating announcement ${variables.announcementId} via mutation:`, error);
    },
  });

  // Effect to populate form when announcementToEdit changes or modal opens
  useEffect(() => {
    if (visible && announcementToEdit) {
      setTitle(announcementToEdit.title);
      setMessage(announcementToEdit.message);
      setType(announcementToEdit.type); // Set type from original
      mutation.reset();
    }
  }, [visible, announcementToEdit]);

  const handleSave = () => {
    if (!announcementToEdit) return;

    // Validate input
    if (!title.trim()) {
      return;
    }
    if (!message.trim()) {
      return;
    }

    // Construct the updates object - only include changed fields
    const updates: Partial<Omit<Announcement, 'id' | 'date'>> = {};
    if (title.trim() !== announcementToEdit.title) updates.title = title.trim();
    if (message.trim() !== announcementToEdit.message) updates.message = message.trim();
    if (type !== announcementToEdit.type) updates.type = type;
    // relatedStudentId could be updated here if needed

    // Only mutate if there are actual changes
    if (Object.keys(updates).length === 0) {
      onClose(); // Close if no changes
      return;
    }

    // Trigger the mutation
    mutation.mutate({ announcementId: announcementToEdit.id, updates });
  };

  // Don't render if no announcement is selected
  if (!announcementToEdit) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Edit Announcement</Text>
          <Text style={modalStyles.subTitle}>ID: {announcementToEdit.id}</Text>

          <Text style={modalStyles.label}>Title:</Text>
          <TextInput
            style={modalStyles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Announcement Title"
            placeholderTextColor={colors.textLight}
            maxLength={100}
            editable={!mutation.isPending} // Disable while loading
          />

          <Text style={modalStyles.label}>Message:</Text>
          <TextInput
            style={modalStyles.textArea}
            value={message}
            onChangeText={setMessage}
            placeholder="Enter the full announcement message..."
            placeholderTextColor={colors.textLight}
            multiline={true}
            numberOfLines={4}
            editable={!mutation.isPending}
          />

          {/* Optional: Add controls to change 'type' if needed */}

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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
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

export default EditAnnouncementModal;