import React from 'react';
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { fetchStudents } from '../../api/users';
import { User, SimplifiedStudent } from '../../types/dataTypes';
import { getUserDisplayName } from '../../utils/helpers';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { adminSharedStyles } from '../../styles/adminSharedStyles';
import { AdminTeacherDetailViewProps } from '../../types/componentProps';

export const AdminTeacherDetailView: React.FC<AdminTeacherDetailViewProps> = ({
  viewingUserId,
  onInitiateEditUser,
  onInitiateStatusUser,
  onViewStudentProfile,
}) => {
  const {
    data: teacher,
    isLoading: teacherLoading,
    isError: teacherError,
    error: teacherErrorMsg,
  } = useQuery<User, Error>({
    queryKey: ['user', viewingUserId, { role: 'teacher' }],
    queryFn: async () => {
      const response = await fetch(`/api/users/${viewingUserId}`);
      if (!response.ok) throw new Error(`Failed to fetch teacher ${viewingUserId}`);
      const userData = await response.json();
      if (userData.role !== 'teacher') throw new Error('User is not a teacher');
      return userData;
    },
    enabled: !!viewingUserId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: linkedStudentsResult,
    isLoading: isLoadingLinkedStudents,
    isError: isErrorLinkedStudents,
    error: errorLinkedStudents,
  } = useQuery({
    queryKey: ['students', { teacherId: viewingUserId, context: 'teacherDetailView' }],
    queryFn: () =>
      fetchStudents({
        teacherId: viewingUserId,
        filter: 'all',
        limit: 9999,
        page: 1,
      }),
    enabled: !!viewingUserId,
    staleTime: 5 * 60 * 1000,
  });

  const linkedStudents: SimplifiedStudent[] = linkedStudentsResult?.students ?? [];

  if (teacherLoading) {
    return (
      <View style={[appSharedStyles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (teacherError || !teacher) {
    return (
      <View style={appSharedStyles.container}>
        <Text style={appSharedStyles.textDanger}>
          Error loading teacher details: {teacherErrorMsg?.message || 'Teacher not found.'}
        </Text>
      </View>
    );
  }

  const teacherDisplayName = getUserDisplayName(teacher);
  const isTeacherActive = teacher.status === 'active';

  const handleEdit = () => onInitiateEditUser(teacher);
  const handleStatus = () => onInitiateStatusUser(teacher);
  const handleLoginQR = () => alert(`Simulating QR Code login for ${teacherDisplayName}...`);

  return (
    <ScrollView style={appSharedStyles.container}>
      <Text style={appSharedStyles.sectionTitle}>Teacher Details</Text>
      <Text style={appSharedStyles.itemDetailText}>Name: {teacherDisplayName}</Text>
      <Text style={appSharedStyles.itemDetailText}>ID: {teacher.id}</Text>
      <Text style={appSharedStyles.itemDetailText}>
        Status:{' '}
        <Text
          style={{
            fontWeight: 'bold',
            color: isTeacherActive ? colors.success : colors.secondary,
          }}
        >
          {teacher.status}
        </Text>
      </Text>

      <View
        style={[adminSharedStyles.adminStudentActions, commonSharedStyles.actionButtonsContainer]}
      >
        <Button title="Edit Info" onPress={handleEdit} color={colors.warning} />
        <Button title="Manage Status" onPress={handleStatus} color={colors.secondary} />
        <Button
          title="Login (QR - TODO)"
          onPress={handleLoginQR}
          color={colors.info}
          disabled={!isTeacherActive}
        />
      </View>

      <Text style={appSharedStyles.sectionTitle}>Linked Students</Text>
      {isLoadingLinkedStudents && (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
      )}
      {isErrorLinkedStudents && (
        <Text style={appSharedStyles.textDanger}>
          Error loading linked students: {errorLinkedStudents?.message}
        </Text>
      )}
      {!isLoadingLinkedStudents && linkedStudents.length > 0 && (
        <FlatList
          data={linkedStudents.sort((a, b) => a.name.localeCompare(b.name))}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[appSharedStyles.itemContainer, styles.linkedStudentItem]}>
              <Text style={appSharedStyles.itemTitle}>{item.name}</Text>
              <Text style={appSharedStyles.itemDetailText}>
                Status: {item.isActive ? 'Active' : 'Inactive'}
              </Text>
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
          No students currently linked to this teacher.
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
