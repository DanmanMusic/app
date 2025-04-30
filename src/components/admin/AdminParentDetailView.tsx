import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useQuery, useQueries, useQueryClient, useMutation } from '@tanstack/react-query';

import { fetchUserProfile, unlinkStudentFromParent } from '../../api/users';

import { User } from '../../types/dataTypes';
import { AdminParentDetailViewProps } from '../../types/componentProps';

import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { adminSharedStyles } from '../../styles/adminSharedStyles';
import { colors } from '../../styles/colors';
import { getUserDisplayName } from '../../utils/helpers';
import LinkStudentToParentModal from './modals/LinkStudentToParentModal';
import Toast from 'react-native-toast-message';
import ConfirmationModal from '../common/ConfirmationModal';

export const AdminParentDetailView: React.FC<AdminParentDetailViewProps> = ({
  viewingUserId,
  onInitiateEditUser,
  onInitiateStatusUser,
  onViewStudentProfile,
}) => {
  const queryClient = useQueryClient();

  const {
    data: parent,
    isLoading: parentLoading,
    isError: parentError,
    error: parentErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', viewingUserId],
    queryFn: () => fetchUserProfile(viewingUserId),
    enabled: !!viewingUserId,
    staleTime: 5 * 60 * 1000,
  });

  const [isLinkStudentModalVisible, setIsLinkStudentModalVisible] = useState(false);
  const [isUnlinkConfirmModalVisible, setIsUnlinkConfirmModalVisible] = useState(false);
  const [linkToRemove, setLinkToRemove] = useState<{
    parentId: string;
    studentId: string;
    studentName: string;
  } | null>(null);

  const linkedStudentIds = useMemo(() => parent?.linkedStudentIds || [], [parent]);

  const linkedStudentsQueries = useQueries({
    queries: linkedStudentIds.map(id => ({
      queryKey: ['userProfile', id],
      queryFn: () => fetchUserProfile(id),
      enabled: !!parent,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    })),
  });

  const { linkedStudents, isLoadingLinkedStudents, isErrorLinkedStudents } = useMemo(() => {
    const students: User[] = [];
    let isLoading = false;
    let isError = false;

    if (linkedStudentsQueries.length > 0) {
      isLoading = linkedStudentsQueries.some(q => q.isLoading || q.isFetching);
      isError = linkedStudentsQueries.some(q => q.isError);
      linkedStudentsQueries.forEach(q => {
        if (q.isSuccess && q.data && q.data.role === 'student') {
          students.push(q.data);
        } else if (q.isError) {
          console.error(`[AdminParentDetailView] Error fetching linked student:`, q.error?.message);
        }
      });
    }

    return {
      linkedStudents: students,
      isLoadingLinkedStudents: isLoading,
      isErrorLinkedStudents: isError,
    };
  }, [linkedStudentsQueries]);

  const unlinkMutation = useMutation({
    mutationFn: (variables: { parentId: string; studentId: string }) =>
      unlinkStudentFromParent(variables.parentId, variables.studentId),
    onSuccess: (_, variables) => {
      Toast.show({ type: 'success', text1: 'Success', text2: 'Student unlinked successfully.' });
      queryClient.invalidateQueries({ queryKey: ['userProfile', variables.parentId] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', variables.studentId] });
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });

      closeUnlinkConfirmModal(); // Close confirmation modal
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Unlinking Failed',
        text2: error.message || 'Could not unlink student.',
      });
      // Keep confirmation modal open on error? Or close? Closing for now.
      closeUnlinkConfirmModal();
    },
  });

  const closeUnlinkConfirmModal = () => {
    setIsUnlinkConfirmModalVisible(false);
    setLinkToRemove(null);
    unlinkMutation.reset(); // Reset mutation state
  };

  const parentDisplayName = useMemo(
    () => (parent ? getUserDisplayName(parent) : 'Loading...'),
    [parent]
  );
  const isParentActive = useMemo(() => parent?.status === 'active', [parent]);

  const handleEdit = () => {
    if (parent && onInitiateEditUser) {
      onInitiateEditUser(parent);
    }
  };
  const handleStatus = () => {
    if (parent && onInitiateStatusUser) {
      onInitiateStatusUser(parent);
    }
  };

  const handleLinkStudent = () => setIsLinkStudentModalVisible(true);

  const handleInitiateUnlink = (studentToUnlink: User) => {
    if (!parent) return; // Should not happen if button is visible
    setLinkToRemove({
      parentId: parent.id,
      studentId: studentToUnlink.id,
      studentName: getUserDisplayName(studentToUnlink),
    });
    setIsUnlinkConfirmModalVisible(true);
  };

  const handleConfirmUnlink = () => {
    if (linkToRemove && !unlinkMutation.isPending) {
      unlinkMutation.mutate({ parentId: linkToRemove.parentId, studentId: linkToRemove.studentId });
    }
  };

  if (parentLoading) {
    return (
      <View style={[appSharedStyles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text>Loading Parent Details...</Text>
      </View>
    );
  }

  if (parentError || !parent) {
    return (
      <View style={appSharedStyles.container}>
        <Text style={commonSharedStyles.errorText}>
          Error loading parent details: {parentErrorMsg?.message || 'Parent not found.'}
        </Text>
      </View>
    );
  }

  if (parent.role !== 'parent') {
    return (
      <View style={appSharedStyles.container}>
        <Text style={commonSharedStyles.errorText}>Error: User found but is not a parent.</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={appSharedStyles.container}>
        <Text style={appSharedStyles.sectionTitle}>Parent Details</Text>
        <Text style={appSharedStyles.itemDetailText}>Name: {parentDisplayName}</Text>
        <Text style={appSharedStyles.itemDetailText}>ID: {parent.id}</Text>
        <Text style={appSharedStyles.itemDetailText}>
          Status:{' '}
          <Text style={isParentActive ? styles.activeStatus : styles.inactiveStatus}>
            {parent.status}
          </Text>
        </Text>
        <View
          style={[adminSharedStyles.adminStudentActions, commonSharedStyles.actionButtonsContainer]}
        >
          <Button title="Edit Info" onPress={handleEdit} color={colors.warning} />
          <Button title="Manage Status" onPress={handleStatus} color={colors.secondary} />
          <Button title="Link Student" onPress={handleLinkStudent} color={colors.info} />
        </View>
        <Text style={appSharedStyles.sectionTitle}>Linked Students ({linkedStudents.length})</Text>
        {isLoadingLinkedStudents && (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
        )}
        {isErrorLinkedStudents && !isLoadingLinkedStudents && (
          <Text style={commonSharedStyles.errorText}>
            Error loading details for one or more linked students.
          </Text>
        )}
        {!isLoadingLinkedStudents && !isErrorLinkedStudents && (
          <FlatList
            data={linkedStudents.sort((a, b) =>
              getUserDisplayName(a).localeCompare(getUserDisplayName(b))
            )}
            keyExtractor={item => item.id}
            renderItem={({ item: studentItem }) => (
              <View style={[appSharedStyles.itemContainer, styles.linkedStudentItem]}>
                <Text style={appSharedStyles.itemTitle}>{getUserDisplayName(studentItem)}</Text>
                <Text style={appSharedStyles.itemDetailText}>
                  Status:{' '}
                  <Text
                    style={
                      studentItem.status === 'active' ? styles.activeStatus : styles.inactiveStatus
                    }
                  >
                    {studentItem.status}
                  </Text>
                </Text>
                <View style={styles.linkedStudentActions}>
                  <Button
                    title="View Profile"
                    onPress={() => onViewStudentProfile(studentItem.id)}
                  />
                  <Button
                    title="Unlink Student"
                    onPress={() => handleInitiateUnlink(studentItem)}
                    color={colors.danger}
                    disabled={unlinkMutation.isPending} // Disable while unlinking
                  />
                </View>
              </View>
            )}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={() => (
              <Text style={appSharedStyles.emptyListText}>
                No students currently linked to this parent.
              </Text>
            )}
          />
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
      {parent && (
        <LinkStudentToParentModal
          visible={isLinkStudentModalVisible}
          onClose={() => setIsLinkStudentModalVisible(false)}
          parentId={parent.id}
          parentName={parentDisplayName}
          currentlyLinkedStudentIds={linkedStudentIds}
        />
      )}
      <ConfirmationModal
        visible={isUnlinkConfirmModalVisible}
        title="Confirm Unlink"
        message={`Are you sure you want to unlink student "${linkToRemove?.studentName || ''}" from parent "${parentDisplayName}"?`}
        confirmText={unlinkMutation.isPending ? 'Unlinking...' : 'Yes, Unlink'}
        onConfirm={handleConfirmUnlink}
        onCancel={closeUnlinkConfirmModal}
        confirmDisabled={unlinkMutation.isPending}
      />
    </>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStatus: { fontWeight: 'bold', color: colors.success },
  inactiveStatus: { fontWeight: 'bold', color: colors.secondary },
  linkedStudentItem: { backgroundColor: colors.backgroundSecondary },
  linkedStudentActions: {
    marginTop: 8,
    flexDirection: 'row', // Arrange buttons horizontally
    gap: 10, // Add space between buttons
    justifyContent: 'flex-start', // Align buttons to the start
  },
});
