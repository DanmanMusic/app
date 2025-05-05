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
} from 'react-native';
import Toast from 'react-native-toast-message';

import { fetchStudents } from '../../../api/users';
import { linkStudentToParent } from '../../../api/users';
import { SimplifiedStudent, User } from '../../../types/dataTypes';
import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';

interface LinkStudentToParentModalProps {
  visible: boolean;
  onClose: () => void;
  parentId: string;
  parentName: string;

  currentlyLinkedStudentIds?: string[];
}

export const LinkStudentToParentModal: React.FC<LinkStudentToParentModalProps> = ({
  visible,
  onClose,
  parentId,
  parentName,
  currentlyLinkedStudentIds = [],
}) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);

  const {
    data: studentListResult,
    isLoading: isLoadingStudents,
    isError: isErrorStudents,
    error: errorStudents,
  } = useQuery({
    queryKey: ['students', { filter: 'active', context: 'linkParentModal', search: searchTerm }],
    queryFn: () =>
      fetchStudents({
        filter: 'active',
        searchTerm: searchTerm,
        limit: 50,
        page: 1,
      }),
    enabled: visible,
    staleTime: 1 * 60 * 1000,
  });

  const availableStudents = useMemo(() => {
    const allFetched = studentListResult?.students ?? [];
    return allFetched
      .filter(student => !currentlyLinkedStudentIds.includes(student.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [studentListResult, currentlyLinkedStudentIds]);

  const linkMutation = useMutation({
    mutationFn: (studentIdToLink: string) => linkStudentToParent(parentId, studentIdToLink),
    onSuccess: (_, studentIdLinked) => {
      Toast.show({ type: 'success', text1: 'Success', text2: `Student linked successfully.` });

      queryClient.invalidateQueries({ queryKey: ['userProfile', parentId] });

      queryClient.invalidateQueries({ queryKey: ['parents'] });
      onClose();
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

  useEffect(() => {
    if (visible) {
      setSearchTerm('');
      setSelectedStudentId(null);
      setSelectedStudentName(null);
      linkMutation.reset();
    }
  }, [visible]);

  const handleSelectStudent = (student: SimplifiedStudent) => {
    setSelectedStudentId(student.id);
    setSelectedStudentName(student.name);
  };

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
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Link Student to Parent</Text>
          <Text style={commonSharedStyles.modalContextInfo}>Parent: {parentName}</Text>
          <Text style={commonSharedStyles.modalStepTitle}>Select Student to Link:</Text>

          {/* Search Input */}
          <TextInput
            style={[commonSharedStyles.input, commonSharedStyles.searchInput]}
            placeholder="Search active students by name..."
            placeholderTextColor={colors.textLight}
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!linkMutation.isPending}
          />

          {/* Student List */}
          <View style={commonSharedStyles.listItemFull}>
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
                      item.id === selectedStudentId ? commonSharedStyles.selectedStudentItem : {},
                    ]}
                  >
                    <Text style={commonSharedStyles.textPrimaryLarge}>{item.name}</Text>
                    {item.id === selectedStudentId && (
                      <Text style={commonSharedStyles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={commonSharedStyles.separator} />}
                ListEmptyComponent={
                  <Text style={commonSharedStyles.baseEmptyText}>
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
            <Text style={commonSharedStyles.selectionConfirmation}>
              Selected: {selectedStudentName}
            </Text>
          )}

          {/* Mutation Status */}
          {linkMutation.isPending && (
            <View style={commonSharedStyles.baseRowCentered}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={commonSharedStyles.baseSecondaryText}>Linking Student...</Text>
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
          <View style={commonSharedStyles.full}>
            <Button
              title={linkMutation.isPending ? 'Linking...' : 'Link Selected Student'}
              onPress={handleConfirmLink}
              disabled={isLinkDisabled}
            />
          </View>
          <View style={[commonSharedStyles.full, { marginTop: 10 }]}>
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

export default LinkStudentToParentModal;
