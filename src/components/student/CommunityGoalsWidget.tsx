// src/components/student/CommunityGoalsWidget.tsx
import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, FlatList, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { fetchRewards } from '../../api/rewards';
import { fetchGoalStats, GoalStat } from '../../api/stats';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { RewardItem } from '../../types/dataTypes';

interface TrendingGoal extends RewardItem {
  goal_count: number;
}

const CommunityGoalsWidget = () => {
  const { appUser } = useAuth();

  const { data: rewardsCatalog = [], isLoading: isLoadingRewards } = useQuery<RewardItem[], Error>({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
    staleTime: 10 * 60 * 1000,
  });

  const { data: goalStats = [], isLoading: isLoadingStats } = useQuery<GoalStat[], Error>({
    queryKey: ['goalStats', appUser?.companyId],
    queryFn: () => fetchGoalStats(appUser!.companyId),
    enabled: !!appUser?.companyId,
    staleTime: 5 * 60 * 1000,
  });

  const trendingGoals = useMemo((): TrendingGoal[] => {
    if (!goalStats || !rewardsCatalog || rewardsCatalog.length === 0) {
      return [];
    }
    const trending = goalStats
      .map(stat => {
        const rewardDetails = rewardsCatalog.find(r => r.id === stat.reward_id);
        if (!rewardDetails) return null;
        return { ...rewardDetails, goal_count: stat.goal_count };
      })
      .filter((g): g is TrendingGoal => g !== null)
      .sort((a, b) => b.goal_count - a.goal_count)
      .slice(0, 3); // Show top 3 trending goals

    return trending;
  }, [goalStats, rewardsCatalog]);

  const isLoading = isLoadingRewards || isLoadingStats;

  if (isLoading) {
    return (
      <View style={[commonSharedStyles.baseItem, { padding: 20, alignItems: 'center' }]}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }

  if (trendingGoals.length === 0) {
    // Don't show the widget if no one has set any goals yet
    return null;
  }

  return (
    <View style={commonSharedStyles.baseItem}>
      <Text style={[commonSharedStyles.baseSubTitleText, { marginBottom: 10 }]}>
        Trending Goals
      </Text>
      <FlatList
        data={trendingGoals}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              commonSharedStyles.baseRow,
              commonSharedStyles.baseAlignCenter,
              { marginBottom: 8 },
            ]}
          >
            <Image
              source={{ uri: item.imageUrl }}
              style={commonSharedStyles.goalImage}
              resizeMode="contain"
            />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={commonSharedStyles.itemTitle}>{item.name}</Text>
              <Text style={commonSharedStyles.baseSecondaryText}>
                {item.goal_count} student{item.goal_count > 1 ? 's' : ''} saving
              </Text>
            </View>
          </View>
        )}
        scrollEnabled={false}
      />
    </View>
  );
};

export default CommunityGoalsWidget;
