// src/components/common/DeactivateOrDeleteUserModal.tsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, ActivityIndicator, StyleSheet } from 'react-native'; // Added StyleSheet

// Import Supabase-backed API functions (deleteUser is deferred)
import { deleteUser, toggleUserStatus } from '../../api/users';

// Style and Helper Imports
import { colors } from '../../styles/colors';
import { modalSharedStyles } from '../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { getUserDisplayName } from '../../utils/helpers';

// Type Imports
import { DeactivateOrDeleteUserModalProps } from '../../types/componentProps';
import ConfirmationModal from './ConfirmationModal'; // Keep for delete confirmation flow (even if disabled)
import Toast from 'react-native-toast-message';

const DeactivateOrDeleteUserModal: React.FC<DeactivateOrDeleteUserModalProps> = ({
  visible,
  user,
  onClose,
  onDeletionSuccess, // Handler if delete ever works
}) => {
  // State for the secondary delete confirmation modal
  const [isConfirmDeleteVisible, setIsConfirmDeleteVisible] = useState(false);
  const queryClient = useQueryClient();

  // --- Mutations ---
  // Delete Mutation (Points to deferred/throwing API)
  const deleteMutation = useMutation({
    mutationFn: deleteUser, // This function throws an error currently
    onSuccess: (_, userId) => {
        // This won't be reached with current deleteUser implementation
        console.log(`[DeactivateOrDeleteUserModal] User ${userId} deleted (Simulated).`);
        // Invalidate user lists
        const userRole = user?.role;
        if (userRole === 'student') queryClient.invalidateQueries({ queryKey: ['students'] });
        if (userRole === 'teacher') queryClient.invalidateQueries({ queryKey: ['teachers'] });
        if (userRole === 'parent') queryClient.invalidateQueries({ queryKey: ['parents'] });
        if (userRole === 'admin') queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); // Adjust key if needed
        queryClient.invalidateQueries({ queryKey: ['userProfile', userId] }); // Invalidate specific profile
        console.log(`Successfully deleted user ${user ? getUserDisplayName(user) : userId} (Simulated).`);
        if (onDeletionSuccess) onDeletionSuccess(userId);
        onClose(); // Close the main modal
        Toast.show({ type: 'success', text1: 'Success', text2: 'User delete simulated.' });
    },
    onError: (error: Error, userId) => { // Explicitly type error
        // This *will* be reached if delete is attempted
        console.error(`[DeactivateOrDeleteUserModal] Error deleting user ${userId}:`, error);
        setIsConfirmDeleteVisible(false); // Close confirmation modal on error
        Toast.show({
            type: 'error',
            text1: 'Deletion Not Implemented', // Specific error
            text2: error.message || 'Could not delete user.',
            position: 'bottom',
            visibilityTime: 5000,
        });
    },
  });

  // Toggle Status Mutation (Uses Supabase API)
  const toggleStatusMutation = useMutation({
    mutationFn: toggleUserStatus,
    onSuccess: updatedUser => {
      console.log(`[DeactivateOrDeleteUserModal] User ${updatedUser.id} status toggled to ${updatedUser.status}.`);
      // Invalidate relevant user list and specific profile queries
      const userRole = updatedUser.role;
      if (userRole === 'student') queryClient.invalidateQueries({ queryKey: ['students'] });
      if (userRole === 'teacher') queryClient.invalidateQueries({ queryKey: ['teachers'] });
      if (userRole === 'parent') queryClient.invalidateQueries({ queryKey: ['parents'] });
      if (userRole === 'admin') queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); // Adjust key if needed
      queryClient.invalidateQueries({ queryKey: ['userProfile', updatedUser.id] }); // Invalidate specific profile
      console.log(`Successfully toggled status for ${getUserDisplayName(updatedUser)} to ${updatedUser.status}.`);
      onClose(); // Close modal after successful toggle
      Toast.show({ type: 'success', text1: 'Success', text2: 'User status updated successfully.' });
    },
    onError: (error: Error, userId) => { // Explicitly type error
      console.error(`[DeactivateOrDeleteUserModal] Error toggling status for user ${userId}:`, error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error.message || 'Could not update user status.',
        position: 'bottom',
        visibilityTime: 4000,
      });
      // Keep modal open on error? Or close? Closing might be better UX.
      // onClose();
    },
  });
  // --- End Mutations ---


  // Effect to reset mutations when modal visibility changes
  useEffect(() => {
    if (!visible) {
      deleteMutation.reset();
      toggleStatusMutation.reset();
      setIsConfirmDeleteVisible(false); // Ensure confirm modal is also closed
    }
  }, [visible]);


  // --- Event Handlers ---
  const handleToggle = () => {
    if (user?.id && !toggleStatusMutation.isPending && !deleteMutation.isPending) {
      toggleStatusMutation.mutate(user.id);
    }
  };

  // Show confirmation modal OR info toast for delete
  const handleDeletePress = () => {
    if (!deleteMutation.isPending && !toggleStatusMutation.isPending) {
        // Option 1: Show Confirmation Modal (even though final action fails)
        // setIsConfirmDeleteVisible(true);

        // Option 2: Show Info Toast Directly (more direct feedback)
        Toast.show({
            type: 'info',
            text1: 'Feature Not Implemented',
            text2: 'Permanent user deletion requires server-side logic.',
            visibilityTime: 5000,
        });
        console.warn("Attempted permanent delete, but API implementation is deferred.");
    }
  };

  // Action for the *confirmation* modal's confirm button
  const handleConfirmDeleteAction = () => {
     // This will immediately trigger the onError handler of deleteMutation
     if (user?.id && !deleteMutation.isPending) {
         try {
             deleteMutation.mutate(user.id);
         } catch(e) {
             // Error already handled by mutation's onError
         }
     } else {
       console.error('[DeactivateOrDeleteUserModal] Cannot delete: User ID missing or delete already in progress.');
       setIsConfirmDeleteVisible(false); // Close confirm modal if something is wrong
     }
  };

  // Cancel handler for the *confirmation* modal
  const handleCancelDelete = () => {
    setIsConfirmDeleteVisible(false);
  };


  // --- Render Logic ---
  if (!visible || !user) {
    return null; // Don't render anything if not visible or no user
  }

  const displayName = getUserDisplayName(user);
  const isCurrentlyActive = user.status === 'active';
  const currentStatusText = isCurrentlyActive ? 'Active' : 'Inactive';
  const toggleButtonText = isCurrentlyActive ? 'Deactivate User' : 'Reactivate User';
  const toggleActionColor = isCurrentlyActive ? colors.warning : colors.success;

  // Determine if any action is pending
  const isActionPending = deleteMutation.isPending || toggleStatusMutation.isPending;
  // Always disable delete button
  const isDeleteDisabled = true;


  return (
    <>
      {/* Main Deactivate/Delete Modal */}
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

            {/* Loading Indicator for Toggle Status */}
            {toggleStatusMutation.isPending && (
              <View style={modalSharedStyles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={modalSharedStyles.loadingText}>Updating Status...</Text>
              </View>
            )}

            {/* Error Display for Toggle Status */}
            {toggleStatusMutation.isError && (
              <Text style={commonSharedStyles.errorText}>
                Status update failed: {toggleStatusMutation.error instanceof Error ? toggleStatusMutation.error.message : 'Unknown error'}
              </Text>
            )}

            {/* Action Buttons */}
            <View style={modalSharedStyles.buttonContainer}>
              <Button
                title={toggleButtonText}
                onPress={handleToggle}
                color={toggleActionColor}
                disabled={isActionPending} // Disable if toggle or delete simulation is running
              />
              <Button
                title="Permanently Delete (Disabled)" // Update text
                onPress={handleDeletePress} // Shows info toast now
                color={colors.danger}
                disabled={isDeleteDisabled} // Always disabled
              />
            </View>

            {/* Informational Text about Delete */}
             <Text style={styles.infoText}>
                Note: Permanent deletion requires server-side setup and is currently disabled.
            </Text>

            {/* Footer Close Button */}
            <View style={modalSharedStyles.footerButton}>
              <Button
                title="Close"
                onPress={onClose}
                color={colors.secondary}
                disabled={isActionPending} // Disable close during toggle status action
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Secondary Confirmation Modal (Kept for structure, but delete action is disabled) */}
      {/* This modal might not even be shown now depending on handleDeletePress implementation */}
      <ConfirmationModal
        visible={isConfirmDeleteVisible}
        title="Confirm Permanent Deletion"
        message={`Are you absolutely sure you want to permanently delete user "${displayName}" (${user.id})? This action requires server setup and cannot be undone.`}
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Yes, Permanently Delete (Disabled)'}
        onConfirm={handleConfirmDeleteAction} // This will trigger the mutation's onError
        onCancel={handleCancelDelete}
        confirmDisabled={true} // Always disable the final confirm button
      />
    </>
  );
};

// Local Styles
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
        marginTop: 10, // Space above footer
        fontStyle: 'italic',
    }
});

export default DeactivateOrDeleteUserModal;