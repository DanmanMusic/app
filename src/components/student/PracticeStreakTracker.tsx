// File: src/components/student/PracticeStreakTracker.tsx

import React, { useState } from 'react';

import { View, Text, ActivityIndicator, Button } from 'react-native';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import LogPracticeModal from './modals/LogPracticeModal';
import { getStudentStreakDetails, logPracticeForToday } from '../../api/streaks';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

interface PracticeStreakTrackerProps {
  studentId: string;
}

// The flawed isToday helper function is now completely removed.

const PracticeStreakTracker: React.FC<PracticeStreakTrackerProps> = ({ studentId }) => {
  const queryClient = useQueryClient();
  const [isModalVisible, setModalVisible] = useState(false);

  const {
    data: streakDetails,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['streakDetails', studentId],
    queryFn: () => getStudentStreakDetails(studentId),
    enabled: !!studentId,
  });

  const logPracticeMutation = useMutation({
    mutationFn: () => logPracticeForToday(studentId),
    onSuccess: _data => {
      queryClient.invalidateQueries({ queryKey: ['streakDetails', studentId] });
      queryClient.invalidateQueries({ queryKey: ['balance', studentId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['companyStreakStats'] });
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

  // Use the new boolean directly from the API response
  const { has_logged_practice_today, current_streak, longest_streak } = streakDetails;
  const nextMilestone = 7 - (current_streak % 7);

  let buttonText = 'I Practiced Today!';
  if (current_streak > 0) buttonText = 'Continue your streak!';
  else if (longest_streak > 0) buttonText = 'Restart your streak!';
  else buttonText = 'Start a practice streak!';

  const handlePress = () => !has_logged_practice_today && setModalVisible(true);

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
              title={has_logged_practice_today ? 'Practice Logged For Today!' : buttonText}
              onPress={handlePress}
              disabled={has_logged_practice_today}
              color={has_logged_practice_today ? colors.secondary : colors.success}
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
          {!has_logged_practice_today && current_streak > 0 && nextMilestone !== 7 && (
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
