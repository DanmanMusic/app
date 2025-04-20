// src/components/admin/CreateUserModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Button, Alert, TextInput, Platform, ScrollView } from 'react-native';

// Import types
import { UserRole, User } from '../../mocks/mockUsers'; // Import UserRole including 'parent'
import { Instrument } from '../../mocks/mockInstruments';
import { SimplifiedStudent } from '../../views/AdminView';

// Import shared styles and colors
import { colors } from '../../styles/colors';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { adminSharedStyles } from './adminSharedStyles';


interface CreateUserModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateUser: (userData: Omit<User, 'id'>) => void;
  allPupils: SimplifiedStudent[];
  mockInstruments: Instrument[];
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  visible,
  onClose,
  onCreateUser,
  allPupils,
  mockInstruments,
}) => {
  // State type should now include 'parent' again
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole | ''>(''); // Role state includes 'parent'
  const [instrumentIds, setInstrumentIds] = useState<string[]>([]);
  const [linkedStudentIds, setLinkedStudentIds] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setName('');
      setRole('');
      setInstrumentIds([]);
      setLinkedStudentIds([]);
    }
  }, [visible]);

  const handleCreatePress = () => {
    if (!name || !role) {
      Alert.alert('Missing Information', 'Please enter a name and select a role.');
      return;
    }

    const newUserPartial: Omit<User, 'id'> = {
      role: role,
      name: name.trim(),
    };

    if (role === 'pupil') {
      newUserPartial.instrumentIds = instrumentIds;
    } else if (role === 'teacher' || role === 'parent') { // Linking applies to teacher AND parent
      newUserPartial.linkedStudentIds = linkedStudentIds;
    }

    onCreateUser(newUserPartial);

    onClose();
  };

  const handleAddInstrument = () => {
     Alert.prompt(
       'Add Instrument ID (Mock)',
       'Enter instrument ID (e.g., inst-1):',
       [
         { text: 'Cancel', style: 'cancel' },
         {
           text: 'Add',
           onPress: id => {
             if (id && mockInstruments.some(inst => inst.id === id) && !instrumentIds.includes(id)) {
                setInstrumentIds(prev => [...prev, id]);
             } else if (id && instrumentIds.includes(id)) {
                Alert.alert('Already Added', 'This instrument ID is already in the list.');
             }
             else {
               Alert.alert('Invalid ID', 'Please enter a valid instrument ID from the mock list.');
             }
           }
         }
       ],
       Platform.OS === 'ios' ? 'default' : 'plain-text'
     );
  };

  const handleRemoveInstrument = (idToRemove: string) => {
      setInstrumentIds(prev => prev.filter(id => id !== idToRemove));
  };


   const handleAddLinkedStudent = () => {
     Alert.prompt(
       'Link Student ID (Mock)',
       'Enter student ID (e.g., student-1):',
       [
         { text: 'Cancel', style: 'cancel' },
         {
           text: 'Link',
           onPress: id => {
             if (id && allPupils.some(pupil => pupil.id === id) && !linkedStudentIds.includes(id)) {
                setLinkedStudentIds(prev => [...prev, id]);
             } else if (id && linkedStudentIds.includes(id)) {
                 Alert.alert('Already Linked', 'This student ID is already linked.');
             }
             else {
               Alert.alert('Invalid ID', 'Please enter a valid student ID from the mock list.');
             }
           }
         }
       ],
        Platform.OS === 'ios' ? 'default' : 'plain-text'
     );
   };

    const handleRemoveLinkedStudent = (idToRemove: string) => {
       setLinkedStudentIds(prev => prev.filter(id => id !== idToRemove));
    };


  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Create New User (Mock)</Text>

          <ScrollView style={modalStyles.scrollView}>
            <Text style={modalStyles.label}>Name:</Text>
            <TextInput
              style={modalStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter Name"
              placeholderTextColor={colors.textLight}
            />

            <Text style={modalStyles.label}>Role:</Text>
            <View style={modalStyles.roleButtons}>
              {/* REMOVE 'parent' from this map, but keep UserRole as potential state value */}
              {(['admin', 'teacher', 'pupil'] as UserRole[]).map((r) => (
                <Button
                  key={r}
                  title={r.charAt(0).toUpperCase() + r.slice(1)}
                  onPress={() => setRole(r)} // Set role including 'parent' if button existed
                  color={role === r ? colors.primary : colors.secondary}
                />
              ))}
            </View>

            {/* Role-Specific Fields */}
            {role === 'pupil' && (
              <View style={modalStyles.roleSpecificSection}>
                 <Text style={modalStyles.roleSectionTitle}>Pupil Details</Text>
                 <Text style={modalStyles.label}>Instrument IDs:</Text>
                 {instrumentIds.map(id => (
                    <View key={id} style={modalStyles.linkedItemRow}>
                       <Text style={modalStyles.linkedItemText}>{mockInstruments.find(inst => inst.id === id)?.name || id}</Text>
                       <Button title="Remove" onPress={() => handleRemoveInstrument(id)} color={colors.danger} />
                    </View>
                 ))}
                 <Button title="Add Instrument (Mock)" onPress={handleAddInstrument} />
              </View>
            )}

            {(role === 'teacher' || role === 'parent') && ( // Linking applies to teacher OR parent
               <View style={modalStyles.roleSpecificSection}>
                  <Text style={modalStyles.roleSectionTitle}>{role === 'teacher' ? 'Teacher' : 'Parent'} Links</Text>
                  <Text style={modalStyles.label}>Linked Student IDs:</Text>
                  {linkedStudentIds.map(id => {
                     const student = allPupils.find(p => p.id === id);
                     return (
                        <View key={id} style={modalStyles.linkedItemRow}>
                           <Text style={modalStyles.linkedItemText}>{student?.name || id}</Text>
                           <Button title="Remove" onPress={() => handleRemoveLinkedStudent(id)} color={colors.danger} />
                        </View>
                     );
                  })}
                  <Button title="Link Student (Mock)" onPress={handleAddLinkedStudent} />
               </View>
            )}

          </ScrollView>


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
    marginTop: 15,
    marginBottom: 5,
    color: colors.textPrimary,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.borderPrimary, // Keep the darker border color fix
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundPrimary, // Keep the background color fix
  },
  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
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