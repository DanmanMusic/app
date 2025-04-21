
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Button, TextInput } from 'react-native';

import { Instrument } from '../../../mocks/mockInstruments'; 
import { colors } from '../../../styles/colors';
import { appSharedStyles } from '../../../styles/appSharedStyles';


const modalStyles = StyleSheet.create({
    centeredView:{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.7)' },
    modalView:{ margin:20, backgroundColor:colors.backgroundPrimary, borderRadius:10, padding:20, alignItems:'center', shadowColor:'#000', shadowOffset:{ width:0, height:2 }, shadowOpacity:0.25, shadowRadius:4, elevation:5, width:'95%', maxWidth:400 },
    modalTitle:{ fontSize:20, fontWeight:'bold', marginBottom:15, textAlign:'center', color:colors.textPrimary, width:'100%', borderBottomWidth:1, borderBottomColor:colors.borderPrimary, paddingBottom:10 },
    label:{ fontSize:14, fontWeight:'bold', marginTop:10, marginBottom:5, color:colors.textPrimary, alignSelf:'flex-start', width: '100%' },
    input:{ width:'100%', borderWidth:1, borderColor:colors.borderPrimary, borderRadius:5, padding:10, fontSize:16, color:colors.textPrimary, backgroundColor:colors.backgroundPrimary, marginBottom:15 },
    buttonContainer:{ flexDirection:'column', width:'100%', marginTop:10, gap:10 },
    footerButton:{ width:'100%', marginTop:10 },
});


interface CreateInstrumentModalProps {
  visible: boolean;
  onClose: () => void;
  
  onCreateConfirm: (instrumentData: Omit<Instrument, 'id'>) => void;
}

const CreateInstrumentModal: React.FC<CreateInstrumentModalProps> = ({
  visible,
  onClose,
  onCreateConfirm,
}) => {
  const [name, setName] = useState('');

  
  useEffect(() => {
    if (visible) {
      setName('');
    }
  }, [visible]);

  const handleCreate = () => {
    if (!name.trim()) {
      alert('Please enter an instrument name.');
      return;
    }
    onCreateConfirm({ name: name.trim() });
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
          <Text style={modalStyles.modalTitle}>Add New Instrument</Text>

          <Text style={modalStyles.label}>Instrument Name:</Text>
          <TextInput
            style={modalStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Saxophone"
            placeholderTextColor={colors.textLight}
            autoCapitalize="words"
          />
          {}

          <View style={modalStyles.buttonContainer}>
            <Button title="Create Instrument" onPress={handleCreate} />
          </View>
          <View style={modalStyles.footerButton}>
            <Button title="Cancel" onPress={onClose} color={colors.secondary} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CreateInstrumentModal;