import React, { useState, useEffect } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Modal, View, Text, StyleSheet, Button, ActivityIndicator } from 'react-native';

import { deleteUser, toggleUserStatus } from '../../api/users';
import { colors } from '../../styles/colors';
import { DeactivateOrDeleteUserModalProps } from '../../types/componentProps';
import { User, UserStatus } from '../../types/userTypes';
import { getUserDisplayName } from '../../utils/helpers';

import ConfirmationModal from './ConfirmationModal';

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
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>Manage User Status</Text>
            <Text style={modalStyles.userInfo}>User: {displayName}</Text>
            <Text style={modalStyles.userInfo}>
              Status:{' '}
              <Text
                style={{
                  fontWeight: 'bold',
                  color: isCurrentlyActive ? colors.success : colors.secondary,
                }}
              >
                {currentStatusText}
              </Text>
            </Text>

            {}
            {isActionPending && (
              <View style={modalStyles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={modalStyles.loadingText}>
                  {deleteMutation.isPending ? 'Deleting User...' : 'Updating Status...'}
                </Text>
              </View>
            )}
            {}
            {toggleStatusMutation.isError && (
              <Text style={modalStyles.errorText}>
                Status update failed:{' '}
                {toggleStatusMutation.error instanceof Error
                  ? toggleStatusMutation.error.message
                  : 'Unknown error'}
              </Text>
            )}
            {}
            {deleteMutation.isError && (
              <Text style={modalStyles.errorText}>
                Delete failed:{' '}
                {deleteMutation.error instanceof Error
                  ? deleteMutation.error.message
                  : 'Unknown error'}
              </Text>
            )}

            <View style={modalStyles.buttonContainer}>
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

            <View style={modalStyles.footerButton}>
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
    height: 20,
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
    minHeight: 18,
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
  },
});

export default DeactivateOrDeleteUserModal;
