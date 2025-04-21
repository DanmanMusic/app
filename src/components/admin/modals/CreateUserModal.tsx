
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Button, TextInput, ScrollView } from 'react-native';
import { UserRole, User } from '../../../types/userTypes';
import { Instrument } from '../../../mocks/mockInstruments';
import { colors } from '../../../styles/colors';
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { getUserDisplayName } from '../../../utils/helpers'; 

const CREATABLE_ROLES: UserRole[] = ['admin', 'teacher', 'student'];

interface CreateUserModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateUser: (userData: Omit<User, 'id'>) => void;  
  allTeachers: User[]; 
  mockInstruments: Instrument[];
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  visible,
  onClose,
  onCreateUser,
  allTeachers, 
  mockInstruments,
}) => {
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');  
  const [role, setRole] = useState<UserRole | ''>('');
  const [instrumentIds, setInstrumentIds] = useState<string[]>([]);   
  const [linkedTeacherIds, setLinkedTeacherIds] = useState<string[]>([]); 

  useEffect(() => {
    if (visible) {
      setFirstName('');
      setLastName('');
      
      setRole('');
      setInstrumentIds([]);
      setLinkedTeacherIds([]); 
    }
  }, [visible]);

  
  const handleCreatePress = () => {
    if (!firstName || !lastName || !role) {
      alert('Missing Information - Please enter First Name, Last Name, and select a Role.');
      return;
    }

    const newUserPartial: Omit<User, 'id'> = {
      role: role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      ...(role === 'student' && {
        instrumentIds: instrumentIds,
        linkedTeacherIds: linkedTeacherIds, 
      }),      
    };
    onCreateUser(newUserPartial);
  };

  const handleAddInstrument = () => {
    alert('Mock Add Instrument ID');
  };

  const handleRemoveInstrument = (idToRemove: string) => {
    setInstrumentIds(prev => prev.filter(id => id !== idToRemove));
  };

  const handleAddLinkedTeacher = () => {
    alert('Mock Link Teacher ID');
  };
  
  const handleRemoveLinkedTeacher = (idToRemove: string) => {
    setLinkedTeacherIds(prev => prev.filter(id => id !== idToRemove));
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
          <Text style={modalStyles.modalTitle}>Create New User</Text>

          <ScrollView style={modalStyles.scrollView}>
            {}
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
            <Text style={modalStyles.label}>Role:</Text>
            <View style={modalStyles.roleButtons}>
              {}
              {CREATABLE_ROLES.map(r => (
                <Button
                  key={r}
                  title={r.charAt(0).toUpperCase() + r.slice(1)}
                  onPress={() => setRole(r)}
                  color={role === r ? colors.primary : colors.secondary}
                />
              ))}
            </View>
            {role === 'student' && (
              <View style={modalStyles.roleSpecificSection}>
                <Text style={modalStyles.roleSectionTitle}>Student Details</Text>

                {}
                <Text style={modalStyles.label}>Instrument IDs:</Text>
                {instrumentIds.length > 0 ? instrumentIds.map(id => (
                  <View key={id} style={modalStyles.linkedItemRow}>
                    <Text style={modalStyles.linkedItemText}>
                      {mockInstruments.find(inst => inst.id === id)?.name || id}
                    </Text>
                    <Button title="Remove" onPress={() => handleRemoveInstrument(id)} color={colors.danger} />
                  </View>
                )) : <Text style={appSharedStyles.emptyListText}>No instruments selected.</Text>}
                <Button title="Add Instrument (Mock)" onPress={handleAddInstrument} />
                <Text style={[modalStyles.label, { marginTop: 15 }]}>Linked Teacher IDs:</Text>
                {linkedTeacherIds.length > 0 ? linkedTeacherIds.map(id => {
                  
                  const teacher = allTeachers.find(t => t.id === id);
                  return (
                    <View key={id} style={modalStyles.linkedItemRow}>
                      <Text style={modalStyles.linkedItemText}>
                        {teacher ? getUserDisplayName(teacher) : id}
                      </Text>
                      <Button title="Remove" onPress={() => handleRemoveLinkedTeacher(id)} color={colors.danger} />
                    </View>
                  );
                }) : <Text style={appSharedStyles.emptyListText}>No teachers linked.</Text>}
                <Button title="Link Teacher (Mock)" onPress={handleAddLinkedTeacher} />
              </View>
            )}
          </ScrollView>
          <View style={modalStyles.buttonContainer}>
            <Button title="Create User" onPress={handleCreatePress} />
          </View>
          <View style={modalStyles.footerButton}>
            <Button title="Cancel" onPress={onClose} color={colors.secondary} />
          </View>
        </View>
      </View>
    </Modal>
  );                {}
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