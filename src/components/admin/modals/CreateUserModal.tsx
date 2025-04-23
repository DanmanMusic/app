import React, { useState, useEffect } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  Modal,
  View,
  Text,
  StyleSheet,
  Button,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { createUser, fetchTeachers } from '../../../api/users';
import { Instrument } from '../../../mocks/mockInstruments';
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { colors } from '../../../styles/colors';
import { CreateUserModalProps } from '../../../types/componentProps';
import { UserRole, User } from '../../../types/userTypes';
import { getUserDisplayName } from '../../../utils/helpers';

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
    },
    onError: error => {
      console.error('Error creating user via mutation:', error);
      Alert.alert(
        'Error',
        `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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
      Alert.alert('Validation Error', 'Please enter First Name, Last Name, and select a Role.');
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
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Create New User</Text>

          <ScrollView style={modalStyles.scrollView}>
            <Text style={modalStyles.label}>First Name:</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="Enter First Name"
              placeholderTextColor={colors.textLight}
              value={firstName}
              onChangeText={setFirstName}
              editable={!mutation.isPending}
            />
            <Text style={modalStyles.label}>Last Name:</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="Enter Last Name"
              placeholderTextColor={colors.textLight}
              value={lastName}
              onChangeText={setLastName}
              editable={!mutation.isPending}
            />

            <Text style={modalStyles.label}>Role:</Text>
            <View style={modalStyles.roleButtons}>
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
              <View style={modalStyles.roleSpecificSection}>
                <Text style={modalStyles.roleSectionTitle}>Student Details (Optional)</Text>

                <Text style={modalStyles.label}>Instruments:</Text>
                <View style={modalStyles.selectionContainer}>
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

                <Text style={[modalStyles.label, { marginTop: 15 }]}>Link Teachers:</Text>
                <View style={modalStyles.selectionContainer}>
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
            <View style={modalStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalStyles.loadingText}>Creating User...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={modalStyles.errorText}>
              Error:{' '}
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to create user'}
            </Text>
          )}

          <View style={modalStyles.buttonContainer}>
            <Button
              title="Create User"
              onPress={handleCreatePress}
              disabled={mutation.isPending || !role || !firstName || !lastName || isLoadingTeachers}
            />
          </View>
          <View style={modalStyles.footerButton}>
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

const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalView: {
    margin: 20,
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  scrollView: { width: '100%', marginBottom: 15 },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: colors.textPrimary,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    paddingBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    color: colors.textPrimary,
    alignSelf: 'flex-start',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundPrimary,
    marginBottom: 5,
  },
  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 15,
  },
  roleSpecificSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.borderPrimary,
    width: '100%',
  },
  roleSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  selectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  loadingText: { marginLeft: 10, fontSize: 14, color: colors.textSecondary },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 5,
    fontSize: 14,
  },
  buttonContainer: { flexDirection: 'column', width: '100%', marginTop: 10, gap: 10 },
  footerButton: { width: '100%', marginTop: 10 },
});

export default CreateUserModal;
