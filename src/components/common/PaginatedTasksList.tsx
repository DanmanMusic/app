// src/components/common/PaginatedTasksList.tsx
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { View, Text, Button, FlatList, ActivityIndicator } from 'react-native';

// API Imports
import { fetchStudents, fetchTeachers, fetchAdmins, fetchUserProfile } from '../../api/users';
import { AssignedTask, User, UserStatus } from '../../types/dataTypes';
import { TaskAssignmentFilterStatusAPI, StudentTaskFilterStatusAPI } from '../../api/assignedTasks';

// Hook Imports
import { usePaginatedAssignedTasks } from '../../hooks/usePaginatedAssignedTasks';
import { useAuth } from '../../contexts/AuthContext'; // Needed for teacher permission check

// Component Imports
import { AssignedTaskDetailItem } from './AssignedTaskDetailItem';
import PaginationControls from '../admin/PaginationControls'; // Reuse existing pagination

// Style & Helper Imports
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { colors } from '../../styles/colors';
import { getUserDisplayName } from '../../utils/helpers';

interface PaginatedTasksListProps {
  viewingRole: 'admin' | 'teacher';
  teacherId?: string; // Required if viewingRole is 'teacher'
  initialAssignmentFilter?: TaskAssignmentFilterStatusAPI;
  initialStudentStatusFilter?: StudentTaskFilterStatusAPI;
  onInitiateVerification: (task: AssignedTask) => void;
  onInitiateDelete: (task: AssignedTask) => void; // Callback to parent to show confirmation
}

export const PaginatedTasksList: React.FC<PaginatedTasksListProps> = ({
  viewingRole,
  teacherId,
  initialAssignmentFilter = 'all', // Default to 'all'
  initialStudentStatusFilter = 'active', // Default to 'active'
  onInitiateVerification,
  onInitiateDelete,
}) => {
  const { currentUserId: authUserId } = useAuth();

  // --- Use the paginated hook ---
  const {
    tasks,
    currentPage,
    totalPages,
    totalItems,
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
    null, // studentId filter not used directly here
    viewingRole === 'teacher' ? teacherId : undefined // Pass teacherId if role is teacher
  );

  // --- Fetch User Lookups (similar to modal, optimize later if needed) ---
  // Fetch Students
  const { data: allStudentsData, isLoading: isLoadingStudents } = useQuery<User[], Error>({
    queryKey: ['students', { filter: 'all', limit: 9999, context: 'paginatedTasksListLookup' }],
    queryFn: async () => {
      const result = await fetchStudents({ page: 1, limit: 9999, filter: 'all' });
      const students = await Promise.all((result?.students || []).map(s => fetchUserProfile(s.id)));
      return students.filter((u): u is User => u !== null);
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch Teachers
  const { data: allTeachersData, isLoading: isLoadingTeachers } = useQuery<User[], Error>({
    queryKey: ['teachers', { limit: 9999, context: 'paginatedTasksListLookup' }],
    queryFn: async () => {
      const result = await fetchTeachers({ page: 1, limit: 9999 });
      return result?.items || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch Admins
  const { data: allAdminsData, isLoading: isLoadingAdmins } = useQuery<User[], Error>({
    queryKey: ['admins', { limit: 9999, context: 'paginatedTasksListLookup' }],
    queryFn: async () => {
      const result = await fetchAdmins({ page: 1, limit: 9999 });
      return result?.items || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const userLookup = useMemo(() => {
    const lookup: Record<string, { name: string; status: UserStatus | 'unknown' }> = {};
    const allUsers = [
      ...(allStudentsData || []),
      ...(allTeachersData || []),
      ...(allAdminsData || []),
    ];
    allUsers.forEach(user => {
      if (user && user.id) {
        lookup[user.id] = {
          name: getUserDisplayName(user),
          status: user.status || 'unknown',
        };
      }
    });
    return lookup;
  }, [allStudentsData, allTeachersData, allAdminsData]);

  const isLoadingUsers = isLoadingStudents || isLoadingTeachers || isLoadingAdmins;

  // Combined loading state
  const isDataLoading = isLoadingTasks || isLoadingUsers;

  // --- Render Logic ---
  return (
    <View style={commonSharedStyles.flex1}>
      {/* Filter Section */}
      <View style={commonSharedStyles.filterSection}>
        <View style={commonSharedStyles.baseRowCentered}>
          <Text style={commonSharedStyles.filterLabel}>Task Status:</Text>
          <Button
            title="All"
            onPress={() => setAssignmentFilter('all')}
            color={assignmentFilter === 'all' ? colors.primary : colors.secondary}
          />
          <Button
            title="Assigned"
            onPress={() => setAssignmentFilter('assigned')}
            color={assignmentFilter === 'assigned' ? colors.primary : colors.secondary}
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
        {/* Show Student Status Filter only for Admins */}
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
              color={studentStatusFilter === 'inactive' ? colors.secondary : colors.secondary}
            />
            <Button
              title="All"
              onPress={() => setStudentStatusFilter('all')}
              color={studentStatusFilter === 'all' ? colors.info : colors.secondary}
            />
          </View>
        )}
      </View>

      {/* Loading Indicator */}
      {isDataLoading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
      )}

      {/* Error Display */}
      {isErrorTasks && !isLoadingTasks && (
        <View style={commonSharedStyles.errorContainer}>
          <Text style={commonSharedStyles.errorText}>
            Error loading tasks: {errorTasks?.message}
          </Text>
        </View>
      )}

      {/* Sub-loading indicator for user lookup */}
      {!isDataLoading && isLoadingUsers && (
        <Text
          style={[commonSharedStyles.textCenter, { color: colors.textLight, marginVertical: 10 }]}
        >
          Loading user details...
        </Text>
      )}

      {/* Task List */}
      {!isDataLoading && !isErrorTasks && (
        <FlatList
          style={commonSharedStyles.flex1} // Allow list to take remaining space
          data={tasks}
          keyExtractor={item => `task-list-${item.id}`}
          renderItem={({ item }) => {
            const studentInfo = userLookup[item.studentId] || {
              name: `ID: ${item.studentId}`,
              status: 'unknown',
            };
            const assignerInfo = userLookup[item.assignedById] || {
              name: `ID: ${item.assignedById}`,
              status: 'unknown',
            };
            const verifierInfo = item.verifiedById ? userLookup[item.verifiedById] : null;

            // Determine delete permission
            const taskIsNotVerified =
              item.verificationStatus === null || item.verificationStatus === 'pending';
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
                studentName={studentInfo.name}
                assignerName={assignerInfo.name}
                verifierName={verifierInfo?.name}
                studentStatus={studentInfo.status}
                onInitiateVerification={onInitiateVerification} // Pass down prop
                // Pass down delete handler only if delete is possible
                onDelete={canDelete && onInitiateDelete ? () => onInitiateDelete(item) : undefined}
                // Disabled prop might not be needed if handled by parent's ConfirmationModal state
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
          contentContainerStyle={{ paddingBottom: 10 }} // Ensure space for pagination
        />
      )}
    </View>
  );
};
