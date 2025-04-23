

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


import { User } from '../../types/userTypes';
import { Instrument } from '../../mocks/mockInstruments';
import { updateUser } from '../../api/users'; 


import { colors } from '../../styles/colors';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { getUserDisplayName } from '../../utils/helpers'; 

interface EditUserModalProps {
  visible: boolean;
  userToEdit: User | null;
  onClose: () => void;
  
  mockInstruments: Instrument[]; 
  allTeachers: User[]; 
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  visible,
  userToEdit,
  onClose,
  
  mockInstruments,
  allTeachers,
}) => {
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [instrumentIds, setInstrumentIds] = useState<string[]>([]);
  const [linkedTeacherIds, setLinkedTeacherIds] = useState<string[]>([]);

  
  const queryClient = useQueryClient();

  
  const mutation = useMutation({
    mutationFn: updateUser, 
    onSuccess: updatedUser => {
      
      console.log('User updated successfully via mutation:', updatedUser);

      
      
      queryClient.invalidateQueries({ queryKey: ['user', updatedUser.id] }); 

      
      if (updatedUser.role === 'student') {
        queryClient.invalidateQueries({ queryKey: ['students'] });
      } else if (updatedUser.role === 'teacher') {
        queryClient.invalidateQueries({ queryKey: ['teachers'] });
      }
      onClose(); 
    },
    onError: error => {
      console.error('Error updating user via mutation:', error);
    },
  });

  
  useEffect(() => {
    if (visible && userToEdit && userToEdit.role !== 'parent') {
      setFirstName(userToEdit.firstName);
      setLastName(userToEdit.lastName);
      setNickname(userToEdit.nickname || '');
      if (userToEdit.role === 'student') {
        setInstrumentIds(userToEdit.instrumentIds || []);
        setLinkedTeacherIds(userToEdit.linkedTeacherIds || []);
      } else {
        setInstrumentIds([]);
        setLinkedTeacherIds([]);
      }
      mutation.reset(); 
    }
    
    
    
    
    
    
    
    
  }, [visible, userToEdit]); 

  const handleSaveChanges = () => {
    if (!userToEdit || userToEdit.role === 'parent') {
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      return;
    }

    
    const updates: Partial<Omit<User, 'id' | 'role' | 'status'>> = {};
    if (firstName.trim() !== userToEdit.firstName) updates.firstName = firstName.trim();
    if (lastName.trim() !== userToEdit.lastName) updates.lastName = lastName.trim();

    
    const trimmedNickname = nickname.trim();
    if (trimmedNickname !== (userToEdit.nickname || '')) {
      updates.nickname = trimmedNickname ? trimmedNickname : undefined; 
    }

    if (userToEdit.role === 'student') {
      
      if (
        JSON.stringify(instrumentIds.sort()) !==
        JSON.stringify((userToEdit.instrumentIds || []).sort())
      ) {
        updates.instrumentIds = instrumentIds;
      }
      if (
        JSON.stringify(linkedTeacherIds.sort()) !==
        JSON.stringify((userToEdit.linkedTeacherIds || []).sort())
      ) {
        updates.linkedTeacherIds = linkedTeacherIds;
      }
    }

    
    if (Object.keys(updates).length === 0) {
      onClose(); 
      return;
    }

    
    mutation.mutate({ userId: userToEdit.id, updates });
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
            <Text style={modalStyles.label}>First Name:</Text>
            <TextInput
              style={modalStyles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter First Name"
              placeholderTextColor={colors.textLight}
              editable={!mutation.isPending} 
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

            <Text style={modalStyles.label}>Nickname:</Text>
            <TextInput
              style={modalStyles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="Optional Nickname"
              placeholderTextColor={colors.textLight}
              editable={!mutation.isPending}
            />

            {userToEdit.role === 'student' && (
              <>
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
                          disabled={mutation.isPending}
                        />
                      </View>
                    ))
                  ) : (
                    <Text style={appSharedStyles.emptyListText}>No instruments linked.</Text>
                  )}
                  <Button
                    title="Add Instrument (Mock)"
                    onPress={handleAddInstrument}
                    disabled={mutation.isPending}
                  />
                </View>

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
                            disabled={mutation.isPending}
                          />
                        </View>
                      );
                    })
                  ) : (
                    <Text style={appSharedStyles.emptyListText}>No teachers linked.</Text>
                  )}
                  <Button
                    title="Link Teacher (Mock)"
                    onPress={handleAddTeacher}
                    disabled={mutation.isPending}
                  />
                </View>
              </>
            )}
          </ScrollView>

          {mutation.isPending && (
            <View style={modalStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalStyles.loadingText}>Saving Changes...</Text>
            </View>
          )}

          {mutation.isError && (
            <Text style={modalStyles.errorText}>
              Error:{' '}
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to save changes'}
            </Text>
          )}

          <View style={modalStyles.buttonContainer}>
            <Button
              title="Save Changes"
              onPress={handleSaveChanges}
              disabled={mutation.isPending}
            />
          </View>
          <View style={modalStyles.footerButton}>
            <Button
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={mutation.isPending}
            />
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

export default EditUserModal;
