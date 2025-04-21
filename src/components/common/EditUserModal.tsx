import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Button,
  TextInput,
  Platform,
  ScrollView,
} from 'react-native';
import { User } from '../../types/userTypes';
import { Instrument } from '../../mocks/mockInstruments';
import { colors } from '../../styles/colors';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { getUserDisplayName, getInstrumentNames } from '../../utils/helpers';

interface EditUserModalProps {
  visible: boolean;
  userToEdit: User | null;
  onClose: () => void;
  onEditUser: (userId: string, updatedData: Partial<Omit<User, 'id'>>) => void;

  mockInstruments: Instrument[];
  allTeachers: User[];
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  visible,
  userToEdit,
  onClose,
  onEditUser,
  mockInstruments,
  allTeachers,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [originalHadNickname, setOriginalHadNickname] = useState(false);
  const [instrumentIds, setInstrumentIds] = useState<string[]>([]);
  const [linkedTeacherIds, setLinkedTeacherIds] = useState<string[]>([]);

  useEffect(() => {
    if (visible && userToEdit && userToEdit.role !== 'parent') {
      setFirstName(userToEdit.firstName);
      setLastName(userToEdit.lastName);
      setNickname(userToEdit.nickname || '');
      setOriginalHadNickname(!!userToEdit.nickname);
      if (userToEdit.role === 'student') {
        setInstrumentIds(userToEdit.instrumentIds || []);
        setLinkedTeacherIds(userToEdit.linkedTeacherIds || []);
      } else {
        setInstrumentIds([]);
        setLinkedTeacherIds([]);
      }
    } else if (!visible) {
      setFirstName('');
      setLastName('');
      setNickname('');
      setOriginalHadNickname(false);
      setInstrumentIds([]);
      setLinkedTeacherIds([]);
    }
  }, [visible, userToEdit]);

  const handleSaveChanges = () => {
    if (!userToEdit) {
      alert('Error: No user data to save.');
      return;
    }
    if (userToEdit.role === 'parent') {
      alert('Error - Cannot edit parent users.');
      return;
    }
    if (!firstName || !lastName) {
      alert('Error - First Name and Last Name cannot be empty.');
      return;
    }

    const updatedUserData: Partial<Omit<User, 'id'>> = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      nickname: nickname.trim() ? nickname.trim() : undefined,
    };

    if (userToEdit.role === 'student') {
      updatedUserData.instrumentIds = instrumentIds;
      updatedUserData.linkedTeacherIds = linkedTeacherIds;
    }

    onEditUser(userToEdit.id, updatedUserData);
  };

  const handleAddInstrument = () => {
    alert('Mock Add Instrument');
  };
  const handleRemoveInstrument = (idToRemove: string) => {
    setInstrumentIds(prev => prev.filter(id => id !== idToRemove));
  };
  const handleAddTeacher = () => {
    alert('Mock Link Teacher');
  };
  const handleRemoveTeacher = (idToRemove: string) => {
    setLinkedTeacherIds(prev => prev.filter(id => id !== idToRemove));
  };

  if (!visible || !userToEdit || userToEdit.role === 'parent') {
    return null;
  }

  const currentUserDisplayName = getUserDisplayName(userToEdit);
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Edit User: {currentUserDisplayName}</Text>
          <Text style={modalStyles.subTitle}>
            Role: {userToEdit.role.toUpperCase()} (ID: {userToEdit.id})
          </Text>

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
            {originalHadNickname && (
              <>
                {' '}
                <Text style={modalStyles.label}>Nickname:</Text>{' '}
                <TextInput
                  style={modalStyles.input}
                  value={nickname}
                  onChangeText={setNickname}
                  placeholderTextColor={colors.textLight}
                />{' '}
              </>
            )}

            {}
            {userToEdit.role === 'student' && (
              <>
                {}
                <View style={modalStyles.roleSpecificSection}>
                  <Text style={modalStyles.roleSectionTitle}>Instruments</Text>
                  {instrumentIds.length > 0 ? (
                    instrumentIds.map(id => (
                      <View key={id} style={modalStyles.linkedItemRow}>
                        <Text style={modalStyles.linkedItemText}>
                          {mockInstruments.find(inst => inst.id === id)?.name || id}
                        </Text>
                        <Button
                          title="Remove (Mock)"
                          onPress={() => handleRemoveInstrument(id)}
                          color={colors.danger}
                        />
                      </View>
                    ))
                  ) : (
                    <Text style={appSharedStyles.emptyListText}>No instruments linked.</Text>
                  )}
                  <Button title="Add Instrument (Mock)" onPress={handleAddInstrument} />
                </View>

                {}
                <View style={modalStyles.roleSpecificSection}>
                  <Text style={modalStyles.roleSectionTitle}>Linked Teachers</Text>
                  {linkedTeacherIds.length > 0 ? (
                    linkedTeacherIds.map(id => {
                      const teacher = allTeachers.find(t => t.id === id);
                      return (
                        <View key={id} style={modalStyles.linkedItemRow}>
                          <Text style={modalStyles.linkedItemText}>
                            {teacher ? getUserDisplayName(teacher) : id}
                          </Text>
                          <Button
                            title="Remove (Mock)"
                            onPress={() => handleRemoveTeacher(id)}
                            color={colors.danger}
                          />
                        </View>
                      );
                    })
                  ) : (
                    <Text style={appSharedStyles.emptyListText}>No teachers linked.</Text>
                  )}
                  <Button title="Link Teacher (Mock)" onPress={handleAddTeacher} />
                </View>
              </>
            )}
            {}
          </ScrollView>

          {}
          <View style={modalStyles.buttonContainer}>
            <Button title="Save Changes" onPress={handleSaveChanges} />
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '95%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  scrollView: { width: '100%', marginBottom: 15 },
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

  roleSpecificSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.borderSecondary,
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
  buttonContainer: { flexDirection: 'column', width: '100%', marginTop: 10, gap: 10 },
  footerButton: { width: '100%', marginTop: 10 },
});

export default EditUserModal;
