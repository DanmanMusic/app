import React from 'react';

import { useQuery } from '@tanstack/react-query';

import { View, Text, Button, ActivityIndicator, StyleSheet } from 'react-native';

import { fetchUserCounts, fetchPendingTaskCount, UserCounts, TaskStats } from '../../api/stats';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { AdminDashboardSectionProps } from '../../types/componentProps';

export const AdminDashboardSection: React.FC<AdminDashboardSectionProps> = ({
  onViewPendingVerifications,
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
  const pendingVerificationsCount = taskStats?.pendingVerificationCount ?? 0;

  const isLoading = isLoadingCounts || isLoadingTaskStats;

  return (
    <View>
      <Text style={appSharedStyles.sectionTitle}>Overview</Text>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 15 }} />
      ) : (
        <>
          {}
          <Text style={appSharedStyles.itemDetailText}>
            Total Students: {isErrorCounts ? 'Error' : studentCount}
          </Text>
          <Text style={appSharedStyles.itemDetailText}>
            Total Teachers: {isErrorCounts ? 'Error' : teacherCount}
          </Text>
          <Text style={appSharedStyles.itemDetailText}>
            Total Parents: {isErrorCounts ? 'Error' : parentCount}
          </Text>
          <Text style={appSharedStyles.itemDetailText}>
            Tasks Pending Verification: {isErrorTaskStats ? 'Error' : pendingVerificationsCount}
          </Text>
          {isErrorCounts && (
            <Text style={styles.errorText}>Failed to load user counts: {errorCounts?.message}</Text>
          )}
          {isErrorTaskStats && (
            <Text style={styles.errorText}>
              Failed to load task stats: {errorTaskStats?.message}
            </Text>
          )}

          {}
          <View style={{ marginTop: 20, alignItems: 'flex-start' }}>
            <Button
              title={`View Pending Verifications (${isErrorTaskStats ? '!' : pendingVerificationsCount})`}
              onPress={onViewPendingVerifications}
              color={colors.warning}
              disabled={isErrorTaskStats}
            />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 5,
  },
});
