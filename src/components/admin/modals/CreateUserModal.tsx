import React, { useState, useEffect } from 'react';

import { Modal, View, Text, TextInput, ScrollView, ActivityIndicator } from 'react-native';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Toast from 'react-native-toast-message';

import { fetchInstruments } from '../../../api/instruments';
import { createUser, fetchTeachers } from '../../../api/users';
import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import { UserRole, User, Instrument } from '../../../types/dataTypes';
import { capitalizeFirstLetter, getUserDisplayName } from '../../../utils/helpers';
import { useAuth } from '../../../contexts/AuthContext';
import { CustomButton } from '../../common/CustomButton';
import { UserPlusIcon, XCircleIcon } from 'react-native-heroicons/solid';

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
  const { appUser } = useAuth();
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

      queryClient.invalidateQueries({ queryKey: ['userCounts'] });
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `User "${getUserDisplayName(createdUser)}" created.`,
        position: 'bottom',
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
    const adminCompanyId = appUser?.companyId;

    if (!trimmedFirstName || !trimmedLastName || !role) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'First Name, Last Name, and Role are required.',
        position: 'bottom',
      });
      return;
    }

    if (!adminCompanyId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not determine your company. Please re-login.',
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
      companyId: adminCompanyId,
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
      <View style={[commonSharedStyles.centeredView]}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Create New User</Text>

          <ScrollView style={[commonSharedStyles.modalScrollView, { paddingHorizontal: 2 }]}>
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
            <View style={[commonSharedStyles.baseRowCentered, { marginBottom: 15 }]}>
              {CREATABLE_ROLES.map(r => (
                <CustomButton
                  key={r}
                  title={capitalizeFirstLetter(r)}
                  onPress={() => setRole(r)}
                  color={role === r ? colors.primary : colors.secondary}
                  disabled={mutation.isPending}
                />
              ))}
            </View>

            {isStudentRoleSelected && (
              <View style={commonSharedStyles.modalSubSection}>
                <Text style={commonSharedStyles.roleSectionTitle}>Student Details (Optional)</Text>
                <Text style={commonSharedStyles.label}>Instruments:</Text>
                {isLoadingInstruments && <ActivityIndicator color={colors.primary} />}
                {isErrorInstruments && (
                  <Text style={commonSharedStyles.errorText}>
                    Error loading instruments: {errorInstrumentsMsg?.message}
                  </Text>
                )}
                {!isLoadingInstruments && !isErrorInstruments && (
                  <View style={commonSharedStyles.baseRowCentered}>
                    {instruments.length > 0 ? (
                      instruments.map(inst => (
                        <CustomButton
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
                      <Text style={commonSharedStyles.baseEmptyText}>
                        No instruments available.
                      </Text>
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
                  <View style={commonSharedStyles.baseRowCentered}>
                    {activeTeachers.length > 0 ? (
                      activeTeachers.map(teacher => (
                        <CustomButton
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
                      <Text style={commonSharedStyles.baseEmptyText}>
                        No active teachers available.
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {mutation.isPending && (
            <View style={commonSharedStyles.baseRowCentered}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={commonSharedStyles.baseSecondaryText}>Creating User...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:{' '}
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to create user'}
            </Text>
          )}

          <View style={commonSharedStyles.full}>
            <CustomButton
              title={mutation.isPending ? 'Creating...' : 'Create User'}
              onPress={handleCreatePress}
              color={colors.primary}
              disabled={isCreateDisabled}
              leftIcon={
                <UserPlusIcon
                  color={isCreateDisabled ? colors.disabledText : colors.textWhite}
                  size={18}
                />
              }
            />
          </View>
          <View style={[commonSharedStyles.full, { marginTop: 10 }]}>
            <CustomButton
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={mutation.isPending}
              leftIcon={
                <XCircleIcon
                  color={mutation.isPending ? colors.disabledText : colors.textWhite}
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

export default CreateUserModal;
