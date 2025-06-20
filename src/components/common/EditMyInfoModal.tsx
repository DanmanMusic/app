// src/components/common/EditMyInfoModal.tsx

import React, { useState, useEffect, useMemo } from 'react';

import {
  Modal,
  View,
  Text,
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
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { User } from '../../types/dataTypes';
import { getUserAvatarSource, getUserDisplayName, NativeFileObject } from '../../utils/helpers';
import { CustomButton } from './CustomButton';
import { CameraIcon, ShieldCheckIcon, XCircleIcon } from 'react-native-heroicons/solid';

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
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);

  const currentAuthEmail = useMemo(() => supabaseUser?.email ?? null, [supabaseUser]);
  const hasSetUpCredentials = useMemo(
    () => !!currentAuthEmail && !currentAuthEmail.endsWith('@placeholder.app'),
    [currentAuthEmail]
  );

  const profileUpdateMutation = useMutation({
    mutationFn: (vars: {
      companyId: string;
      updates: Partial<Omit<User, 'id' | 'role' | 'status' | 'companyId'>>;
      avatarFile?: NativeFileObject | null;
    }) => {
      if (!currentUserId) throw new Error('User ID not found.');
      return updateUser({
        userId: currentUserId,
        companyId: vars.companyId,
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

  const canEditAvatar = useMemo(() => appUser?.role !== 'parent', [appUser]);

  useEffect(() => {
    const loadData = async () => {
      if (appUser) {
        setFirstName(appUser.firstName || '');
        setLastName(appUser.lastName || '');
        setNickname(appUser.nickname || '');
        setAvatarFile(undefined);

        if (canEditAvatar && appUser.avatarPath) {
          setIsLoadingAvatar(true);
          const source = await getUserAvatarSource(appUser);
          setAvatarPreview(source ? source.uri : null);
          setIsLoadingAvatar(false);
        } else {
          setAvatarPreview(null);
        }
      }
    };

    if (visible) {
      loadData();

      setMode('profile');
      setNewPassword('');
      setConfirmPassword('');
      profileUpdateMutation.reset();
      credentialsUpdateMutation.reset();
    }
  }, [visible, appUser, canEditAvatar]);

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera roll permissions are needed.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
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
    if (!appUser.companyId) {
      Toast.show({
        type: 'error',
        text1: 'Session Error',
        text2: 'User company could not be determined. Please log out and back in.',
      });
      console.error('Update failed: companyId is missing from appUser context.');
      return;
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    if (!trimmedFirstName || !trimmedLastName) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'First and Last Name are required.',
      });
      return;
    }

    const updates: Partial<Omit<User, 'id' | 'role' | 'status' | 'companyId'>> = {};
    let hasChanges = false;
    if (trimmedFirstName !== appUser.firstName) {
      updates.firstName = trimmedFirstName;
      hasChanges = true;
    }
    if (trimmedLastName !== appUser.lastName) {
      updates.lastName = trimmedLastName;
      hasChanges = true;
    }
    if ((nickname || '').trim() !== (appUser.nickname || '')) {
      updates.nickname = nickname.trim() || undefined;
      hasChanges = true;
    }
    if (avatarFile !== undefined) {
      hasChanges = true;
    }

    if (!hasChanges) {
      Toast.show({ type: 'info', text1: 'No Changes', text2: 'No info was modified.' });
      onClose();
      return;
    }

    profileUpdateMutation.mutate({
      companyId: appUser.companyId,
      updates,
      avatarFile,
    });
  };

  const handleCredentialsSave = () => {
    if (credentialsUpdateMutation.isPending) return;
    const trimmedEmail = newEmail.trim();
    const updatePayload: { email?: string; password?: string } = {};
    if (trimmedEmail && trimmedEmail !== currentAuthEmail) {
      if (!trimmedEmail.includes('@')) {
        Toast.show({
          type: 'error',
          text1: 'Invalid Email',
          text2: 'Please enter a valid email.',
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
        });
        return;
      }
      if (newPassword !== confirmPassword) {
        Toast.show({
          type: 'error',
          text1: "Passwords Don't Match",
          text2: 'Please re-enter matching passwords.',
        });
        return;
      }
      updatePayload.password = newPassword;
    }
    if (Object.keys(updatePayload).length === 0) {
      Toast.show({ type: 'info', text1: 'No Changes', text2: 'No login info was modified.' });
      onClose();
      return;
    }
    credentialsUpdateMutation.mutate(updatePayload);
  };

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
                {canEditAvatar && (
                  <>
                    <Text style={commonSharedStyles.label}>Profile Picture:</Text>
                    <View style={commonSharedStyles.containerIconPreview}>
                      {isLoadingAvatar ? (
                        <ActivityIndicator
                          style={commonSharedStyles.iconPreview}
                          color={colors.primary}
                        />
                      ) : avatarPreview ? (
                        <Image
                          source={{ uri: avatarPreview }}
                          style={commonSharedStyles.iconPreview}
                        />
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
                        <CustomButton
                          title="Choose Image"
                          onPress={pickImage}
                          disabled={isOverallLoading}
                          color={colors.info}
                          leftIcon={
                            <CameraIcon
                              color={isOverallLoading ? colors.disabledText : colors.textWhite}
                              size={18}
                            />
                          }
                        />
                        {avatarPreview && (
                          <CustomButton
                            title="Remove Image"
                            onPress={removeImage}
                            disabled={isOverallLoading}
                            color={colors.warning}
                            leftIcon={
                              <XCircleIcon
                                color={isOverallLoading ? colors.disabledText : colors.textWhite}
                                size={18}
                              />
                            }
                          />
                        )}
                      </View>
                    </View>
                  </>
                )}
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
                  <CustomButton
                    title={profileUpdateMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
                    onPress={handleProfileSave}
                    color={colors.primary}
                    disabled={isOverallLoading || !firstName.trim() || !lastName.trim()}
                    leftIcon={
                      <ShieldCheckIcon
                        color={
                          isOverallLoading || !firstName.trim() || !lastName.trim()
                            ? colors.disabledText
                            : colors.textWhite
                        }
                        size={18}
                      />
                    }
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
                  <CustomButton
                    title={credentialsUpdateMutation.isPending ? 'Saving...' : 'Save Login Changes'}
                    onPress={handleCredentialsSave}
                    color={colors.primary}
                    disabled={
                      isOverallLoading ||
                      (!newEmail.trim() && !newPassword) ||
                      (newPassword.length > 0 && newPassword !== confirmPassword)
                    }
                    leftIcon={
                      <ShieldCheckIcon
                        color={
                          isOverallLoading ||
                          (!newEmail.trim() && !newPassword) ||
                          (newPassword.length > 0 && newPassword !== confirmPassword)
                            ? colors.disabledText
                            : colors.textWhite
                        }
                        size={18}
                      />
                    }
                  />
                </View>
              </View>
            )}
          </ScrollView>
          <View style={commonSharedStyles.modalFooter}>
            <CustomButton
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={isOverallLoading}
              leftIcon={
                <XCircleIcon
                  color={isOverallLoading ? colors.disabledText : colors.textWhite}
                  size={18}
                />
              }
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditMyInfoModal;
