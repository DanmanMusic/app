import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { createUser, fetchTeachers } from '../../../api/users';
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { colors } from '../../../styles/colors';
import { CreateUserModalProps } from '../../../types/componentProps';
import { UserRole, User } from '../../../types/userTypes';
import { getUserDisplayName } from '../../../utils/helpers';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';

const CREATABLE_ROLES: UserRole[] = ['admin', 'teacher', 'student'];

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  visible,
  onClose,
  mockInstruments,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  const queryClient = useQueryClient();

  const {
    data: allTeachers = [],
    isLoading: isLoadingTeachers,
    isError: isErrorTeachers,
    error: errorTeachers,
  } = useQuery<User[], Error>({
    queryKey: ['teachers', { status: 'active', context: 'createUserModal' }],
    queryFn: async () => {
      const result = await fetchTeachers({ page: 1 });
      return (result?.items || []).filter(t => t.status === 'active');
    },
    enabled: visible && role === 'student',
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: createdUser => {
      console.log('User created successfully via mutation:', createdUser);
      if (createdUser.role === 'student') {
        queryClient.invalidateQueries({ queryKey: ['students'] });
      } else if (createdUser.role === 'teacher') {
        queryClient.invalidateQueries({ queryKey: ['teachers'] });
      }
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'User created successfully.',
        position: 'bottom',
      });
    },
    onError: error => {
      console.error('Error creating user via mutation:', error);
      Toast.show({
        type: 'error',
        text1: 'Creation Failed',
        text2: error instanceof Error ? error.message : 'Could not create user.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  useEffect(() => {
    if (visible) {
      setFirstName('');
      setLastName('');
      setRole('');
      setSelectedInstrumentIds([]);
      setSelectedTeacherIds([]);
      mutation.reset();
    }
  }, [visible]);

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

  const handleCreatePress = () => {
    if (!firstName.trim() || !lastName.trim() || !role) {
      Toast.show({
        type: 'error',
        text1: 'Re-assign Failed',
        text2: 'Validation Error - Please enter First Name, Last Name, and select a Role.',
        position: 'bottom',
        visibilityTime: 4000,
      });
      return;
    }

    const newUserPartial: Omit<User, 'id' | 'status'> = {
      role: role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      ...(role === 'student' && {
        instrumentIds: selectedInstrumentIds.length > 0 ? selectedInstrumentIds : undefined,
        linkedTeacherIds: selectedTeacherIds.length > 0 ? selectedTeacherIds : undefined,
      }),
    };

    console.log('[CreateUserModal] Sending user data:', JSON.stringify(newUserPartial));
    mutation.mutate(newUserPartial);
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Create New User</Text>

          <ScrollView style={modalSharedStyles.scrollView}>
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

            <Text style={commonSharedStyles.label}>Role:</Text>
            <View style={modalSharedStyles.buttonContainer}>
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

            {role === 'student' && (
              <View style={modalSharedStyles.modalSubSection}>
                <Text style={modalSharedStyles.modalTitle}>Student Details (Optional)</Text>

                <Text style={commonSharedStyles.label}>Instruments:</Text>
                <View style={commonSharedStyles.selectionContainer}>
                  {mockInstruments.length > 0 ? (
                    mockInstruments.map(inst => (
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

                <Text style={[commonSharedStyles.label, { marginTop: 15 }]}>Link Teachers:</Text>
                <View style={commonSharedStyles.selectionContainer}>
                  {isLoadingTeachers && <ActivityIndicator color={colors.primary} />}
                  {isErrorTeachers && (
                    <Text style={appSharedStyles.textDanger}>Error loading teachers.</Text>
                  )}
                  {!isLoadingTeachers &&
                    !isErrorTeachers &&
                    (allTeachers.length > 0 ? (
                      allTeachers.map(teacher => (
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
                    ))}
                </View>
              </View>
            )}
          </ScrollView>

          {mutation.isPending && (
            <View style={modalSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalSharedStyles.loadingText}>Creating User...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to create user'}
            </Text>
          )}

          <View style={modalSharedStyles.buttonContainer}>
            <Button
              title="Create User"
              onPress={handleCreatePress}
              disabled={mutation.isPending || !role || !firstName || !lastName || isLoadingTeachers}
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

export default CreateUserModal;
