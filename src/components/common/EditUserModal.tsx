import React, { useState, useEffect } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Modal,
  View,
  Text,
  Button,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { updateUser, fetchTeachers } from '../../api/users';

import { fetchInstruments } from '../../api/instruments';

import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { modalSharedStyles } from '../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

import { EditUserModalProps } from '../../types/componentProps';
import { User, Instrument } from '../../types/dataTypes';
import { getUserDisplayName } from '../../utils/helpers';
import Toast from 'react-native-toast-message';

export const EditUserModal: React.FC<EditUserModalProps> = ({ visible, userToEdit, onClose }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  const queryClient = useQueryClient();
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

  const mutation = useMutation({
    mutationFn: updateUser,
    onSuccess: updatedUser => {
      console.log('[EditUserModal] User updated successfully:', updatedUser);

      queryClient.invalidateQueries({ queryKey: ['userProfile', updatedUser.id] });
      if (updatedUser.role === 'student') queryClient.invalidateQueries({ queryKey: ['students'] });
      if (updatedUser.role === 'teacher') queryClient.invalidateQueries({ queryKey: ['teachers'] });

      queryClient.invalidateQueries({ queryKey: ['activeProfilesForDevSelector'] });
      onClose();
      Toast.show({ type: 'success', text1: 'Success', text2: 'User updated successfully.' });
    },
    onError: (error: Error) => {
      console.error('[EditUserModal] Error updating user:', error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error.message || 'Could not update user.',
      });
    },
  });

  useEffect(() => {
    if (visible && userToEdit) {
      setFirstName(userToEdit.firstName);
      setLastName(userToEdit.lastName);
      setNickname(userToEdit.nickname || '');
      if (userToEdit.role === 'student') {
        setSelectedInstrumentIds(userToEdit.instrumentIds || []);
        setSelectedTeacherIds(userToEdit.linkedTeacherIds || []);
      } else {
        setSelectedInstrumentIds([]);
        setSelectedTeacherIds([]);
      }
      mutation.reset();
    } else {
      setFirstName('');
      setLastName('');
      setNickname('');
      setSelectedInstrumentIds([]);
      setSelectedTeacherIds([]);
    }
  }, [visible, userToEdit]);

  const toggleInstrumentSelection = (id: string) => {
    setSelectedInstrumentIds(prev =>
      prev.includes(id) ? prev.filter(instrumentId => instrumentId !== id) : [...prev, id]
    );
  };

  const toggleTeacherSelection = (id: string) => {
    setSelectedTeacherIds(prev =>
      prev.includes(id) ? prev.filter(teacherId => teacherId !== id) : [...prev, id]
    );
  };

  const handleSaveChanges = () => {
    if (!userToEdit) return;

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

    const updates: Partial<Omit<User, 'id' | 'role' | 'status'>> = {};
    let hasChanges = false;

    if (trimmedFirstName !== userToEdit.firstName) {
      updates.firstName = trimmedFirstName;
      hasChanges = true;
    }
    if (trimmedLastName !== userToEdit.lastName) {
      updates.lastName = trimmedLastName;
      hasChanges = true;
    }
    if (trimmedNickname !== (userToEdit.nickname || '')) {
      updates.nickname = trimmedNickname || undefined;
      hasChanges = true;
    }

    if (userToEdit.role === 'student') {
      const initialInstrumentIdsSorted = JSON.stringify((userToEdit.instrumentIds || []).sort());
      const currentInstrumentIdsSorted = JSON.stringify(selectedInstrumentIds.sort());
      if (currentInstrumentIdsSorted !== initialInstrumentIdsSorted) {
        updates.instrumentIds = selectedInstrumentIds;
        hasChanges = true;
        console.log('[EditUserModal] Instrument links changed.');
      }

      const initialTeacherIdsSorted = JSON.stringify((userToEdit.linkedTeacherIds || []).sort());
      const currentTeacherIdsSorted = JSON.stringify(selectedTeacherIds.sort());
      if (currentTeacherIdsSorted !== initialTeacherIdsSorted) {
        updates.linkedTeacherIds = selectedTeacherIds;
        hasChanges = true;
        console.log('[EditUserModal] Teacher links changed.');
      }
    }

    if (!hasChanges) {
      console.log('[EditUserModal] No changes detected.');
      onClose();
      return;
    }

    console.log('[EditUserModal] Calling mutation with updates:', updates);

    mutation.mutate({ userId: userToEdit.id, updates });
  };

  const isSaveDisabled =
    mutation.isPending ||
    !firstName.trim() ||
    !lastName.trim() ||
    (isStudentRole && (isLoadingInstruments || isLoadingTeachers));

  if (!visible || !userToEdit) {
    return null;
  }

  if (userToEdit.role === 'parent') {
    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalSharedStyles.centeredView}>
          <View style={modalSharedStyles.modalView}>
            <Text style={modalSharedStyles.modalTitle}>Edit User</Text>
            <Text style={commonSharedStyles.errorText}>
              Editing Parent details is not supported via this modal.
            </Text>
            <View style={modalSharedStyles.footerButton}>
              <Button title="Close" onPress={onClose} color={colors.secondary} />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  const currentUserDisplayName = getUserDisplayName(userToEdit);

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Edit User: {currentUserDisplayName}</Text>
          <Text style={modalSharedStyles.subTitle}>
            Role: {userToEdit.role.toUpperCase()} (ID: {userToEdit.id})
          </Text>

          <ScrollView style={modalSharedStyles.scrollView}>
            {}
            <Text style={commonSharedStyles.label}>First Name:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={firstName}
              onChangeText={setFirstName}
              editable={!mutation.isPending}
            />
            <Text style={commonSharedStyles.label}>Last Name:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={lastName}
              onChangeText={setLastName}
              editable={!mutation.isPending}
            />
            <Text style={commonSharedStyles.label}>Nickname (Optional):</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="Optional Nickname"
              placeholderTextColor={colors.textLight}
              editable={!mutation.isPending}
            />

            {}
            {isStudentRole && (
              <>
                {}
                <View style={modalSharedStyles.roleSpecificSection}>
                  <Text style={modalSharedStyles.roleSectionTitle}>Instruments</Text>
                  {}
                  {isLoadingInstruments && <ActivityIndicator color={colors.primary} />}
                  {isErrorInstruments && (
                    <Text style={commonSharedStyles.errorText}>
                      Error loading instruments: {errorInstrumentsMsg?.message}
                    </Text>
                  )}
                  {}
                  {!isLoadingInstruments && !isErrorInstruments && (
                    <View style={commonSharedStyles.selectionContainer}>
                      {instruments.length > 0 ? (
                        instruments.map(inst => (
                          <Button
                            key={inst.id}
                            title={inst.name}
                            onPress={() => toggleInstrumentSelection(inst.id)}
                            color={
                              selectedInstrumentIds.includes(inst.id)
                                ? colors.success
                                : colors.secondary
                            }
                            disabled={mutation.isPending}
                          />
                        ))
                      ) : (
                        <Text style={appSharedStyles.emptyListText}>No instruments available.</Text>
                      )}
                    </View>
                  )}
                  <Text style={styles.infoText}>
                    Note: Instrument link saving is currently deferred in API.
                  </Text>
                </View>

                {}
                <View style={modalSharedStyles.roleSpecificSection}>
                  <Text style={modalSharedStyles.roleSectionTitle}>Linked Teachers</Text>
                  {isLoadingTeachers && <ActivityIndicator color={colors.primary} />}
                  {isErrorTeachers && (
                    <Text style={commonSharedStyles.errorText}>
                      Error loading teachers: {errorTeachersMsg?.message}
                    </Text>
                  )}
                  {!isLoadingTeachers && !isErrorTeachers && (
                    <View style={commonSharedStyles.selectionContainer}>
                      {activeTeachers.length > 0 ? (
                        activeTeachers.map(teacher => (
                          <Button
                            key={teacher.id}
                            title={getUserDisplayName(teacher)}
                            onPress={() => toggleTeacherSelection(teacher.id)}
                            color={
                              selectedTeacherIds.includes(teacher.id)
                                ? colors.success
                                : colors.secondary
                            }
                            disabled={mutation.isPending}
                          />
                        ))
                      ) : (
                        <Text style={appSharedStyles.emptyListText}>No active teachers found.</Text>
                      )}
                    </View>
                  )}
                  <Text style={styles.infoText}>
                    Note: Teacher link saving is currently deferred in API.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          {}
          {mutation.isPending && (
            <View style={modalSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalSharedStyles.loadingText}>Saving Changes...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:{' '}
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to save changes'}
            </Text>
          )}

          {}
          <View style={modalSharedStyles.buttonContainer}>
            <Button
              title={mutation.isPending ? 'Saving...' : 'Save Changes'}
              onPress={handleSaveChanges}
              disabled={isSaveDisabled}
            />
          </View>
          <View style={modalSharedStyles.footerButton}>
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

const styles = StyleSheet.create({
  infoText: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
});

export default EditUserModal;
