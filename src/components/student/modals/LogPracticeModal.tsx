// File: src/components/student/modals/LogPracticeModal.tsx (Refactored for copy change)

import React from 'react';

import { Modal, View, Text, Button, ActivityIndicator } from 'react-native';

import { UseMutationResult } from '@tanstack/react-query';

import Toast from 'react-native-toast-message';

import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';

interface LogPracticeModalProps {
  isVisible: boolean;
  onClose: () => void;
  currentStreak: number;
  logPracticeMutation: UseMutationResult<
    { success: boolean; newStreak: number },
    Error,
    void,
    unknown
  >;
}

const LogPracticeModal: React.FC<LogPracticeModalProps> = ({
  isVisible,
  onClose,
  currentStreak,
  logPracticeMutation,
}) => {
  const handleConfirm = async () => {
    try {
      const data = await logPracticeMutation.mutateAsync();
      const nextMilestone = 7 - (data.newStreak % 7);

      if (data.newStreak > 0 && data.newStreak % 7 === 0) {
        Toast.show({
          type: 'success',
          text1: `Streak Milestone! 🎉`,
          text2: `You reached a ${data.newStreak}-day streak and earned 10 tickets!`,
          visibilityTime: 6000,
        });
      } else {
        Toast.show({
          type: 'info',
          text1: 'Practice Logged!',
          text2: `Your streak is now ${data.newStreak} days. ${nextMilestone} days to your next reward!`,
          visibilityTime: 6000,
        });
      }
      onClose();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Log Failed',
        text2: error instanceof Error ? error.message : 'Could not log practice.',
        visibilityTime: 4000,
      });
    }
  };

  const modalMessage =
    currentStreak > 0
      ? `Confirm that you practiced today to continue your ${currentStreak}-day streak.`
      : 'Confirm that you practiced today to start a practice streak.';

  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Log Practice?</Text>
          <Text style={commonSharedStyles.modalMessage}>{modalMessage}</Text>

          {logPracticeMutation.isPending && (
            <View style={commonSharedStyles.baseRowCentered}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={commonSharedStyles.baseSecondaryText}> Logging...</Text>
            </View>
          )}

          <View style={commonSharedStyles.full}>
            <Button
              title={logPracticeMutation.isPending ? 'Logging...' : 'Yes, I Practiced!'}
              onPress={handleConfirm}
              color={colors.success}
              disabled={logPracticeMutation.isPending}
            />
            <Button
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={logPracticeMutation.isPending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default LogPracticeModal;
