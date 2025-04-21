// src/components/admin/modals/CreateTaskLibraryModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Button, TextInput, ScrollView } from 'react-native';

import { TaskLibraryItem } from '../../../mocks/mockTaskLibrary';
import { colors } from '../../../styles/colors';
import { appSharedStyles } from '../../../styles/appSharedStyles';

// Reusing modal styles
const modalStyles = StyleSheet.create({
    centeredView:{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.7)' },
    modalView:{ margin:20, backgroundColor:colors.backgroundPrimary, borderRadius:10, padding:20, alignItems:'center', shadowColor:'#000', shadowOffset:{ width:0, height:2 }, shadowOpacity:0.25, shadowRadius:4, elevation:5, width:'95%', maxWidth:450, maxHeight: '85%' },
    scrollView:{ width:'100%', marginBottom: 15 },
    modalTitle:{ fontSize:20, fontWeight:'bold', marginBottom:15, textAlign:'center', color:colors.textPrimary, width:'100%', borderBottomWidth:1, borderBottomColor:colors.borderPrimary, paddingBottom:10 },
    label:{ fontSize:14, fontWeight:'bold', marginTop:10, marginBottom:5, color:colors.textPrimary, alignSelf:'flex-start', width: '100%' },
    input:{ width:'100%', borderWidth:1, borderColor:colors.borderPrimary, borderRadius:5, padding:10, fontSize:16, color:colors.textPrimary, backgroundColor:colors.backgroundPrimary, marginBottom:10 },
    textArea:{ width:'100%', borderWidth:1, borderColor:colors.borderPrimary, borderRadius:5, padding:10, fontSize:16, color:colors.textPrimary, backgroundColor:colors.backgroundPrimary, marginBottom:10, minHeight: 80, textAlignVertical: 'top' },
    buttonContainer:{ flexDirection:'column', width:'100%', marginTop:10, gap:10 },
    footerButton:{ width:'100%', marginTop:10 },
});

interface CreateTaskLibraryModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateConfirm: (taskData: Omit<TaskLibraryItem, 'id'>) => void;
}

const CreateTaskLibraryModal: React.FC<CreateTaskLibraryModalProps> = ({
  visible,
  onClose,
  onCreateConfirm,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [baseTickets, setBaseTickets] = useState<number | ''>('');

  useEffect(() => {
    if (visible) {
      setTitle('');
      setDescription('');
      setBaseTickets('');
    }
  }, [visible]);

  const handleCreate = () => {
    const numericTickets = typeof baseTickets === 'number' ? baseTickets : parseInt(String(baseTickets || '0'), 10);
    if (!title.trim()) {
      alert('Please enter a task title.');
      return;
    }
    if (!description.trim()) {
      alert('Please enter a task description.');
      return;
    }
     if (isNaN(numericTickets) || numericTickets < 0) {
         alert('Please enter a valid, non-negative base ticket value.');
         return;
     }

    onCreateConfirm({
      title: title.trim(),
      description: description.trim(),
      baseTickets: numericTickets,
    });
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Create New Library Task</Text>
          <ScrollView style={modalStyles.scrollView}>
            <Text style={modalStyles.label}>Task Title:</Text>
            <TextInput
              style={modalStyles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Practice Scales"
              placeholderTextColor={colors.textLight}
              maxLength={100}
            />

             <Text style={modalStyles.label}>Base Tickets:</Text>
            <TextInput
              style={modalStyles.input}
              value={String(baseTickets)}
              onChangeText={text => setBaseTickets(text === '' ? '' : parseInt(text.replace(/[^0-9]/g, ''), 10) || 0)}
              placeholder="e.g., 10"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
            />

            <Text style={modalStyles.label}>Description:</Text>
            <TextInput
              style={modalStyles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the task requirements..."
              placeholderTextColor={colors.textLight}
              multiline={true}
              numberOfLines={3}
            />
          </ScrollView>

          <View style={modalStyles.buttonContainer}>
            <Button title="Create Task" onPress={handleCreate} />
          </View>
          <View style={modalStyles.footerButton}>
            <Button title="Cancel" onPress={onClose} color={colors.secondary} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CreateTaskLibraryModal;