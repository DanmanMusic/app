// src/components/admin/CreateUserModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Button, TextInput, Platform, ScrollView } from 'react-native';

// Import NEW user type
import { UserRole, User } from '../../types/userTypes';
import { Instrument } from '../../mocks/mockInstruments';
// No longer need SimplifiedStudent here

import { colors } from '../../styles/colors';
import { appSharedStyles } from '../../styles/appSharedStyles';
// import { adminSharedStyles } from './adminSharedStyles'; // Not strictly needed here

// Import NEW helper
import { getUserDisplayName } from '../../utils/helpers'; // Import getUserDisplayName


interface CreateUserModalProps {
  visible: boolean;
  onClose: () => void;
  // Use specific signature for the prop, matching the new User structure
  onCreateUser: (userData: Omit<User, 'id'>) => void;
  allPupils: User[]; // Expect full User objects for lookup if needed for linking validation/display
  mockInstruments: Instrument[];
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  visible,
  onClose,
  onCreateUser,
  allPupils, // Receives full User objects
  mockInstruments,
}) => {
  // State for the new name fields and other user properties
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState(''); // Optional nickname state
  const [role, setRole] = useState<UserRole | ''>(''); // Role selection state
  const [instrumentIds, setInstrumentIds] = useState<string[]>([]); // For Pupil role
  const [linkedStudentIds, setLinkedStudentIds] = useState<string[]>([]); // For Teacher/Parent roles

  // Effect to reset form state when modal visibility changes
  useEffect(() => {
    if (visible) {
      // Reset all fields when modal opens
      setFirstName('');
      setLastName('');
      setNickname('');
      setRole('');
      setInstrumentIds([]);
      setLinkedStudentIds([]);
    }
    // No action needed when modal closes from here
  }, [visible]); // Dependency array is correct

  // Handler for the "Create User" button press
  const handleCreatePress = () => {
    // Basic validation for required fields
    if (!firstName || !lastName || !role) {
       alert('Missing Information - Please enter First Name, Last Name, and select a Role.');
      return;
    }

    // Construct the new user data object based on the new structure
    const newUserPartial: Omit<User, 'id'> = {
      role: role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      // Only include nickname if it's not empty (after trimming)
      ...(nickname.trim() && { nickname: nickname.trim() }),
      // Conditionally add role-specific properties
      ...(role === 'pupil' && { instrumentIds: instrumentIds }),
      ...((role === 'teacher' || role === 'parent') && { linkedStudentIds: linkedStudentIds }),
    };

    // Call the onCreateUser prop passed from AdminView (which calls the one from App.tsx)
    onCreateUser(newUserPartial);
    // Note: Closing the modal is handled by the wrapper function in AdminView
  };

  // Mock handler for adding instruments (using simple alert for now)
  const handleAddInstrument = () => {
     alert('Mock Add Instrument ID');
    // Could use Alert.prompt or a selection modal later
  };

  // Handler for removing an instrument ID
  const handleRemoveInstrument = (idToRemove: string) => {
      setInstrumentIds(prev => prev.filter(id => id !== idToRemove));
  };


  // Mock handler for linking students (using simple alert for now)
   const handleAddLinkedStudent = () => {
      alert('Mock Link Student ID');
    // Could use Alert.prompt or a selection modal later
   };

   // Handler for removing a linked student ID
    const handleRemoveLinkedStudent = (idToRemove: string) => {
       setLinkedStudentIds(prev => prev.filter(id => id !== idToRemove));
    };


  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose} // Allow closing via system back/escape
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Create New User (Mock)</Text>

          <ScrollView style={modalStyles.scrollView}>
            {/* Input fields for the new name structure */}
            <Text style={modalStyles.label}>First Name:</Text>
            <TextInput
              style={modalStyles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter First Name"
              placeholderTextColor={colors.textLight}
            />

            <Text style={modalStyles.label}>Last Name:</Text>
            <TextInput
              style={modalStyles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter Last Name"
              placeholderTextColor={colors.textLight}
            />

            <Text style={modalStyles.label}>Nickname (Optional):</Text>
            <TextInput
              style={modalStyles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="Enter Nickname"
              placeholderTextColor={colors.textLight}
            />


            {/* Role Selection */}
            <Text style={modalStyles.label}>Role:</Text>
            <View style={modalStyles.roleButtons}>
              {/* Render buttons for all roles, including 'parent' */}
              {(['admin', 'teacher', 'pupil', 'parent'] as UserRole[]).map((r) => (
                <Button
                  key={r}
                  title={r.charAt(0).toUpperCase() + r.slice(1)}
                  onPress={() => setRole(r)}
                  color={role === r ? colors.primary : colors.secondary}
                />
              ))}
            </View>

            {/* Conditional sections based on selected role */}
            {role === 'pupil' && (
              <View style={modalStyles.roleSpecificSection}>
                 <Text style={modalStyles.roleSectionTitle}>Pupil Details</Text>
                 <Text style={modalStyles.label}>Instrument IDs:</Text>
                 {instrumentIds.map(id => (
                    <View key={id} style={modalStyles.linkedItemRow}>
                       {/* Display instrument name */}
                       <Text style={modalStyles.linkedItemText}>{mockInstruments.find(inst => inst.id === id)?.name || id}</Text>
                       <Button title="Remove" onPress={() => handleRemoveInstrument(id)} color={colors.danger} />
                    </View>
                 ))}
                 <Button title="Add Instrument (Mock)" onPress={handleAddInstrument} />
              </View>
            )}

            {(role === 'teacher' || role === 'parent') && ( // Applies to both Teacher and Parent
               <View style={modalStyles.roleSpecificSection}>
                  <Text style={modalStyles.roleSectionTitle}>{role === 'teacher' ? 'Teacher' : 'Parent'} Links</Text>
                  <Text style={modalStyles.label}>Linked Student IDs:</Text>
                  {linkedStudentIds.map(id => {
                     // Find the full pupil object to display their name
                     const student = allPupils.find(p => p.id === id);
                     return (
                        <View key={id} style={modalStyles.linkedItemRow}>
                           {/* Use helper to display linked student's name */}
                           <Text style={modalStyles.linkedItemText}>{student ? getUserDisplayName(student) : id}</Text>
                           <Button title="Remove" onPress={() => handleRemoveLinkedStudent(id)} color={colors.danger} />
                        </View>
                     );
                  })}
                  <Button title="Link Student (Mock)" onPress={handleAddLinkedStudent} />
               </View>
            )}

          </ScrollView>

          {/* Action Buttons */}
          <View style={modalStyles.buttonContainer}>
            <Button title="Create User (Mock)" onPress={handleCreatePress} />
          </View>
           <View style={modalStyles.footerButton}>
             <Button title="Cancel" onPress={onClose} color={colors.secondary} />
           </View>
        </View>
      </View>
    </Modal>
  );
};

// Modal styles (mostly reusable)
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '95%',
    maxWidth: 500,
    maxHeight: '80%',
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