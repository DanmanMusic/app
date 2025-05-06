import React, { useState, useEffect } from 'react';

import { Modal, View, Text, Button, TextInput, ActivityIndicator } from 'react-native';

import { useMutation } from '@tanstack/react-query';

import Toast from 'react-native-toast-message';

import { updateAuthCredentials } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { getUserDisplayName } from '../../utils/helpers';

interface SetEmailPasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SetEmailPasswordModal: React.FC<SetEmailPasswordModalProps> = ({
  visible,
  onClose,
}) => {
  const { appUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const mutation = useMutation({
    mutationFn: updateAuthCredentials,
    onSuccess: data => {
      console.log('[SetEmailPasswordModal] Credentials updated successfully:', data.message);
      Toast.show({
        type: 'success',
        text1: 'Credentials Set!',
        text2: 'You can now log in using your email and password. Please log out and back in.',
        visibilityTime: 6000,
        position: 'bottom',
      });

      onClose();
    },
    onError: (error: Error) => {
      console.error('[SetEmailPasswordModal] Error setting credentials:', error);
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
    if (visible) {
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      mutation.reset();
    }
  }, [visible]);

  const handleSave = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password || !confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please fill in all fields.',
        position: 'bottom',
      });
      return;
    }
    if (!trimmedEmail.includes('@')) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Email',
        text2: 'Please enter a valid email address.',
        position: 'bottom',
      });
      return;
    }
    if (password.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Password Too Short',
        text2: 'Password must be at least 6 characters.',
        position: 'bottom',
      });
      return;
    }
    if (password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: "Passwords Don't Match",
        text2: 'Please re-enter matching passwords.',
        position: 'bottom',
      });
      return;
    }

    mutation.mutate({ email: trimmedEmail, password: password });
  };

  const isSaveDisabled = mutation.isPending || !email.trim() || !password || !confirmPassword;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Set Email & Password</Text>
          <Text style={commonSharedStyles.modalContextInfo}>
            For: {appUser ? getUserDisplayName(appUser) : 'Loading...'}
          </Text>
          <Text style={commonSharedStyles.modalMessage}>
            Set up an email and password for future logins. This will replace PIN-based login for
            this account.
          </Text>

          <Text style={commonSharedStyles.label}>New Email:</Text>
          <TextInput
            style={commonSharedStyles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your desired email"
            placeholderTextColor={colors.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!mutation.isPending}
          />

          <Text style={commonSharedStyles.label}>New Password:</Text>
          <TextInput
            style={commonSharedStyles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter a new password (min 6 chars)"
            placeholderTextColor={colors.textLight}
            secureTextEntry={true}
            autoComplete="new-password"
            editable={!mutation.isPending}
          />

          <Text style={commonSharedStyles.label}>Confirm Password:</Text>
          <TextInput
            style={commonSharedStyles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your new password"
            placeholderTextColor={colors.textLight}
            secureTextEntry={true}
            editable={!mutation.isPending}
          />

          {mutation.isPending && (
            <View style={commonSharedStyles.baseRowCentered}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={commonSharedStyles.baseSecondaryText}>Saving Credentials...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error: {mutation.error instanceof Error ? mutation.error.message : 'Failed to save'}
            </Text>
          )}

          <View style={commonSharedStyles.full}>
            <Button
              title={mutation.isPending ? 'Saving...' : 'Save Credentials'}
              onPress={handleSave}
              color={colors.primary}
              disabled={isSaveDisabled}
            />
          </View>
          <View style={[commonSharedStyles.full, { marginTop: 10 }]}>
            <Button
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={mutation.isPending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SetEmailPasswordModal;
