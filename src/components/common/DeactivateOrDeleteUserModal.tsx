// src/components/common/DeactivateOrDeleteUserModal.tsx
import React, { useState, useEffect } from 'react';

import { Modal, View, Text, ActivityIndicator } from 'react-native';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import Toast from 'react-native-toast-message';

import ConfirmationModal from './ConfirmationModal';
import { deleteUser, toggleUserStatus } from '../../api/users';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { DeactivateOrDeleteUserModalProps } from '../../types/componentProps';
import { getUserDisplayName } from '../../utils/helpers';
import { CustomButton } from './CustomButton';
import {
  PauseCircleIcon,
  PlayCircleIcon,
  UserMinusIcon,
  XCircleIcon,
} from 'react-native-heroicons/solid';

export const DeactivateOrDeleteUserModal: React.FC<DeactivateOrDeleteUserModalProps> = ({
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
      console.log(
        `[DeactivateOrDeleteUserModal] User ${userId} deleted successfully via API/Edge Function.`
      );
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'User deleted successfully.',
        position: 'bottom',
      });

      const userRole = user?.role;
      if (userRole === 'student') queryClient.invalidateQueries({ queryKey: ['students'] });
      if (userRole === 'teacher') queryClient.invalidateQueries({ queryKey: ['teachers'] });
      if (userRole === 'parent') queryClient.invalidateQueries({ queryKey: ['parents'] });
      if (userRole === 'admin') queryClient.invalidateQueries({ queryKey: ['admins'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
      queryClient.invalidateQueries({ queryKey: ['userCounts'] });

      setIsConfirmDeleteVisible(false);

      if (onDeletionSuccess) {
        onDeletionSuccess(userId);
      }

      onClose();
    },
    onError: (error: Error, userId) => {
      console.error(`[DeactivateOrDeleteUserModal] Error deleting user ${userId}:`, error);
      setIsConfirmDeleteVisible(false);
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
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
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'User status updated successfully.',
        position: 'bottom',
      });

      const userRole = updatedUser.role;
      if (userRole === 'student') queryClient.invalidateQueries({ queryKey: ['students'] });
      if (userRole === 'teacher') queryClient.invalidateQueries({ queryKey: ['teachers'] });
      if (userRole === 'parent') queryClient.invalidateQueries({ queryKey: ['parents'] });
      if (userRole === 'admin') queryClient.invalidateQueries({ queryKey: ['admins'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', updatedUser.id] });
      queryClient.invalidateQueries({ queryKey: ['userCounts'] });

      onClose();
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
      setIsConfirmDeleteVisible(true);
    }
  };

  const handleConfirmDeleteAction = () => {
    if (user?.id && !deleteMutation.isPending) {
      console.log(`[DeactivateOrDeleteUserModal] Confirming delete for user ${user.id}`);
      deleteMutation.mutate(user.id);
    } else {
      console.error(
        '[DeactivateOrDeleteUserModal] Cannot delete: User ID missing or delete already in progress.'
      );
      setIsConfirmDeleteVisible(false);
    }
  };

  const handleCancelDelete = () => {
    setIsConfirmDeleteVisible(false);
    deleteMutation.reset();
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

  const isDeleteDisabled = isActionPending;

  return (
    <>
      <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={commonSharedStyles.centeredView}>
          <View style={commonSharedStyles.modalView}>
            <Text style={commonSharedStyles.modalTitle}>Manage User Status</Text>
            <Text style={commonSharedStyles.modalContextInfo}>User: {displayName}</Text>
            <Text style={commonSharedStyles.modalContextInfo}>
              Current Status:{' '}
              <Text
                style={
                  isCurrentlyActive
                    ? commonSharedStyles.activeStatus
                    : commonSharedStyles.inactiveStatus
                }
              >
                {currentStatusText}
              </Text>
            </Text>

            {toggleStatusMutation.isPending && (
              <View style={commonSharedStyles.baseRowCentered}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={commonSharedStyles.baseSecondaryText}>Updating Status...</Text>
              </View>
            )}

            {toggleStatusMutation.isError && !toggleStatusMutation.isPending && (
              <Text style={commonSharedStyles.errorText}>
                Status update failed:{' '}
                {toggleStatusMutation.error instanceof Error
                  ? toggleStatusMutation.error.message
                  : 'Unknown error'}
              </Text>
            )}

            <View style={commonSharedStyles.full}>
              <CustomButton
                title={toggleButtonText}
                onPress={handleToggle}
                color={toggleActionColor}
                disabled={isActionPending}
                leftIcon={
                  isCurrentlyActive ? (
                    <PauseCircleIcon
                      color={isActionPending ? colors.disabledText : colors.textWhite}
                      size={18}
                    />
                  ) : (
                    <PlayCircleIcon
                      color={isActionPending ? colors.disabledText : colors.textWhite}
                      size={18}
                    />
                  )
                }
              />
              <CustomButton
                title="Permanently Delete"
                onPress={handleDeletePress}
                color={colors.danger}
                disabled={isDeleteDisabled}
                leftIcon={
                  <UserMinusIcon
                    color={isDeleteDisabled ? colors.disabledText : colors.textWhite}
                    size={18}
                  />
                }
              />
            </View>

            {deleteMutation.isError && !deleteMutation.isPending && (
              <Text style={[commonSharedStyles.errorText, { marginTop: 5 }]}>
                Deletion Error:{' '}
                {deleteMutation.error instanceof Error
                  ? deleteMutation.error.message
                  : 'Unknown error'}
              </Text>
            )}

            <View style={[commonSharedStyles.full, { marginTop: 10 }]}>
              <CustomButton
                title="Close"
                onPress={onClose}
                color={colors.secondary}
                disabled={isActionPending}
                leftIcon={
                  <XCircleIcon
                    color={isActionPending ? colors.disabledText : colors.textWhite}
                    size={18}
                  />
                }
              />
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmationModal
        visible={isConfirmDeleteVisible}
        title="Confirm Permanent Deletion"
        message={`Are you absolutely sure you want to permanently delete user "${displayName}" (${user.id})? This action cannot be undone and will remove associated data based on database cascade rules.`}
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Yes, Permanently Delete'}
        onConfirm={handleConfirmDeleteAction}
        onCancel={handleCancelDelete}
        confirmDisabled={deleteMutation.isPending}
      />
    </>
  );
};

export default DeactivateOrDeleteUserModal;
