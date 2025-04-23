// src/components/common/DeactivateOrDeleteUserModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Types & Utils
import { User, UserStatus } from '../../types/userTypes';
import { getUserDisplayName } from '../../utils/helpers';
import { colors } from '../../styles/colors';
// Import API functions
import { deleteUser, toggleUserStatus } from '../../api/students';

import ConfirmationModal from './ConfirmationModal';

interface DeactivateOrDeleteUserModalProps {
  visible: boolean;
  user: User | null;
  onClose: () => void;
  // REMOVED: onToggleUserStatus: (userId: string, currentStatus: UserStatus) => void;
  // REMOVED: onPermanentDelete is handled internally by mutation
}

const DeactivateOrDeleteUserModal: React.FC<DeactivateOrDeleteUserModalProps> = ({
  visible,
  user,
  onClose,
  // onToggleUserStatus, // Removed
}) => {
  const [isConfirmDeleteVisible, setIsConfirmDeleteVisible] = useState(false);
  const queryClient = useQueryClient();

  // --- Delete Mutation ---
  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: (_, userId) => {
      console.log(`User ${userId} deleted successfully via mutation.`);
      const userRole = user?.role;
      if (userRole === 'student') { queryClient.invalidateQueries({ queryKey: ['students'] }); }
      else if (userRole === 'teacher') { queryClient.invalidateQueries({ queryKey: ['teachers'] }); }
      else if (userRole === 'parent') { queryClient.invalidateQueries({ queryKey: ['parents'] }); }
      console.log(`Successfully deleted user ${user ? getUserDisplayName(user) : userId}.`);
      onClose();
    },
    onError: (error, userId) => {
      console.error(`Error deleting user ${userId} via mutation:`, error);
      console.error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsConfirmDeleteVisible(false);
    },
  });

  // --- Toggle Status Mutation (New) ---
  const toggleStatusMutation = useMutation({
    mutationFn: toggleUserStatus, // API function: expects userId
    onSuccess: (updatedUser) => { // API returns the updated user
        console.log(`User ${updatedUser.id} status toggled successfully to ${updatedUser.status} via mutation.`);

        // Invalidate relevant queries
        if (updatedUser.role === 'student') { queryClient.invalidateQueries({ queryKey: ['students'] }); }
        else if (updatedUser.role === 'teacher') { queryClient.invalidateQueries({ queryKey: ['teachers'] }); }
        else if (updatedUser.role === 'parent') { queryClient.invalidateQueries({ queryKey: ['parents'] }); }
        // Also invalidate specific user query if exists
        queryClient.invalidateQueries({ queryKey: ['user', updatedUser.id] });

        console.log(`Successfully toggled status for ${getUserDisplayName(updatedUser)} to ${updatedUser.status}.`);
        // Potentially close modal after toggle, or keep open? Let's keep it open for now.
        // onClose();
    },
    onError: (error, userId) => {
        console.error(`Error toggling status for user ${userId} via mutation:`, error);
        console.error(`Failed to toggle status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Keep modal open on error
    }
  });


  // Reset mutations state if modal becomes hidden or user changes
  useEffect(() => {
    if (!visible) {
        deleteMutation.reset();
        toggleStatusMutation.reset(); // Reset toggle mutation too
        setIsConfirmDeleteVisible(false);
    }
  }, [visible, user]); // Removed mutations from deps array

  if (!visible || !user) {
    return null;
  }

  const displayName = getUserDisplayName(user);
  const isCurrentlyActive = user.status === 'active';
  const currentStatusText = isCurrentlyActive ? 'Active' : 'Inactive';
  const toggleButtonText = isCurrentlyActive ? 'Deactivate User' : 'Reactivate User';
  const toggleActionColor = isCurrentlyActive ? colors.warning : colors.success;

  // Call the toggle mutation
  const handleToggle = () => {
    if (user?.id && !toggleStatusMutation.isPending) { // Prevent double clicks
        toggleStatusMutation.mutate(user.id);
    }
  };

  const handleDeletePress = () => {
    if (!deleteMutation.isPending && !toggleStatusMutation.isPending) { // Prevent overlap
        setIsConfirmDeleteVisible(true);
    }
  };

  const handleConfirmDeleteAction = () => {
    setIsConfirmDeleteVisible(false);
    if (user?.id && !deleteMutation.isPending) { // Prevent double clicks
        deleteMutation.mutate(user.id);
    } else {
        console.error("Cannot delete: User ID is missing or delete already in progress.");
    }
  };

  const handleCancelDelete = () => {
    setIsConfirmDeleteVisible(false);
  };

  // Combined pending state
  const isActionPending = deleteMutation.isPending || toggleStatusMutation.isPending;

  return (
    <>
      <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>Manage User Status</Text>
            <Text style={modalStyles.userInfo}>User: {displayName}</Text>
            <Text style={modalStyles.userInfo}>
                Status: <Text style={{fontWeight: 'bold', color: isCurrentlyActive ? colors.success : colors.secondary}}>{currentStatusText}</Text>
            </Text>

             {/* Loading Indicator for EITHER action */}
             {isActionPending && (
                <View style={modalStyles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={modalStyles.loadingText}>
                        {deleteMutation.isPending ? 'Deleting User...' : 'Updating Status...'}
                    </Text>
                </View>
             )}
             {/* Error Display for Toggle */}
             {toggleStatusMutation.isError && (
                 <Text style={modalStyles.errorText}>
                     Status update failed: {toggleStatusMutation.error instanceof Error ? toggleStatusMutation.error.message : 'Unknown error'}
                 </Text>
             )}
             {/* Error Display for Delete */}
             {deleteMutation.isError && (
                 <Text style={modalStyles.errorText}>
                     Delete failed: {deleteMutation.error instanceof Error ? deleteMutation.error.message : 'Unknown error'}
                 </Text>
             )}

            <View style={modalStyles.buttonContainer}>
              <Button
                  title={toggleButtonText}
                  onPress={handleToggle} // Use the new handler
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

            <View style={modalStyles.footerButton}>
              <Button
                title="Close" // Changed from Cancel to Close as actions might happen without closing
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

// Styles
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
   loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 5,
      marginBottom: 10,
      height: 20, // Give it a fixed height to prevent layout shifts
  },
  loadingText: {
      marginLeft: 10,
      fontSize: 14,
      color: colors.textSecondary,
  },
   errorText: {
      color: colors.danger,
      textAlign: 'center',
      marginTop: 5,
      marginBottom: 10,
      fontSize: 14,
      minHeight: 18, // Prevent layout shifts
  },
  buttonContainer: {
    width: '100%',
    marginTop: 10,
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