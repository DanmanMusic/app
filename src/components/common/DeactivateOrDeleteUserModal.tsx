// src/components/common/DeactivateOrDeleteUserModal.tsx
import React from 'react';
import { Modal, View, Text, StyleSheet, Button } from 'react-native';

// Types & Utils
import { User, UserStatus } from '../../types/userTypes'; // Import UserStatus
import { getUserDisplayName } from '../../utils/helpers';
import { colors } from '../../styles/colors';

interface DeactivateOrDeleteUserModalProps {
  visible: boolean;
  user: User | null;
  onClose: () => void;
  // Updated prop name and signature to reflect status toggle
  onToggleUserStatus: (userId: string, currentStatus: UserStatus) => void;
  onPermanentDelete: (userId: string) => void;
}

const DeactivateOrDeleteUserModal: React.FC<DeactivateOrDeleteUserModalProps> = ({
  visible,
  user,
  onClose,
  onToggleUserStatus, // Updated prop name
  onPermanentDelete,
}) => {
  if (!visible || !user) {
    return null;
  }

  const displayName = getUserDisplayName(user);
  // Determine text and colors based on status string
  const isCurrentlyActive = user.status === 'active';
  const currentStatusText = isCurrentlyActive ? 'Active' : 'Inactive';
  const toggleButtonText = isCurrentlyActive ? 'Deactivate User' : 'Reactivate User';
  const toggleActionColor = isCurrentlyActive ? colors.warning : colors.success;

  const handleToggle = () => {
    // Pass the current status string
    onToggleUserStatus(user.id, user.status);
  };

  const handleDelete = () => {
    onPermanentDelete(user.id);
  };


  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Manage User Status</Text>
          <Text style={modalStyles.userInfo}>User: {displayName}</Text>
          <Text style={modalStyles.userInfo}>
              Status: <Text style={{fontWeight: 'bold', color: isCurrentlyActive ? colors.success : colors.secondary}}>{currentStatusText}</Text>
          </Text>

          <View style={modalStyles.buttonContainer}>
            {/* Toggle Status Button */}
            <Button
                title={toggleButtonText}
                onPress={handleToggle}
                color={toggleActionColor}
             />

             {/* Permanent Delete Button */}
             <Button
                title="Permanently Delete User"
                onPress={handleDelete}
                color={colors.danger}
             />
          </View>

          <View style={modalStyles.footerButton}>
             <Button title="Cancel" onPress={onClose} color={colors.secondary} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Styles remain the same
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
    shadowOffset: { width: 0, height: 2 },
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
  userInfo: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 8,
      textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 20,
    marginBottom: 15,
    gap: 15,
  },
  footerButton: {
      width: '100%',
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.borderSecondary,
      paddingTop: 15,
  }
});

export default DeactivateOrDeleteUserModal;