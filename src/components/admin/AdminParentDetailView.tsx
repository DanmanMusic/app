// src/components/admin/AdminParentDetailView.tsx
import React, { useMemo, useState } from 'react';

import { View, Text, Button, ActivityIndicator, FlatList, ScrollView } from 'react-native';

import { useQuery, useQueries, useQueryClient, useMutation } from '@tanstack/react-query';

import Toast from 'react-native-toast-message';

import LinkStudentToParentModal from './modals/LinkStudentToParentModal';
import { fetchAuthUser, fetchUserProfile, unlinkStudentFromParent } from '../../api/users';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { AdminParentDetailViewProps } from '../../types/componentProps';
import { User } from '../../types/dataTypes';
import { getUserDisplayName, getUserAvatarSource } from '../../utils/helpers';
import ConfirmationModal from '../common/ConfirmationModal';

export const AdminParentDetailView: React.FC<AdminParentDetailViewProps> = ({
  viewingUserId,
  onInitiateEditUser,
  onInitiateStatusUser,
  onViewStudentProfile,
  onInitiatePinGeneration,
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

  const {
    data: parentAuthData,
    isLoading: isLoadingParentAuth,
    isError: isErrorParentAuth,
  } = useQuery<{ email: string | null } | null, Error>({
    queryKey: ['authUser', viewingUserId],
    queryFn: () => fetchAuthUser(viewingUserId),
    enabled: !!viewingUserId && !!onInitiatePinGeneration,
    staleTime: 15 * 60 * 1000,
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
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Student unlinked successfully.',
        position: 'bottom',
      });
      queryClient.invalidateQueries({ queryKey: ['userProfile', variables.parentId] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', variables.studentId] });
      closeUnlinkConfirmModal();
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Unlinking Failed',
        text2: error.message || 'Could not unlink student.',
        position: 'bottom',
      });
      closeUnlinkConfirmModal();
    },
  });

  const closeUnlinkConfirmModal = () => {
    setIsUnlinkConfirmModalVisible(false);
    setLinkToRemove(null);
    unlinkMutation.reset();
  };

  const parentDisplayName = useMemo(
    () => (parent ? getUserDisplayName(parent) : 'Loading...'),
    [parent]
  );
  const isParentActive = useMemo(() => parent?.status === 'active', [parent]);

  const showPinButton = useMemo(() => {
    if (!onInitiatePinGeneration || !isParentActive || isLoadingParentAuth) return false;
    if (isErrorParentAuth) return true;
    return !parentAuthData?.email || parentAuthData.email.endsWith('@placeholder.app');
  }, [
    onInitiatePinGeneration,
    isParentActive,
    parentAuthData,
    isLoadingParentAuth,
    isErrorParentAuth,
  ]);

  const handleEdit = () => {
    if (parent && onInitiateEditUser) onInitiateEditUser(parent);
  };
  const handleStatus = () => {
    if (parent && onInitiateStatusUser) onInitiateStatusUser(parent);
  };
  const handleLinkStudent = () => setIsLinkStudentModalVisible(true);
  const handleInitiateUnlink = (studentToUnlink: User) => {
    if (!parent) return;
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
  const handlePinGenerationClick = () => {
    if (parent && onInitiatePinGeneration) {
      onInitiatePinGeneration(parent);
    }
  };

  if (parentLoading) {
    return (
      <View style={[commonSharedStyles.flex1, commonSharedStyles.baseCentered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text>Loading Parent Details...</Text>
      </View>
    );
  }
  if (parentError || !parent) {
    return (
      <View style={commonSharedStyles.flex1}>
        <Text style={commonSharedStyles.errorText}>
          Error loading parent details: {parentErrorMsg?.message || 'Parent not found.'}
        </Text>
      </View>
    );
  }
  if (parent.role !== 'parent') {
    return (
      <View style={commonSharedStyles.flex1}>
        <Text style={commonSharedStyles.errorText}>Error: User found but is not a parent.</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={commonSharedStyles.flex1}>
        <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifyCenter]}>
          <Text
            style={[
              commonSharedStyles.baseTitleText,
              commonSharedStyles.baseMarginTopBottom,
              commonSharedStyles.bold,
            ]}
          >
            Parent Details
          </Text>
        </View>

        <Text style={commonSharedStyles.baseSecondaryText}>
          Name: <Text style={commonSharedStyles.bold}>{parentDisplayName}</Text>
        </Text>
        <Text style={commonSharedStyles.baseSecondaryText}>
          ID: <Text style={commonSharedStyles.bold}>{parent.id}</Text>
        </Text>
        <Text style={commonSharedStyles.baseSecondaryText}>
          Status:{' '}
          <Text
            style={
              isParentActive ? commonSharedStyles.activeStatus : commonSharedStyles.inactiveStatus
            }
          >
            {parent.status}
          </Text>
        </Text>

        <View
          style={[
            commonSharedStyles.baseRow,
            commonSharedStyles.baseGap,
            commonSharedStyles.baseMarginTopBottom,
          ]}
        >
          <Button title="Edit Info" onPress={handleEdit} color={colors.warning} />
          <Button title="Manage Status" onPress={handleStatus} color={colors.secondary} />
          <Button title="Link Student" onPress={handleLinkStudent} color={colors.success} />
          {showPinButton && (
            <Button
              title="Login (PIN)"
              onPress={handlePinGenerationClick}
              color={colors.info}
              disabled={!isParentActive}
            />
          )}
        </View>

        <Text style={commonSharedStyles.baseSubTitleText}>
          Linked Students ({linkedStudents.length})
        </Text>

        {isLoadingLinkedStudents ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
        ) : isErrorLinkedStudents ? (
          <Text style={commonSharedStyles.errorText}>
            Error loading details for one or more linked students.
          </Text>
        ) : (
          <FlatList
            data={linkedStudents.sort((a, b) =>
              getUserDisplayName(a).localeCompare(getUserDisplayName(b))
            )}
            keyExtractor={item => item.id}
            renderItem={({ item: studentItem }) => (
              <View style={[commonSharedStyles.baseItem, commonSharedStyles.linkedStudentItem]}>
                <Text style={commonSharedStyles.itemTitle}>{getUserDisplayName(studentItem)}</Text>
                <Text style={commonSharedStyles.baseSecondaryText}>
                  Status:{' '}
                  <Text
                    style={
                      studentItem.status === 'active'
                        ? commonSharedStyles.activeStatus
                        : commonSharedStyles.inactiveStatus
                    }
                  >
                    {studentItem.status}
                  </Text>
                </Text>
                <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseGap]}>
                  <Button
                    title="View Profile"
                    onPress={() => onViewStudentProfile(studentItem.id)}
                    color={colors.primary}
                  />
                  <Button
                    title="Unlink Student"
                    onPress={() => handleInitiateUnlink(studentItem)}
                    color={colors.danger}
                    disabled={unlinkMutation.isPending}
                  />
                </View>
              </View>
            )}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={
              <Text style={commonSharedStyles.baseEmptyText}>
                No students currently linked to this parent.
              </Text>
            }
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
