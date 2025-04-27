// src/components/admin/modals/CreateUserModal.tsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ScrollView, ActivityIndicator, StyleSheet } from 'react-native'; // Added StyleSheet

// API Imports (fetch using Supabase, createUser is deferred)
import { createUser, fetchTeachers } from '../../../api/users'; // createUser throws error now
import { fetchInstruments } from '../../../api/instruments'; // Uses Supabase

// Style Imports
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { colors } from '../../../styles/colors';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';

// Type Imports
import { CreateUserModalProps } from '../../../types/componentProps';
import { UserRole, User, Instrument } from '../../../types/dataTypes'; // Need Instrument
import { getUserDisplayName } from '../../../utils/helpers';
import Toast from 'react-native-toast-message';

const CREATABLE_ROLES: UserRole[] = ['admin', 'teacher', 'student']; // Keep parent out for now

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  visible,
  onClose,
  // instruments prop is removed, fetched internally now
}) => {
  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  const queryClient = useQueryClient();

  // --- Data Fetching ---
  // Fetch Instruments (needed for student role selection)
  const {
    data: instruments = [],
    isLoading: isLoadingInstruments,
    isError: isErrorInstruments,
    error: errorInstruments,
  } = useQuery<Instrument[], Error>({
      queryKey: ['instruments'],
      queryFn: fetchInstruments,
      staleTime: Infinity, // Instruments don't change often
      enabled: visible && role === 'student', // Fetch only when needed
  });

  // Fetch Active Teachers (needed for student role selection)
  const {
    data: activeTeachers = [], // Renamed for clarity
    isLoading: isLoadingTeachers,
    isError: isErrorTeachers,
    error: errorTeachers,
  } = useQuery<User[], Error>({
    queryKey: ['teachers', { status: 'active', context: 'createUserModal' }],
    queryFn: async () => {
      // Fetch only active teachers
      const result = await fetchTeachers({ page: 1, limit: 1000 }); // Fetch all active
      return (result?.items || []).filter(t => t.status === 'active');
    },
    enabled: visible && role === 'student', // Fetch only when needed
    staleTime: 5 * 60 * 1000,
  });
  // --- End Data Fetching ---


  // --- Mutation (Points to deferred API) ---
  // We keep the mutation setup for consistency but disable calling mutate()
  const mutation = useMutation({
    mutationFn: createUser, // This will throw an error if called
    onSuccess: (createdUser) => {
        // This won't be reached with current createUser implementation
        console.log('[CreateUserModal] User created (Simulated):', createdUser);
        // Invalidate relevant user lists
        if (createdUser.role === 'student') queryClient.invalidateQueries({ queryKey: ['students'] });
        if (createdUser.role === 'teacher') queryClient.invalidateQueries({ queryKey: ['teachers'] });
        if (createdUser.role === 'admin') queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); // Or specific admin key
        onClose();
        Toast.show({ type: 'success', text1: 'Success', text2: 'User creation simulated.' });
    },
    onError: (error) => {
      // This *will* be reached immediately because createUser throws
      console.error('[CreateUserModal] Error creating user:', error);
      Toast.show({
        type: 'error',
        text1: 'Creation Not Implemented', // More specific error
        text2: error instanceof Error ? error.message : 'Could not create user.',
        position: 'bottom',
        visibilityTime: 5000,
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
      setSelectedInstrumentIds([]);
      setSelectedTeacherIds([]);
      mutation.reset();
    }
  }, [visible]);


  // --- Event Handlers ---
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

  // Handle Create Button Press - NOW SHOWS INFO/ERROR
  const handleCreatePress = () => {
    if (!firstName.trim() || !lastName.trim() || !role) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill in First Name, Last Name, and select a Role.' });
      return;
    }

    // Prepare data structure (even though API is deferred)
    const newUserPartial: Omit<User, 'id' | 'status'> = {
      role: role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      // Only include student-specific fields if role is student
      ...(role === 'student' && {
        instrumentIds: selectedInstrumentIds.length > 0 ? selectedInstrumentIds : undefined,
        linkedTeacherIds: selectedTeacherIds.length > 0 ? selectedTeacherIds : undefined,
      }),
    };

    // --- DEFERRED ACTION ---
    Toast.show({
        type: 'info',
        text1: 'Feature Not Implemented',
        text2: 'User creation requires server-side logic (Edge Function).',
        visibilityTime: 5000,
    });
     console.warn("[CreateUserModal] Attempted user creation, but API implementation is deferred.", newUserPartial);
    // mutation.mutate(newUserPartial); // DO NOT CALL MUTATE YET
    // --- END DEFERRED ACTION ---

     // Optionally call the mutation just to trigger the onError handler immediately:
     // try {
     //     mutation.mutate(newUserPartial);
     // } catch (e) {
     //     // Error is already handled by mutation's onError
     // }
  };


  // --- Render Logic ---
  // Determine if create button should be disabled (always disabled for now)
  const isCreateDisabled = true; // Always disable as API is deferred
  // const isCreateDisabled = mutation.isPending || !role || !firstName.trim() || !lastName.trim() || (role === 'student' && (isLoadingInstruments || isLoadingTeachers));


  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Create New User</Text>

          <ScrollView style={modalSharedStyles.scrollView}>
            {/* Basic Info */}
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

            {/* Role Selection */}
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

            {/* Student Specific Fields (Conditional) */}
            {role === 'student' && (
              <View style={modalSharedStyles.modalSubSection}>
                <Text style={modalSharedStyles.roleSectionTitle}>Student Details (Optional)</Text>

                {/* Instrument Selection */}
                <Text style={commonSharedStyles.label}>Instruments:</Text>
                {isLoadingInstruments && <ActivityIndicator color={colors.primary} />}
                {isErrorInstruments && <Text style={commonSharedStyles.errorText}>Error loading instruments.</Text>}
                {!isLoadingInstruments && !isErrorInstruments && (
                    <View style={commonSharedStyles.selectionContainer}>
                      {instruments.length > 0 ? (
                        instruments.map(inst => (
                          <Button
                            key={inst.id}
                            title={inst.name}
                            onPress={() => toggleInstrumentSelection(inst.id)}
                            color={selectedInstrumentIds.includes(inst.id) ? colors.success : colors.secondary}
                            disabled={mutation.isPending}
                          />
                        ))
                      ) : (
                        <Text style={appSharedStyles.emptyListText}>No instruments available.</Text>
                      )}
                    </View>
                )}


                {/* Teacher Selection */}
                <Text style={[commonSharedStyles.label, { marginTop: 15 }]}>Link Teachers:</Text>
                 {isLoadingTeachers && <ActivityIndicator color={colors.primary} />}
                 {isErrorTeachers && <Text style={commonSharedStyles.errorText}>Error loading teachers.</Text>}
                 {!isLoadingTeachers && !isErrorTeachers && (
                    <View style={commonSharedStyles.selectionContainer}>
                      {activeTeachers.length > 0 ? (
                        activeTeachers.map(teacher => (
                          <Button
                            key={teacher.id}
                            title={getUserDisplayName(teacher)}
                            onPress={() => toggleTeacherSelection(teacher.id)}
                            color={selectedTeacherIds.includes(teacher.id) ? colors.success : colors.secondary}
                            disabled={mutation.isPending}
                          />
                        ))
                      ) : (
                        <Text style={appSharedStyles.emptyListText}>No active teachers available.</Text>
                      ))}
                    </View>
                 )}
              </View>
            )}
          </ScrollView>

          {/* Info Message about Deferred API */}
           <Text style={styles.infoText}>
                Note: User creation requires server-side setup (Edge Function) and is currently disabled in this view.
            </Text>

          {/* Loading/Error (Mutation state might not be relevant now) */}
          {/* {mutation.isPending && ... } */}
          {/* {mutation.isError && ... } */}


          {/* Action Buttons */}
          <View style={modalSharedStyles.buttonContainer}>
            <Button
              title={"Create User (Disabled)"} // Update text
              onPress={handleCreatePress} // Still calls validation and shows info toast
              disabled={isCreateDisabled} // Always disabled
            />
          </View>
          <View style={modalSharedStyles.footerButton}>
            <Button
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={mutation.isPending} // Keep potentially disabling cancel
            />
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
        justifyContent: 'space-around', // Space out role buttons
        marginBottom: 20,
        flexWrap: 'wrap', // Allow wrapping on small screens
        gap: 10,
    },
    infoText: {
        fontSize: 13,
        color: colors.textLight,
        textAlign: 'center',
        marginVertical: 10,
        fontStyle: 'italic',
        paddingHorizontal: 10,
    }
});

export default CreateUserModal;