import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import { fetchUserCounts, fetchPendingTaskCount, UserCounts, TaskStats } from '../../api/stats';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { AdminDashboardSectionProps, UserTab } from '../../types/componentProps';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const AdminDashboardSection: React.FC<AdminDashboardSectionProps> = ({
  onViewPendingVerifications,
  setActiveTab,
  setViewingSection,
  onInitiateCreateUser,
}) => {
  const {
    data: userCounts,
    isLoading: isLoadingCounts,
    isError: isErrorCounts,
    error: errorCounts,
  } = useQuery<UserCounts, Error>({
    queryKey: ['userCounts'],
    queryFn: fetchUserCounts,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: taskStats,
    isLoading: isLoadingTaskStats,
    isError: isErrorTaskStats,
    error: errorTaskStats,
  } = useQuery<TaskStats, Error>({
    queryKey: ['taskStats', 'pendingCount'],
    queryFn: fetchPendingTaskCount,
    staleTime: 1 * 60 * 1000,
  });

  const studentCount = userCounts?.studentCount ?? 0;
  const teacherCount = userCounts?.teacherCount ?? 0;
  const parentCount = userCounts?.parentCount ?? 0;
  const adminCount = userCounts?.adminCount ?? 0;
  const studentButtonTitle = `Students: ${studentCount}`;
  const teacherButtonTitle = `Teachers: ${teacherCount}`;
  const parentButtonTitle = `Parents: ${parentCount}`;
  const adminButtonTitle = `Admins: ${adminCount}`;
  const pendingVerificationsCount = taskStats?.pendingVerificationCount ?? 0;

  const isLoading = isLoadingCounts || isLoadingTaskStats;

  const handleUserSelection = (userTab: UserTab) => {
    setActiveTab(userTab);
    setViewingSection('users');
  };

  return (
    <View style={commonSharedStyles.baseMargin}>
      <Text style={[commonSharedStyles.baseTitle, commonSharedStyles.baseMarginTopBottom]}>
        Overview
      </Text>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 15 }} />
      ) : (
        <>
          {isErrorCounts ? (
            <Text style={commonSharedStyles.errorText}>
              Failed to load user counts: {errorCounts?.message}
            </Text>
          ) : (
            <>
              <View
                style={[
                  commonSharedStyles.baseColumn,
                  commonSharedStyles.baseGap,
                  commonSharedStyles.baseMarginTopBottom,
                ]}
              >
                <Text style={commonSharedStyles.baseSubTitle}>
                  <Text style={{ fontWeight: 'bold' }}>Users</Text>:{' '}
                  {studentCount + teacherCount + parentCount + adminCount}
                </Text>
                <View
                  style={[
                    commonSharedStyles.baseRow,
                    commonSharedStyles.baseGap,
                    commonSharedStyles.baseMarginTopBottom,
                  ]}
                >
                  <Button title="+ User" onPress={onInitiateCreateUser} color={colors.warning} />
                  <Button
                    title={studentButtonTitle}
                    onPress={() => {
                      handleUserSelection('students');
                    }}
                  />
                  <Button
                    title={teacherButtonTitle}
                    onPress={() => {
                      handleUserSelection('teachers');
                    }}
                  />
                  <Button
                    title={parentButtonTitle}
                    onPress={() => {
                      handleUserSelection('parents');
                    }}
                  />
                  <Button
                    title={adminButtonTitle}
                    onPress={() => {
                      handleUserSelection('admins');
                    }}
                  />
                </View>
              </View>
            </>
          )}
          {isErrorTaskStats ? (
            <Text style={commonSharedStyles.errorText}>
              Failed to load task stats: {errorTaskStats?.message}
            </Text>
          ) : (
            <View
              style={[
                commonSharedStyles.baseColumn,
                commonSharedStyles.baseGap,
                commonSharedStyles.baseMarginTopBottom,
              ]}
            >
              <Text style={[commonSharedStyles.baseSubTitle, commonSharedStyles.bold]}>Tasks</Text>
              <View
                style={[
                  commonSharedStyles.baseRow,
                  commonSharedStyles.baseGap,
                  commonSharedStyles.baseMarginTopBottom,
                ]}
              >
                <Button
                  title={`View Pending Verifications (${isErrorTaskStats ? '!' : pendingVerificationsCount})`}
                  onPress={onViewPendingVerifications}
                  color={colors.warning}
                  disabled={isErrorTaskStats}
                />
                <Button title="Tasks" onPress={() => setViewingSection('tasks')} />
                <Button title="History" onPress={() => setViewingSection('history')} />
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
};
