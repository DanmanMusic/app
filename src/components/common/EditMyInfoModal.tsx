// src/components/common/EditMyInfoModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Modal,
  View,
  Text,
  Button,
  TextInput,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { updateUser, updateAuthCredentials } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../types/dataTypes';

import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { getUserDisplayName } from '../../utils/helpers';

interface EditMyInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

type EditMode = 'profile' | 'credentials';

export const EditMyInfoModal: React.FC<EditMyInfoModalProps> = ({ visible, onClose }) => {
  const { appUser, supabaseUser, currentUserId } = useAuth();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<EditMode>('profile');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const currentAuthEmail = useMemo(() => supabaseUser?.email ?? null, [supabaseUser]);

  const hasSetUpCredentials = useMemo(() => {
    const email = currentAuthEmail;
    return !!email && !email.endsWith('@placeholder.app');
  }, [currentAuthEmail]);

  const profileUpdateMutation = useMutation({
    mutationFn: (updates: Partial<Omit<User, 'id' | 'role' | 'status'>>) => {
      if (!currentUserId) throw new Error('User ID not found.');
      return updateUser({ userId: currentUserId, updates });
    },
    onSuccess: updatedUser => {
      console.log('[EditMyInfoModal] Profile updated successfully.');
      queryClient.setQueryData(['userProfile', currentUserId], updatedUser);

      const profileQueryKey = ['userProfile', currentUserId];
      queryClient.invalidateQueries({ queryKey: profileQueryKey });
      console.log(`[EditMyInfoModal] Invalidated query: ${JSON.stringify(profileQueryKey)}`);

      Toast.show({ type: 'success', text1: 'Profile Updated', position: 'bottom' });
      onClose();
    },
    onError: (error: Error) => {
      console.error('[EditMyInfoModal] Profile update error:', error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error.message || 'Could not update profile.',
        position: 'bottom',
      });
    },
  });

  const credentialsUpdateMutation = useMutation({
    mutationFn: updateAuthCredentials,
    onSuccess: async data => {
      console.log('[EditMyInfoModal] Credentials updated successfully:', data.message);
      Toast.show({
        type: 'success',
        text1: 'Credentials Updated!',
        text2: newPassword
          ? 'Please log out and log back in with your new password.'
          : 'Email updated successfully.',
        visibilityTime: 6000,
        position: 'bottom',
      });
      queryClient.invalidateQueries({ queryKey: ['userProfile', currentUserId] });
      onClose();
    },
    onError: (error: Error) => {
      console.error('[EditMyInfoModal] Credentials update error:', error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error.message || 'Could not update credentials.',
        position: 'bottom',
        visibilityTime: 5000,
      });
    },
  });

  useEffect(() => {
    if (visible && appUser) {
      setFirstName(appUser.firstName || '');
      setLastName(appUser.lastName || '');
      setNickname(appUser.nickname || '');

      const contextEmail = supabaseUser?.email ?? null;
      setNewEmail(contextEmail && !contextEmail.endsWith('@placeholder.app') ? contextEmail : '');

      setNewPassword('');
      setConfirmPassword('');

      profileUpdateMutation.reset();
      credentialsUpdateMutation.reset();
      const setup = !!contextEmail && !contextEmail.endsWith('@placeholder.app');
      setMode('profile');
    } else if (!visible) {
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [visible, appUser, supabaseUser]);

  const handleProfileSave = () => {
    if (!appUser || !currentUserId || profileUpdateMutation.isPending) return;

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedNickname = nickname.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'First and Last Name are required.',
        position: 'bottom',
      });
      return;
    }

    const updates: Partial<Omit<User, 'id' | 'role' | 'status'>> = {};
    let hasChanges = false;

    if (trimmedFirstName !== appUser.firstName) {
      updates.firstName = trimmedFirstName;
      hasChanges = true;
    }
    if (trimmedLastName !== appUser.lastName) {
      updates.lastName = trimmedLastName;
      hasChanges = true;
    }
    if (trimmedNickname !== (appUser.nickname || '')) {
      updates.nickname = trimmedNickname || undefined;
      hasChanges = true;
    }

    if (!hasChanges) {
      Toast.show({
        type: 'info',
        text1: 'No Changes',
        text2: 'No profile information was modified.',
        position: 'bottom',
      });
      onClose();
      return;
    }

    profileUpdateMutation.mutate(updates);
  };

  const handleCredentialsSave = () => {
    if (credentialsUpdateMutation.isPending) return;

    const trimmedEmail = newEmail.trim();
    const updatePayload: { email?: string; password?: string } = {};
    let changesMade = false;

    if (trimmedEmail && trimmedEmail !== currentAuthEmail) {
      if (!trimmedEmail.includes('@')) {
        Toast.show({
          type: 'error',
          text1: 'Invalid Email',
          text2: 'Please enter a valid email.',
          position: 'bottom',
        });
        return;
      }
      updatePayload.email = trimmedEmail;
      changesMade = true;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        Toast.show({
          type: 'error',
          text1: 'Password Too Short',
          text2: 'Password must be at least 6 characters.',
          position: 'bottom',
        });
        return;
      }
      if (newPassword !== confirmPassword) {
        Toast.show({
          type: 'error',
          text1: "Passwords Don't Match",
          text2: 'Please re-enter matching passwords.',
          position: 'bottom',
        });
        return;
      }
      updatePayload.password = newPassword;
      changesMade = true;
    }

    if (!changesMade) {
      Toast.show({
        type: 'info',
        text1: 'No Changes',
        text2: 'No login information was modified.',
        position: 'bottom',
      });
      onClose();
      return;
    }

    credentialsUpdateMutation.mutate(updatePayload);
  };

  const isProfileSaveDisabled =
    profileUpdateMutation.isPending || !firstName.trim() || !lastName.trim();
  const isCredentialsSaveDisabled =
    credentialsUpdateMutation.isPending || (!newEmail.trim() && !newPassword);
  const isOverallLoading = profileUpdateMutation.isPending || credentialsUpdateMutation.isPending;

  if (!visible) return null;

  if (!appUser) {
    return (
      <Modal visible={visible} transparent={true} animationType="slide">
        <View style={commonSharedStyles.centeredView}>
          <View style={commonSharedStyles.modalView}>
            <ActivityIndicator color={colors.primary} />
            <Text>Loading user info...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Edit My Info</Text>
          <Text style={commonSharedStyles.modalSubTitle}>
            User: {getUserDisplayName(appUser)} ({appUser.role})
          </Text>

          {hasSetUpCredentials && (
            <View style={commonSharedStyles.containerToggle}>
              <TouchableOpacity
                style={[
                  commonSharedStyles.toggleButton,
                  mode === 'profile' && commonSharedStyles.toggleButtonActive,
                ]}
                onPress={() => setMode('profile')}
                disabled={isOverallLoading}
              >
                <Text
                  style={[
                    commonSharedStyles.toggleButtonText,
                    mode === 'profile' && commonSharedStyles.toggleButtonTextActive,
                  ]}
                >
                  Update Profile
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  commonSharedStyles.toggleButton,
                  mode === 'credentials' && commonSharedStyles.toggleButtonActive,
                ]}
                onPress={() => setMode('credentials')}
                disabled={isOverallLoading}
              >
                <Text
                  style={[
                    commonSharedStyles.toggleButtonText,
                    mode === 'credentials' && commonSharedStyles.toggleButtonTextActive,
                  ]}
                >
                  Update Login
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={[commonSharedStyles.modalScrollView, { paddingHorizontal: 2 }]}>
            {mode === 'profile' && (
              <View>
                <Text style={commonSharedStyles.modalSectionTitle}>Profile Details</Text>
                <Text style={commonSharedStyles.label}>First Name:</Text>
                <TextInput
                  style={commonSharedStyles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Enter First Name"
                  placeholderTextColor={colors.textLight}
                  editable={!isOverallLoading}
                />
                <Text style={commonSharedStyles.label}>Last Name:</Text>
                <TextInput
                  style={commonSharedStyles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Enter Last Name"
                  placeholderTextColor={colors.textLight}
                  editable={!isOverallLoading}
                />
                <Text style={commonSharedStyles.label}>Nickname (Optional):</Text>
                <TextInput
                  style={commonSharedStyles.input}
                  value={nickname}
                  onChangeText={setNickname}
                  placeholder="Optional Nickname"
                  placeholderTextColor={colors.textLight}
                  editable={!isOverallLoading}
                />

                {profileUpdateMutation.isPending && <ActivityIndicator color={colors.primary} />}
                {profileUpdateMutation.isError && (
                  <Text style={commonSharedStyles.errorText}>
                    Error:{' '}
                    {profileUpdateMutation.error instanceof Error
                      ? profileUpdateMutation.error.message
                      : 'Failed'}
                  </Text>
                )}

                <View style={{ marginTop: 15 }}>
                  <Button
                    title={profileUpdateMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
                    onPress={handleProfileSave}
                    color={colors.primary}
                    disabled={isProfileSaveDisabled || isOverallLoading}
                  />
                </View>
              </View>
            )}
            {mode === 'credentials' && hasSetUpCredentials && (
              <View style={{ paddingHorizontal: 2 }}>
                <Text style={commonSharedStyles.modalSectionTitle}>Login Details</Text>
                <Text style={commonSharedStyles.label}>Email:</Text>
                <TextInput
                  style={commonSharedStyles.input}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  placeholder={currentAuthEmail || 'Enter Email'}
                  placeholderTextColor={colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isOverallLoading}
                />
                <Text style={commonSharedStyles.label}>New Password (Optional):</Text>
                <TextInput
                  style={commonSharedStyles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Leave blank to keep current password"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry={true}
                  autoComplete="new-password"
                  editable={!isOverallLoading}
                />
                {newPassword.length > 0 && (
                  <>
                    <Text style={commonSharedStyles.label}>Confirm New Password:</Text>
                    <TextInput
                      style={commonSharedStyles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter new password"
                      placeholderTextColor={colors.textLight}
                      secureTextEntry={true}
                      editable={!isOverallLoading}
                    />
                  </>
                )}

                {credentialsUpdateMutation.isPending && (
                  <ActivityIndicator color={colors.primary} />
                )}
                {credentialsUpdateMutation.isError && (
                  <Text style={commonSharedStyles.errorText}>
                    Error:{' '}
                    {credentialsUpdateMutation.error instanceof Error
                      ? credentialsUpdateMutation.error.message
                      : 'Failed'}
                  </Text>
                )}
                <View style={{ marginTop: 15 }}>
                  <Button
                    title={credentialsUpdateMutation.isPending ? 'Saving...' : 'Save Login Changes'}
                    onPress={handleCredentialsSave}
                    color={colors.primary}
                    disabled={
                      isCredentialsSaveDisabled ||
                      isOverallLoading ||
                      (newPassword.length > 0 && newPassword !== confirmPassword)
                    }
                  />
                </View>
              </View>
            )}
          </ScrollView>
          <View style={commonSharedStyles.modalFooter}>
            <Button
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={isOverallLoading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditMyInfoModal;
