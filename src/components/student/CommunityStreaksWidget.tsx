// src/components/student/CommunityStreaksWidget.tsx
import React from 'react';
import { View, Text, ActivityIndicator, Button } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query'; // Import useMutation

import { getCompanyStreakStats, debugFetchPracticeLogs } from '../../api/streaks'; // Import debug function
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { CompanyStreakStats } from '../../types/dataTypes';

const CommunityStreaksWidget = () => {
  const { appUser } = useAuth();

  const {
    data: streakStats,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<CompanyStreakStats, Error>({
    queryKey: ['companyStreakStats', appUser?.companyId],
    queryFn: () => getCompanyStreakStats(appUser!.companyId),
    enabled: !!appUser?.companyId,
    staleTime: 5 * 60 * 1000,
  });

  // New mutation for our debug function
  const debugMutation = useMutation({
    mutationFn: () => debugFetchPracticeLogs(appUser!.companyId),
    onSuccess: data => {
      console.log('--- DEBUG PRACTICE LOGS START ---');
      console.log(JSON.stringify(data, null, 2));
      console.log('--- DEBUG PRACTICE LOGS END ---');
    },
    onError: (error: Error) => {
      console.error('--- DEBUG FAILED ---', error.message);
    },
  });

  const handleRefetch = () => refetch();
  const handleDebug = () => debugMutation.mutate();

  // ... (keep the rest of the component the same)

  if (isLoading) {
    return (
      <View style={[commonSharedStyles.baseItem, { padding: 20, alignItems: 'center' }]}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }

  // ... (keep isError block)
  if (isError) {
    return (
      <View style={[commonSharedStyles.baseItem, commonSharedStyles.errorContainer]}>
        <Text style={commonSharedStyles.errorText}>Could not load community stats.</Text>
        <Button title="Retry" onPress={handleRefetch} color={colors.primary} />
      </View>
    );
  }

  if (!streakStats) {
    return null;
  }

  return (
    <View style={commonSharedStyles.baseItem}>
      <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifySpaceBetween]}>
        <Text style={[commonSharedStyles.baseSubTitleText, { marginBottom: 10 }]}>
          Community Streaks
        </Text>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          <Button title="Debug" onPress={handleDebug} color={colors.warning} />
          <Button title={isRefetching ? '...' : '⟳'} onPress={handleRefetch} />
        </View>
      </View>

      {streakStats.total_active_streaks === 0 ? (
        <Text style={commonSharedStyles.baseEmptyText}>
          No one has an active streak yet. Be the first!
        </Text>
      ) : (
        <View style={{ gap: 5 }}>
          <Text style={commonSharedStyles.baseSecondaryText}>
            <Text style={commonSharedStyles.bold}>{streakStats.total_active_streaks}</Text> Students
            with an Active Streak
          </Text>
          <Text style={commonSharedStyles.baseSecondaryText}>
            <Text style={commonSharedStyles.bold}>{streakStats.streaks_over_7_days}</Text> Streaks
            over a Week Long
          </Text>
          <Text style={commonSharedStyles.baseSecondaryText}>
            <Text style={commonSharedStyles.bold}>{streakStats.milestone_earners_this_month}</Text>{' '}
            Milestones Hit This Month
          </Text>
        </View>
      )}
    </View>
  );
};

export default CommunityStreaksWidget;
