import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { updateUser, fetchTeachers } from '../../api/users';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { EditUserModalProps } from '../../types/componentProps';
import { User } from '../../types/dataTypes';
import { getUserDisplayName } from '../../utils/helpers';
import { modalSharedStyles } from '../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';

export const EditUserModal: React.FC<EditUserModalProps> = ({
  visible,
  userToEdit,
  onClose,
  instruments,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  const queryClient = useQueryClient();

  const {
    data: allTeachers = [],
    isLoading: isLoadingTeachers,
    isError: isErrorTeachers,
  } = useQuery<User[], Error>({
    queryKey: ['teachers', { status: 'active', context: 'editUserModal' }],
    queryFn: async () => {
      const result = await fetchTeachers({ page: 1 });
      return (result?.items || []).filter(t => t.status === 'active');
    },

    enabled: visible && !!userToEdit && userToEdit.role === 'student',
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: updateUser,
    onSuccess: updatedUser => {
      console.log('User updated successfully via mutation:', updatedUser);
      queryClient.invalidateQueries({ queryKey: ['user', updatedUser.id] });

      if (updatedUser.role === 'student') {
        queryClient.invalidateQueries({ queryKey: ['students'] });
      } else if (updatedUser.role === 'teacher') {
        queryClient.invalidateQueries({ queryKey: ['teachers'] });
      }
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'User updated successfully.',
        position: 'bottom',
      });
    },
    onError: error => {
      console.error('Error updating user via mutation:', error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error instanceof Error ? error.message : 'Could not update user.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  useEffect(() => {
    if (visible && userToEdit && userToEdit.role !== 'parent') {
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
    if (!userToEdit || userToEdit.role === 'parent') return;
    if (!firstName.trim() || !lastName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'First Name and Last Name cannot be empty.',
        position: 'bottom',
        visibilityTime: 4000,
      });
      return;
    }

    const updates: Partial<Omit<User, 'id' | 'role' | 'status'>> = {};
    if (firstName.trim() !== userToEdit.firstName) updates.firstName = firstName.trim();
    if (lastName.trim() !== userToEdit.lastName) updates.lastName = lastName.trim();
    const trimmedNickname = nickname.trim();
    if (trimmedNickname !== (userToEdit.nickname || '')) {
      updates.nickname = trimmedNickname ? trimmedNickname : undefined;
    }

    if (userToEdit.role === 'student') {
      if (
        JSON.stringify(selectedInstrumentIds.sort()) !==
        JSON.stringify((userToEdit.instrumentIds || []).sort())
      ) {
        updates.instrumentIds = selectedInstrumentIds;
      }

      if (
        JSON.stringify(selectedTeacherIds.sort()) !==
        JSON.stringify((userToEdit.linkedTeacherIds || []).sort())
      ) {
        updates.linkedTeacherIds = selectedTeacherIds;
      }
    }

    if (Object.keys(updates).length === 0) {
      console.log('[EditUserModal] No changes detected.');
      onClose();
      return;
    }

    console.log('[EditUserModal] Applying updates:', JSON.stringify(updates));
    mutation.mutate({ userId: userToEdit.id, updates });
  };

  if (!visible || !userToEdit || userToEdit.role === 'parent') {
    return null;
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
            <Text style={commonSharedStyles.label}>Nickname:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="Optional Nickname"
              placeholderTextColor={colors.textLight}
              editable={!mutation.isPending}
            />

            {userToEdit.role === 'student' && (
              <>
                <View style={modalSharedStyles.roleSpecificSection}>
                  <Text style={modalSharedStyles.roleSectionTitle}>Instruments</Text>
                  <View style={modalSharedStyles.selectionContainer}>
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
                </View>
                <View style={modalSharedStyles.roleSpecificSection}>
                  <Text style={modalSharedStyles.roleSectionTitle}>Linked Teachers</Text>
                  <View style={modalSharedStyles.selectionContainer}>
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
              </>
            )}
          </ScrollView>
          {mutation.isPending && (
            <View style={modalSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalSharedStyles.loadingText}>Saving Changes...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to save changes'}
            </Text>
          )}
          <View style={modalSharedStyles.buttonContainer}>
            <Button
              title="Save Changes"
              onPress={handleSaveChanges}
              disabled={mutation.isPending || isLoadingTeachers}
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

export default EditUserModal;
