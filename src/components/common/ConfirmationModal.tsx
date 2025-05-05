import React from 'react';

import { Modal, View, Text, Button } from 'react-native';

import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { ConfirmationModalProps } from '../../types/componentProps';

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
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>{title}</Text>
          <Text style={commonSharedStyles.modalMessage}>{message}</Text>

          <View style={commonSharedStyles.full}>
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
