// File: src/components/student/GoalTracker.tsx

import React, { useMemo } from 'react';

import { View, Text, Button, Image, ActivityIndicator } from 'react-native';

import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { RewardItem } from '../../types/dataTypes';

interface GoalTrackerProps {
  balance: number;
  goalReward: RewardItem | undefined;
  isLoading: boolean;
  onSetGoalPress: () => void;
}

const GoalTracker: React.FC<GoalTrackerProps> = ({
  balance,
  goalReward,
  isLoading,
  onSetGoalPress,
}) => {
  const rawProgressTowardGoal = useMemo(
    () => (goalReward ? (balance / goalReward.cost) * 100 : 0),
    [balance, goalReward]
  );
  const clampedProgress = useMemo(
    () => Math.min(Math.max(rawProgressTowardGoal, 0), 100),
    [rawProgressTowardGoal]
  );
  const goalMet = useMemo(() => rawProgressTowardGoal >= 100, [rawProgressTowardGoal]);

  if (isLoading) {
    return (
      <View style={[commonSharedStyles.baseItem, { padding: 20, alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (goalReward) {
    return (
      <View style={commonSharedStyles.baseItem}>
        <View
          style={[
            commonSharedStyles.baseRow,
            commonSharedStyles.baseGap,
            { alignItems: 'flex-start' },
          ]}
        >
          <Image
            source={{ uri: goalReward.imageUrl }}
            style={commonSharedStyles.goalImage}
            resizeMode="contain"
          />
          <View style={commonSharedStyles.flex1}>
            <Text style={commonSharedStyles.baseSubTitleText}>Saving for: {goalReward.name}</Text>
            <Text style={[commonSharedStyles.baseSecondaryText, { color: colors.gold }]}>
              {goalReward.cost} Tickets
            </Text>
          </View>
          <View>
            <Button title="Change Goal" onPress={onSetGoalPress} color={colors.primary} />
          </View>
        </View>
        <Text style={[commonSharedStyles.baseSecondaryText, { marginVertical: 5 }]}>
          Progress: {balance} / {goalReward.cost} ({clampedProgress.toFixed(1)}%){' '}
          {goalMet && balance > goalReward.cost && `(+${balance - goalReward.cost} extra)`}
        </Text>
        <View style={commonSharedStyles.progressBarBackground}>
          <View
            style={[
              commonSharedStyles.progressBarFill,
              {
                width: `${clampedProgress}%`,
                backgroundColor: goalMet ? colors.success : colors.gold,
              },
            ]}
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        commonSharedStyles.baseItem,
        commonSharedStyles.baseRow,
        commonSharedStyles.justifySpaceBetween,
        commonSharedStyles.baseAlignCenter,
      ]}
    >
      <Text style={commonSharedStyles.baseSubTitleText}>No goal set yet.</Text>
      <Button title="Set a Goal" onPress={onSetGoalPress} color={colors.primary} />
    </View>
  );
};

export default GoalTracker;
