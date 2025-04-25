import React from 'react';
import { View, Text, Button, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../types/dataTypes';
import { getUserDisplayName } from '../../utils/helpers';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { adminSharedStyles } from '../../styles/adminSharedStyles';

interface AdminTeacherDetailViewProps {
  viewingUserId: string;
  onInitiateEditUser: (user: User) => void;
  onInitiateStatusUser: (user: User) => void;
}

export const AdminTeacherDetailView: React.FC<AdminTeacherDetailViewProps> = ({
  viewingUserId,
  onInitiateEditUser,
  onInitiateStatusUser,
}) => {
  const { currentUserId: adminUserId } = useAuth();

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
        <Button
          title="Edit Info"
          onPress={() => onInitiateEditUser(teacher)}
          color={colors.warning}
        />
        <Button
          title="Manage Status"
          onPress={() => onInitiateStatusUser(teacher)}
          color={colors.secondary}
        />
        <Button
          title="Login (QR - TODO)"
          onPress={() => alert(`Simulating QR Code login for ${teacherDisplayName}...`)}
          color={colors.info}
          disabled={!isTeacherActive}
        />
      </View>
      <Text style={appSharedStyles.sectionTitle}>Linked Students (TODO)</Text>
      <Text style={appSharedStyles.emptyListText}>
        List of students linked to this teacher will go here.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
