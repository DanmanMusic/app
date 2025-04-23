// src/components/admin/modals/CreateUserModal.tsx

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Button, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native'; // Added ActivityIndicator, Alert
import { useMutation, useQueryClient } from '@tanstack/react-query'; // Added TQ imports

// Types & API
import { UserRole, User } from '../../../types/userTypes';
import { Instrument } from '../../../mocks/mockInstruments';
import { createUser } from '../../../api/users'; // Import the API function

// Utils & Styles
import { colors } from '../../../styles/colors';
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { getUserDisplayName } from '../../../utils/helpers';

const CREATABLE_ROLES: UserRole[] = ['admin', 'teacher', 'student'];

interface CreateUserModalProps {
  visible: boolean;
  onClose: () => void;
  // Removed: onCreateUser: (userData: Omit<User, 'id'>) => void;
  allTeachers: User[]; // Still needed for teacher linking UI
  mockInstruments: Instrument[]; // Still needed for instrument linking UI
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  visible,
  onClose,
  // onCreateUser, // Removed
  allTeachers,
  mockInstruments,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [instrumentIds, setInstrumentIds] = useState<string[]>([]);
  const [linkedTeacherIds, setLinkedTeacherIds] = useState<string[]>([]);

  // Get QueryClient instance
  const queryClient = useQueryClient();

  // Setup the mutation
  const mutation = useMutation({
    mutationFn: createUser, // Function that performs the async task
    onSuccess: (createdUser) => { // 'createdUser' is the data returned by the API on success
      console.log('User created successfully via mutation:', createdUser);
      // Invalidate queries to refetch data after successful creation
      // Invalidate based on the role created
      if (createdUser.role === 'student') {
        queryClient.invalidateQueries({ queryKey: ['students'] });
      } else if (createdUser.role === 'teacher') {
        queryClient.invalidateQueries({ queryKey: ['teachers'] });
      }
      onClose(); // Close the modal
    },
    onError: (error) => {
      console.error('Error creating user via mutation:', error);
    },
  });

  // Reset form state when modal visibility changes
  useEffect(() => {
    if (visible) {
      setFirstName('');
      setLastName('');
      setRole('');
      setInstrumentIds([]);
      setLinkedTeacherIds([]);
      mutation.reset(); // Reset mutation state (isLoading, isError, etc.)
    }
  }, [visible]);

  const handleCreatePress = () => {
    if (!firstName.trim() || !lastName.trim() || !role) {
      return;
    }

    const newUserPartial: Omit<User, 'id' | 'status'> = {
      role: role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      // Only include role-specific fields if they exist
      ...(role === 'student' && {
        instrumentIds: instrumentIds.length > 0 ? instrumentIds : undefined,
        linkedTeacherIds: linkedTeacherIds.length > 0 ? linkedTeacherIds : undefined,
      }),
      // Nickname could be added here if needed
    };

    // Trigger the mutation
    mutation.mutate(newUserPartial);
  };

  // Handlers for mock instrument/teacher linking (keep as is for now)
  const handleAddInstrument = () => { alert('Mock Add Instrument ID'); };
  const handleRemoveInstrument = (idToRemove: string) => { setInstrumentIds(prev => prev.filter(id => id !== idToRemove)); };
  const handleAddLinkedTeacher = () => { alert('Mock Link Teacher ID'); };
  const handleRemoveLinkedTeacher = (idToRemove: string) => { setLinkedTeacherIds(prev => prev.filter(id => id !== idToRemove)); };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Create New User</Text>

          <ScrollView style={modalStyles.scrollView}>
            <Text style={modalStyles.label}>First Name:</Text>
            <TextInput
              style={modalStyles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter First Name"
              placeholderTextColor={colors.textLight}
              editable={!mutation.isPending} // Disable input while loading
            />

            <Text style={modalStyles.label}>Last Name:</Text>
            <TextInput
              style={modalStyles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter Last Name"
              placeholderTextColor={colors.textLight}
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
                  disabled={mutation.isPending} // Disable role selection while loading
                />
              ))}
            </View>

            {role === 'student' && (
              <View style={modalStyles.roleSpecificSection}>
                <Text style={modalStyles.roleSectionTitle}>Student Details (Optional)</Text>

                <Text style={modalStyles.label}>Instrument IDs:</Text>
                {instrumentIds.length > 0 ? (
                  instrumentIds.map(id => (
                    <View key={id} style={modalStyles.linkedItemRow}>
                      <Text style={modalStyles.linkedItemText}>
                        {mockInstruments.find(inst => inst.id === id)?.name || id}
                      </Text>
                      <Button
                        title="Remove"
                        onPress={() => handleRemoveInstrument(id)}
                        color={colors.danger}
                        disabled={mutation.isPending}
                      />
                    </View>
                  ))
                ) : (
                  <Text style={appSharedStyles.emptyListText}>No instruments selected.</Text>
                )}
                <Button title="Add Instrument (Mock)" onPress={handleAddInstrument} disabled={mutation.isPending}/>

                <Text style={[modalStyles.label, { marginTop: 15 }]}>Linked Teacher IDs:</Text>
                {linkedTeacherIds.length > 0 ? (
                  linkedTeacherIds.map(id => {
                    const teacher = allTeachers.find(t => t.id === id);
                    return (
                      <View key={id} style={modalStyles.linkedItemRow}>
                        <Text style={modalStyles.linkedItemText}>
                          {teacher ? getUserDisplayName(teacher) : id}
                        </Text>
                        <Button
                          title="Remove"
                          onPress={() => handleRemoveLinkedTeacher(id)}
                          color={colors.danger}
                          disabled={mutation.isPending}
                        />
                      </View>
                    );
                  })
                ) : (
                  <Text style={appSharedStyles.emptyListText}>No teachers linked.</Text>
                )}
                <Button title="Link Teacher (Mock)" onPress={handleAddLinkedTeacher} disabled={mutation.isPending}/>
              </View>
            )}
          </ScrollView>

          {/* Display loading indicator */}
          {mutation.isPending && (
             <View style={modalStyles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={modalStyles.loadingText}>Creating User...</Text>
            </View>
          )}

          {/* Display error message (optional) */}
          {mutation.isError && (
            <Text style={modalStyles.errorText}>
                Error: {mutation.error instanceof Error ? mutation.error.message : 'Failed to create user'}
            </Text>
          )}

          <View style={modalStyles.buttonContainer}>
            {/* Disable button while mutation is pending */}
            <Button title="Create User" onPress={handleCreatePress} disabled={mutation.isPending} />
          </View>
          <View style={modalStyles.footerButton}>
            <Button title="Cancel" onPress={onClose} color={colors.secondary} disabled={mutation.isPending} />
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
    maxHeight: '80%', // Adjusted maxHeight slightly
  },
  scrollView: {
    width: '100%',
    marginBottom: 15,
  },
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
  linkedItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: colors.backgroundGrey,
    borderRadius: 4,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  linkedItemText: {
    flex: 1,
    marginRight: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
      marginBottom: 5,
  },
  loadingText: {
      marginLeft: 10,
      fontSize: 14,
      color: colors.textSecondary,
  },
   errorText: {
      color: colors.danger,
      textAlign: 'center',
      marginTop: 10,
      marginBottom: 5,
      fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'column',
    width: '100%',
    marginTop: 10,
    gap: 10,
  },
  footerButton: {
    width: '100%',
    marginTop: 10,
  },
});

export default CreateUserModal;