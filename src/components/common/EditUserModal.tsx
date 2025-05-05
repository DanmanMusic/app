// src/components/common/EditUserModal.tsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';

import { updateUser, fetchTeachers, fetchUserProfile } from '../../api/users';
import { fetchInstruments } from '../../api/instruments';
import { useAuth } from '../../contexts/AuthContext';

import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

import { EditUserModalProps } from '../../types/componentProps';
import { User, Instrument } from '../../types/dataTypes';
import { getUserDisplayName } from '../../utils/helpers';

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

  const userIdToEdit = userToEditProp?.id;

  const {
    data: userToEdit,
    isLoading: isLoadingUserToEdit,
    isSuccess: isSuccessUserToEdit,
    isError: isErrorUserToEdit,
    error: errorUserToEdit,
  } = useQuery<User | null, Error>({
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
    error: errorInstrumentsMsg,
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
    error: errorTeachersMsg,
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
    }) => updateUser({ userId: vars.userId, updates: vars.updates }),
    onSuccess: updatedUser => {
      console.log('[EditUserModal] User update successful via mutation.');
      queryClient.invalidateQueries({ queryKey: ['userProfile', updatedUser.id] });
      if (updatedUser.role === 'student') queryClient.invalidateQueries({ queryKey: ['students'] });
      if (updatedUser.role === 'teacher') queryClient.invalidateQueries({ queryKey: ['teachers'] });
      if (updatedUser.role === 'parent') queryClient.invalidateQueries({ queryKey: ['parents'] });
      if (updatedUser.role === 'admin') queryClient.invalidateQueries({ queryKey: ['admins'] });

      Toast.show({ type: 'success', text1: 'User Updated', position: 'bottom' });
      onClose();
    },
    onError: (error: Error) => {
      console.error('[EditUserModal] Error updating user:', error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error.message || 'Could not update user.',
        position: 'bottom',
      });
    },
  });

  useEffect(() => {
    console.log(
      `[EditUserModal useEffect] Running. Visible: ${visible}, User Loaded: ${isSuccessUserToEdit}, User Data ID: ${userToEdit?.id}`
    );
    if (visible && userToEdit) {
      console.log('[EditUserModal useEffect] Setting form state...');
      setFirstName(userToEdit.firstName || '');
      setLastName(userToEdit.lastName || '');
      setNickname(userToEdit.nickname || '');
      if (userToEdit.role === 'student') {
        const instrumentsToSet = userToEdit.instrumentIds || [];
        const teachersToSet = userToEdit.linkedTeacherIds || [];
        console.log(
          '[EditUserModal useEffect] Setting student selections - Instruments:',
          instrumentsToSet,
          'Teachers:',
          teachersToSet
        );
        setSelectedInstrumentIds(instrumentsToSet);
        setSelectedTeacherIds(teachersToSet);
      } else {
        setSelectedInstrumentIds([]);
        setSelectedTeacherIds([]);
      }
      profileUpdateMutation.reset();
    } else if (!visible) {
      setFirstName('');
      setLastName('');
      setNickname('');
      setSelectedInstrumentIds([]);
      setSelectedTeacherIds([]);
    }
  }, [visible, userToEdit, isSuccessUserToEdit]);

  const toggleInstrumentSelection = (id: string) => {
    setSelectedInstrumentIds(prev =>
      prev.includes(id) ? prev.filter(instrumentId => instrumentId !== id) : [...prev, id]
    );
  };
  const toggleTeacherSelection = (id: string) => {
    if (currentUserRole !== 'admin') {
      Toast.show({
        type: 'info',
        text1: 'Permission Denied',
        text2: 'Only Admins can change teacher links.',
      });
      return;
    }
    setSelectedTeacherIds(prev =>
      prev.includes(id) ? prev.filter(teacherId => teacherId !== id) : [...prev, id]
    );
  };

  const handleSaveChanges = () => {
    if (!userToEdit) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'User data not loaded.' });
      return;
    }
    if (profileUpdateMutation.isPending) return;

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedNickname = nickname.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'First and Last Name cannot be empty.',
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
    if (trimmedNickname !== (userToEdit.nickname || '')) {
      updatesPayload.nickname = trimmedNickname || undefined;
      hasChanges = true;
    }

    if (userToEdit.role === 'student') {
      if (currentUserRole === 'admin' || currentUserRole === 'teacher') {
        const initialInstrumentIds = (userToEdit.instrumentIds || []).sort();
        const currentInstrumentIds = [...selectedInstrumentIds].sort();
        if (JSON.stringify(currentInstrumentIds) !== JSON.stringify(initialInstrumentIds)) {
          updatesPayload.instrumentIds = selectedInstrumentIds;
          hasChanges = true;
        }
      }

      if (currentUserRole === 'admin') {
        const initialTeacherIds = (userToEdit.linkedTeacherIds || []).sort();
        const currentTeacherIds = [...selectedTeacherIds].sort();
        if (JSON.stringify(currentTeacherIds) !== JSON.stringify(initialTeacherIds)) {
          updatesPayload.linkedTeacherIds = selectedTeacherIds;
          hasChanges = true;
        }
      }
    }

    if (!hasChanges) {
      console.log('[EditUserModal] No relevant changes detected or authorized to send.');
      Toast.show({ type: 'info', text1: 'No Changes', text2: 'No information was modified.' });
      onClose();
      return;
    }

    console.log('[EditUserModal] Calling mutation with updatesPayload:', updatesPayload);
    profileUpdateMutation.mutate({ userId: userToEdit.id, updates: updatesPayload });
  };

  const isSaveDisabled =
    profileUpdateMutation.isPending ||
    isLoadingUserToEdit ||
    !firstName.trim() ||
    !lastName.trim() ||
    (isStudentRole && (isLoadingInstruments || isLoadingTeachers));

  if (visible && isLoadingUserToEdit) {
    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={commonSharedStyles.centeredView}>
          <View style={commonSharedStyles.modalView}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={commonSharedStyles.baseSecondaryText}>Loading user data...</Text>
          </View>
        </View>
      </Modal>
    );
  }
  if (visible && isErrorUserToEdit) {
    console.error('Error fetching user to edit:', errorUserToEdit);
    Toast.show({
      type: 'error',
      text1: 'Error Loading User',
      text2: errorUserToEdit?.message || 'Could not load user details.',
      position: 'bottom',
      visibilityTime: 4000,
    });
    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={commonSharedStyles.centeredView}>
          <View style={commonSharedStyles.modalView}>
            <Text style={commonSharedStyles.modalTitle}>Error</Text>
            <Text style={commonSharedStyles.errorText}>Could not load user details to edit.</Text>
            <Text style={commonSharedStyles.errorText}>{errorUserToEdit?.message}</Text>
            <View style={[commonSharedStyles.full, { marginTop: 20 }]}>
              <Button title="Close" onPress={onClose} color={colors.secondary} />
            </View>
          </View>
        </View>
      </Modal>
    );
  }
  if (visible && !userToEdit && !isLoadingUserToEdit) {
    console.error('[EditUserModal] Modal visible but user data is null after load attempt.');
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'User data unavailable.',
      position: 'bottom',
    });
    return null;
  }
  if (!visible || !userToEdit) {
    return null;
  }

  const currentUserDisplayName = getUserDisplayName(userToEdit);

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={[commonSharedStyles.centeredView]}>
        <View style={[commonSharedStyles.modalView]}>
          <Text style={commonSharedStyles.modalTitle}>Edit User: {currentUserDisplayName}</Text>
          <Text style={commonSharedStyles.modalSubTitle}>
            Role: {userToEdit.role.toUpperCase()} (ID: {userToEdit.id})
          </Text>

          <ScrollView style={[commonSharedStyles.modalScrollView, { paddingHorizontal: 2 }]}>
            <Text style={commonSharedStyles.label}>First Name:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={firstName}
              onChangeText={setFirstName}
              editable={!profileUpdateMutation.isPending}
              placeholder="Enter First Name"
              placeholderTextColor={colors.textLight}
            />
            <Text style={commonSharedStyles.label}>Last Name:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={lastName}
              onChangeText={setLastName}
              editable={!profileUpdateMutation.isPending}
              placeholder="Enter Last Name"
              placeholderTextColor={colors.textLight}
            />
            <Text style={commonSharedStyles.label}>Nickname (Optional):</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="Optional Nickname"
              placeholderTextColor={colors.textLight}
              editable={!profileUpdateMutation.isPending}
            />

            {isStudentRole && (
              <>
                <View style={commonSharedStyles.roleSpecificSection}>
                  <Text style={commonSharedStyles.roleSectionTitle}>Instruments</Text>
                  {isLoadingInstruments && <ActivityIndicator color={colors.primary} />}
                  {isErrorInstruments && (
                    <Text style={commonSharedStyles.errorText}>
                      Error loading instruments: {errorInstrumentsMsg?.message}
                    </Text>
                  )}
                  {!isLoadingInstruments && !isErrorInstruments && (
                    <View style={commonSharedStyles.baseRowCentered}>
                      {instruments.length > 0 ? (
                        instruments.map(inst => {
                          const isSelected = selectedInstrumentIds.includes(inst.id);
                          return (
                            <Button
                              key={inst.id}
                              title={inst.name}
                              onPress={() => toggleInstrumentSelection(inst.id)}
                              color={isSelected ? colors.success : colors.secondary}
                              disabled={profileUpdateMutation.isPending}
                            />
                          );
                        })
                      ) : (
                        <Text style={commonSharedStyles.baseEmptyText}>
                          No instruments available.
                        </Text>
                      )}
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
                  {isLoadingTeachers && <ActivityIndicator color={colors.primary} />}
                  {isErrorTeachers && (
                    <Text style={commonSharedStyles.errorText}>
                      Error loading teachers: {errorTeachersMsg?.message}
                    </Text>
                  )}
                  {!isLoadingTeachers && !isErrorTeachers && (
                    <View style={commonSharedStyles.baseRowCentered}>
                      {activeTeachers.length > 0 ? (
                        activeTeachers.map(teacher => {
                          const isSelected = selectedTeacherIds.includes(teacher.id);
                          return (
                            <Button
                              key={teacher.id}
                              title={getUserDisplayName(teacher)}
                              onPress={() => toggleTeacherSelection(teacher.id)}
                              color={isSelected ? colors.success : colors.secondary}
                              disabled={
                                profileUpdateMutation.isPending || currentUserRole !== 'admin'
                              }
                            />
                          );
                        })
                      ) : (
                        <Text style={commonSharedStyles.baseEmptyText}>
                          No active teachers found.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>

          {profileUpdateMutation.isPending && (
            <View style={commonSharedStyles.baseRowCentered}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={commonSharedStyles.baseSecondaryText}>Saving Changes...</Text>
            </View>
          )}
          {profileUpdateMutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:{' '}
              {profileUpdateMutation.error instanceof Error
                ? profileUpdateMutation.error.message
                : 'Failed to save changes'}
            </Text>
          )}
          <View style={commonSharedStyles.full}>
            <Button
              title={profileUpdateMutation.isPending ? 'Saving...' : 'Save Changes'}
              onPress={handleSaveChanges}
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
