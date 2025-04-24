import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { View, Text, FlatList, Button, ActivityIndicator } from 'react-native';
import { fetchStudents } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { TeacherStudentsSectionProps } from '../../types/componentProps';
import { SimplifiedStudent } from '../../types/dataTypes';
import { StudentListItem } from '../common/StudentListItem';

export const TeacherStudentsSection: React.FC<TeacherStudentsSectionProps> = ({
  mockInstruments,
  onViewProfile,
  onAssignTask,
}) => {
  const { currentUserId: teacherId } = useAuth();

  const {
    data: allStudentsResult,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['students', { filter: 'all', context: 'teacherStudentsSection' }],
    queryFn: () => fetchStudents({ filter: 'all', page: 1 }),
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000,
  });
  const allStudentsSimple: SimplifiedStudent[] = allStudentsResult?.students ?? [];

  const studentsLinkedToTeacher = useMemo(() => {
    if (!teacherId || !allStudentsSimple) return [];
    console.warn(
      '[TeacherStudentsSection] Filtering students client-side. Inefficient/Inaccurate.'
    );

    return allStudentsSimple.sort((a, b) => a.name.localeCompare(b.name));
  }, [teacherId, allStudentsSimple]);

  return (
    <View>
      <Text style={appSharedStyles.sectionTitle}>
        My Students ({studentsLinkedToTeacher.length})
      </Text>
      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />}
      {isError && (
        <Text style={appSharedStyles.textDanger}>Error loading students: {error?.message}</Text>
      )}
      {!isLoading &&
        !isError &&
        (studentsLinkedToTeacher.length > 0 ? (
          <FlatList
            data={studentsLinkedToTeacher}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <StudentListItem
                student={item}
                mockInstruments={mockInstruments}
                onViewProfile={onViewProfile}
                onAssignTask={onAssignTask}
              />
            )}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        ) : (
          <Text style={appSharedStyles.emptyListText}> No students linked to you. </Text>
        ))}
      <View style={{ marginTop: 20, alignItems: 'flex-start' }}>
        <Button
          title="View All Students (TODO)"
          onPress={() => alert('Implement view all students')}
        />
      </View>
    </View>
  );
};