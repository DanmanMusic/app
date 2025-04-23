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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'; // Added useQuery

import { User, UserRole } from '../../types/userTypes'; // Added UserRole
import { Instrument } from '../../mocks/mockInstruments';
import { updateUser, fetchTeachers } from '../../api/users'; // Added fetchTeachers

import { colors } from '../../styles/colors';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { getUserDisplayName } from '../../utils/helpers';
import { EditUserModalProps } from '../../types/componentProps'; // Import props type

export const EditUserModal: React.FC<EditUserModalProps> = ({
  visible,
  userToEdit,
  onClose,
  mockInstruments, // Keep instruments prop
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  const queryClient = useQueryClient();

  // --- Fetch Active Teachers (needed for linking UI) ---
  const {
      data: allTeachers = [],
      isLoading: isLoadingTeachers,
      isError: isErrorTeachers,
      // error: errorTeachers, // Can add error display if needed
  } = useQuery<User[], Error>({
      queryKey: ['teachers', { status: 'active', context: 'editUserModal' }],
      queryFn: async () => {
          // Fetch active teachers - might need pagination handling if list is large
          const result = await fetchTeachers({ page: 1 }); // Adjust as needed
          return (result?.items || []).filter(t => t.status === 'active');
      },
      // Only fetch when the modal is visible AND editing a student
      enabled: visible && !!userToEdit && userToEdit.role === 'student',
      staleTime: 5 * 60 * 1000,
  });
  // --- End Fetch Teachers ---

  // --- Update User Mutation ---
  const mutation = useMutation({
    mutationFn: updateUser,
    onSuccess: updatedUser => {
      console.log('User updated successfully via mutation:', updatedUser);
      queryClient.invalidateQueries({ queryKey: ['user', updatedUser.id] }); // Invalidate specific user
      // Invalidate relevant lists
      if (updatedUser.role === 'student') {
        queryClient.invalidateQueries({ queryKey: ['students'] });
      } else if (updatedUser.role === 'teacher') {
        queryClient.invalidateQueries({ queryKey: ['teachers'] });
      }
      onClose();
    },
    onError: error => {
      console.error('Error updating user via mutation:', error);
      Alert.alert('Error', `Failed to save changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Effect to populate state when modal opens or userToEdit changes
  useEffect(() => {
    if (visible && userToEdit && userToEdit.role !== 'parent') {
      setFirstName(userToEdit.firstName);
      setLastName(userToEdit.lastName);
      setNickname(userToEdit.nickname || '');
      if (userToEdit.role === 'student') {
        setSelectedInstrumentIds(userToEdit.instrumentIds || []);
        setSelectedTeacherIds(userToEdit.linkedTeacherIds || []);
      } else {
        setSelectedInstrumentIds([]);
        setSelectedTeacherIds([]);
      }
      mutation.reset();
    } else {
        // Reset fields if modal closes or user is null/parent
        setFirstName('');
        setLastName('');
        setNickname('');
        setSelectedInstrumentIds([]);
        setSelectedTeacherIds([]);
    }
  }, [visible, userToEdit]);

  // --- Selection Handlers ---
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

  // --- Save Changes Handler ---
  const handleSaveChanges = () => {
    if (!userToEdit || userToEdit.role === 'parent') return;
    if (!firstName.trim() || !lastName.trim()) {
        Alert.alert('Validation Error', 'First Name and Last Name cannot be empty.');
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
      // Check if instrument selection changed
      if ( JSON.stringify(selectedInstrumentIds.sort()) !== JSON.stringify((userToEdit.instrumentIds || []).sort()) ) {
        updates.instrumentIds = selectedInstrumentIds;
      }
      // Check if teacher selection changed
      if ( JSON.stringify(selectedTeacherIds.sort()) !== JSON.stringify((userToEdit.linkedTeacherIds || []).sort()) ) {
        updates.linkedTeacherIds = selectedTeacherIds;
      }
    }

    if (Object.keys(updates).length === 0) {
      console.log('[EditUserModal] No changes detected.');
      onClose();
      return;
    }

    console.log('[EditUserModal] Applying updates:', JSON.stringify(updates));
    mutation.mutate({ userId: userToEdit.id, updates });
  };

  // --- Render ---
  if (!visible || !userToEdit || userToEdit.role === 'parent') {
    return null; // Don't render if not visible or user invalid/parent
  }

  const currentUserDisplayName = getUserDisplayName(userToEdit);

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Edit User: {currentUserDisplayName}</Text>
          <Text style={modalStyles.subTitle}> Role: {userToEdit.role.toUpperCase()} (ID: {userToEdit.id}) </Text>

          <ScrollView style={modalStyles.scrollView}>
            <Text style={modalStyles.label}>First Name:</Text>
            <TextInput style={modalStyles.input} value={firstName} onChangeText={setFirstName} editable={!mutation.isPending} />
            <Text style={modalStyles.label}>Last Name:</Text>
            <TextInput style={modalStyles.input} value={lastName} onChangeText={setLastName} editable={!mutation.isPending} />
            <Text style={modalStyles.label}>Nickname:</Text>
            <TextInput style={modalStyles.input} value={nickname} onChangeText={setNickname} placeholder="Optional Nickname" placeholderTextColor={colors.textLight} editable={!mutation.isPending} />

            {/* Student Specific Section */}
            {userToEdit.role === 'student' && (
              <>
                {/* Instrument Selection */}
                <View style={modalStyles.roleSpecificSection}>
                  <Text style={modalStyles.roleSectionTitle}>Instruments</Text>
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
                    ) : ( <Text style={appSharedStyles.emptyListText}>No instruments available.</Text> )}
                  </View>
                </View>

                {/* Teacher Selection */}
                <View style={modalStyles.roleSpecificSection}>
                  <Text style={modalStyles.roleSectionTitle}>Linked Teachers</Text>
                  <View style={modalStyles.selectionContainer}>
                    {isLoadingTeachers && <ActivityIndicator color={colors.primary} />}
                    {isErrorTeachers && <Text style={appSharedStyles.textDanger}>Error loading teachers.</Text>}
                    {!isLoadingTeachers && !isErrorTeachers && (
                        allTeachers.length > 0 ? (
                            allTeachers.map(teacher => (
                                <Button
                                  key={teacher.id}
                                  title={getUserDisplayName(teacher)}
                                  onPress={() => toggleTeacherSelection(teacher.id)}
                                  color={selectedTeacherIds.includes(teacher.id) ? colors.success : colors.secondary}
                                  disabled={mutation.isPending}
                                />
                            ))
                        ) : ( <Text style={appSharedStyles.emptyListText}>No active teachers available.</Text> )
                    )}
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {/* Loading/Error Indicators */}
          {mutation.isPending && (
            <View style={modalStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalStyles.loadingText}>Saving Changes...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={modalStyles.errorText}> Error: {mutation.error instanceof Error ? mutation.error.message : 'Failed to save changes'} </Text>
          )}

          {/* Action Buttons */}
          <View style={modalStyles.buttonContainer}>
            <Button title="Save Changes" onPress={handleSaveChanges} disabled={mutation.isPending || isLoadingTeachers} />
          </View>
          <View style={modalStyles.footerButton}>
            <Button title="Cancel" onPress={onClose} color={colors.secondary} disabled={mutation.isPending} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Styles
const modalStyles = StyleSheet.create({
  centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalView: { margin: 20, backgroundColor: colors.backgroundPrimary, borderRadius: 10, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '95%', maxWidth: 500, maxHeight: '90%' }, // Increased maxHeight
  scrollView: { width: '100%', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5, textAlign: 'center', color: colors.textPrimary, width: '100%', },
  subTitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 15, textAlign: 'center', width: '100%', borderBottomWidth: 1, borderBottomColor: colors.borderPrimary, paddingBottom: 10, },
  label: { fontSize: 14, fontWeight: 'bold', marginTop: 10, marginBottom: 5, color: colors.textPrimary, alignSelf: 'flex-start', },
  input: { width: '100%', borderWidth: 1, borderColor: colors.borderPrimary, borderRadius: 5, padding: 10, fontSize: 16, color: colors.textPrimary, backgroundColor: colors.backgroundPrimary, marginBottom: 5, },
  roleSpecificSection: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: colors.borderSecondary, width: '100%', },
  roleSectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: colors.textSecondary, textAlign: 'center', },
  selectionContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 10, },
  linkedItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, backgroundColor: colors.backgroundGrey, borderRadius: 4, marginBottom: 5, borderWidth: 1, borderColor: colors.borderSecondary, },
  linkedItemText: { flex: 1, marginRight: 10, fontSize: 15, color: colors.textPrimary, },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 5, },
  loadingText: { marginLeft: 10, fontSize: 14, color: colors.textSecondary, },
  errorText: { color: colors.danger, textAlign: 'center', marginTop: 10, marginBottom: 5, fontSize: 14, },
  buttonContainer: { flexDirection: 'column', width: '100%', marginTop: 10, gap: 10, },
  footerButton: { width: '100%', marginTop: 10, },
});

export default EditUserModal;