// src/components/common/EditUserModal.tsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';

import { updateUser, fetchTeachers, fetchUserProfile } from '../../api/users';
import { fetchInstruments } from '../../api/instruments';

import { useAuth } from '../../contexts/AuthContext'; // Import useAuth
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
  const { currentUserRole } = useAuth(); // Get the logged-in user's role
  const isCallerAdmin = currentUserRole === 'admin'; // Check if the caller is admin

  // State for form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const userIdToEdit = userToEditProp?.id;

  // Fetch the LATEST user profile data when modal opens or user ID changes
  const {
    data: userToEdit,
    isLoading: isLoadingUserToEdit,
    isSuccess: isSuccessUserToEdit,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', userIdToEdit, { context: 'editUserModalFetch' }],
    queryFn: () => (userIdToEdit ? fetchUserProfile(userIdToEdit) : Promise.resolve(null)),
    enabled: visible && !!userIdToEdit, // Fetch only when modal is visible and user ID exists
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // Determine if the user being edited is a student
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

  // Mutation hook for updating the user
  const mutation = useMutation({
    mutationFn: updateUser, // Calls the API function which now calls the Edge Function
    onSuccess: updatedUser => {
      console.log('[EditUserModal] User update successful:', updatedUser);
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['userProfile', updatedUser.id] });
      if (updatedUser.role === 'student') queryClient.invalidateQueries({ queryKey: ['students'] });
      if (updatedUser.role === 'teacher') queryClient.invalidateQueries({ queryKey: ['teachers'] });
      if (updatedUser.role === 'parent') queryClient.invalidateQueries({ queryKey: ['parents'] });
      if (updatedUser.role === 'admin') queryClient.invalidateQueries({ queryKey: ['admins'] });
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

  // Effect to initialize form state based on the fetched user data
  useEffect(() => {
    console.log(
      `[EditUserModal useEffect] Running. Visible: ${visible}, User Loaded: ${isSuccessUserToEdit}, User Data:`,
      userToEdit
    );
    if (visible && userToEdit) {
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
        setSelectedInstrumentIds([]);
        setSelectedTeacherIds([]);
      }
      mutation.reset(); // Reset mutation state when opening
    } else if (!visible) {
      // Clear state when modal closes
      setFirstName('');
      setLastName('');
      setNickname('');
      setSelectedInstrumentIds([]);
      setSelectedTeacherIds([]);
    }
  }, [visible, userToEdit, isSuccessUserToEdit]); // Depend on visibility and fetched user data

  // Handlers for selection toggles
  const toggleInstrumentSelection = (id: string) => {
    setSelectedInstrumentIds(prev =>
      prev.includes(id) ? prev.filter(instrumentId => instrumentId !== id) : [...prev, id]
    );
  };
  const toggleTeacherSelection = (id: string) => {
    // Only allow admins to change teacher selection
    if (!isCallerAdmin) {
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
    let hasProfileChanges = false;
    let hasLinkChanges = false;

    // Check for changes in basic fields
    if (trimmedFirstName !== userToEdit.firstName) {
      updates.firstName = trimmedFirstName;
      hasProfileChanges = true;
    }
    if (trimmedLastName !== userToEdit.lastName) {
      updates.lastName = trimmedLastName;
      hasProfileChanges = true;
    }
    if (trimmedNickname !== (userToEdit.nickname || '')) {
      updates.nickname = trimmedNickname || undefined;
      hasProfileChanges = true;
    }

    // Check for changes in student-specific link tables
    if (userToEdit.role === 'student') {
      const initialInstrumentIds = (userToEdit.instrumentIds || []).sort();
      const currentInstrumentIds = [...selectedInstrumentIds].sort();
      if (JSON.stringify(currentInstrumentIds) !== JSON.stringify(initialInstrumentIds)) {
        hasLinkChanges = true;
      }
      // Always include instruments payload for students (EF handles sync)
      updates.instrumentIds = selectedInstrumentIds;

      const initialTeacherIds = (userToEdit.linkedTeacherIds || []).sort();
      const currentTeacherIds = [...selectedTeacherIds].sort();
      if (JSON.stringify(currentTeacherIds) !== JSON.stringify(initialTeacherIds)) {
        hasLinkChanges = true;
      }
      // Always include teachers payload (EF handles authorization)
      updates.linkedTeacherIds = selectedTeacherIds;
    }

    if (!hasProfileChanges && !hasLinkChanges) {
      console.log('[EditUserModal] No changes detected.');
      onClose();
      return;
    }

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
        <View style={commonSharedStyles.centeredView}>
          <View style={commonSharedStyles.modalView}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={commonSharedStyles.baseSecondaryText}>Loading user data...</Text>
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

  if (!userToEdit) {
    return null;
  }

  const currentUserDisplayName = getUserDisplayName(userToEdit);

  // --- JSX Rendering ---
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Edit User: {currentUserDisplayName}</Text>
          <Text style={commonSharedStyles.modalSubTitle}>
            Role: {userToEdit.role.toUpperCase()} (ID: {userToEdit.id})
          </Text>

          <ScrollView style={commonSharedStyles.modalScrollView}>
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
                              disabled={mutation.isPending}
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

                {/* Teachers Section (Teachers CANNOT edit this) */}
                <View style={commonSharedStyles.roleSpecificSection}>
                  <Text style={commonSharedStyles.roleSectionTitle}>Linked Teachers</Text>
                  {!isCallerAdmin && (
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
                              onPress={() => toggleTeacherSelection(teacher.id)} // Press handled by toggle function
                              color={isSelected ? colors.success : colors.secondary}
                              // Disable button interaction if not admin
                              disabled={mutation.isPending || !isCallerAdmin}
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

          {/* Mutation Status */}
          {mutation.isPending && (
            <View style={commonSharedStyles.baseRowCentered}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={commonSharedStyles.baseSecondaryText}>Saving Changes...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:{' '}
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to save changes'}
            </Text>
          )}

          {/* Action Buttons */}
          <View style={commonSharedStyles.full}>
            <Button
              title={mutation.isPending ? 'Saving...' : 'Save Changes'}
              onPress={handleSaveChanges}
              disabled={isSaveDisabled}
            />
          </View>
          <View style={[commonSharedStyles.full, { marginTop: 10 }]}>
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
