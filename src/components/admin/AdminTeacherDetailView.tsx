// src/components/admin/AdminTeacherDetailView.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, Button, ActivityIndicator, ScrollView, FlatList, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { usePaginatedStudentsWithStats } from '../../hooks/usePaginatedStudentsWithStats';
import { fetchInstruments } from '../../api/instruments'; // <<< THE FIX IS HERE
import { fetchUserProfile } from '../../api/users';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { AdminTeacherDetailViewProps } from '../../types/componentProps';
import { User, Instrument } from '../../types/dataTypes';
import { getUserDisplayName, getUserAvatarSource } from '../../utils/helpers';
import { AdminStudentItem } from '../common/AdminStudentItem';

export const AdminTeacherDetailView: React.FC<AdminTeacherDetailViewProps> = ({
  viewingUserId,
  onInitiateEditUser,
  onInitiateStatusUser,
  onViewStudentProfile,
  onInitiatePinGeneration,
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);

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

  const { data: instruments = [] } = useQuery<Instrument[], Error>({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
  });

  useEffect(() => {
    const fetchAvatar = async () => {
      if (teacher?.avatarPath) {
        setIsLoadingAvatar(true);
        const source = await getUserAvatarSource(teacher);
        setAvatarUrl(source ? source.uri : null);
        setIsLoadingAvatar(false);
      } else {
        setAvatarUrl(null);
      }
    };
    fetchAvatar();
  }, [teacher]);

  const {
    students: linkedStudents,
    isLoading: isLoadingLinkedStudents,
    isError: isErrorLinkedStudents,
    error: errorLinkedStudents,
  } = usePaginatedStudentsWithStats({ teacherId: viewingUserId });

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
    if (teacher && onInitiatePinGeneration) onInitiatePinGeneration(teacher);
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

      <View style={{ alignItems: 'center', marginBottom: 15 }}>
        {isLoadingAvatar ? (
          <ActivityIndicator style={commonSharedStyles.detailAvatar} color={colors.primary} />
        ) : avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={commonSharedStyles.detailAvatar}
            resizeMode="cover"
          />
        ) : (
          <View style={[commonSharedStyles.detailAvatar, commonSharedStyles.avatarPlaceholder]}>
            <Text style={commonSharedStyles.avatarPlaceholderTextLarge}>
              {teacher.firstName?.charAt(0)}
              {teacher.lastName?.charAt(0)}
            </Text>
          </View>
        )}
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
          data={linkedStudents}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AdminStudentItem
              student={item}
              instruments={instruments}
              onViewManage={onViewStudentProfile}
              // The "Assign Task" button on the list item isn't strictly necessary here,
              // as the admin can view the profile to assign tasks. Passing an empty function.
              onInitiateAssignTask={() => {}}
            />
          )}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <Text style={commonSharedStyles.baseEmptyText}>
              No students currently linked to this teacher.
            </Text>
          }
        />
      )}
    </ScrollView>
  );
};
