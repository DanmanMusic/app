import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, ActivityIndicator } from 'react-native';
import { deleteUser, toggleUserStatus } from '../../api/users';
import { colors } from '../../styles/colors';
import { DeactivateOrDeleteUserModalProps } from '../../types/componentProps';
import { getUserDisplayName } from '../../utils/helpers';
import { modalSharedStyles } from '../../styles/modalSharedStyles';

import ConfirmationModal from './ConfirmationModal';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

const DeactivateOrDeleteUserModal: React.FC<DeactivateOrDeleteUserModalProps> = ({
  visible,
  user,
  onClose,
}) => {
  const [isConfirmDeleteVisible, setIsConfirmDeleteVisible] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: (_, userId) => {
      console.log(`User ${userId} deleted successfully via mutation.`);
      const userRole = user?.role;
      if (userRole === 'student') {
        queryClient.invalidateQueries({ queryKey: ['students'] });
      } else if (userRole === 'teacher') {
        queryClient.invalidateQueries({ queryKey: ['teachers'] });
      } else if (userRole === 'parent') {
        queryClient.invalidateQueries({ queryKey: ['parents'] });
      }
      console.log(`Successfully deleted user ${user ? getUserDisplayName(user) : userId}.`);
      onClose();
    },
    onError: (error, userId) => {
      console.error(`Error deleting user ${userId} via mutation:`, error);
      console.error(
        `Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      setIsConfirmDeleteVisible(false);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: toggleUserStatus,
    onSuccess: updatedUser => {
      console.log(
        `User ${updatedUser.id} status toggled successfully to ${updatedUser.status} via mutation.`
      );

      if (updatedUser.role === 'student') {
        queryClient.invalidateQueries({ queryKey: ['students'] });
      } else if (updatedUser.role === 'teacher') {
        queryClient.invalidateQueries({ queryKey: ['teachers'] });
      } else if (updatedUser.role === 'parent') {
        queryClient.invalidateQueries({ queryKey: ['parents'] });
      }

      queryClient.invalidateQueries({ queryKey: ['user', updatedUser.id] });

      console.log(
        `Successfully toggled status for ${getUserDisplayName(updatedUser)} to ${updatedUser.status}.`
      );
    },
    onError: (error, userId) => {
      console.error(`Error toggling status for user ${userId} via mutation:`, error);
      console.error(
        `Failed to toggle status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    },
  });

  useEffect(() => {
    if (!visible) {
      deleteMutation.reset();
      toggleStatusMutation.reset();
      setIsConfirmDeleteVisible(false);
    }
  }, [visible, user]);

  if (!visible || !user) {
    return null;
  }

  const displayName = getUserDisplayName(user);
  const isCurrentlyActive = user.status === 'active';
  const currentStatusText = isCurrentlyActive ? 'Active' : 'Inactive';
  const toggleButtonText = isCurrentlyActive ? 'Deactivate User' : 'Reactivate User';
  const toggleActionColor = isCurrentlyActive ? colors.warning : colors.success;

  const handleToggle = () => {
    if (user?.id && !toggleStatusMutation.isPending) {
      toggleStatusMutation.mutate(user.id);
    }
  };

  const handleDeletePress = () => {
    if (!deleteMutation.isPending && !toggleStatusMutation.isPending) {
      setIsConfirmDeleteVisible(true);
    }
  };

  const handleConfirmDeleteAction = () => {
    setIsConfirmDeleteVisible(false);
    if (user?.id && !deleteMutation.isPending) {
      deleteMutation.mutate(user.id);
    } else {
      console.error('Cannot delete: User ID is missing or delete already in progress.');
    }
  };

  const handleCancelDelete = () => {
    setIsConfirmDeleteVisible(false);
  };

  const isActionPending = deleteMutation.isPending || toggleStatusMutation.isPending;

  return (
    <>
      <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalSharedStyles.centeredView}>
          <View style={modalSharedStyles.modalView}>
            <Text style={modalSharedStyles.modalTitle}>Manage User Status</Text>
            <Text style={modalSharedStyles.modalContextInfo}>User: {displayName}</Text>
            <Text style={modalSharedStyles.modalContextInfo}>
              Status:
              <Text
                style={{
                  fontWeight: 'bold',
                  color: isCurrentlyActive ? colors.success : colors.secondary,
                }}
              >
                {currentStatusText}
              </Text>
            </Text>
            {isActionPending && (
              <View style={modalSharedStyles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={modalSharedStyles.loadingText}>
                  {deleteMutation.isPending ? 'Deleting User...' : 'Updating Status...'}
                </Text>
              </View>
            )}
            {toggleStatusMutation.isError && (
              <Text style={commonSharedStyles.errorText}>
                Status update failed:
                {toggleStatusMutation.error instanceof Error
                  ? toggleStatusMutation.error.message
                  : 'Unknown error'}
              </Text>
            )}
            {deleteMutation.isError && (
              <Text style={commonSharedStyles.errorText}>
                Delete failed:
                {deleteMutation.error instanceof Error
                  ? deleteMutation.error.message
                  : 'Unknown error'}
              </Text>
            )}
            <View style={modalSharedStyles.buttonContainer}>
              <Button
                title={toggleButtonText}
                onPress={handleToggle}
                color={toggleActionColor}
                disabled={isActionPending}
              />
              <Button
                title="Permanently Delete User"
                onPress={handleDeletePress}
                color={colors.danger}
                disabled={isActionPending}
              />
            </View>
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

      <ConfirmationModal
        visible={isConfirmDeleteVisible}
        title="Confirm Permanent Deletion"
        message={`Are you absolutely sure you want to permanently delete user "${displayName}" (${user.id})? This action cannot be undone.`}
        confirmText="Yes, Permanently Delete"
        onConfirm={handleConfirmDeleteAction}
        onCancel={handleCancelDelete}
      />
    </>
  );
};

export default DeactivateOrDeleteUserModal;
