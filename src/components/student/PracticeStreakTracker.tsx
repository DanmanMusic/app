// File: src/components/student/PracticeStreakTracker.tsx (Refactored)

import React, { useState } from 'react';

import { View, Text, ActivityIndicator, Button } from 'react-native';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import LogPracticeModal from './modals/LogPracticeModal';
import { getStudentStreakDetails, logPracticeForToday } from '../../api/streaks';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

const isToday = (someDate: string | null): boolean => {
  if (!someDate) return false;
  const today = new Date();
  const date = new Date(`${someDate}T00:00:00Z`);
  return (
    date.getUTCDate() === today.getDate() &&
    date.getUTCMonth() === today.getMonth() &&
    date.getUTCFullYear() === today.getFullYear()
  );
};

const PracticeStreakTracker = () => {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();
  const [isModalVisible, setModalVisible] = useState(false);

  const {
    data: streakDetails,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['streakDetails', appUser?.id],
    queryFn: () => getStudentStreakDetails(appUser!.id),
    enabled: !!appUser?.id,
  });

  const logPracticeMutation = useMutation({
    mutationFn: () => logPracticeForToday(appUser!.id),
    onSuccess: _data => {
      queryClient.invalidateQueries({ queryKey: ['streakDetails', appUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['balance', appUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: error => {
      console.error('Error from logPracticeMutation:', error.message);
    },
  });

  if (isLoading) {
    return (
      <View
        style={[
          commonSharedStyles.baseItem,
          commonSharedStyles.baseRowCentered,
          { paddingVertical: 20 },
        ]}
      >
        <ActivityIndicator color={colors.primary} />
        <Text style={commonSharedStyles.baseSecondaryText}> Loading Streak...</Text>
      </View>
    );
  }

  if (isError || !streakDetails) {
    return (
      <View style={[commonSharedStyles.baseItem, commonSharedStyles.errorContainer]}>
        <Text style={commonSharedStyles.errorText}>Could not load streak data.</Text>
      </View>
    );
  }

  const { current_streak, longest_streak, last_log_date } = streakDetails;
  const alreadyLoggedToday = isToday(last_log_date);
  const nextMilestone = 7 - (current_streak % 7);

  let buttonText = 'I Practiced Today!';
  if (current_streak > 0) buttonText = 'Continue your streak!';
  else if (longest_streak > 0) buttonText = 'Restart your streak!';
  else buttonText = 'Start a practice streak!';

  const handlePress = () => !alreadyLoggedToday && setModalVisible(true);

  return (
    <>
      <View style={[commonSharedStyles.baseItem]}>
        <View style={commonSharedStyles.baseRow}>
          <View
            style={[
              commonSharedStyles.flex1,
              commonSharedStyles.baseRow,
              commonSharedStyles.baseGap,
              { alignItems: 'center' },
            ]}
          >
            <Text style={{ fontSize: 26, fontWeight: 'bold', color: colors.primary }}>
              {current_streak}
            </Text>
            <Text style={[commonSharedStyles.baseSubTitleText]}>
              Day Streak {current_streak > 0 && '🔥'}
            </Text>
          </View>
          <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifyCenter]}>
            <Button
              title={alreadyLoggedToday ? 'Practice Logged For Today!' : buttonText}
              onPress={handlePress}
              disabled={alreadyLoggedToday}
              color={alreadyLoggedToday ? colors.secondary : colors.success}
            />
          </View>
        </View>

        <View
          style={[
            commonSharedStyles.baseRow,
            {
              justifyContent: 'space-between',
              width: '100%',
              paddingVertical: 8,
            },
          ]}
        >
          <Text style={commonSharedStyles.baseSecondaryText}>
            Personal Best: {longest_streak} days
          </Text>
          {!alreadyLoggedToday && current_streak > 0 && nextMilestone !== 7 && (
            <Text style={commonSharedStyles.baseSecondaryText}>
              Next Reward: {nextMilestone} day(s)
            </Text>
          )}
        </View>
      </View>

      <LogPracticeModal
        isVisible={isModalVisible}
        onClose={() => setModalVisible(false)}
        currentStreak={current_streak}
        logPracticeMutation={logPracticeMutation}
      />
    </>
  );
};

export default PracticeStreakTracker;
