import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { View, Text, FlatList, ActivityIndicator, Button } from 'react-native';
import { fetchAssignedTasks } from '../../api/assignedTasks';
import { fetchStudents } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/colors';
import { TeacherDashboardSectionProps } from '../../types/componentProps';
import { SimplifiedStudent } from '../../types/dataTypes';
import { AssignedTaskDetailItem } from '../common/AssignedTaskDetailItem';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const TeacherDashboardSection: React.FC<TeacherDashboardSectionProps> = ({
  onInitiateVerificationModal,
  setViewingSection,
}) => {
  const { currentUserId: teacherId } = useAuth();

  const {
    data: pendingTasksResult,
    isLoading: isLoadingTasks,
    isError: isErrorTasks,
    error: errorTasks,
  } = useQuery({
    queryKey: [
      'assigned-tasks',
      {
        assignmentStatus: 'pending',
        studentStatus: 'active',
        teacherId,
        context: 'teacherDashboard',
      },
    ],
    queryFn: () =>
      fetchAssignedTasks({
        assignmentStatus: 'pending',
        studentStatus: 'active',
        teacherId: teacherId ?? undefined,
        limit: 1000,
      }),
    enabled: !!teacherId,
    staleTime: 1 * 60 * 1000,
  });

  const pendingVerifications = pendingTasksResult?.items ?? [];

  const {
    data: allStudentsResult,
    isLoading: isLoadingStudents,
    isError: isErrorStudents,
    error: errorStudents,
  } = useQuery({
    queryKey: ['students', { filter: 'all', context: 'teacherDashboardLookup' }],
    queryFn: () => fetchStudents({ filter: 'all', page: 1 }),
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000,
  });
  const allStudentsSimple: SimplifiedStudent[] = allStudentsResult?.students ?? [];

  const isLoading = isLoadingTasks || isLoadingStudents;

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
          Dashboard Overview
        </Text>
      </View>
      {isLoadingStudents && (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
      )}
      {isErrorStudents && (
        <Text style={[commonSharedStyles.textDanger, { marginVertical: 5 }]}>
          Error loading students: {errorStudents?.message}
        </Text>
      )}
      {!isLoadingStudents &&
        !isErrorStudents &&
        (allStudentsSimple.length > 0 ? (
          <View
            style={[
              commonSharedStyles.baseRow,
              commonSharedStyles.baseGap,
              commonSharedStyles.baseMarginTopBottom,
            ]}
          >
            <Button
              title={`My Students: (${allStudentsSimple.length})`}
              onPress={() => setViewingSection('students')}
              color={colors.warning}
            />
            <Button title="Tasks" onPress={() => setViewingSection('tasks')} />
          </View>
        ) : (
          <Text style={commonSharedStyles.baseEmptyText}>No students.</Text>
        ))}

      <Text style={[commonSharedStyles.baseSubTitleText, commonSharedStyles.baseMarginTopBottom]}>
        Pending Verifications ({pendingVerifications.length})
      </Text>
      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />}
      {isErrorTasks && (
        <Text style={[commonSharedStyles.textDanger, { marginVertical: 5 }]}>
          Error loading tasks: {errorTasks?.message}
        </Text>
      )}
      {!isLoading &&
        !isErrorTasks &&
        (pendingVerifications.length > 0 ? (
          <FlatList
            data={pendingVerifications.sort(
              (a, b) =>
                new Date(a.completedDate || a.assignedDate).getTime() -
                new Date(b.completedDate || b.assignedDate).getTime()
            )}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              const studentInfo = allStudentsSimple.find(s => s.id === item.studentId);
              return (
                <AssignedTaskDetailItem
                  item={item}
                  studentName={studentInfo?.name || 'Unknown Student'}
                  showStudentName={true}
                  onInitiateVerification={onInitiateVerificationModal}
                />
              );
            }}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        ) : (
          <Text style={commonSharedStyles.baseEmptyText}>No tasks pending verification.</Text>
        ))}
    </View>
  );
};
