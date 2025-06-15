// src/components/student/CommunityStreaksWidget.tsx
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { getCompanyStreakStats } from '../../api/streaks';
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
  } = useQuery<CompanyStreakStats, Error>({
    queryKey: ['companyStreakStats', appUser?.companyId],
    queryFn: () => getCompanyStreakStats(appUser!.companyId),
    enabled: !!appUser?.companyId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <View style={[commonSharedStyles.baseItem, { padding: 20, alignItems: 'center' }]}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }

  // Handle error case separately
  if (isError) {
    return (
      <View style={[commonSharedStyles.baseItem, commonSharedStyles.errorContainer]}>
        <Text style={commonSharedStyles.errorText}>Could not load community stats.</Text>
      </View>
    );
  }

  // This handles the case where the query succeeds but returns no data.
  if (!streakStats) {
    return null;
  }

  // This is the new logic for the empty state.
  if (streakStats.total_active_streaks === 0) {
    return (
      <View style={commonSharedStyles.baseItem}>
        <Text style={[commonSharedStyles.baseSubTitleText, { marginBottom: 10 }]}>
          Community Streaks
        </Text>
        <Text style={commonSharedStyles.baseEmptyText}>
          No one has an active streak yet. Be the first!
        </Text>
      </View>
    );
  }

  // This is the original view for when there *is* data.
  return (
    <View style={commonSharedStyles.baseItem}>
      <Text style={[commonSharedStyles.baseSubTitleText, { marginBottom: 10 }]}>
        Community Streaks
      </Text>
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
          <Text style={commonSharedStyles.bold}>
            {streakStats.milestone_earners_this_month}
          </Text>{' '}
          Milestones Hit This Month
        </Text>
      </View>
    </View>
  );
};

export default CommunityStreaksWidget;