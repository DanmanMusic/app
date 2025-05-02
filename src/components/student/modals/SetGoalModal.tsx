// src/components/student/modals/SetGoalModal.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, View, Text, Button, FlatList, ActivityIndicator } from 'react-native';

// API Import
import { fetchRewards } from '../../../api/rewards';

// Type Imports
import { RewardItem } from '../../../types/dataTypes';
import { SetGoalModalProps } from '../../../types/componentProps';

// Style Imports
import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles'; // Use common

// Component Import
import { RewardGoalItem } from '../../common/RewardGoalItem';

export const SetGoalModal: React.FC<SetGoalModalProps> = ({
  visible,
  onClose,
  currentBalance,
  currentGoalId,
  onSetGoal,
}) => {
  // Query to fetch available rewards
  const {
    data: rewardsCatalog = [],
    isLoading,
    isError,
    error,
  } = useQuery<RewardItem[], Error>({
    queryKey: ['rewards'], // Use the same query key as other places fetching rewards
    queryFn: fetchRewards,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    enabled: visible, // Only fetch when the modal is visible
  });

  // Handler when a reward is selected as the goal
  const handleSelectGoal = (id: string) => {
    onSetGoal(id); // Pass the selected ID back to the parent (StudentView)
    // StudentView will handle closing the modal via mutation success/error
  };

  // Handler to clear the current goal
  const handleClearGoal = () => {
    onSetGoal(null); // Pass null back to indicate clearing the goal
    // StudentView will handle closing the modal via mutation success/error
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
              style={commonSharedStyles.listItemFull} // Use common style for list container
              data={rewardsCatalog.sort((a, b) => a.cost - b.cost)} // Sort by cost ascending
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                // RewardGoalItem uses commonSharedStyles internally now
                <RewardGoalItem
                  item={item}
                  isCurrentGoal={item.id === currentGoalId}
                  canAfford={currentBalance >= item.cost}
                  onSelect={handleSelectGoal}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />} // Consistent separator
              ListEmptyComponent={
                <Text style={commonSharedStyles.baseEmptyText}>
                  No rewards available to set as goal.
                </Text>
              }
              ListFooterComponent={<View style={{ height: 10 }} />} // Footer space
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
