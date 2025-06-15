// File: src/components/student/PracticeStreakTracker.tsx

import React, { useState } from 'react';
import { View, Text, ActivityIndicator, Button } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import LogPracticeModal from './modals/LogPracticeModal';
import { getStudentStreakDetails, logPracticeForToday } from '../../api/streaks';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

// --- The Fix: Accept studentId as a prop ---
interface PracticeStreakTrackerProps {
  studentId: string;
}

const isToday = (someDate: string | null): boolean => {
  if (!someDate) return false;
  const today = new Date();
  const date = new Date(`${someDate}T00:00:00Z`); // Treat date as UTC
  return (
    date.getUTCDate() === today.getUTCDate() &&
    date.getUTCMonth() === today.getUTCMonth() &&
    date.getUTCFullYear() === today.getUTCFullYear()
  );
};

const PracticeStreakTracker: React.FC<PracticeStreakTrackerProps> = ({ studentId }) => {
  const queryClient = useQueryClient();
  const [isModalVisible, setModalVisible] = useState(false);

  const {
    data: streakDetails,
    isLoading,
    isError,
  } = useQuery({
    // Use the passed-in studentId for the query
    queryKey: ['streakDetails', studentId],
    queryFn: () => getStudentStreakDetails(studentId),
    enabled: !!studentId,
  });

  const logPracticeMutation = useMutation({
    // Use the passed-in studentId for the mutation
    mutationFn: () => logPracticeForToday(studentId),
    onSuccess: _data => {
      // Invalidate queries using the correct studentId
      queryClient.invalidateQueries({ queryKey: ['streakDetails', studentId] });
      queryClient.invalidateQueries({ queryKey: ['balance', studentId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['companyStreakStats'] }); // Invalidate company stats too
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
