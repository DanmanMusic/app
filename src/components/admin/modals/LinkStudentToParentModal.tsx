// src/components/admin/modals/LinkStudentToParentModal.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Modal,
  View,
  Text,
  Button,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Toast from 'react-native-toast-message';

// API Imports
import { fetchStudents } from '../../../api/users'; // To find students
import { linkStudentToParent } from '../../../api/users'; // API to create the link

// Type Imports
import { SimplifiedStudent, User } from '../../../types/dataTypes';

// Style Imports
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';

interface LinkStudentToParentModalProps {
  visible: boolean;
  onClose: () => void;
  parentId: string; // The ID of the parent we are linking to
  parentName: string; // For display purposes
  // Pass already linked IDs to filter them out from selection
  currentlyLinkedStudentIds?: string[];
}

export const LinkStudentToParentModal: React.FC<LinkStudentToParentModalProps> = ({
  visible,
  onClose,
  parentId,
  parentName,
  currentlyLinkedStudentIds = [], // Default to empty array
}) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);

  // Query for active students, potentially filtered by search term
  const {
    data: studentListResult,
    isLoading: isLoadingStudents,
    isError: isErrorStudents,
    error: errorStudents,
  } = useQuery({
    // Query key includes search term to refetch when it changes
    queryKey: ['students', { filter: 'active', context: 'linkParentModal', search: searchTerm }],
    queryFn: () =>
      fetchStudents({
        filter: 'active',
        searchTerm: searchTerm,
        limit: 50, // Limit results for performance in modal search
        page: 1,
      }),
    enabled: visible, // Only fetch when modal is visible
    staleTime: 1 * 60 * 1000, // Cache search results briefly
  });

  // Filter out already linked students and prepare display list
  const availableStudents = useMemo(() => {
    const allFetched = studentListResult?.students ?? [];
    return allFetched
      .filter(student => !currentlyLinkedStudentIds.includes(student.id)) // Exclude already linked
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
  }, [studentListResult, currentlyLinkedStudentIds]);

  // Mutation to link the selected student
  const linkMutation = useMutation({
    mutationFn: (studentIdToLink: string) => linkStudentToParent(parentId, studentIdToLink),
    onSuccess: (_, studentIdLinked) => {
      Toast.show({ type: 'success', text1: 'Success', text2: `Student linked successfully.` });
      // Invalidate the parent's profile query to update their linkedStudentIds list
      queryClient.invalidateQueries({ queryKey: ['userProfile', parentId] });
      // Also invalidate the generic parents list query if it exists
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      onClose(); // Close the modal
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Linking Failed',
        text2: error.message || 'Could not link student.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSearchTerm('');
      setSelectedStudentId(null);
      setSelectedStudentName(null);
      linkMutation.reset();
    }
  }, [visible]);

  // Handler when a student is selected from the list
  const handleSelectStudent = (student: SimplifiedStudent) => {
    setSelectedStudentId(student.id);
    setSelectedStudentName(student.name);
    // Optionally move to a confirmation step, or allow direct linking from list?
    // For simplicity, let's allow direct linking confirmation now.
  };

  // Handler for the final "Link" button
  const handleConfirmLink = () => {
    if (!selectedStudentId) {
      Toast.show({
        type: 'error',
        text1: 'No Student Selected',
        text2: 'Please select a student to link.',
      });
      return;
    }
    if (linkMutation.isPending) return;

    console.log(
      `[LinkStudentModal] Attempting to link Parent ${parentId} and Student ${selectedStudentId}`
    );
    linkMutation.mutate(selectedStudentId);
  };

  const isLinkDisabled = !selectedStudentId || linkMutation.isPending || isLoadingStudents;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={appSharedStyles.centeredView}>
        <View style={appSharedStyles.modalView}>
          <Text style={appSharedStyles.modalTitle}>Link Student to Parent</Text>
          <Text style={appSharedStyles.modalContextInfo}>Parent: {parentName}</Text>
          <Text style={appSharedStyles.stepTitle}>Select Student to Link:</Text>

          {/* Search Input */}
          <TextInput
            style={[commonSharedStyles.input, styles.searchInput]}
            placeholder="Search active students by name..."
            placeholderTextColor={colors.textLight}
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!linkMutation.isPending}
          />

          {/* Student List */}
          <View style={styles.listContainer}>
            {isLoadingStudents && (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
            )}
            {isErrorStudents && (
              <Text style={commonSharedStyles.errorText}>
                Error loading students: {errorStudents?.message}
              </Text>
            )}
            {!isLoadingStudents && !isErrorStudents && (
              <FlatList
                data={availableStudents}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSelectStudent(item)}
                    disabled={linkMutation.isPending}
                    style={[
                      styles.studentItem,
                      item.id === selectedStudentId ? styles.selectedStudentItem : {},
                    ]}
                  >
                    <Text style={styles.studentName}>{item.name}</Text>
                    {item.id === selectedStudentId && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                  <Text style={appSharedStyles.emptyListText}>
                    {searchTerm
                      ? 'No matching active students found.'
                      : 'No active students available to link.'}
                  </Text>
                }
              />
            )}
          </View>

          {/* Selected Student Confirmation Display */}
          {selectedStudentName && (
            <Text style={styles.selectionConfirmation}>Selected: {selectedStudentName}</Text>
          )}

          {/* Mutation Status */}
          {linkMutation.isPending && (
            <View style={appSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={appSharedStyles.loadingText}>Linking Student...</Text>
            </View>
          )}
          {linkMutation.isError && !linkMutation.isPending && (
            <Text style={[commonSharedStyles.errorText, { marginTop: 10 }]}>
              Error:{' '}
              {linkMutation.error instanceof Error
                ? linkMutation.error.message
                : 'Failed to link student'}
            </Text>
          )}

          {/* Action Buttons */}
          <View style={appSharedStyles.buttonContainer}>
            <Button
              title={linkMutation.isPending ? 'Linking...' : 'Link Selected Student'}
              onPress={handleConfirmLink}
              disabled={isLinkDisabled}
            />
          </View>
          <View style={appSharedStyles.footerButton}>
            <Button
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={linkMutation.isPending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Local Styles
const styles = StyleSheet.create({
  searchInput: {
    marginBottom: 10,
  },
  listContainer: {
    flexGrow: 0, // Prevent FlatList from taking all height
    maxHeight: 250, // Limit height for scrolling
    borderColor: colors.borderPrimary,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
  },
  studentItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedStudentItem: {
    backgroundColor: colors.backgroundHighlight,
  },
  studentName: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  checkmark: {
    fontSize: 18,
    color: colors.primary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderSecondary,
  },
  selectionConfirmation: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: colors.textSecondary,
    marginBottom: 10,
    fontSize: 15,
  },
});

export default LinkStudentToParentModal;
