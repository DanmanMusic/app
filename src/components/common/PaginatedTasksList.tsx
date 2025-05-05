// src/components/common/PaginatedTasksList.tsx
import React, { useMemo } from 'react';

import { View, Text, Button, FlatList, ActivityIndicator } from 'react-native';

import { AssignedTask, User } from '../../types/dataTypes';
import { TaskAssignmentFilterStatusAPI, StudentTaskFilterStatusAPI } from '../../api/assignedTasks';

import { usePaginatedAssignedTasks } from '../../hooks/usePaginatedAssignedTasks';
import { useAuth } from '../../contexts/AuthContext';

import { AssignedTaskDetailItem } from './AssignedTaskDetailItem';
import PaginationControls from '../admin/PaginationControls';

import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { colors } from '../../styles/colors';
import { useQuery } from '@tanstack/react-query';
import { fetchStudents, fetchUserProfile } from '../../api/users';
import { getUserDisplayName } from '../../utils/helpers';

interface PaginatedTasksListProps {
  viewingRole: 'admin' | 'teacher';
  teacherId?: string;
  initialAssignmentFilter?: TaskAssignmentFilterStatusAPI;
  initialStudentStatusFilter?: StudentTaskFilterStatusAPI;
  onInitiateVerification: (task: AssignedTask) => void;
  onInitiateDelete: (task: AssignedTask) => void;
}

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
          <Button
            title="All"
            onPress={() => setAssignmentFilter('all')}
            color={assignmentFilter === 'all' ? '' : colors.secondary}
          />
          <Button
            title="Assigned"
            onPress={() => setAssignmentFilter('assigned')}
            color={assignmentFilter === 'assigned' ? '' : colors.secondary}
          />
          <Button
            title="Pending"
            onPress={() => setAssignmentFilter('pending')}
            color={assignmentFilter === 'pending' ? colors.warning : colors.secondary}
          />
          <Button
            title="Completed"
            onPress={() => setAssignmentFilter('completed')}
            color={assignmentFilter === 'completed' ? colors.success : colors.secondary}
          />
        </View>
        {viewingRole === 'admin' && (
          <View style={commonSharedStyles.baseRowCentered}>
            <Text style={commonSharedStyles.filterLabel}>Student Status:</Text>
            <Button
              title="Active"
              onPress={() => setStudentStatusFilter('active')}
              color={studentStatusFilter === 'active' ? colors.success : colors.secondary}
            />
            <Button
              title="Inactive"
              onPress={() => setStudentStatusFilter('inactive')}
              color={studentStatusFilter === 'inactive' ? colors.warning : colors.secondary}
            />
            <Button
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

            const assignerNameDisplay = item.assignerName || `ID: ${item.assignedById}`;
            const verifierNameDisplay =
              item.verifierName || (item.verifiedById ? `ID: ${item.verifiedById}` : undefined);
            const studentStatusDisplay = item.studentStatus || 'unknown';

            const taskIsNotVerified = !(
              item.verificationStatus === 'verified' ||
              item.verificationStatus === 'partial' ||
              item.verificationStatus === 'incomplete'
            );
            let canDelete = false;
            if (viewingRole === 'admin' && taskIsNotVerified) {
              canDelete = true;
            } else if (
              viewingRole === 'teacher' &&
              item.assignedById === authUserId &&
              taskIsNotVerified
            ) {
              canDelete = true;
            }

            return (
              <AssignedTaskDetailItem
                item={item}
                studentName={studentNameDisplay}
                onInitiateVerification={onInitiateVerification}
                canDelete={canDelete}
                onDelete={canDelete ? () => onInitiateDelete(item) : undefined}
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
