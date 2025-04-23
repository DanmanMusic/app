
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Button,
  TextInput,
  ActivityIndicator, 
  Alert, 
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query'; 


import { updateAnnouncement } from '../../../api/announcements'; 
import { Announcement, AnnouncementType } from '../../../mocks/mockAnnouncements';
import { colors } from '../../../styles/colors';


interface EditAnnouncementModalProps {
  visible: boolean;
  announcementToEdit: Announcement | null;
  onClose: () => void;
  
}

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
  }, [visible, announcementToEdit]);

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
            editable={!mutation.isPending} 
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

          {}

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
            <Button
              title="Save Changes"
              onPress={handleSave}
              disabled={mutation.isPending} 
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
