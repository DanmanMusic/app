import React, { useState, useEffect } from 'react';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { UserRole, User } from '../../../types/userTypes';
import { Instrument } from '../../../mocks/mockInstruments';
import { createUser } from '../../../api/users';

import { colors } from '../../../styles/colors';
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { getUserDisplayName } from '../../../utils/helpers';

const CREATABLE_ROLES: UserRole[] = ['admin', 'teacher', 'student'];

interface CreateUserModalProps {
  visible: boolean;
  onClose: () => void;
  allTeachers: User[]; // Active teachers list
  mockInstruments: Instrument[]; // Instruments list
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  visible,
  onClose,
  allTeachers,
  mockInstruments,
}) => {
  // State for user fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  // --- State for selections ---
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  const queryClient = useQueryClient();

  // Mutation hook for creating user
  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: createdUser => {
      console.log('User created successfully via mutation:', createdUser);
      // Invalidate relevant queries based on created user role
      if (createdUser.role === 'student') {
        queryClient.invalidateQueries({ queryKey: ['students'] });
      } else if (createdUser.role === 'teacher') {
        queryClient.invalidateQueries({ queryKey: ['teachers'] });
      } // Add invalidation for 'admin' if needed elsewhere
      onClose(); // Close modal on success
    },
    onError: error => {
      console.error('Error creating user via mutation:', error);
      Alert.alert('Error', `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Effect to reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setFirstName('');
      setLastName('');
      setRole('');
      setSelectedInstrumentIds([]); // Reset selections
      setSelectedTeacherIds([]);   // Reset selections
      mutation.reset();
    }
  }, [visible]);

  // --- Handlers for Selections ---
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
  // --- End Handlers ---

  // Handler for the create button press
  const handleCreatePress = () => {
    // Basic validation
    if (!firstName.trim() || !lastName.trim() || !role) {
      Alert.alert('Validation Error', 'Please enter First Name, Last Name, and select a Role.');
      return;
    }

    // Prepare the data payload
    const newUserPartial: Omit<User, 'id' | 'status'> = {
      role: role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      // Conditionally include student-specific fields IF role is student
      ...(role === 'student' && {
        instrumentIds: selectedInstrumentIds.length > 0 ? selectedInstrumentIds : undefined,
        linkedTeacherIds: selectedTeacherIds.length > 0 ? selectedTeacherIds : undefined,
      }),
    };

    console.log('[CreateUserModal] Sending user data:', JSON.stringify(newUserPartial)); // Log data being sent
    // Trigger the mutation
    mutation.mutate(newUserPartial);
  };


  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Create New User</Text>

          <ScrollView style={modalStyles.scrollView}>
            {/* Basic Info */}
            <Text style={modalStyles.label}>First Name:</Text>
            <TextInput style={modalStyles.input} placeholder="Enter First Name" placeholderTextColor={colors.textLight} value={firstName} onChangeText={setFirstName} editable={!mutation.isPending} />
            <Text style={modalStyles.label}>Last Name:</Text>
            <TextInput style={modalStyles.input} placeholder="Enter Last Name" placeholderTextColor={colors.textLight} value={lastName} onChangeText={setLastName} editable={!mutation.isPending} />

            {/* Role Selection */}
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

            {/* Student Specific Section */}
            {role === 'student' && (
              <View style={modalStyles.roleSpecificSection}>
                <Text style={modalStyles.roleSectionTitle}>Student Details (Optional)</Text>

                {/* Instrument Selection */}
                <Text style={modalStyles.label}>Instruments:</Text>
                <View style={modalStyles.selectionContainer}>
                  {mockInstruments.length > 0 ? (
                    mockInstruments.map(inst => (
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

                {/* Teacher Selection */}
                <Text style={[modalStyles.label, { marginTop: 15 }]}>Link Teachers:</Text>
                 <View style={modalStyles.selectionContainer}>
                   {allTeachers.length > 0 ? (
                     allTeachers.filter(t => t.status === 'active').map(teacher => ( // Only show active teachers
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
                   )}
                </View>

              </View>
            )}
          </ScrollView>

          {/* Loading/Error Indicators */}
          {mutation.isPending && (
            <View style={modalStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalStyles.loadingText}>Creating User...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={modalStyles.errorText}>
              Error: {mutation.error instanceof Error ? mutation.error.message : 'Failed to create user'}
            </Text>
          )}

          {/* Action Buttons */}
          <View style={modalStyles.buttonContainer}>
            <Button title="Create User" onPress={handleCreatePress} disabled={mutation.isPending || !role || !firstName || !lastName} />
          </View>
          <View style={modalStyles.footerButton}>
            <Button title="Cancel" onPress={onClose} color={colors.secondary} disabled={mutation.isPending} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Styles (cleaned up)
const modalStyles = StyleSheet.create({
  centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalView: { margin: 20, backgroundColor: colors.backgroundPrimary, borderRadius: 10, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '95%', maxWidth: 500, maxHeight: '90%' },
  scrollView: { width: '100%', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: colors.textPrimary, width: '100%', borderBottomWidth: 1, borderBottomColor: colors.borderPrimary, paddingBottom: 10 },
  label: { fontSize: 14, fontWeight: 'bold', marginTop: 10, marginBottom: 5, color: colors.textPrimary, alignSelf: 'flex-start' },
  input: { width: '100%', borderWidth: 1, borderColor: colors.borderPrimary, borderRadius: 5, padding: 10, fontSize: 16, color: colors.textPrimary, backgroundColor: colors.backgroundPrimary, marginBottom: 5 },
  roleButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10, marginBottom: 15 },
  roleSpecificSection: { marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: colors.borderPrimary, width: '100%' },
  roleSectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: colors.textSecondary, textAlign: 'center' },
  selectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 10,
  },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 5 },
  loadingText: { marginLeft: 10, fontSize: 14, color: colors.textSecondary },
  errorText: { color: colors.danger, textAlign: 'center', marginTop: 10, marginBottom: 5, fontSize: 14 },
  buttonContainer: { flexDirection: 'column', width: '100%', marginTop: 10, gap: 10 },
  footerButton: { width: '100%', marginTop: 10 },
});

export default CreateUserModal;