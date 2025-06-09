// src/components/common/EditUserModal.tsx
import React, { useState, useEffect } from 'react';

import {
  Modal,
  View,
  Text,
  Button,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
} from 'react-native';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import { fetchInstruments } from '../../api/instruments';
import { updateUser, fetchTeachers, fetchUserProfile } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';
import { getSupabase } from '../../lib/supabaseClient';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { EditUserModalProps } from '../../types/componentProps';
import { User, Instrument } from '../../types/dataTypes';
import { getUserDisplayName, NativeFileObject } from '../../utils/helpers';

export const EditUserModal: React.FC<EditUserModalProps> = ({
  visible,
  userToEdit: userToEditProp,
  onClose,
}) => {
  const { currentUserRole } = useAuth();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<NativeFileObject | null | undefined>(undefined);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const userIdToEdit = userToEditProp?.id;

  const { data: userToEdit, isLoading: isLoadingUserToEdit } = useQuery<User | null, Error>({
    queryKey: ['userProfile', userIdToEdit, { context: 'editUserModalFetch' }],
    queryFn: () => (userIdToEdit ? fetchUserProfile(userIdToEdit) : Promise.resolve(null)),
    enabled: visible && !!userIdToEdit,
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const isStudentRole = userToEdit?.role === 'student';

  const {
    data: instruments = [],
    isLoading: isLoadingInstruments,
    isError: isErrorInstruments,
  } = useQuery<Instrument[], Error>({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
    enabled: visible && isStudentRole,
  });

  const {
    data: activeTeachers = [],
    isLoading: isLoadingTeachers,
    isError: isErrorTeachers,
  } = useQuery<User[], Error>({
    queryKey: ['teachers', { status: 'active', context: 'editUserModal' }],
    queryFn: async () => {
      const result = await fetchTeachers({ page: 1, limit: 1000 });
      return (result?.items || []).filter(t => t.status === 'active');
    },
    enabled: visible && isStudentRole,
    staleTime: 5 * 60 * 1000,
  });

  const profileUpdateMutation = useMutation({
    mutationFn: (vars: {
      userId: string;
      updates: Partial<Omit<User, 'id' | 'role' | 'status'>>;
      avatarFile?: NativeFileObject | null;
    }) => updateUser(vars),
    onSuccess: updatedUser => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', updatedUser.id] });
      queryClient.invalidateQueries({ queryKey: [`${updatedUser.role}s`] });
      Toast.show({ type: 'success', text1: 'User Updated', position: 'bottom' });
      onClose();
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error.message || 'Could not update user.',
        position: 'bottom',
      });
    },
  });

  useEffect(() => {
    if (visible && userToEdit) {
      setFirstName(userToEdit.firstName || '');
      setLastName(userToEdit.lastName || '');
      setNickname(userToEdit.nickname || '');
      if (userToEdit.avatarPath) {
        const supabase = getSupabase();
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(userToEdit.avatarPath);
        setAvatarPreview(urlData.publicUrl);
      } else {
        setAvatarPreview(null);
      }
      setAvatarFile(undefined);

      if (userToEdit.role === 'student') {
        setSelectedInstrumentIds(userToEdit.instrumentIds || []);
        setSelectedTeacherIds(userToEdit.linkedTeacherIds || []);
      }
      profileUpdateMutation.reset();
    }
  }, [visible, userToEdit]);

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera roll permissions are needed.');
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

  const toggleInstrumentSelection = (id: string) =>
    setSelectedInstrumentIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  const toggleTeacherSelection = (id: string) => {
    if (currentUserRole !== 'admin') {
      Toast.show({
        type: 'info',
        text1: 'Permission Denied',
        text2: 'Only Admins can change teacher links.',
        position: 'bottom',
      });
      return;
    }
    setSelectedTeacherIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const handleSaveChanges = () => {
    if (!userToEdit) return;
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    if (!trimmedFirstName || !trimmedLastName) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'First and Last Name cannot be empty.',
        position: 'bottom',
      });
      return;
    }
    const updatesPayload: Partial<Omit<User, 'id' | 'role' | 'status'>> = {};
    let hasChanges = false;
    if (trimmedFirstName !== (userToEdit.firstName || '')) {
      updatesPayload.firstName = trimmedFirstName;
      hasChanges = true;
    }
    if (trimmedLastName !== (userToEdit.lastName || '')) {
      updatesPayload.lastName = trimmedLastName;
      hasChanges = true;
    }
    if (nickname.trim() !== (userToEdit.nickname || '')) {
      updatesPayload.nickname = nickname.trim() || undefined;
      hasChanges = true;
    }
    if (avatarFile !== undefined) {
      hasChanges = true;
    }
    if (userToEdit.role === 'student') {
      const initialInstrumentIds = (userToEdit.instrumentIds || []).sort();
      if (
        JSON.stringify([...selectedInstrumentIds].sort()) !== JSON.stringify(initialInstrumentIds)
      ) {
        updatesPayload.instrumentIds = selectedInstrumentIds;
        hasChanges = true;
      }
      if (currentUserRole === 'admin') {
        const initialTeacherIds = (userToEdit.linkedTeacherIds || []).sort();
        if (JSON.stringify([...selectedTeacherIds].sort()) !== JSON.stringify(initialTeacherIds)) {
          updatesPayload.linkedTeacherIds = selectedTeacherIds;
          hasChanges = true;
        }
      }
    }
    if (!hasChanges) {
      Toast.show({
        type: 'info',
        text1: 'No Changes',
        text2: 'No information was modified.',
        position: 'bottom',
      });
      onClose();
      return;
    }
    profileUpdateMutation.mutate({ userId: userToEdit.id, updates: updatesPayload, avatarFile });
  };

  const isSaveDisabled =
    profileUpdateMutation.isPending ||
    isLoadingUserToEdit ||
    !firstName.trim() ||
    !lastName.trim() ||
    (isStudentRole && (isLoadingInstruments || isLoadingTeachers));
  if (!visible || !userToEdit) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={[commonSharedStyles.centeredView]}>
        <View style={[commonSharedStyles.modalView]}>
          <Text style={commonSharedStyles.modalTitle}>
            Edit User: {getUserDisplayName(userToEdit)}
          </Text>
          <Text style={commonSharedStyles.modalSubTitle}>
            Role: {userToEdit.role.toUpperCase()}
          </Text>
          <ScrollView style={[commonSharedStyles.modalScrollView, { paddingHorizontal: 2 }]}>
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
                  disabled={profileUpdateMutation.isPending}
                  color={colors.info}
                />
                {avatarPreview && (
                  <Button
                    title="Remove Image"
                    onPress={removeImage}
                    disabled={profileUpdateMutation.isPending}
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
              editable={!profileUpdateMutation.isPending}
            />
            <Text style={commonSharedStyles.label}>Last Name:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={lastName}
              onChangeText={setLastName}
              editable={!profileUpdateMutation.isPending}
            />
            <Text style={commonSharedStyles.label}>Nickname (Optional):</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={nickname}
              onChangeText={setNickname}
              editable={!profileUpdateMutation.isPending}
            />

            {isStudentRole && (
              <>
                <View style={commonSharedStyles.roleSpecificSection}>
                  <Text style={commonSharedStyles.roleSectionTitle}>Instruments</Text>
                  {isLoadingInstruments ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : isErrorInstruments ? (
                    <Text style={commonSharedStyles.errorText}>Error loading instruments.</Text>
                  ) : (
                    <View style={commonSharedStyles.baseRowCentered}>
                      {instruments.map(inst => (
                        <Button
                          key={inst.id}
                          title={inst.name}
                          onPress={() => toggleInstrumentSelection(inst.id)}
                          color={
                            selectedInstrumentIds.includes(inst.id)
                              ? colors.success
                              : colors.secondary
                          }
                          disabled={profileUpdateMutation.isPending}
                        />
                      ))}
                    </View>
                  )}
                </View>

                <View style={commonSharedStyles.roleSpecificSection}>
                  <Text style={commonSharedStyles.roleSectionTitle}>Linked Teachers</Text>
                  {currentUserRole !== 'admin' && (
                    <Text style={commonSharedStyles.infoText}>
                      Only Admins can modify teacher links.
                    </Text>
                  )}
                  {isLoadingTeachers ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : isErrorTeachers ? (
                    <Text style={commonSharedStyles.errorText}>Error loading teachers.</Text>
                  ) : (
                    <View style={commonSharedStyles.baseRowCentered}>
                      {activeTeachers.map(teacher => (
                        <Button
                          key={teacher.id}
                          title={getUserDisplayName(teacher)}
                          onPress={() => toggleTeacherSelection(teacher.id)}
                          color={
                            selectedTeacherIds.includes(teacher.id)
                              ? colors.success
                              : colors.secondary
                          }
                          disabled={profileUpdateMutation.isPending || currentUserRole !== 'admin'}
                        />
                      ))}
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>

          {profileUpdateMutation.isPending && (
            <View style={commonSharedStyles.baseRowCentered}>
              <ActivityIndicator size="small" />
              <Text> Saving...</Text>
            </View>
          )}
          {profileUpdateMutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error: {profileUpdateMutation.error.message}
            </Text>
          )}
          <View style={commonSharedStyles.full}>
            <Button
              title={profileUpdateMutation.isPending ? 'Saving...' : 'Save Changes'}
              onPress={handleSaveChanges}
              color={colors.primary}
              disabled={isSaveDisabled}
            />
          </View>
          <View style={[commonSharedStyles.full, { marginTop: 10 }]}>
            <Button
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={profileUpdateMutation.isPending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditUserModal;
