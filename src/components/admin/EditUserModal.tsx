// src/components/admin/EditUserModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Button, TextInput, Platform, ScrollView } from 'react-native';

// Import NEW user type
import { UserRole, User } from '../../types/userTypes';
// No longer need Instrument or SimplifiedStudent imports here

import { colors } from '../../styles/colors';
import { appSharedStyles } from '../../styles/appSharedStyles';
// import { adminSharedStyles } from './adminSharedStyles'; // Not strictly needed here

// Import NEW helper
import { getUserDisplayName } from '../../utils/helpers';


interface EditUserModalProps {
  visible: boolean;
  userToEdit: User | null; // Expect full User object
  onClose: () => void;
  // Use specific signatures matching App.tsx's simulation functions
  onEditUser: (userId: string, userData: Partial<Omit<User, 'id'>>) => void;
  onDeleteUser: (userId: string) => void;
  allPupils: User[]; // Expect full User objects for lookup
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  visible,
  userToEdit,
  onClose,
  onEditUser,
  onDeleteUser,
  allPupils, // Receive full pupil list for display lookup
}) => {
  // State for editable fields based on the new User structure
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [linkedStudentIds, setLinkedStudentIds] = useState<string[]>([]); // For Teacher/Parent roles

  // Update state when userToEdit changes or modal becomes visible
  useEffect(() => {
    if (visible && userToEdit) {
      // Populate state from the user object passed in
      setFirstName(userToEdit.firstName);
      setLastName(userToEdit.lastName);
      setNickname(userToEdit.nickname || ''); // Handle optional nickname (default to empty string)
      setLinkedStudentIds(userToEdit.linkedStudentIds || []); // Handle optional linked IDs
    } else if (!visible) {
      // Reset state when modal is hidden to prevent showing old data briefly
      setFirstName('');
      setLastName('');
      setNickname('');
      setLinkedStudentIds([]);
    }
  }, [visible, userToEdit]); // Dependencies are correct

  // Handler for saving changes
  const handleSaveChanges = () => {
    // Basic validation
    if (!userToEdit || !firstName || !lastName) {
       alert('Error - First Name and Last Name cannot be empty.');
      return;
    }

    // Construct the partial update object with new fields
    const updatedUserData: Partial<Omit<User, 'id'>> = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      // Only include nickname if it has a value (trimmed), otherwise ensure it's potentially removed if cleared
      nickname: nickname.trim() ? nickname.trim() : undefined,
    };

    // Include linked students if applicable to the role
    if (userToEdit.role === 'teacher' || userToEdit.role === 'parent') {
       updatedUserData.linkedStudentIds = linkedStudentIds;
    }

    // Call the prop passed from AdminView (which calls the one from App.tsx)
    onEditUser(userToEdit.id, updatedUserData);
    // Note: Closing the modal is handled by the wrapper function in AdminView now
  };

  // Handler for deleting the user
  const handleDelete = () => {
    if (!userToEdit) return;
    // Call the prop passed from AdminView (which calls the one from App.tsx)
    // This prop in App.tsx currently shows a simple browser alert.
    // A confirmation modal *could* be triggered here instead if preferred,
    // but for now, we rely on the simple alert from App.tsx.
    onDeleteUser(userToEdit.id);
     // Note: Closing the modal is handled by the wrapper function in AdminView now
  };

   // Mock handler for linking students (using simple alert for now)
   const handleAddLinkedStudent = () => {
      alert('Mock Link Student ID');
    // Could use Alert.prompt or a selection modal later
   };

   // Handler for unlinking a student
    const handleRemoveLinkedStudent = (idToRemove: string) => {
       setLinkedStudentIds(prev => prev.filter(id => id !== idToRemove));
    };

  // Don't render if no user to edit
  if (!userToEdit) {
    return null;
  }

  // Get display name for the title using the helper
  const currentUserDisplayName = getUserDisplayName(userToEdit);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose} // Allow closing via system back/escape
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
           {/* Use display name in title */}
          <Text style={modalStyles.modalTitle}>Edit User: {currentUserDisplayName}</Text>
          <Text style={modalStyles.subTitle}>Role: {userToEdit.role.toUpperCase()} (ID: {userToEdit.id})</Text>

          <ScrollView style={modalStyles.scrollView}>
             {/* Inputs for the new name structure */}
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


            {/* Section for managing linked students (for Teacher/Parent roles) */}
            {(userToEdit.role === 'teacher' || userToEdit.role === 'parent') && (
              <View style={modalStyles.linkedSection}>
                <Text style={modalStyles.label}>Linked Students:</Text>
                {linkedStudentIds.length > 0 ? (
                  linkedStudentIds.map(id => {
                    // Find the full pupil object from the list passed in
                    const student = allPupils.find(p => p.id === id);
                    return (
                      <View key={id} style={modalStyles.linkedItemRow}>
                         {/* Use helper to display the linked student's name */}
                        <Text style={modalStyles.linkedItemText}>{student ? getUserDisplayName(student) : id}</Text>
                        <Button title="Unlink (Mock)" onPress={() => handleRemoveLinkedStudent(id)} color={colors.warning} />
                      </View>
                    );
                  })
                ) : (
                  <Text style={appSharedStyles.emptyListText}>No students linked.</Text>
                )}
                <View style={{ marginTop: 10 }}>
                   <Button title="Link Another Student (Mock)" onPress={handleAddLinkedStudent} />
                </View>
              </View>
            )}

          </ScrollView>

          {/* Action Buttons */}
          <View style={modalStyles.buttonContainer}>
            <Button title="Save Changes (Mock)" onPress={handleSaveChanges} />
            <Button title="Delete User (Mock)" onPress={handleDelete} color={colors.danger} />
          </View>
          <View style={modalStyles.footerButton}>
            <Button title="Cancel" onPress={onClose} color={colors.secondary} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Modal styles (can be reused or refined)
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
    marginBottom: 5,
    textAlign: 'center',
    color: colors.textPrimary,
    width: '100%',
  },
  subTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 15,
    textAlign: 'center',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    paddingBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10, // Adjusted margin
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
    marginBottom: 5, // Adjusted margin
  },
  linkedSection: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSecondary,
    width: '100%',
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

export default EditUserModal;