import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, ActivityIndicator, StyleSheet } from 'react-native';

import { deleteUser, toggleUserStatus } from '../../api/users';

import { colors } from '../../styles/colors';
import { modalSharedStyles } from '../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { getUserDisplayName } from '../../utils/helpers';

import { DeactivateOrDeleteUserModalProps } from '../../types/componentProps';
import ConfirmationModal from './ConfirmationModal';
import Toast from 'react-native-toast-message';

const DeactivateOrDeleteUserModal: React.FC<DeactivateOrDeleteUserModalProps> = ({
  visible,
  user,
  onClose,
  onDeletionSuccess,
}) => {
  const [isConfirmDeleteVisible, setIsConfirmDeleteVisible] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: (_, userId) => {
      console.log(`[DeactivateOrDeleteUserModal] User ${userId} deleted (Simulated).`);

      const userRole = user?.role;
      if (userRole === 'student') queryClient.invalidateQueries({ queryKey: ['students'] });
      if (userRole === 'teacher') queryClient.invalidateQueries({ queryKey: ['teachers'] });
      if (userRole === 'parent') queryClient.invalidateQueries({ queryKey: ['parents'] });
      if (userRole === 'admin') queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
      console.log(
        `Successfully deleted user ${user ? getUserDisplayName(user) : userId} (Simulated).`
      );
      if (onDeletionSuccess) onDeletionSuccess(userId);
      onClose();
      Toast.show({ type: 'success', text1: 'Success', text2: 'User delete simulated.' });
    },
    onError: (error: Error, userId) => {
      console.error(`[DeactivateOrDeleteUserModal] Error deleting user ${userId}:`, error);
      setIsConfirmDeleteVisible(false);
      Toast.show({
        type: 'error',
        text1: 'Deletion Not Implemented',
        text2: error.message || 'Could not delete user.',
        position: 'bottom',
        visibilityTime: 5000,
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: toggleUserStatus,
    onSuccess: updatedUser => {
      console.log(
        `[DeactivateOrDeleteUserModal] User ${updatedUser.id} status toggled to ${updatedUser.status}.`
      );

      const userRole = updatedUser.role;
      if (userRole === 'student') queryClient.invalidateQueries({ queryKey: ['students'] });
      if (userRole === 'teacher') queryClient.invalidateQueries({ queryKey: ['teachers'] });
      if (userRole === 'parent') queryClient.invalidateQueries({ queryKey: ['parents'] });
      if (userRole === 'admin') queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', updatedUser.id] });
      console.log(
        `Successfully toggled status for ${getUserDisplayName(updatedUser)} to ${updatedUser.status}.`
      );
      onClose();
      Toast.show({ type: 'success', text1: 'Success', text2: 'User status updated successfully.' });
    },
    onError: (error: Error, userId) => {
      console.error(
        `[DeactivateOrDeleteUserModal] Error toggling status for user ${userId}:`,
        error
      );
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error.message || 'Could not update user status.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  useEffect(() => {
    if (!visible) {
      deleteMutation.reset();
      toggleStatusMutation.reset();
      setIsConfirmDeleteVisible(false);
    }
  }, [visible]);

  const handleToggle = () => {
    if (user?.id && !toggleStatusMutation.isPending && !deleteMutation.isPending) {
      toggleStatusMutation.mutate(user.id);
    }
  };

  const handleDeletePress = () => {
    if (!deleteMutation.isPending && !toggleStatusMutation.isPending) {
      Toast.show({
        type: 'info',
        text1: 'Feature Not Implemented',
        text2: 'Permanent user deletion requires server-side logic.',
        visibilityTime: 5000,
      });
      console.warn('Attempted permanent delete, but API implementation is deferred.');
    }
  };

  const handleConfirmDeleteAction = () => {
    if (user?.id && !deleteMutation.isPending) {
      try {
        deleteMutation.mutate(user.id);
      } catch (e) {}
    } else {
      console.error(
        '[DeactivateOrDeleteUserModal] Cannot delete: User ID missing or delete already in progress.'
      );
      setIsConfirmDeleteVisible(false);
    }
  };

  const handleCancelDelete = () => {
    setIsConfirmDeleteVisible(false);
  };

  if (!visible || !user) {
    return null;
  }

  const displayName = getUserDisplayName(user);
  const isCurrentlyActive = user.status === 'active';
  const currentStatusText = isCurrentlyActive ? 'Active' : 'Inactive';
  const toggleButtonText = isCurrentlyActive ? 'Deactivate User' : 'Reactivate User';
  const toggleActionColor = isCurrentlyActive ? colors.warning : colors.success;

  const isActionPending = deleteMutation.isPending || toggleStatusMutation.isPending;

  const isDeleteDisabled = true;

  return (
    <>
      {}
      <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalSharedStyles.centeredView}>
          <View style={modalSharedStyles.modalView}>
            <Text style={modalSharedStyles.modalTitle}>Manage User Status</Text>
            <Text style={modalSharedStyles.modalContextInfo}>User: {displayName}</Text>
            <Text style={modalSharedStyles.modalContextInfo}>
              Current Status:{' '}
              <Text style={isCurrentlyActive ? styles.activeStatus : styles.inactiveStatus}>
                {currentStatusText}
              </Text>
            </Text>

            {}
            {toggleStatusMutation.isPending && (
              <View style={modalSharedStyles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={modalSharedStyles.loadingText}>Updating Status...</Text>
              </View>
            )}

            {}
            {toggleStatusMutation.isError && (
              <Text style={commonSharedStyles.errorText}>
                Status update failed:{' '}
                {toggleStatusMutation.error instanceof Error
                  ? toggleStatusMutation.error.message
                  : 'Unknown error'}
              </Text>
            )}

            {}
            <View style={modalSharedStyles.buttonContainer}>
              <Button
                title={toggleButtonText}
                onPress={handleToggle}
                color={toggleActionColor}
                disabled={isActionPending}
              />
              <Button
                title="Permanently Delete (Disabled)"
                onPress={handleDeletePress}
                color={colors.danger}
                disabled={isDeleteDisabled}
              />
            </View>

            {}
            <Text style={styles.infoText}>
              Note: Permanent deletion requires server-side setup and is currently disabled.
            </Text>

            {}
            <View style={modalSharedStyles.footerButton}>
              <Button
                title="Close"
                onPress={onClose}
                color={colors.secondary}
                disabled={isActionPending}
              />
            </View>
          </View>
        </View>
      </Modal>

      {}
      {}
      <ConfirmationModal
        visible={isConfirmDeleteVisible}
        title="Confirm Permanent Deletion"
        message={`Are you absolutely sure you want to permanently delete user "${displayName}" (${user.id})? This action requires server setup and cannot be undone.`}
        confirmText={
          deleteMutation.isPending ? 'Deleting...' : 'Yes, Permanently Delete (Disabled)'
        }
        onConfirm={handleConfirmDeleteAction}
        onCancel={handleCancelDelete}
        confirmDisabled={true}
      />
    </>
  );
};

const styles = StyleSheet.create({
  activeStatus: {
    fontWeight: 'bold',
    color: colors.success,
  },
  inactiveStatus: {
    fontWeight: 'bold',
    color: colors.secondary,
  },
  infoText: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});

export default DeactivateOrDeleteUserModal;
