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

import { createUser, fetchTeachers } from '../../../api/users';
import { fetchInstruments } from '../../../api/instruments';

import { appSharedStyles } from '../../../styles/appSharedStyles';
import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';

import { UserRole, User, Instrument } from '../../../types/dataTypes';
import { getUserDisplayName } from '../../../utils/helpers';
import Toast from 'react-native-toast-message';

const CREATABLE_ROLES: UserRole[] = ['admin', 'teacher', 'student', 'parent'];

interface InternalCreateUserModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CreateUserModal: React.FC<InternalCreateUserModalProps> = ({ visible, onClose }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [nickname, setNickname] = useState('');

  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const isStudentRoleSelected = role === 'student';

  const {
    data: instruments = [],
    isLoading: isLoadingInstruments,
    isError: isErrorInstruments,
    error: errorInstrumentsMsg,
  } = useQuery<Instrument[], Error>({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
    enabled: visible && isStudentRoleSelected,
  });

  const {
    data: activeTeachers = [],
    isLoading: isLoadingTeachers,
    isError: isErrorTeachers,
    error: errorTeachersMsg,
  } = useQuery<User[], Error>({
    queryKey: ['teachers', { status: 'active', context: 'createUserModal' }],
    queryFn: async () => {
      const result = await fetchTeachers({ page: 1, limit: 1000 });
      return (result?.items || []).filter(t => t.status === 'active');
    },
    enabled: visible && isStudentRoleSelected,
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: createdUser => {
      console.log('[CreateUserModal] User created successfully:', createdUser);

      const userRole = createdUser.role;
      if (userRole === 'student') queryClient.invalidateQueries({ queryKey: ['students'] });
      if (userRole === 'teacher') queryClient.invalidateQueries({ queryKey: ['teachers'] });
      if (userRole === 'admin') queryClient.invalidateQueries({ queryKey: ['admins'] });
      if (userRole === 'parent') queryClient.invalidateQueries({ queryKey: ['parents'] });

      queryClient.invalidateQueries({ queryKey: ['activeProfilesForDevSelector'] });
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `User "${getUserDisplayName(createdUser)}" created.`,
      });
    },
    onError: (error: Error) => {
      console.error('[CreateUserModal] Error creating user:', error);
      Toast.show({
        type: 'error',
        text1: 'Creation Failed',

        text2: error.message || 'Could not create user.',
        position: 'bottom',
        visibilityTime: 5000,
      });
    },
  });

  useEffect(() => {
    if (visible) {
      setFirstName('');
      setLastName('');
      setRole('');
      setNickname('');

      setSelectedInstrumentIds([]);
      setSelectedTeacherIds([]);
      mutation.reset();
    }
  }, [visible]);

  const toggleInstrumentSelection = (id: string) => {
    setSelectedInstrumentIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  const toggleTeacherSelection = (id: string) => {
    setSelectedTeacherIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const handleCreatePress = () => {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedNickname = nickname.trim();

    if (!trimmedFirstName || !trimmedLastName || !role) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'First Name, Last Name, and Role are required.',
      });
      return;
    }

    const payload: Omit<User, 'id' | 'status'> & {
      instrumentIds?: string[];
      linkedTeacherIds?: string[];
    } = {
      role: role,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      nickname: trimmedNickname || undefined,

      instrumentIds: undefined,
      linkedTeacherIds: undefined,
    };

    if (role === 'student') {
      if (selectedInstrumentIds.length > 0) {
        payload.instrumentIds = selectedInstrumentIds;
      }
      if (selectedTeacherIds.length > 0) {
        payload.linkedTeacherIds = selectedTeacherIds;
      }
    }

    console.log('[CreateUserModal] Calling mutation with payload (no PIN):', payload);
    mutation.mutate(payload);
  };

  const isStudentFieldsLoading =
    isStudentRoleSelected && (isLoadingInstruments || isLoadingTeachers);

  const isCreateDisabled =
    mutation.isPending || !role || !firstName.trim() || !lastName.trim() || isStudentFieldsLoading;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={appSharedStyles.centeredView}>
        <View style={appSharedStyles.modalView}>
          <Text style={appSharedStyles.modalTitle}>Create New User</Text>

          <ScrollView style={appSharedStyles.scrollView}>
            <Text style={commonSharedStyles.label}>First Name:</Text>
            <TextInput
              style={commonSharedStyles.input}
              placeholder="Enter First Name"
              placeholderTextColor={colors.textLight}
              value={firstName}
              onChangeText={setFirstName}
              editable={!mutation.isPending}
            />
            <Text style={commonSharedStyles.label}>Last Name:</Text>
            <TextInput
              style={commonSharedStyles.input}
              placeholder="Enter Last Name"
              placeholderTextColor={colors.textLight}
              value={lastName}
              onChangeText={setLastName}
              editable={!mutation.isPending}
            />
            <Text style={commonSharedStyles.label}>Nickname (Optional):</Text>
            <TextInput
              style={commonSharedStyles.input}
              placeholder="Enter Nickname"
              placeholderTextColor={colors.textLight}
              value={nickname}
              onChangeText={setNickname}
              editable={!mutation.isPending}
            />
            <Text style={commonSharedStyles.label}>Role:</Text>
            <View style={styles.roleButtonContainer}>
              {CREATABLE_ROLES.map(r => (
                <Button
                  key={r}
                  title={r.charAt(0).toUpperCase() + r.slice(1)}
                  onPress={() => setRole(r)}
                  color={role === r ? colors.primary : colors.secondary}
                  disabled={mutation.isPending}
                />
              ))}
            </View>

            {isStudentRoleSelected && (
              <View style={appSharedStyles.modalSubSection}>
                <Text style={appSharedStyles.roleSectionTitle}>Student Details (Optional)</Text>
                <Text style={commonSharedStyles.label}>Instruments:</Text>
                {isLoadingInstruments && <ActivityIndicator color={colors.primary} />}
                {isErrorInstruments && (
                  <Text style={commonSharedStyles.errorText}>
                    Error loading instruments: {errorInstrumentsMsg?.message}
                  </Text>
                )}
                {!isLoadingInstruments && !isErrorInstruments && (
                  <View style={appSharedStyles.selectionContainer}>
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

                <Text style={[commonSharedStyles.label, { marginTop: 15 }]}>Link Teachers:</Text>
                {isLoadingTeachers && <ActivityIndicator color={colors.primary} />}
                {isErrorTeachers && (
                  <Text style={commonSharedStyles.errorText}>
                    Error loading teachers: {errorTeachersMsg?.message}
                  </Text>
                )}
                {!isLoadingTeachers && !isErrorTeachers && (
                  <View style={appSharedStyles.selectionContainer}>
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
                      <Text style={appSharedStyles.emptyListText}>
                        No active teachers available.
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {mutation.isPending && (
            <View style={appSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={appSharedStyles.loadingText}>Creating User...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:{' '}
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to create user'}
            </Text>
          )}

          <View style={appSharedStyles.buttonContainer}>
            <Button
              title={mutation.isPending ? 'Creating...' : 'Create User'}
              onPress={handleCreatePress}
              disabled={isCreateDisabled}
            />
          </View>
          <View style={appSharedStyles.footerButton}>
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
  roleButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 10,
  },
});

export default CreateUserModal;
