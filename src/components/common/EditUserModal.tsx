// src/components/common/EditUserModal.tsx
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
import Toast from 'react-native-toast-message';

// API Imports
import { updateUser, fetchTeachers, fetchUserProfile } from '../../api/users'; // Use updated updateUser
import { fetchInstruments } from '../../api/instruments';

// Style Imports
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { modalSharedStyles } from '../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

// Type Imports
import { EditUserModalProps } from '../../types/componentProps';
import { User, Instrument } from '../../types/dataTypes';
import { getUserDisplayName } from '../../utils/helpers';

export const EditUserModal: React.FC<EditUserModalProps> = ({
  visible,
  userToEdit: userToEditProp,
  onClose,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const userIdToEdit = userToEditProp?.id;

  // Fetch the LATEST user profile data when modal opens
  const {
    data: userToEdit,
    isLoading: isLoadingUserToEdit,
    isSuccess: isSuccessUserToEdit,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', userIdToEdit, { context: 'editUserModalFetch' }],
    queryFn: () => (userIdToEdit ? fetchUserProfile(userIdToEdit) : Promise.resolve(null)),
    enabled: visible && !!userIdToEdit,
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const isStudentRole = userToEdit?.role === 'student';

  // Fetch all instruments if editing a student
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

  // Fetch all active teachers if editing a student
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

  // Mutation hook for updating the user (now calls the API function which calls the Edge Function)
  const mutation = useMutation({
    mutationFn: updateUser, // Uses the updated function from users.ts
    onSuccess: updatedUser => {
      console.log('[EditUserModal] User update successful (via API/Edge Function):', updatedUser);
      // Invalidate queries to refetch data shown elsewhere
      queryClient.invalidateQueries({ queryKey: ['userProfile', updatedUser.id] });
      if (updatedUser.role === 'student') queryClient.invalidateQueries({ queryKey: ['students'] });
      if (updatedUser.role === 'teacher') queryClient.invalidateQueries({ queryKey: ['teachers'] });
      if (updatedUser.role === 'parent') queryClient.invalidateQueries({ queryKey: ['parents'] });
      if (updatedUser.role === 'admin') queryClient.invalidateQueries({ queryKey: ['admins'] });
      queryClient.invalidateQueries({ queryKey: ['activeProfilesForDevSelector'] });
      onClose(); // Close the modal
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

  // Effect to initialize form state when modal opens or userToEdit changes
  useEffect(() => {
    console.log(
      `[EditUserModal useEffect] Running. Visible: ${visible}, User Loaded: ${isSuccessUserToEdit}, User Data:`,
      userToEdit
    );

    if (visible && userToEdit) {
      // Use the fetched userToEdit
      console.log('[EditUserModal useEffect] Setting form state...');
      setFirstName(userToEdit.firstName);
      setLastName(userToEdit.lastName);
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
        console.log('[EditUserModal useEffect] Clearing student selections (not student role).');
        setSelectedInstrumentIds([]);
        setSelectedTeacherIds([]);
      }
      mutation.reset();
    } else if (!visible) {
      // Clear state when modal closes
      setFirstName('');
      setLastName('');
      setNickname('');
      setSelectedInstrumentIds([]);
      setSelectedTeacherIds([]);
    }
  }, [visible, userToEdit, isSuccessUserToEdit]); // Depend on fetched userToEdit

  // Handlers for selection toggles
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

  // Handle save button press
  const handleSaveChanges = () => {
    if (!userToEdit) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'User data not loaded.' });
      return;
    }

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

    // Check for changes in basic fields
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

    // Check for changes in student-specific link tables
    if (userToEdit.role === 'student') {
      const initialInstrumentIds = (userToEdit.instrumentIds || []).sort();
      const currentInstrumentIds = [...selectedInstrumentIds].sort();
      if (JSON.stringify(currentInstrumentIds) !== JSON.stringify(initialInstrumentIds)) {
        updates.instrumentIds = selectedInstrumentIds; // Include changed instruments
        hasChanges = true;
        console.log('[EditUserModal] Instrument links changed.');
      }

      const initialTeacherIds = (userToEdit.linkedTeacherIds || []).sort();
      const currentTeacherIds = [...selectedTeacherIds].sort();
      if (JSON.stringify(currentTeacherIds) !== JSON.stringify(initialTeacherIds)) {
        updates.linkedTeacherIds = selectedTeacherIds; // Include changed teachers
        hasChanges = true;
        console.log('[EditUserModal] Teacher links changed.');
      }
    }

    if (!hasChanges) {
      console.log('[EditUserModal] No changes detected.');
      onClose();
      return;
    }

    // --- REMOVED Deferred Logic Warning ---
    // The API/Edge function now handles links

    console.log('[EditUserModal] Calling mutation with updates:', updates);
    mutation.mutate({ userId: userToEdit.id, updates });
  };

  // Determine if save should be disabled
  const isSaveDisabled =
    mutation.isPending ||
    isLoadingUserToEdit ||
    !firstName.trim() ||
    !lastName.trim() ||
    (isStudentRole && (isLoadingInstruments || isLoadingTeachers));

  // Handle loading state for the user being edited
  if (visible && isLoadingUserToEdit) {
    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalSharedStyles.centeredView}>
          <View style={modalSharedStyles.modalView}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={modalSharedStyles.loadingText}>Loading user data...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  // If the modal is visible but userToEdit (fetched data) is null/undefined, handle close
  if (visible && !userToEdit) {
    useEffect(() => {
      if (visible && !isLoadingUserToEdit && !userToEdit) {
        console.error(
          '[EditUserModal] Modal visible but user data failed to load after fetch attempt.'
        );
        Toast.show({ type: 'error', text1: 'Error', text2: 'Could not load user details.' });
        onClose(); // Auto-close if fetch failed
      }
    }, [visible, isLoadingUserToEdit, userToEdit, onClose]);
    return null; // Render nothing while closing
  }

  // Ensure userToEdit is loaded before proceeding
  if (!userToEdit) {
    return null;
  }

  // Prevent rendering Parent edit UI for now (can be enabled later if needed)
  if (userToEdit.role === 'parent') {
    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalSharedStyles.centeredView}>
          <View style={modalSharedStyles.modalView}>
            <Text style={modalSharedStyles.modalTitle}>Edit User</Text>
            <Text style={commonSharedStyles.errorText}>
              Editing Parent details is not fully supported via this modal yet.
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

  // --- JSX Rendering ---
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Edit User: {currentUserDisplayName}</Text>
          <Text style={modalSharedStyles.subTitle}>
            Role: {userToEdit.role.toUpperCase()} (ID: {userToEdit.id})
          </Text>

          <ScrollView style={modalSharedStyles.scrollView}>
            {/* Basic Info Fields */}
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

            {/* Student Specific Fields */}
            {isStudentRole && (
              <>
                {/* Instruments Section */}
                <View style={modalSharedStyles.roleSpecificSection}>
                  <Text style={modalSharedStyles.roleSectionTitle}>Instruments</Text>
                  {isLoadingInstruments && <ActivityIndicator color={colors.primary} />}
                  {isErrorInstruments && (
                    <Text style={commonSharedStyles.errorText}>
                      Error loading instruments: {errorInstrumentsMsg?.message}
                    </Text>
                  )}
                  {!isLoadingInstruments && !isErrorInstruments && (
                    <View style={commonSharedStyles.selectionContainer}>
                      {instruments.length > 0 ? (
                        instruments.map(inst => {
                          const isSelected = selectedInstrumentIds.includes(inst.id);
                          return (
                            <Button
                              key={inst.id}
                              title={inst.name}
                              onPress={() => toggleInstrumentSelection(inst.id)}
                              color={isSelected ? colors.success : colors.secondary}
                              disabled={mutation.isPending}
                            />
                          );
                        })
                      ) : (
                        <Text style={appSharedStyles.emptyListText}>No instruments available.</Text>
                      )}
                    </View>
                  )}
                  {/* Removed deferred message */}
                </View>

                {/* Teachers Section */}
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
                        activeTeachers.map(teacher => {
                          const isSelected = selectedTeacherIds.includes(teacher.id);
                          return (
                            <Button
                              key={teacher.id}
                              title={getUserDisplayName(teacher)}
                              onPress={() => toggleTeacherSelection(teacher.id)}
                              color={isSelected ? colors.success : colors.secondary}
                              disabled={mutation.isPending}
                            />
                          );
                        })
                      ) : (
                        <Text style={appSharedStyles.emptyListText}>No active teachers found.</Text>
                      )}
                    </View>
                  )}
                  {/* Removed deferred message */}
                </View>
              </>
            )}
          </ScrollView>

          {/* Mutation Status */}
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

          {/* Action Buttons */}
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
    // Keep this style if used elsewhere, otherwise remove
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
});

export default EditUserModal;
