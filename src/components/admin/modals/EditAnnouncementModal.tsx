
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Button, TextInput } from 'react-native';

import { Announcement, AnnouncementType } from '../../../mocks/mockAnnouncements'; 
import { colors } from '../../../styles/colors';
import { appSharedStyles } from '../../../styles/appSharedStyles';


const modalStyles = StyleSheet.create({
    centeredView:{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.7)' },
    modalView:{ margin:20, backgroundColor:colors.backgroundPrimary, borderRadius:10, padding:20, alignItems:'center', shadowColor:'#000', shadowOffset:{ width:0, height:2 }, shadowOpacity:0.25, shadowRadius:4, elevation:5, width:'95%', maxWidth:400 },
    modalTitle:{ fontSize:20, fontWeight:'bold', marginBottom:5, textAlign:'center', color:colors.textPrimary, width:'100%' },
    subTitle:{ fontSize:14, color:colors.textSecondary, marginBottom:15, textAlign:'center', width:'100%', borderBottomWidth:1, borderBottomColor:colors.borderPrimary, paddingBottom:10 },
    label:{ fontSize:14, fontWeight:'bold', marginTop:10, marginBottom:5, color:colors.textPrimary, alignSelf:'flex-start', width: '100%' },
    input:{ width:'100%', borderWidth:1, borderColor:colors.borderPrimary, borderRadius:5, padding:10, fontSize:16, color:colors.textPrimary, backgroundColor:colors.backgroundPrimary, marginBottom:15 },
    textArea:{ width:'100%', borderWidth:1, borderColor:colors.borderPrimary, borderRadius:5, padding:10, fontSize:16, color:colors.textPrimary, backgroundColor:colors.backgroundPrimary, marginBottom:15, height: 100, textAlignVertical: 'top' },
    buttonContainer:{ flexDirection:'column', width:'100%', marginTop:10, gap:10 },
    footerButton:{ width:'100%', marginTop:10 },
});

interface EditAnnouncementModalProps {
  visible: boolean;
  announcementToEdit: Announcement | null;
  onClose: () => void;
  onEditConfirm: (announcementId: string, announcementData: Partial<Omit<Announcement, 'id' | 'date'>>) => void;
}

const EditAnnouncementModal: React.FC<EditAnnouncementModalProps> = ({
  visible,
  announcementToEdit,
  onClose,
  onEditConfirm,
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AnnouncementType>('announcement');

  useEffect(() => {
    if (visible && announcementToEdit) {
      setTitle(announcementToEdit.title);
      setMessage(announcementToEdit.message);
      setType(announcementToEdit.type); 
    } else if (!visible) {
      
      setTitle('');
      setMessage('');
      setType('announcement');
    }
  }, [visible, announcementToEdit]);

  const handleSave = () => {
    if (!announcementToEdit) return;
    if (!title.trim() || !message.trim()) {
      alert('Please enter both a title and a message.');
      return;
    }
    onEditConfirm(announcementToEdit.id, {
        title: title.trim(),
        message: message.trim(),
        type: type, 
        
    });
  };

  if (!announcementToEdit) return null; 

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Edit Announcement</Text>
          <Text style={modalStyles.subTitle}>ID: {announcementToEdit.id}</Text>

          {}

          <Text style={modalStyles.label}>Title:</Text>
          <TextInput
            style={modalStyles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Announcement Title"
            placeholderTextColor={colors.textLight}
            maxLength={100}
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
          />

          <View style={modalStyles.buttonContainer}>
            <Button title="Save Changes" onPress={handleSave} />
          </View>
          <View style={modalStyles.footerButton}>
            <Button title="Cancel" onPress={onClose} color={colors.secondary} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditAnnouncementModal;