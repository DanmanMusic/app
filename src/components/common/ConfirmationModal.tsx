import React from 'react';
import { Modal, View, Text, Button } from 'react-native';
import { colors } from '../../styles/colors';
import { ConfirmationModalProps } from '../../types/componentProps';
import { appSharedStyles } from '../../styles/appSharedStyles';

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmDisabled = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onCancel}>
      <View style={appSharedStyles.centeredView}>
        <View style={appSharedStyles.modalView}>
          <Text style={appSharedStyles.modalTitle}>{title}</Text>
          <Text style={appSharedStyles.modalMessage}>{message}</Text>

          <View style={appSharedStyles.buttonContainer}>
            <Button
              title={confirmText}
              onPress={onConfirm}
              color={colors.danger}
              disabled={confirmDisabled}
            />
            <Button title={cancelText} onPress={onCancel} color={colors.secondary} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ConfirmationModal;
