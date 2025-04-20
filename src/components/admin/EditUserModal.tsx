// src/components/admin/EditUserModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Button, TextInput, Platform, ScrollView } from 'react-native';

import { UserRole, User } from '../../types/userTypes';

import { colors } from '../../styles/colors';
import { appSharedStyles } from '../../styles/appSharedStyles';

import { getUserDisplayName } from '../../utils/helpers';

interface EditUserModalProps {
  visible: boolean;
  userToEdit: User | null; // Expect full User object
  onClose: () => void;
  onEditUser: (userId: string, userData: Partial<Omit<User, 'id'>>) => void;
  onDeleteUser: (userId: string) => void;
  // allPupils prop removed
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  visible,
  userToEdit,
  onClose,
  onEditUser,
  onDeleteUser,
}) => {
  // State only for editable fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  // Nickname state removed
  // LinkedStudentIds state removed

  // Update state when userToEdit changes or modal becomes visible
  useEffect(() => {
    // Only populate if user is Admin, Teacher, or Pupil (exclude Parent editing here)
    if (visible && userToEdit && userToEdit.role !== 'parent') {
      setFirstName(userToEdit.firstName);
      setLastName(userToEdit.lastName);
      // Nickname update removed
      // Linking update removed
    } else if (!visible) {
      // Reset state when modal is hidden
      setFirstName('');
      setLastName('');
      // Nickname reset removed
      // Linking reset removed
    }
  }, [visible, userToEdit]);

  // Handler for saving changes
  const handleSaveChanges = () => {
    // Ensure user exists and is not a parent
    if (!userToEdit || userToEdit.role === 'parent') {
      alert('Error - Cannot edit this user type or user not found.');
      return;
    }
    if (!firstName || !lastName) {
      alert('Error - First Name and Last Name cannot be empty.');
      return;
    }

    // Construct the partial update object - only names
    const updatedUserData: Partial<Omit<User, 'id'>> = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      // Nickname update removed
      // Linking update removed
    };

    onEditUser(userToEdit.id, updatedUserData);
  };

  // Handler for deleting the user
  const handleDelete = () => {
    if (!userToEdit) return;
    // Deletion might still apply to Parents even if editing doesn't
    // We can keep this simple for now and allow delete for any role passed in
    onDeleteUser(userToEdit.id);
  };

  // Student linking/unlinking handlers removed

  // Don't render if no user or if user is a parent
  if (!userToEdit || userToEdit.role === 'parent') {
    // Silently don't show modal for parents, or could show a message
    // If visible is true but userToEdit is parent, onClose might be needed
    // useEffect handles the case where userToEdit becomes parent while modal is open
    // For simplicity, if the intent is just *not to open* for parents, AdminView handles that.
    // If it could be opened then switched, we might need an explicit return or message here.
    // Let's assume AdminView prevents opening for Parent role.
    return null;
  }

  const currentUserDisplayName = getUserDisplayName(userToEdit);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Edit User: {currentUserDisplayName}</Text>
          <Text style={modalStyles.subTitle}>Role: {userToEdit.role.toUpperCase()} (ID: {userToEdit.id})</Text>

          <ScrollView style={modalStyles.scrollView}>
            {/* Inputs for names */}
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

            {/* Nickname Input Removed */}

            {/* Section for managing linked students Removed */}

          </ScrollView>

          {/* Action Buttons */}
          <View style={modalStyles.buttonContainer}>
            <Button title="Save Changes" onPress={handleSaveChanges} />
            <Button title="Delete User" onPress={handleDelete} color={colors.danger} />
          </View>
          <View style={modalStyles.footerButton}>
            <Button title="Cancel" onPress={onClose} color={colors.secondary} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Styles (Keep existing, ensure they work for simplified layout)
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
  linkedSection: { // Keep style definition in case it's needed later elsewhere
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSecondary,
    width: '100%',
  },
  linkedItemRow: { // Keep style definition
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
  linkedItemText: { // Keep style definition
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