import React from 'react';
import { Modal, View, Text, ScrollView, StyleSheet } from 'react-native';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { colors } from '../../styles/colors';
import { CustomButton } from './CustomButton';
import { XCircleIcon } from 'react-native-heroicons/solid';

interface LegalTextModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export const LegalTextModal: React.FC<LegalTextModalProps> = ({
  visible,
  onClose,
  title,
  content,
}) => {
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>{title}</Text>
          <ScrollView style={styles.contentScrollView}>
            <Text style={styles.contentText}>{content}</Text>
          </ScrollView>
          <View style={[commonSharedStyles.full, { marginTop: 15 }]}>
            <CustomButton
              title="Close"
              onPress={onClose}
              color={colors.primary}
              leftIcon={<XCircleIcon color={colors.textWhite} size={18} />}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  contentScrollView: {
    maxHeight: '80%',
    width: '100%',
    marginBottom: 10,
  },
  contentText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

export default LegalTextModal;
