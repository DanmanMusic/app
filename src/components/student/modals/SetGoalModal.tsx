// src/components/student/modals/SetGoalModal.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, View, Text, Button, FlatList, ActivityIndicator } from 'react-native';

import { fetchRewards } from '../../../api/rewards';

import { RewardItem } from '../../../types/dataTypes';
import { SetGoalModalProps } from '../../../types/componentProps';

import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';

import { RewardGoalItem } from '../../common/RewardGoalItem';

export const SetGoalModal: React.FC<SetGoalModalProps> = ({
  visible,
  onClose,
  currentBalance,
  currentGoalId,
  onSetGoal,
}) => {
  const {
    data: rewardsCatalog = [],
    isLoading,
    isError,
    error,
  } = useQuery<RewardItem[], Error>({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
    staleTime: 10 * 60 * 1000,
    enabled: visible,
  });

  const handleSelectGoal = (id: string) => {
    onSetGoal(id);
  };

  const handleClearGoal = () => {
    onSetGoal(null);
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>
            {currentGoalId ? 'Change Your Goal' : 'Set Your Goal'}
          </Text>

          {/* Loading Indicator */}
          {isLoading && (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} size="large" />
          )}

          {/* Error Display */}
          {isError && (
            <Text style={[commonSharedStyles.errorText, { marginVertical: 10 }]}>
              Error loading rewards: {error?.message || 'Unknown error'}
            </Text>
          )}

          {/* Rewards List */}
          {!isLoading && !isError && (
            <FlatList
              style={commonSharedStyles.listItemFull}
              data={rewardsCatalog.sort((a, b) => a.cost - b.cost)}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <RewardGoalItem
                  item={item}
                  isCurrentGoal={item.id === currentGoalId}
                  canAfford={currentBalance >= item.cost}
                  onSelect={handleSelectGoal}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              ListEmptyComponent={
                <Text style={commonSharedStyles.baseEmptyText}>
                  No rewards available to set as goal.
                </Text>
              }
              ListFooterComponent={<View style={{ height: 10 }} />}
            />
          )}

          {/* Action Buttons Footer */}
          <View style={commonSharedStyles.modalFooter}>
            {currentGoalId && (
              <Button title="Clear Current Goal" onPress={handleClearGoal} color={colors.warning} />
            )}
            {/* Add spacing only if clear button is shown */}
            {/* {currentGoalId && <View style={{ height: 10 }} />}  <-- Removed, handled by modalFooter gap */}
            <Button title="Cancel" onPress={onClose} color={colors.secondary} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SetGoalModal;
