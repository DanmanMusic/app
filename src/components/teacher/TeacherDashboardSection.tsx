import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { fetchAssignedTasks } from '../../api/assignedTasks';
import { fetchStudents } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { TeacherDashboardSectionProps } from '../../types/componentProps';
import { SimplifiedStudent } from '../../types/dataTypes';
import { PendingVerificationItem } from '../../views/TeacherView';

export const TeacherDashboardSection: React.FC<TeacherDashboardSectionProps> = ({
  onInitiateVerificationModal,
}) => {
  const { currentUserId: teacherId } = useAuth();

  const {
    data: assignedTasksResult,
    isLoading: isLoadingTasks,
    isError: isErrorTasks,
    error: errorTasks,
  } = useQuery({
    queryKey: [
      'assigned-tasks',
      { assignmentStatus: 'pending', studentStatus: 'active', context: 'teacherDashboard' },
    ],
    queryFn: () =>
      fetchAssignedTasks({ assignmentStatus: 'pending', studentStatus: 'active', limit: 1000 }),
    enabled: !!teacherId,
    staleTime: 1 * 60 * 1000,
  });
  const allPendingTasks = assignedTasksResult?.items ?? [];

  const { data: allStudentsResult, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students', { filter: 'all', context: 'teacherDashboardLookup' }],
    queryFn: () => fetchStudents({ filter: 'all', page: 1 }),
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000,
  });
  const allStudentsSimple: SimplifiedStudent[] = allStudentsResult?.students ?? [];

  const pendingVerifications = useMemo(() => {
    if (!teacherId || !allPendingTasks || !allStudentsSimple) return [];
    console.warn('[TeacherDashboard] Filtering pending tasks client-side. Inefficient.');

    return allPendingTasks;
  }, [teacherId, allPendingTasks, allStudentsSimple]);

  const isLoading = isLoadingTasks || isLoadingStudents;

  return (
    <View>
      <Text style={appSharedStyles.sectionTitle}>
        Pending Verifications ({pendingVerifications.length})
      </Text>
      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />}
      {isErrorTasks && (
        <Text style={[appSharedStyles.textDanger, { marginVertical: 5 }]}>
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
                <PendingVerificationItem
                  task={item}
                  studentName={studentInfo?.name || 'Unknown Student'}
                  onInitiateVerification={onInitiateVerificationModal}
                />
              );
            }}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        ) : (
          <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text>
        ))}
    </View>
  );
};
