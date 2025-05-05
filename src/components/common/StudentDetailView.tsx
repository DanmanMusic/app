// src/components/common/StudentDetailView.tsx
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  ScrollView,
  Button,
  FlatList,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { fetchInstruments } from '../../api/instruments';
import { fetchStudentBalance } from '../../api/tickets';
import { fetchUserProfile, fetchTeachers, fetchAuthUser } from '../../api/users';
import { usePaginatedStudentHistory } from '../../hooks/usePaginatedStudentHistory';
import { usePaginatedStudentTasks } from '../../hooks/usePaginatedStudentTasks';
import { TicketHistoryItem } from './TicketHistoryItem';
import PaginationControls from '../admin/PaginationControls';
import { AssignedTask, Instrument, User } from '../../types/dataTypes';
import { getInstrumentNames, getUserDisplayName, timestampDisplay } from '../../utils/helpers';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { colors } from '../../styles/colors';
import { StudentDetailViewProps } from '../../types/componentProps';
import { useAuth } from '../../contexts/AuthContext';
import { AssignedTaskDetailItem } from './AssignedTaskDetailItem';

export const StudentDetailView: React.FC<StudentDetailViewProps> = ({
  viewingStudentId,
  onInitiateVerification,
  onInitiateAssignTaskForStudent,
  onInitiateEditStudent,
  onInitiateStatusUser,
  onInitiateTicketAdjustment,
  onInitiateRedemption,
  onInitiatePinGeneration,
  onInitiateDeleteTask,
}) => {
  const { currentUserId: loggedInUserId, currentUserRole } = useAuth();

  const {
    data: student,
    isLoading: studentLoading,
    isError: studentError,
    error: studentErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', viewingStudentId],
    queryFn: () => fetchUserProfile(viewingStudentId),
    enabled: !!viewingStudentId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: balance = 0,
    isLoading: balanceLoading,
    isError: balanceError,
    error: balanceErrorMsg,
  } = useQuery<number, Error>({
    queryKey: ['balance', viewingStudentId],
    queryFn: () => fetchStudentBalance(viewingStudentId),
    enabled: !!student && student.status === 'active',
    staleTime: 1 * 60 * 1000,
  });

  const { data: fetchedInstruments = [], isLoading: instrumentsLoading } = useQuery<
    Instrument[],
    Error
  >({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
  });

  const { data: activeTeachers = [], isLoading: teachersLoading } = useQuery<User[], Error>({
    queryKey: ['teachers', { status: 'active', context: 'studentDetailLookup' }],
    queryFn: async () => {
      const result = await fetchTeachers({ page: 1, limit: 1000 });
      return (result?.items || []).filter(t => t.status === 'active');
    },
    enabled: !!student,
    staleTime: 10 * 60 * 1000,
  });

  const {
    data: studentAuthData,
    isLoading: isLoadingStudentAuth,
    isError: isErrorStudentAuth,
  } = useQuery<{ email: string | null } | null, Error>({
    queryKey: ['authUser', viewingStudentId],
    queryFn: () => fetchAuthUser(viewingStudentId),
    enabled: !!viewingStudentId && !!onInitiatePinGeneration,
    staleTime: 15 * 60 * 1000,
  });

  const {
    tasks: paginatedTasks,
    currentPage: tasksCurrentPage,
    totalPages: tasksTotalPages,
    setPage: setTasksPage,
    isLoading: studentTasksLoading,
    isFetching: studentTasksFetching,
    isError: studentTasksError,
    error: studentTasksErrorObject,
    totalItems: totalTasksCount,
  } = usePaginatedStudentTasks(viewingStudentId);

  const {
    history: paginatedHistory,
    currentPage: historyCurrentPage,
    totalPages: historyTotalPages,
    setPage: setHistoryPage,
    isLoading: studentHistoryLoading,
    isFetching: studentHistoryFetching,
    isError: studentHistoryError,
    error: historyErrorObject,
    totalItems: totalHistoryCount,
  } = usePaginatedStudentHistory(viewingStudentId);

  const isStudentActive = useMemo(() => student?.status === 'active', [student]);
  const studentDisplayName = useMemo(
    () => (student ? getUserDisplayName(student) : 'Loading...'),
    [student]
  );
  const instrumentNames = useMemo(
    () => (student ? getInstrumentNames(student.instrumentIds, fetchedInstruments) : 'Loading...'),
    [student, fetchedInstruments]
  );
  const teacherNames = useMemo(() => {
    if (!student || !student.linkedTeacherIds || student.linkedTeacherIds.length === 0)
      return 'None';
    if (teachersLoading) return 'Loading...';
    return (
      student.linkedTeacherIds
        .map(id => {
          const teacher = activeTeachers.find(t => t.id === id);
          return teacher ? getUserDisplayName(teacher) : `Unknown (${id.substring(0, 6)}...)`;
        })
        .join(', ') || 'N/A'
    );
  }, [student, activeTeachers, teachersLoading]);

  const filteredTasksForDisplay = useMemo(() => {
    return paginatedTasks.filter(task => !task.isComplete || task.verificationStatus === 'pending');
  }, [paginatedTasks]);

  const showPinButton = useMemo(() => {
    if (!onInitiatePinGeneration || !isStudentActive || isLoadingStudentAuth) {
      return false;
    }
    if (isErrorStudentAuth) {
      console.warn('Could not fetch student auth details to determine PIN button visibility.');
      return true;
    }
    return !studentAuthData?.email || studentAuthData.email.endsWith('@placeholder.app');
  }, [
    onInitiatePinGeneration,
    isStudentActive,
    studentAuthData,
    isLoadingStudentAuth,
    isErrorStudentAuth,
  ]);

  const handleVerifyTaskClicked = (task: AssignedTask) => {
    onInitiateVerification?.(task);
  };
  const handleAssignTaskClick = () => {
    if (student) {
      onInitiateAssignTaskForStudent(student.id);
    }
  };
  const handleEditClick = () => {
    if (student) {
      onInitiateEditStudent(student);
    }
  };
  const handleStatusClick = () => {
    if (student && onInitiateStatusUser) {
      onInitiateStatusUser(student);
    }
  };
  const handleAdjustmentClick = () => {
    if (student && !balanceLoading && onInitiateTicketAdjustment) {
      onInitiateTicketAdjustment(student);
    } else if (balanceLoading) {
      Toast.show({ type: 'info', text1: 'Loading balance...', position: 'bottom' });
    }
  };
  const handleRedemptionClick = () => {
    if (student && !balanceLoading && onInitiateRedemption) {
      onInitiateRedemption(student);
    } else if (balanceLoading) {
      Toast.show({ type: 'info', text1: 'Loading balance...', position: 'bottom' });
    }
  };
  const handlePinGenerationClick = () => {
    if (student && onInitiatePinGeneration) {
      onInitiatePinGeneration(student);
    }
  };

  const isLoading = studentLoading || instrumentsLoading || teachersLoading;

  if (isLoading) {
    return (
      <View style={commonSharedStyles.baseCentered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={commonSharedStyles.baseSecondaryText}>Loading Student Details...</Text>
      </View>
    );
  }
  if (studentError || !student) {
    return (
      <View style={commonSharedStyles.flex1}>
        <Text style={commonSharedStyles.errorText}>
          Error loading student: {studentErrorMsg?.message || 'Student not found.'}
        </Text>
      </View>
    );
  }
  if (student.role !== 'student') {
    return (
      <View style={commonSharedStyles.flex1}>
        <Text style={commonSharedStyles.errorText}>Error: User is not a student.</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={[
          commonSharedStyles.flex1,
          commonSharedStyles.baseMargin,
          commonSharedStyles.baseMarginTopBottom,
        ]}
      >
        <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifyCenter]}>
          <Text
            style={[
              commonSharedStyles.baseTitleText,
              commonSharedStyles.baseMarginTopBottom,
              commonSharedStyles.bold,
            ]}
          >
            Student Details
          </Text>
        </View>
        <View style={[commonSharedStyles.baseColumn, commonSharedStyles.baseGap]}>
          <Text style={commonSharedStyles.baseSecondaryText}>
            Name: <Text style={commonSharedStyles.bold}>{studentDisplayName}</Text>
          </Text>
          {balanceLoading ? (
            <Text style={[commonSharedStyles.baseSecondaryText]}>
              Balance: <Text style={commonSharedStyles.bold}>Loading...</Text>
            </Text>
          ) : balanceError ? (
            <Text style={commonSharedStyles.baseSecondaryText}>
              Balance: <Text style={commonSharedStyles.errorText}>Error</Text>
            </Text>
          ) : (
            <Text style={[commonSharedStyles.baseSecondaryText]}>
              Balance:{' '}
              <Text style={[commonSharedStyles.bold, commonSharedStyles.baseSubTitleText]}>
                {balance} Tickets
              </Text>
            </Text>
          )}
          <Text style={commonSharedStyles.baseSecondaryText}>
            Status:{' '}
            <Text
              style={
                isStudentActive
                  ? commonSharedStyles.activeStatus
                  : commonSharedStyles.inactiveStatus
              }
            >
              {student.status}
            </Text>
          </Text>
          <Text style={commonSharedStyles.baseSecondaryText}>
            Instrument(s): <Text style={commonSharedStyles.bold}>{instrumentNames}</Text>
          </Text>
          <Text style={commonSharedStyles.baseSecondaryText}>
            Linked Teachers: <Text style={commonSharedStyles.bold}>{teacherNames}</Text>
          </Text>
          <Text style={commonSharedStyles.baseSecondaryText}>
            ID: <Text style={commonSharedStyles.bold}>{student.id}</Text>
          </Text>
        </View>
        <View
          style={[
            commonSharedStyles.baseRow,
            commonSharedStyles.baseGap,
            commonSharedStyles.baseMarginTopBottom,
          ]}
        >
          {onInitiateTicketAdjustment && (
            <Button
              title="Adjust Tickets"
              onPress={handleAdjustmentClick}
              disabled={!isStudentActive || balanceLoading}
            />
          )}
          {onInitiateRedemption && (
            <Button
              title="Redeem Reward"
              onPress={handleRedemptionClick}
              disabled={!isStudentActive || balance <= 0 || balanceLoading}
              color={colors.success}
            />
          )}
          {isStudentActive && <Button title="Assign Task" onPress={handleAssignTaskClick} />}
          <Button title="Edit Info" onPress={handleEditClick} color={colors.warning} />
          {onInitiateStatusUser && (
            <Button title="Manage Status" onPress={handleStatusClick} color={colors.secondary} />
          )}
          {showPinButton && (
            <Button
              title="Login (PIN)"
              onPress={handlePinGenerationClick}
              color={colors.info}
              disabled={!isStudentActive}
            />
          )}
          {isLoadingStudentAuth && (
            <Text style={commonSharedStyles.baseLightText}>Checking login type...</Text>
          )}
        </View>
        <Text style={[commonSharedStyles.baseTitleText, commonSharedStyles.baseMarginTopBottom]}>
          Current Tasks ({filteredTasksForDisplay.length})
        </Text>
        {studentTasksLoading && <ActivityIndicator />}
        {studentTasksError && (
          <Text style={commonSharedStyles.errorText}>
            Error loading tasks: {studentTasksErrorObject?.message}
          </Text>
        )}
        {!studentTasksLoading && !studentTasksError && (
          <FlatList
            data={filteredTasksForDisplay}
            keyExtractor={item => `task-${item.id}`}
            renderItem={({ item }) => {
              const allowVerify =
                onInitiateVerification &&
                item.isComplete &&
                item.verificationStatus === 'pending' &&
                isStudentActive;

              let canDelete = false;
              if (!item.isComplete || item.verificationStatus === 'pending') {
                if (currentUserRole === 'admin') {
                  canDelete = true;
                } else if (currentUserRole === 'teacher' && loggedInUserId === item.assignedById) {
                  canDelete = true;
                }
              }

              return (
                <AssignedTaskDetailItem
                  item={item}
                  studentName={' '}
                  showStudentName={false}
                  canDelete={canDelete}
                  onInitiateVerification={handleVerifyTaskClicked}
                  onDelete={canDelete ? onInitiateDeleteTask : undefined}
                />
              );
            }}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={
              <Text style={commonSharedStyles.baseEmptyText}>No active or pending tasks.</Text>
            }
            contentContainerStyle={{ paddingBottom: 10 }}
          />
        )}
        <Text style={[commonSharedStyles.baseTitleText, commonSharedStyles.baseMarginTopBottom]}>
          History ({totalHistoryCount})
        </Text>
        {studentHistoryLoading && <ActivityIndicator />}
        {studentHistoryError && (
          <Text style={commonSharedStyles.errorText}>
            Error loading history: {historyErrorObject?.message}
          </Text>
        )}
        {!studentHistoryLoading && !studentHistoryError && (
          <FlatList
            data={paginatedHistory}
            keyExtractor={item => `history-${item.id}`}
            renderItem={({ item }) => <TicketHistoryItem item={item} />}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
            ListEmptyComponent={
              <Text style={commonSharedStyles.baseEmptyText}>No history yet.</Text>
            }
            ListHeaderComponent={
              studentHistoryFetching && !studentHistoryLoading ? (
                <ActivityIndicator size="small" color={colors.secondary} />
              ) : null
            }
            ListFooterComponent={
              historyTotalPages > 1 ? (
                <PaginationControls
                  currentPage={historyCurrentPage}
                  totalPages={historyTotalPages}
                  onPageChange={setHistoryPage}
                />
              ) : null
            }
            contentContainerStyle={{ paddingBottom: 10 }}
          />
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </>
  );
};

const localStyles = StyleSheet.create({
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
  },
  linkText: {
    color: colors.primary,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
