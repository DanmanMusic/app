// src/components/admin/modals/EditInstrumentModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Button, TextInput, Image } from 'react-native'; // Added Image

import { Instrument } from '../../../mocks/mockInstruments';
import { colors } from '../../../styles/colors';
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { getInstrumentIconSource } from '../../../utils/helpers'; // Import the helper

// Function to get icon source REMOVED from here


// Reusing modal styles
const modalStyles = StyleSheet.create({
    centeredView:{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.7)' },
    modalView:{ margin:20, backgroundColor:colors.backgroundPrimary, borderRadius:10, padding:20, alignItems:'center', shadowColor:'#000', shadowOffset:{ width:0, height:2 }, shadowOpacity:0.25, shadowRadius:4, elevation:5, width:'95%', maxWidth:400 },
    modalTitle:{ fontSize:20, fontWeight:'bold', marginBottom:5, textAlign:'center', color:colors.textPrimary, width:'100%', },
    subTitle:{ fontSize:14, color:colors.textSecondary, marginBottom:15, textAlign:'center', width:'100%', borderBottomWidth:1, borderBottomColor:colors.borderPrimary, paddingBottom:10, },
    label:{ fontSize:14, fontWeight:'bold', marginTop:10, marginBottom:5, color:colors.textPrimary, alignSelf:'flex-start', width: '100%' },
    input:{ width:'100%', borderWidth:1, borderColor:colors.borderPrimary, borderRadius:5, padding:10, fontSize:16, color:colors.textPrimary, backgroundColor:colors.backgroundPrimary, marginBottom:15 },
    buttonContainer:{ flexDirection:'column', width:'100%', marginTop:10, gap:10 },
    footerButton:{ width:'100%', marginTop:10 },
    // Styles for icon display in modal
    iconPreviewContainer: {
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSecondary,
        width: '100%',
    },
    iconPreview: {
        width: 60, // Slightly larger preview
        height: 60,
        marginBottom: 5,
        // Add border if helpful to see JPEG bounds
        // borderWidth: 1,
        // borderColor: colors.borderLight,
    },
});


interface EditInstrumentModalProps {
  visible: boolean;
  instrumentToEdit: Instrument | null;
  onClose: () => void;
  onEditConfirm: (instrumentId: string, instrumentData: Partial<Omit<Instrument, 'id'>>) => void;
}

const EditInstrumentModal: React.FC<EditInstrumentModalProps> = ({
  visible,
  instrumentToEdit,
  onClose,
  onEditConfirm,
}) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (visible && instrumentToEdit) {
      setName(instrumentToEdit.name);
    } else if (!visible) {
      setName('');
    }
  }, [visible, instrumentToEdit]);

  const handleSave = () => {
    if (!instrumentToEdit) return;
    if (!name.trim()) {
      alert('Please enter an instrument name.');
      return;
    }
    onEditConfirm(instrumentToEdit.id, { name: name.trim() });
  };

  if (!instrumentToEdit) return null; // Don't render without data

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Edit Instrument</Text>
          <Text style={modalStyles.subTitle}>ID: {instrumentToEdit.id}</Text>

          {/* Icon Preview */}
          <View style={modalStyles.iconPreviewContainer}>
              <Text style={modalStyles.label}>Current Icon (Mock):</Text>
              <Image
                  source={getInstrumentIconSource(instrumentToEdit.name)} // Uses imported helper
                  style={modalStyles.iconPreview}
                  resizeMode="contain"
               />
               {/* "Edit Icon" button is removed as per request */}
          </View>


          <Text style={modalStyles.label}>Instrument Name:</Text>
          <TextInput
            style={modalStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Saxophone"
            placeholderTextColor={colors.textLight}
            autoCapitalize="words"
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

export default EditInstrumentModal;