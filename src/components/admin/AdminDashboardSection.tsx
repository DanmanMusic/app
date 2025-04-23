// src/components/admin/AdminDashboardSection.tsx
import React from 'react';

import { useQuery } from '@tanstack/react-query';

import { View, Text, Button, ActivityIndicator, StyleSheet } from 'react-native';

// Import API functions for stats
import { fetchUserCounts, fetchPendingTaskCount, UserCounts, TaskStats } from '../../api/stats'; // Adjust path
// Import Prop Type

// Import Styles
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { AdminDashboardSectionProps } from '../../types/componentProps'; // Adjust path

export const AdminDashboardSection: React.FC<AdminDashboardSectionProps> = ({
  onViewPendingVerifications, // Only prop needed now
}) => {
  // --- Fetch User Counts ---
  const {
    data: userCounts,
    isLoading: isLoadingCounts,
    isError: isErrorCounts,
    error: errorCounts,
  } = useQuery<UserCounts, Error>({
    queryKey: ['userCounts'],
    queryFn: fetchUserCounts,
    staleTime: 5 * 60 * 1000, // Cache counts for 5 mins
  });

  // --- Fetch Task Stats ---
  const {
    data: taskStats,
    isLoading: isLoadingTaskStats,
    isError: isErrorTaskStats,
    error: errorTaskStats,
  } = useQuery<TaskStats, Error>({
    queryKey: ['taskStats', 'pendingCount'], // Be specific
    queryFn: fetchPendingTaskCount,
    staleTime: 1 * 60 * 1000, // Cache pending count for 1 min
  });

  // Extract counts with defaults
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
          {/* Display counts fetched via internal queries */}
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

          {/* Button remains the same, uses internal count */}
          <View style={{ marginTop: 20, alignItems: 'flex-start' }}>
            <Button
              title={`View Pending Verifications (${isErrorTaskStats ? '!' : pendingVerificationsCount})`}
              onPress={onViewPendingVerifications} // Use callback prop
              color={colors.warning}
              disabled={isErrorTaskStats} // Disable if count failed
            />
          </View>
        </>
      )}
    </View>
  );
};

// Local styles
const styles = StyleSheet.create({
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 5,
  },
});
