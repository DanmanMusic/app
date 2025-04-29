// src/components/admin/modals/CreateUserModal.tsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';

// API Imports
import { createUser, fetchTeachers } from '../../../api/users';
import { fetchInstruments } from '../../../api/instruments';

// Style Imports
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { colors } from '../../../styles/colors';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';

// Type Imports
import { UserRole, User, Instrument } from '../../../types/dataTypes';
import { getUserDisplayName } from '../../../utils/helpers';
import Toast from 'react-native-toast-message';

const CREATABLE_ROLES: UserRole[] = ['admin', 'teacher', 'student'];

// Interface for the props this component accepts
interface InternalCreateUserModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CreateUserModal: React.FC<InternalCreateUserModalProps> = ({
  visible,
  onClose,
}) => {
  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [nickname, setNickname] = useState('');
  // PIN state removed
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const isStudentRoleSelected = role === 'student';

  // --- Data Fetching (Conditional based on role) ---
  const {
    data: instruments = [],
    isLoading: isLoadingInstruments,
    isError: isErrorInstruments,
    error: errorInstrumentsMsg,
  } = useQuery<Instrument[], Error>({
      queryKey: ['instruments'],
      queryFn: fetchInstruments,
      staleTime: Infinity,
      enabled: visible && isStudentRoleSelected, // Fetch only when needed
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
    enabled: visible && isStudentRoleSelected, // Fetch only when needed
    staleTime: 5 * 60 * 1000,
  });
  // --- End Data Fetching ---


  // --- Mutation (Calls Edge Function via API) ---
  const mutation = useMutation({
    mutationFn: createUser, // Uses the API function that calls the Edge Function
    onSuccess: (createdUser) => {
        console.log('[CreateUserModal] User created successfully:', createdUser);
        // Invalidate relevant user lists based on role
        const userRole = createdUser.role;
        if (userRole === 'student') queryClient.invalidateQueries({ queryKey: ['students'] });
        if (userRole === 'teacher') queryClient.invalidateQueries({ queryKey: ['teachers'] });
        if (userRole === 'admin') queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); // Or specific admin key
        // Also invalidate dev selector query if it exists
        queryClient.invalidateQueries({ queryKey: ['activeProfilesForDevSelector'] });
        onClose(); // Close modal on success
        Toast.show({ type: 'success', text1: 'Success', text2: `User "${getUserDisplayName(createdUser)}" created.` });
    },
    onError: (error: Error) => {
      console.error('[CreateUserModal] Error creating user:', error);
      Toast.show({
        type: 'error',
        text1: 'Creation Failed',
        // Display specific error message from the API function if available
        text2: error.message || 'Could not create user.',
        position: 'bottom',
        visibilityTime: 5000, // Show longer for potentially detailed errors
      });
    },
  });
  // --- End Mutation ---


  // Effect to reset form state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setFirstName('');
      setLastName('');
      setRole('');
      setNickname('');
      // No PIN to reset
      setSelectedInstrumentIds([]);
      setSelectedTeacherIds([]);
      mutation.reset(); // Reset mutation state (errors, loading)
    }
  }, [visible]);


  // --- Event Handlers ---
  const toggleInstrumentSelection = (id: string) => {
    setSelectedInstrumentIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  const toggleTeacherSelection = (id: string) => {
     setSelectedTeacherIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Handle Create Button Press
  const handleCreatePress = () => {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedNickname = nickname.trim();

    // Validation
    if (!trimmedFirstName || !trimmedLastName || !role) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'First Name, Last Name, and Role are required.' });
      return;
    }
    // No PIN validation

    // Prepare payload based on role - NO PIN
    // Explicitly define type for clarity before passing
    const payload: Omit<User, 'id' | 'status'> & { instrumentIds?: string[]; linkedTeacherIds?: string[] } = {
      role: role,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      nickname: trimmedNickname || undefined, // Send undefined if empty
      // Initialize student-specific fields as undefined
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
    mutation.mutate(payload); // Execute the mutation
  };


  // --- Render Logic ---
  const isStudentFieldsLoading = isStudentRoleSelected && (isLoadingInstruments || isLoadingTeachers);
  // Update disabled condition - remove PIN check
  const isCreateDisabled = mutation.isPending || !role || !firstName.trim() || !lastName.trim() || isStudentFieldsLoading;


  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Create New User</Text>

          <ScrollView style={modalSharedStyles.scrollView}>
            {/* Basic Info */}
            <Text style={commonSharedStyles.label}>First Name:</Text>
            <TextInput style={commonSharedStyles.input} placeholder="Enter First Name" placeholderTextColor={colors.textLight} value={firstName} onChangeText={setFirstName} editable={!mutation.isPending} />
            <Text style={commonSharedStyles.label}>Last Name:</Text>
            <TextInput style={commonSharedStyles.input} placeholder="Enter Last Name" placeholderTextColor={colors.textLight} value={lastName} onChangeText={setLastName} editable={!mutation.isPending} />
            <Text style={commonSharedStyles.label}>Nickname (Optional):</Text>
            <TextInput style={commonSharedStyles.input} placeholder="Enter Nickname" placeholderTextColor={colors.textLight} value={nickname} onChangeText={setNickname} editable={!mutation.isPending} />

            {/* Role Selection */}
            <Text style={commonSharedStyles.label}>Role:</Text>
            <View style={styles.roleButtonContainer}>
              {CREATABLE_ROLES.map(r => (
                <Button key={r} title={r.charAt(0).toUpperCase() + r.slice(1)} onPress={() => setRole(r)} color={role === r ? colors.primary : colors.secondary} disabled={mutation.isPending} />
              ))}
            </View>

            {/* Student Specific Fields (Conditional) - NO PIN INPUT */}
            {isStudentRoleSelected && (
              <View style={modalSharedStyles.modalSubSection}>
                <Text style={modalSharedStyles.roleSectionTitle}>Student Details (Optional)</Text>

                 {/* PIN INPUT SECTION IS REMOVED */}

                {/* Instrument Selection */}
                <Text style={commonSharedStyles.label}>Instruments:</Text>
                {isLoadingInstruments && <ActivityIndicator color={colors.primary} />}
                {isErrorInstruments && <Text style={commonSharedStyles.errorText}>Error loading instruments: {errorInstrumentsMsg?.message}</Text>}
                {!isLoadingInstruments && !isErrorInstruments && (
                    <View style={commonSharedStyles.selectionContainer}>
                      {instruments.length > 0 ? instruments.map(inst => (
                            <Button key={inst.id} title={inst.name} onPress={() => toggleInstrumentSelection(inst.id)} color={selectedInstrumentIds.includes(inst.id) ? colors.success : colors.secondary} disabled={mutation.isPending} />
                        )) : <Text style={appSharedStyles.emptyListText}>No instruments available.</Text>}
                      </View>
                )}

                {/* Teacher Selection */}
                <Text style={[commonSharedStyles.label, { marginTop: 15 }]}>Link Teachers:</Text>
                 {isLoadingTeachers && <ActivityIndicator color={colors.primary} />}
                 {isErrorTeachers && <Text style={commonSharedStyles.errorText}>Error loading teachers: {errorTeachersMsg?.message}</Text>}
                 {!isLoadingTeachers && !isErrorTeachers && (
                    <View style={commonSharedStyles.selectionContainer}>
                      {activeTeachers.length > 0 ? activeTeachers.map(teacher => (
                            <Button key={teacher.id} title={getUserDisplayName(teacher)} onPress={() => toggleTeacherSelection(teacher.id)} color={selectedTeacherIds.includes(teacher.id) ? colors.success : colors.secondary} disabled={mutation.isPending} />
                        )) : <Text style={appSharedStyles.emptyListText}>No active teachers available.</Text>}
                      </View>
                 )}
              </View>
            )}
          </ScrollView>

          {/* Loading/Error Indicators */}
          {mutation.isPending && (
            <View style={modalSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalSharedStyles.loadingText}>Creating User...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error: {mutation.error instanceof Error ? mutation.error.message : 'Failed to create user'}
            </Text>
          )}

          {/* Action Buttons */}
          <View style={modalSharedStyles.buttonContainer}>
            <Button
              title={mutation.isPending ? "Creating..." : "Create User"}
              onPress={handleCreatePress}
              disabled={isCreateDisabled}
            />
          </View>
          <View style={modalSharedStyles.footerButton}>
            <Button title="Cancel" onPress={onClose} color={colors.secondary} disabled={mutation.isPending} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Add local styles
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