// src/components/common/DeactivateOrDeleteUserModal.tsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';

import { deleteUser, toggleUserStatus } from '../../api/users'; // Use updated deleteUser

import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

// Helper & Type Imports
import { getUserDisplayName } from '../../utils/helpers';
import { DeactivateOrDeleteUserModalProps } from '../../types/componentProps';
import ConfirmationModal from './ConfirmationModal'; // Import ConfirmationModal

export const DeactivateOrDeleteUserModal: React.FC<DeactivateOrDeleteUserModalProps> = ({
  visible,
  user,
  onClose,
  onDeletionSuccess, // Callback after successful deletion
}) => {
  const [isConfirmDeleteVisible, setIsConfirmDeleteVisible] = useState(false);
  const queryClient = useQueryClient();

  // Mutation for deleting the user (calls API -> Edge Function)
  const deleteMutation = useMutation({
    mutationFn: deleteUser, // Use the API function calling the Edge Function
    onSuccess: (_, userId) => {
      console.log(
        `[DeactivateOrDeleteUserModal] User ${userId} deleted successfully via API/Edge Function.`
      );
      Toast.show({ type: 'success', text1: 'Success', text2: 'User deleted successfully.' });

      // Invalidate relevant queries BEFORE calling callbacks/closing
      const userRole = user?.role; // Get role from the user prop passed in
      if (userRole === 'student') queryClient.invalidateQueries({ queryKey: ['students'] });
      if (userRole === 'teacher') queryClient.invalidateQueries({ queryKey: ['teachers'] });
      if (userRole === 'parent') queryClient.invalidateQueries({ queryKey: ['parents'] });
      if (userRole === 'admin') queryClient.invalidateQueries({ queryKey: ['admins'] }); // Updated key
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId] }); // Invalidate specific profile
      queryClient.invalidateQueries({ queryKey: ['activeProfilesForDevSelector'] });
      queryClient.invalidateQueries({ queryKey: ['userCounts'] }); // Invalidate counts

      // Close the confirmation modal FIRST
      setIsConfirmDeleteVisible(false);
      // Then call the success callback IF provided
      if (onDeletionSuccess) {
        onDeletionSuccess(userId);
      }
      // Finally, close the main management modal
      onClose();
    },
    onError: (error: Error, userId) => {
      console.error(`[DeactivateOrDeleteUserModal] Error deleting user ${userId}:`, error);
      setIsConfirmDeleteVisible(false); // Close confirmation modal on error
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
        text2: error.message || 'Could not delete user.',
        position: 'bottom',
        visibilityTime: 5000,
      });
      // Do NOT close the main modal on error, let user decide
    },
  });

  // Mutation for toggling user status (uses direct API call)
  const toggleStatusMutation = useMutation({
    mutationFn: toggleUserStatus,
    onSuccess: updatedUser => {
      console.log(
        `[DeactivateOrDeleteUserModal] User ${updatedUser.id} status toggled to ${updatedUser.status}.`
      );
      Toast.show({ type: 'success', text1: 'Success', text2: 'User status updated successfully.' });

      // Invalidate relevant queries
      const userRole = updatedUser.role;
      if (userRole === 'student') queryClient.invalidateQueries({ queryKey: ['students'] });
      if (userRole === 'teacher') queryClient.invalidateQueries({ queryKey: ['teachers'] });
      if (userRole === 'parent') queryClient.invalidateQueries({ queryKey: ['parents'] });
      if (userRole === 'admin') queryClient.invalidateQueries({ queryKey: ['admins'] }); // Updated key
      queryClient.invalidateQueries({ queryKey: ['userProfile', updatedUser.id] });
      queryClient.invalidateQueries({ queryKey: ['activeProfilesForDevSelector'] });
      queryClient.invalidateQueries({ queryKey: ['userCounts'] });

      onClose(); // Close modal on success
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
      // Do NOT close the main modal on error
    },
  });

  // Effect to reset state when modal visibility changes
  useEffect(() => {
    if (!visible) {
      deleteMutation.reset();
      toggleStatusMutation.reset();
      setIsConfirmDeleteVisible(false); // Ensure confirmation is hidden when main modal closes
    }
  }, [visible]); // Removed mutations from deps as reset is handled

  // Handlers
  const handleToggle = () => {
    if (user?.id && !toggleStatusMutation.isPending && !deleteMutation.isPending) {
      toggleStatusMutation.mutate(user.id);
    }
  };

  // Opens the confirmation step for deletion
  const handleDeletePress = () => {
    // Prevent opening confirm modal if another action is pending
    if (!deleteMutation.isPending && !toggleStatusMutation.isPending) {
      setIsConfirmDeleteVisible(true);
    }
  };

  // Executes the delete mutation after confirmation
  const handleConfirmDeleteAction = () => {
    if (user?.id && !deleteMutation.isPending) {
      console.log(`[DeactivateOrDeleteUserModal] Confirming delete for user ${user.id}`);
      deleteMutation.mutate(user.id);
    } else {
      console.error(
        '[DeactivateOrDeleteUserModal] Cannot delete: User ID missing or delete already in progress.'
      );
      setIsConfirmDeleteVisible(false); // Close confirm modal if something went wrong
    }
  };

  // Closes the confirmation modal
  const handleCancelDelete = () => {
    setIsConfirmDeleteVisible(false);
    deleteMutation.reset(); // Reset mutation state if cancelled
  };

  // Render null if modal not visible or user data unavailable
  if (!visible || !user) {
    return null;
  }

  // Derived display values
  const displayName = getUserDisplayName(user);
  const isCurrentlyActive = user.status === 'active';
  const currentStatusText = isCurrentlyActive ? 'Active' : 'Inactive';
  const toggleButtonText = isCurrentlyActive ? 'Deactivate User' : 'Reactivate User';
  const toggleActionColor = isCurrentlyActive ? colors.warning : colors.success;
  const isActionPending = deleteMutation.isPending || toggleStatusMutation.isPending;
  // Re-enable delete button (logic handled by Edge Function)
  const isDeleteDisabled = isActionPending; // Only disable if another action is running

  return (
    <>
      {/* Main Management Modal */}
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

            {/* Loading indicator for toggle status */}
            {toggleStatusMutation.isPending && (
              <View style={commonSharedStyles.baseRowCentered}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={commonSharedStyles.baseSecondaryText}>Updating Status...</Text>
              </View>
            )}
            {/* Error display for toggle status */}
            {toggleStatusMutation.isError && !toggleStatusMutation.isPending && (
              <Text style={commonSharedStyles.errorText}>
                Status update failed:{' '}
                {toggleStatusMutation.error instanceof Error
                  ? toggleStatusMutation.error.message
                  : 'Unknown error'}
              </Text>
            )}

            {/* Action Buttons */}
            <View style={commonSharedStyles.full}>
              <Button
                title={toggleButtonText}
                onPress={handleToggle}
                color={toggleActionColor}
                disabled={isActionPending}
              />
              <Button
                title="Permanently Delete" // Text updated
                onPress={handleDeletePress} // Opens confirmation modal
                color={colors.danger}
                disabled={isDeleteDisabled} // Enable the button
              />
            </View>

            {/* Error display specifically for delete mutation failure */}
            {deleteMutation.isError && !deleteMutation.isPending && (
              <Text style={[commonSharedStyles.errorText, { marginTop: 5 }]}>
                Deletion Error:{' '}
                {deleteMutation.error instanceof Error
                  ? deleteMutation.error.message
                  : 'Unknown error'}
              </Text>
            )}

            {/* Footer Close Button */}
            <View style={[commonSharedStyles.full, { marginTop: 10 }]}>
              <Button
                title="Close"
                onPress={onClose}
                color={colors.secondary}
                disabled={isActionPending} // Disable if any action is running
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Nested Confirmation Modal for Deletion */}
      <ConfirmationModal
        visible={isConfirmDeleteVisible}
        title="Confirm Permanent Deletion"
        message={`Are you absolutely sure you want to permanently delete user "${displayName}" (${user.id})? This action cannot be undone and will remove associated data based on database cascade rules.`}
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Yes, Permanently Delete'}
        onConfirm={handleConfirmDeleteAction}
        onCancel={handleCancelDelete}
        confirmDisabled={deleteMutation.isPending} // Disable confirm while deleting
      />
    </>
  );
};

export default DeactivateOrDeleteUserModal;
