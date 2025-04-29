import React, { useMemo } from 'react';
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useQuery, useQueries } from '@tanstack/react-query';

import { fetchUserProfile } from '../../api/users';

import { User } from '../../types/dataTypes';
import { AdminParentDetailViewProps } from '../../types/componentProps';

import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { adminSharedStyles } from '../../styles/adminSharedStyles';
import { colors } from '../../styles/colors';
import { getUserDisplayName } from '../../utils/helpers';

export const AdminParentDetailView: React.FC<AdminParentDetailViewProps> = ({
  viewingUserId,

  onInitiateEditUser,
  onInitiateStatusUser,
  onViewStudentProfile,
}) => {
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

  const handleLinkStudent = () => {
    if (parent) {
      alert(
        `TODO: Implement link student flow for ${parentDisplayName}... (Parent ID: ${parent.id})`
      );
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
        {}
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
    <ScrollView style={appSharedStyles.container}>
      {}
      <Text style={appSharedStyles.sectionTitle}>Parent Details</Text>
      <Text style={appSharedStyles.itemDetailText}>Name: {parentDisplayName}</Text>
      <Text style={appSharedStyles.itemDetailText}>ID: {parent.id}</Text>
      <Text style={appSharedStyles.itemDetailText}>
        Status:{' '}
        <Text style={isParentActive ? styles.activeStatus : styles.inactiveStatus}>
          {parent.status}
        </Text>
      </Text>
      {}
      <View
        style={[adminSharedStyles.adminStudentActions, commonSharedStyles.actionButtonsContainer]}
      >
        {}
        <Button title="Edit Info (Limited)" onPress={handleEdit} color={colors.warning} />
        <Button title="Manage Status" onPress={handleStatus} color={colors.secondary} />
        {}
        <Button
          title="Link Another Student (TODO)"
          onPress={handleLinkStudent}
          color={colors.info}
        />
      </View>
      {}
      <Text style={appSharedStyles.sectionTitle}>Linked Students ({linkedStudents.length})</Text>
      {isLoadingLinkedStudents && (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
      )}
      {}
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
                {}
                <Button title="View Profile" onPress={() => onViewStudentProfile(studentItem.id)} />
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
      <View style={{ height: 30 }} /> {}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStatus: {
    fontWeight: 'bold',
    color: colors.success,
  },
  inactiveStatus: {
    fontWeight: 'bold',
    color: colors.secondary,
  },
  linkedStudentItem: {
    backgroundColor: colors.backgroundSecondary,
  },
  linkedStudentActions: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
});
