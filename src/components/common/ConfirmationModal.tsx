
import React from 'react';
import { Modal, View, Text, StyleSheet, Button } from 'react-native';

import { colors } from '../../styles/colors';
import { appSharedStyles } from '../../styles/appSharedStyles'; 

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string; 
  cancelText?: string; 
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      animationType="fade" 
      transparent={true}
      visible={visible}
      onRequestClose={onCancel} 
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>{title}</Text>
          <Text style={modalStyles.modalMessage}>{message}</Text>

          <View style={modalStyles.buttonContainer}>
            {}
            <Button title={confirmText} onPress={onConfirm} color={colors.danger} />
            {}
            <Button title={cancelText} onPress={onCancel} color={colors.secondary} />
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
    backgroundColor: 'rgba(0,0,0,0.6)', 
  },
  modalView: {
    margin: 20,
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 10,
    padding: 25, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxWidth: 400, 
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  modalMessage: {
    marginBottom: 25, 
    textAlign: 'center',
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 21, 
  },
  buttonContainer: {
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    width: '100%',
    marginTop: 10,
    gap: 15, 
  },
});

export default ConfirmationModal;