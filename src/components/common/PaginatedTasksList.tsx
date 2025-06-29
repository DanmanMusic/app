// src/components/common/PaginatedTasksList.tsx
import React, { useMemo } from 'react';

import { View, Text, FlatList, ActivityIndicator } from 'react-native';

import { useQuery } from '@tanstack/react-query';

import { AssignedTaskDetailItem } from './AssignedTaskDetailItem';
import { fetchStudents, fetchUserProfile } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';
import { usePaginatedAssignedTasks } from '../../hooks/usePaginatedAssignedTasks';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { PaginatedTasksListProps } from '../../types/componentProps';
import { User } from '../../types/dataTypes';
import { getUserDisplayName } from '../../utils/helpers';
import PaginationControls from '../admin/PaginationControls';
import { CustomButton } from './CustomButton';

export const PaginatedTasksList: React.FC<PaginatedTasksListProps> = ({
  viewingRole,
  teacherId,
  initialAssignmentFilter = 'all',
  initialStudentStatusFilter = 'active',
  onInitiateVerification,
  onInitiateDelete,
}) => {
  const { currentUserId: authUserId } = useAuth();

  const {
    tasks,
    currentPage,
    totalPages,
    setPage,
    assignmentFilter,
    setAssignmentFilter,
    studentStatusFilter,
    setStudentStatusFilter,
    isLoading: isLoadingTasks,
    isFetching: isFetchingTasks,
    isError: isErrorTasks,
    error: errorTasks,
  } = usePaginatedAssignedTasks(
    initialAssignmentFilter,
    initialStudentStatusFilter,
    null,
    viewingRole === 'teacher' ? teacherId : undefined
  );

  const isDataLoading = isLoadingTasks;

  const { data: allStudentsProfilesData, isLoading: isLoadingStudents } = useQuery<User[], Error>({
    queryKey: [
      'students_profiles',
      { filter: 'all', limit: 9999, context: 'paginatedTasksListStudentNameLookup' },
    ],
    queryFn: async () => {
      const result = await fetchStudents({ page: 1, limit: 9999, filter: 'all' });
      const students = await Promise.all((result?.students || []).map(s => fetchUserProfile(s.id)));
      return students.filter((u): u is User => u !== null);
    },
    staleTime: 10 * 60 * 1000,
  });

  const studentNameLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    (allStudentsProfilesData || []).forEach(student => {
      if (student && student.id) {
        lookup[student.id] = getUserDisplayName(student);
      }
    });
    return lookup;
  }, [allStudentsProfilesData]);

  return (
    <View style={commonSharedStyles.flex1}>
      <View style={commonSharedStyles.filterSection}>
        <View style={commonSharedStyles.baseRowCentered}>
          <Text style={commonSharedStyles.filterLabel}>Task Status:</Text>
          <CustomButton
            title="All"
            onPress={() => setAssignmentFilter('all')}
            color={assignmentFilter === 'all' ? colors.primary : colors.secondary}
          />
          <CustomButton
            title="Assigned"
            onPress={() => setAssignmentFilter('assigned')}
            color={assignmentFilter === 'assigned' ? colors.primary : colors.secondary}
          />
          <CustomButton
            title="Pending"
            onPress={() => setAssignmentFilter('pending')}
            color={assignmentFilter === 'pending' ? colors.warning : colors.secondary}
          />
          <CustomButton
            title="Completed"
            onPress={() => setAssignmentFilter('completed')}
            color={assignmentFilter === 'completed' ? colors.success : colors.secondary}
          />
        </View>
        {viewingRole === 'admin' && (
          <View style={commonSharedStyles.baseRowCentered}>
            <Text style={commonSharedStyles.filterLabel}>Student Status:</Text>
            <CustomButton
              title="Active"
              onPress={() => setStudentStatusFilter('active')}
              color={studentStatusFilter === 'active' ? colors.success : colors.secondary}
            />
            <CustomButton
              title="Inactive"
              onPress={() => setStudentStatusFilter('inactive')}
              color={studentStatusFilter === 'inactive' ? colors.warning : colors.secondary}
            />
            <CustomButton
              title="All"
              onPress={() => setStudentStatusFilter('all')}
              color={studentStatusFilter === 'all' ? colors.info : colors.secondary}
            />
          </View>
        )}
      </View>

      {(isDataLoading || isLoadingStudents) && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
      )}

      {isErrorTasks && !isLoadingTasks && (
        <View style={commonSharedStyles.errorContainer}>
          <Text style={commonSharedStyles.errorText}>
            Error loading tasks: {errorTasks?.message}
          </Text>
        </View>
      )}

      {!(isDataLoading || isLoadingStudents) && !isErrorTasks && (
        <FlatList
          style={commonSharedStyles.flex1}
          data={tasks}
          keyExtractor={item => `task-list-${item.id}`}
          renderItem={({ item }) => {
            const studentNameDisplay = studentNameLookup[item.studentId] || `ID: ${item.studentId}`;
            let canDelete = false;

            if (!item.isComplete || item.verificationStatus === 'pending') {
              if (viewingRole === 'admin') {
                canDelete = true;
              } else if (viewingRole === 'teacher') {
                const isTeacherOwner = authUserId === item.assignedById;
                const isSelfAssigned = item.studentId === item.assignedById;
                const isLinkedToStudent = item.studentLinkedTeacherIds?.includes(authUserId!);
                if (isTeacherOwner || (isSelfAssigned && isLinkedToStudent)) {
                  canDelete = true;
                }
              }
            }

            return (
              <AssignedTaskDetailItem
                item={item}
                studentName={studentNameDisplay}
                showStudentName={true}
                onInitiateVerification={onInitiateVerification}
                canDelete={canDelete}
                onDelete={canDelete ? onInitiateDelete : undefined}
              />
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <Text style={[commonSharedStyles.baseEmptyText, { padding: 20 }]}>
              No tasks match the current filters.
            </Text>
          }
          ListHeaderComponent={
            isFetchingTasks && !isLoadingTasks ? (
              <ActivityIndicator size="small" color={colors.secondary} />
            ) : null
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 10 }}
        />
      )}
    </View>
  );
};
