import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { fetchStudents } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/colors';
import { TeacherStudentsSectionProps } from '../../types/componentProps';
import { SimplifiedStudent } from '../../types/dataTypes';
import { StudentListItem } from '../common/StudentListItem';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const TeacherStudentsSection: React.FC<TeacherStudentsSectionProps> = ({
  instruments,
  onViewProfile,
  onAssignTask,
}) => {
  const { currentUserId: teacherId } = useAuth();

  const {
    data: studentsResult,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['students', { context: 'teacherStudents', teacherId }],
    queryFn: () => fetchStudents({ page: 1, filter: 'all', teacherId: teacherId ?? undefined }),
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000,
  });

  const studentsLinkedToTeacher: SimplifiedStudent[] = studentsResult?.students ?? [];

  return (
    <View style={[commonSharedStyles.baseMargin]}>
      <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifyCenter]}>
        <Text
          style={[
            commonSharedStyles.baseTitleText,
            commonSharedStyles.baseMarginTopBottom,
            commonSharedStyles.bold,
          ]}
        >
          My Students ({studentsLinkedToTeacher.length})
        </Text>
      </View>
      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />}
      {isError && (
        <Text style={commonSharedStyles.textDanger}>Error loading students: {error?.message}</Text>
      )}
      {!isLoading &&
        !isError &&
        (studentsLinkedToTeacher.length > 0 ? (
          <FlatList
            data={studentsLinkedToTeacher.sort((a, b) => a.name.localeCompare(b.name))}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <StudentListItem
                student={item}
                instruments={instruments}
                onViewProfile={onViewProfile}
                onAssignTask={onAssignTask}
              />
            )}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        ) : (
          <Text style={commonSharedStyles.baseEmptyText}> No students linked to you. </Text>
        ))}
    </View>
  );
};
