// src/components/common/EditMyInfoModal.tsx
import React, { useState, useEffect, useMemo } from 'react';

import {
  Modal,
  View,
  Text,
  Button,
  TextInput,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
} from 'react-native';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import { updateUser, updateAuthCredentials } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';
import { getSupabase } from '../../lib/supabaseClient';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { User } from '../../types/dataTypes';
import { getUserAvatarSource, getUserDisplayName, NativeFileObject } from '../../utils/helpers';

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

  const [avatarFile, setAvatarFile] = useState<NativeFileObject | null | undefined>(undefined);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const currentAuthEmail = useMemo(() => supabaseUser?.email ?? null, [supabaseUser]);
  const hasSetUpCredentials = useMemo(
    () => !!currentAuthEmail && !currentAuthEmail.endsWith('@placeholder.app'),
    [currentAuthEmail]
  );

  const profileUpdateMutation = useMutation({
    mutationFn: (vars: {
      updates: Partial<Omit<User, 'id' | 'role' | 'status'>>;
      avatarFile?: NativeFileObject | null;
    }) => {
      if (!currentUserId) throw new Error('User ID not found.');
      return updateUser({
        userId: currentUserId,
        updates: vars.updates,
        avatarFile: vars.avatarFile,
      });
    },
    onSuccess: updatedUser => {
      queryClient.setQueryData(['userProfile', currentUserId], updatedUser);
      Toast.show({ type: 'success', text1: 'Profile Updated', position: 'bottom' });
      onClose();
    },
    onError: (error: Error) => {
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
    onSuccess: data => {
      Toast.show({
        type: 'success',
        text1: 'Credentials Updated!',
        text2: data.message,
        visibilityTime: 6000,
        position: 'bottom',
      });
      queryClient.invalidateQueries({ queryKey: ['userProfile', currentUserId] });
      onClose();
    },
    onError: (error: Error) => {
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
    const setup = async () => {
      if (visible && appUser) {
        // ... (setting firstName, lastName, etc. is the same)
        setFirstName(appUser.firstName || '');
        setLastName(appUser.lastName || '');
        setNickname(appUser.nickname || '');

        // THIS IS THE FIX:
        // Use the async helper and await its result.
        const source = await getUserAvatarSource(appUser);
        setAvatarPreview(source ? source.uri : null);

        // ... (rest of the state resets)
        setAvatarFile(undefined);
        setNewPassword('');
        setConfirmPassword('');
        profileUpdateMutation.reset();
        setMode('profile');
      }
    };
    setup();
  }, [visible, appUser]);

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to make this work!'
        );
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      // CORRECTED: Handle potential null value for fileName
      const fileName = asset.fileName ?? `avatar_${Date.now()}.${asset.uri.split('.').pop()}`;
      setAvatarFile({
        uri: asset.uri,
        name: fileName,
        mimeType: asset.mimeType,
        type: asset.type,
        size: asset.fileSize,
      });
      setAvatarPreview(asset.uri);
    }
  };

  const removeImage = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

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

    if (avatarFile !== undefined) {
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

    profileUpdateMutation.mutate({ updates, avatarFile });
  };

  const handleCredentialsSave = () => {
    // ... no changes to this function ...
    if (credentialsUpdateMutation.isPending) return;
    const trimmedEmail = newEmail.trim();
    const updatePayload: { email?: string; password?: string } = {};
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
    }
    if (Object.keys(updatePayload).length === 0) {
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

  // --- No changes to the JSX or the rest of the component logic ---
  const isOverallLoading = profileUpdateMutation.isPending || credentialsUpdateMutation.isPending;
  if (!visible) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Edit My Info</Text>
          <Text style={commonSharedStyles.modalSubTitle}>
            User: {appUser ? getUserDisplayName(appUser) : '...'} ({appUser?.role})
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
                <Text style={commonSharedStyles.label}>Profile Picture:</Text>
                <View style={commonSharedStyles.containerIconPreview}>
                  {avatarPreview ? (
                    <Image source={{ uri: avatarPreview }} style={commonSharedStyles.iconPreview} />
                  ) : (
                    <View
                      style={[
                        commonSharedStyles.iconPreview,
                        {
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: colors.backgroundGrey,
                        },
                      ]}
                    >
                      <Text style={{ color: colors.textLight }}>No Image</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Button
                      title="Choose Image"
                      onPress={pickImage}
                      disabled={isOverallLoading}
                      color={colors.info}
                    />
                    {avatarPreview && (
                      <Button
                        title="Remove Image"
                        onPress={removeImage}
                        disabled={isOverallLoading}
                        color={colors.warning}
                      />
                    )}
                  </View>
                </View>

                <Text style={commonSharedStyles.label}>First Name:</Text>
                <TextInput
                  style={commonSharedStyles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  editable={!isOverallLoading}
                />
                <Text style={commonSharedStyles.label}>Last Name:</Text>
                <TextInput
                  style={commonSharedStyles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  editable={!isOverallLoading}
                />
                <Text style={commonSharedStyles.label}>Nickname (Optional):</Text>
                <TextInput
                  style={commonSharedStyles.input}
                  value={nickname}
                  onChangeText={setNickname}
                  editable={!isOverallLoading}
                />

                {profileUpdateMutation.isPending && <ActivityIndicator color={colors.primary} />}
                {profileUpdateMutation.isError && (
                  <Text style={commonSharedStyles.errorText}>
                    Error: {profileUpdateMutation.error.message}
                  </Text>
                )}

                <View style={{ marginTop: 15 }}>
                  <Button
                    title={profileUpdateMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
                    onPress={handleProfileSave}
                    color={colors.primary}
                    disabled={isOverallLoading || !firstName.trim() || !lastName.trim()}
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
                    Error: {credentialsUpdateMutation.error.message}
                  </Text>
                )}
                <View style={{ marginTop: 15 }}>
                  <Button
                    title={credentialsUpdateMutation.isPending ? 'Saving...' : 'Save Login Changes'}
                    onPress={handleCredentialsSave}
                    color={colors.primary}
                    disabled={
                      isOverallLoading ||
                      (!newEmail.trim() && !newPassword) ||
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
