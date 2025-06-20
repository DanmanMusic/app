import React from 'react';

import { Modal, View, Text } from 'react-native';

import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { ConfirmationModalProps } from '../../types/componentProps';
import { CustomButton } from './CustomButton';
import { XCircleIcon } from 'react-native-heroicons/solid';

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
            <CustomButton
              title={confirmText}
              onPress={onConfirm}
              color={colors.danger}
              disabled={confirmDisabled}
            />
            <CustomButton
              title={cancelText}
              onPress={onCancel}
              color={colors.secondary}
              leftIcon={<XCircleIcon color={colors.textWhite} size={18} />}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ConfirmationModal;
