import React, { useMemo } from 'react';
import { View, Text, Button, ActivityIndicator, ScrollView, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { fetchStudents, fetchUserProfile } from '../../api/users';

import { User, SimplifiedStudent } from '../../types/dataTypes';

import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { colors } from '../../styles/colors';
import { getUserDisplayName } from '../../utils/helpers';
import { AdminTeacherDetailViewProps } from '../../types/componentProps';

export const AdminTeacherDetailView: React.FC<AdminTeacherDetailViewProps> = ({
  viewingUserId,
  onInitiateEditUser,
  onInitiateStatusUser,
  onViewStudentProfile,
  onInitiatePinGeneration,
}) => {
  const {
    data: teacher,
    isLoading: teacherLoading,
    isError: teacherError,
    error: teacherErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', viewingUserId],
    queryFn: () => fetchUserProfile(viewingUserId),
    enabled: !!viewingUserId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: linkedStudentsResult,
    isLoading: isLoadingLinkedStudents,
    isError: isErrorLinkedStudents,
    error: errorLinkedStudents,
  } = useQuery({
    queryKey: [
      'students',
      { teacherId: viewingUserId, filter: 'all', context: 'teacherDetailView' },
    ],
    queryFn: () =>
      fetchStudents({
        teacherId: viewingUserId,
        filter: 'all',
        limit: 9999,
        page: 1,
      }),
    enabled: !!teacher,
    staleTime: 5 * 60 * 1000,
  });

  const linkedStudents: SimplifiedStudent[] = useMemo(() => {
    return linkedStudentsResult?.students ?? [];
  }, [linkedStudentsResult]);

  const teacherDisplayName = useMemo(
    () => (teacher ? getUserDisplayName(teacher) : 'Loading...'),
    [teacher]
  );
  const isTeacherActive = useMemo(() => teacher?.status === 'active', [teacher]);

  const handleEdit = () => {
    if (teacher) onInitiateEditUser(teacher);
  };
  const handleStatus = () => {
    if (teacher) onInitiateStatusUser(teacher);
  };
  const handlePinGenerationClick = () => {
    if (teacher && onInitiatePinGeneration) {
      onInitiatePinGeneration(teacher);
    }
  };

  if (teacherLoading) {
    return (
      <View style={[commonSharedStyles.baseCentered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text>Loading Teacher Details...</Text>
      </View>
    );
  }

  if (teacherError || !teacher) {
    return (
      <View style={commonSharedStyles.flex1}>
        <Text style={commonSharedStyles.errorText}>
          Error loading teacher details: {teacherErrorMsg?.message || 'Teacher not found.'}
        </Text>
      </View>
    );
  }
  if (teacher.role !== 'teacher') {
    return (
      <View style={commonSharedStyles.flex1}>
        <Text style={commonSharedStyles.errorText}>Error: User found but is not a teacher.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[commonSharedStyles.flex1, commonSharedStyles.baseMargin]}>
      <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifyCenter]}>
        <Text
          style={[
            commonSharedStyles.baseTitleText,
            commonSharedStyles.baseMarginTopBottom,
            commonSharedStyles.bold,
          ]}
        >
          Teacher Details
        </Text>
      </View>
      <Text style={commonSharedStyles.baseSecondaryText}>
        Name: <Text style={commonSharedStyles.bold}>{teacherDisplayName}</Text>
      </Text>
      <Text style={commonSharedStyles.baseSecondaryText}>
        ID: <Text style={commonSharedStyles.bold}>{teacher.id}</Text>
      </Text>
      <Text style={commonSharedStyles.baseSecondaryText}>
        Status:{' '}
        <Text
          style={
            isTeacherActive ? commonSharedStyles.activeStatus : commonSharedStyles.inactiveStatus
          }
        >
          {teacher.status}
        </Text>
      </Text>
      <View
        style={[
          commonSharedStyles.baseRow,
          commonSharedStyles.baseMarginTopBottom,
          commonSharedStyles.baseGap,
        ]}
      >
        <Button title="Edit Info" onPress={handleEdit} color={colors.warning} />
        <Button title="Manage Status" onPress={handleStatus} color={colors.secondary} />
        {onInitiatePinGeneration && (
          <Button
            title="Login (PIN)"
            onPress={handlePinGenerationClick}
            color={colors.info}
            disabled={!isTeacherActive}
          />
        )}
      </View>
      <Text style={commonSharedStyles.baseSubTitleText}>
        Linked Students ({linkedStudents.length})
      </Text>
      {isLoadingLinkedStudents && (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
      )}
      {isErrorLinkedStudents && (
        <Text style={commonSharedStyles.errorText}>
          Error loading linked students: {errorLinkedStudents?.message}
        </Text>
      )}
      {!isLoadingLinkedStudents && !isErrorLinkedStudents && (
        <FlatList
          data={linkedStudents.sort((a, b) => a.name.localeCompare(b.name))}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                commonSharedStyles.baseItem,
                commonSharedStyles.baseRow,
                commonSharedStyles.justifySpaceBetween,
              ]}
            >
              <View>
                <Text style={commonSharedStyles.itemTitle}>{item.name}</Text>
                <Text style={commonSharedStyles.baseSecondaryText}>
                  Status:{' '}
                  <Text
                    style={
                      item.isActive
                        ? commonSharedStyles.activeStatus
                        : commonSharedStyles.inactiveStatus
                    }
                  >
                    {item.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </Text>
              </View>
              <View>
                <Button
                  title="View Profile"
                  onPress={() => onViewStudentProfile(item.id)}
                  color={colors.primary}
                />
              </View>
            </View>
          )}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={() => (
            <Text style={commonSharedStyles.baseEmptyText}>
              No students currently linked to this teacher.
            </Text>
          )}
        />
      )}
    </ScrollView>
  );
};
