// src/components/student/modals/SetGoalModal.tsx
import React, { useMemo } from 'react';

import { Modal, View, Text, Button, FlatList, ActivityIndicator } from 'react-native';

import { useQuery } from '@tanstack/react-query';

import { fetchRewards } from '../../../api/rewards';
import { fetchGoalStats, GoalStat } from '../../../api/stats';
import { useAuth } from '../../../contexts/AuthContext';
import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import { SetGoalModalProps } from '../../../types/componentProps';
import { RewardItem } from '../../../types/dataTypes';
import { RewardGoalItem } from '../../common/RewardGoalItem';

export const SetGoalModal: React.FC<SetGoalModalProps> = ({
  visible,
  onClose,
  currentBalance,
  currentGoalId,
  onSetGoal,
}) => {
  const { appUser } = useAuth();

  const {
    data: rewardsCatalog = [],
    isLoading: isLoadingRewards,
    isError: isErrorRewards,
    error: errorRewards,
  } = useQuery<RewardItem[], Error>({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
    staleTime: 10 * 60 * 1000,
    enabled: visible,
  });

  const { data: goalStats = [] } = useQuery<GoalStat[], Error>({
    queryKey: ['goalStats', appUser?.companyId],
    queryFn: () => fetchGoalStats(appUser!.companyId),
    enabled: visible && !!appUser?.companyId,
    staleTime: 5 * 60 * 1000,
  });

  const eligibleGoalRewards = useMemo(() => {
    return rewardsCatalog.filter(reward => reward.isGoalEligible);
  }, [rewardsCatalog]);

  const handleSelectGoal = (id: string) => {
    onSetGoal(id);
  };

  const handleClearGoal = () => {
    onSetGoal(null);
  };

  const isLoading = isLoadingRewards;
  const isError = isErrorRewards;
  const error = errorRewards;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>
            {currentGoalId ? 'Change Your Goal' : 'Set Your Goal'}
          </Text>

          {isLoading && (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} size="large" />
          )}

          {isError && (
            <Text style={[commonSharedStyles.errorText, { marginVertical: 10 }]}>
              Error loading rewards: {error?.message || 'Unknown error'}
            </Text>
          )}

          {!isLoading && !isError && (
            <FlatList
              style={commonSharedStyles.listItemFull}
              data={eligibleGoalRewards.sort((a, b) => a.cost - b.cost)}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const stat = goalStats.find(s => s.reward_id === item.id);
                const count = stat ? stat.goal_count : 0;
                let othersText: string | null = null;
                if (count > 0) {
                  if (item.id === currentGoalId) {
                    if (count === 1) {
                      othersText = `You are saving for this.`;
                    } else {
                      othersText = `You and ${count - 1} other${count - 1 > 1 ? 's are' : ' is'} saving for this.`;
                    }
                  } else {
                    othersText = `${count} other${count > 1 ? 's are' : ' is'} saving for this.`;
                  }
                }
                return (
                  <RewardGoalItem
                    item={item}
                    isCurrentGoal={item.id === currentGoalId}
                    canAfford={currentBalance >= item.cost}
                    onSelect={handleSelectGoal}
                    othersSavingText={othersText}
                  />
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              ListEmptyComponent={
                <Text style={commonSharedStyles.baseEmptyText}>
                  No rewards available to set as goal.
                </Text>
              }
              ListFooterComponent={<View style={{ height: 10 }} />}
            />
          )}

          <View style={commonSharedStyles.modalFooter}>
            {currentGoalId && (
              <Button title="Clear Current Goal" onPress={handleClearGoal} color={colors.warning} />
            )}
            <Button title="Cancel" onPress={onClose} color={colors.secondary} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SetGoalModal;