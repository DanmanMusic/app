import React from 'react';
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

import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../types/dataTypes';
import { getUserDisplayName } from '../../utils/helpers';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { adminSharedStyles } from '../../styles/adminSharedStyles';

interface AdminParentDetailViewProps {
  viewingUserId: string;
  onInitiateEditUser: (user: User) => void;
  onInitiateStatusUser: (user: User) => void;
  onViewStudentProfile: (studentId: string) => void;
}

export const AdminParentDetailView: React.FC<AdminParentDetailViewProps> = ({
  viewingUserId,
  onInitiateEditUser,
  onInitiateStatusUser,
  onViewStudentProfile,
}) => {
  const { currentUserId: adminUserId } = useAuth();

  const {
    data: parent,
    isLoading: parentLoading,
    isError: parentError,
    error: parentErrorMsg,
  } = useQuery<User, Error>({
    queryKey: ['user', viewingUserId, { role: 'parent' }],
    queryFn: async () => {
      const response = await fetch(`/api/users/${viewingUserId}`);
      if (!response.ok) throw new Error(`Failed to fetch parent ${viewingUserId}`);
      const userData = await response.json();
      if (userData.role !== 'parent') throw new Error('User is not a parent');
      return userData;
    },
    enabled: !!viewingUserId,
    staleTime: 5 * 60 * 1000,
  });

  const linkedStudentIds = parent?.linkedStudentIds || [];
  const linkedStudentsQueries = useQueries({
    queries: linkedStudentIds.map(id => ({
      queryKey: ['user', id, { role: 'student' }],
      queryFn: async () => {
        const response = await fetch(`/api/users/${id}`);
        if (!response.ok) return null;
        const studentData = await response.json();
        return studentData.role === 'student' ? (studentData as User) : null;
      },
      enabled: !!parent && linkedStudentIds.length > 0,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const linkedStudents = linkedStudentsQueries.map(q => q.data).filter((s): s is User => !!s);
  const isLoadingLinkedStudents = linkedStudentsQueries.some(q => q.isLoading);

  if (parentLoading) {
    return (
      <View style={[appSharedStyles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (parentError || !parent) {
    return (
      <View style={appSharedStyles.container}>
        <Text style={appSharedStyles.textDanger}>
          Error loading parent details: {parentErrorMsg?.message || 'Parent not found.'}
        </Text>
      </View>
    );
  }

  const parentDisplayName = getUserDisplayName(parent);
  const isParentActive = parent.status === 'active';

  return (
    <ScrollView style={appSharedStyles.container}>
      <Text style={appSharedStyles.sectionTitle}>Parent Details</Text>
      <Text style={appSharedStyles.itemDetailText}>Name: {parentDisplayName}</Text>
      <Text style={appSharedStyles.itemDetailText}>ID: {parent.id}</Text>
      <Text style={appSharedStyles.itemDetailText}>
        Status:{' '}
        <Text
          style={{
            fontWeight: 'bold',
            color: isParentActive ? colors.success : colors.secondary,
          }}
        >
          {parent.status}
        </Text>
      </Text>
      <View
        style={[adminSharedStyles.adminStudentActions, commonSharedStyles.actionButtonsContainer]}
      >
        <Button
          title="Edit Info (TODO)"
          onPress={() => alert('Parent editing not implemented')}
          color={colors.warning}
          disabled={true}
        />
        <Button
          title="Manage Status"
          onPress={() => onInitiateStatusUser(parent)}
          color={colors.secondary}
        />
        <Button
          title="Link Another Student (TODO)"
          onPress={() => alert(`TODO: Implement link student flow for ${parentDisplayName}...`)}
          color={colors.info}
          disabled={!isParentActive}
        />
      </View>
      <Text style={appSharedStyles.sectionTitle}>Linked Students</Text>
      {isLoadingLinkedStudents && <ActivityIndicator color={colors.primary} />}
      {!isLoadingLinkedStudents && linkedStudents.length > 0 && (
        <FlatList
          data={linkedStudents.sort((a, b) =>
            getUserDisplayName(a).localeCompare(getUserDisplayName(b))
          )}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[appSharedStyles.itemContainer, styles.linkedStudentItem]}>
              <Text style={appSharedStyles.itemTitle}>{getUserDisplayName(item)}</Text>
              <Text style={appSharedStyles.itemDetailText}>Status: {item.status}</Text>
              <View style={styles.linkedStudentActions}>
                <Button title="View Profile" onPress={() => onViewStudentProfile(item.id)} />
              </View>
            </View>
          )}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
      {!isLoadingLinkedStudents && linkedStudents.length === 0 && (
        <Text style={appSharedStyles.emptyListText}>
          No students currently linked to this parent.
        </Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkedStudentItem: {
    backgroundColor: colors.backgroundSecondary,
  },
  linkedStudentActions: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
});
