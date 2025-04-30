// src/components/admin/modals/RedeemRewardModal.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Button,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';

// API Imports
import { fetchRewards } from '../../../api/rewards';
import { fetchStudentBalance, redeemReward } from '../../../api/tickets'; // Use updated redeemReward

// Type Imports
import { RewardItem } from '../../../types/dataTypes';
import { RedeemRewardModalProps } from '../../../types/componentProps';

// Style Imports
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { colors } from '../../../styles/colors';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';

export const RedeemRewardModal: React.FC<RedeemRewardModalProps> = ({
  visible,
  onClose,
  studentId,
  studentName,
  // redeemerId is no longer needed as a prop, comes from auth context via API call
}) => {
  const queryClient = useQueryClient();
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);

  // Fetch student balance
  const {
    data: currentBalance = 0,
    isLoading: balanceLoading,
    isError: balanceError,
    error: balanceErrorMsg,
    refetch: refetchBalance, // Add refetch function
  } = useQuery<number, Error>({
    queryKey: ['balance', studentId, { context: 'redeemModal' }],
    queryFn: () => fetchStudentBalance(studentId),
    enabled: visible && !!studentId, // Enable only when modal is visible and studentId is present
    staleTime: 0, // Fetch fresh balance when modal opens or studentId changes
    gcTime: 1 * 60 * 1000, // Cache for 1 minute
  });

  // Fetch rewards catalog
  const {
    data: rewardsCatalog = [],
    isLoading: isLoadingRewards,
    isError: isErrorRewards,
    error: errorRewards,
  } = useQuery<RewardItem[], Error>({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
    staleTime: 10 * 60 * 1000, // Cache rewards for 10 mins
    enabled: visible, // Enable only when modal is visible
  });

  // Mutation for redeeming reward (calls the API function which calls the Edge Function)
  const redeemMutation = useMutation({
    mutationFn: redeemReward, // Use the updated API function
    onSuccess: (data, variables) => {
      // data here is { message, newBalance }
      console.log(
        `[RedeemRewardModal] Redemption successful for student ${variables.studentId}, reward ${variables.rewardId}. New Balance: ${data.newBalance}`
      );
      Toast.show({ type: 'success', text1: 'Redemption Successful!', text2: data.message });

      // Invalidate relevant queries AFTER success
      queryClient.invalidateQueries({ queryKey: ['balance', variables.studentId] });
      queryClient.invalidateQueries({
        queryKey: ['ticket-history', { studentId: variables.studentId }],
      });
      queryClient.invalidateQueries({ queryKey: ['ticket-history'] }); // Invalidate global history
      // Optionally force immediate balance refetch for UI update, though invalidation often suffices
      // refetchBalance();

      onClose(); // Close modal on success
    },
    onError: (error: Error) => {
      console.error('[RedeemRewardModal] Redemption mutation failed:', error);
      Toast.show({
        type: 'error',
        text1: 'Redemption Failed',
        text2: error.message || 'Could not redeem reward.', // Display error from Edge Function/RPC
        position: 'bottom',
        visibilityTime: 5000,
      });
    },
  });

  // Reset selection when modal opens or student changes
  useEffect(() => {
    if (visible) {
      setSelectedRewardId(null);
      redeemMutation.reset();
      // Refetch balance when modal becomes visible for the specific student
      if (studentId) {
        refetchBalance();
      }
    }
  }, [visible, studentId, refetchBalance]); // Add refetchBalance to dependencies

  // Handler for selecting a reward item
  const handleSelectItem = (reward: RewardItem) => {
    if (redeemMutation.isPending || balanceLoading) return; // Prevent selection during loading/mutation

    if (!balanceError && currentBalance >= reward.cost) {
      setSelectedRewardId(reward.id); // Select if affordable
    } else if (!balanceError && currentBalance < reward.cost) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Tickets',
        text2: `Need ${reward.cost - currentBalance} more tickets.`,
        position: 'bottom',
      });
      setSelectedRewardId(null); // Deselect if not affordable
    } else {
      // Handle balance error case - maybe prevent selection?
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Cannot determine affordability due to balance error.',
      });
      setSelectedRewardId(null);
    }
  };

  // Handler for the final confirmation button
  const handleConfirmRedemption = () => {
    if (!selectedRewardId) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please select a reward to redeem.' });
      return;
    }
    if (balanceLoading || redeemMutation.isPending) {
      Toast.show({ type: 'info', text1: 'Please wait', text2: 'Processing...' });
      return;
    }
    if (balanceError) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not verify balance before redemption.',
      });
      return;
    }

    const selectedReward = rewardsCatalog.find(r => r.id === selectedRewardId);
    if (!selectedReward) {
      // Should not happen if selectedRewardId is set from list
      Toast.show({ type: 'error', text1: 'Error', text2: 'Selected reward data not found.' });
      return;
    }

    // Double-check affordability right before mutation
    if (currentBalance < selectedReward.cost) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Tickets',
        text2: `Cannot redeem ${selectedReward.name}. Balance might have changed.`,
      });
      setSelectedRewardId(null); // Deselect if suddenly unaffordable
      return;
    }

    console.log(
      `[RedeemRewardModal] Initiating redemption mutation for student ${studentId}, reward ${selectedRewardId}`
    );
    // Call the mutation with studentId and rewardId
    redeemMutation.mutate({
      studentId: studentId,
      rewardId: selectedRewardId,
    });
  };

  // Find selected reward details for display/confirmation
  const selectedReward = rewardsCatalog.find(r => r.id === selectedRewardId);

  // Determine if confirm button should be disabled
  const isConfirmDisabled =
    !selectedRewardId ||
    balanceLoading ||
    redeemMutation.isPending ||
    isLoadingRewards ||
    balanceError;

  // Render function for each reward item in the list
  const renderRewardItem = ({ item }: { item: RewardItem }) => {
    // Determine affordability based on fetched balance (handle loading/error states)
    const canAfford = balanceLoading ? null : balanceError ? false : currentBalance >= item.cost;
    const isSelected = item.id === selectedRewardId;

    return (
      <TouchableOpacity
        onPress={() => handleSelectItem(item)}
        disabled={balanceLoading || balanceError || redeemMutation.isPending || isLoadingRewards} // Disable touch during loading/mutation
      >
        <View
          style={[
            styles.rewardItemBase,
            // Apply styles based on affordability and selection
            canAfford === false && styles.rewardItemUnaffordable,
            isSelected && styles.rewardItemSelected,
          ]}
        >
          <Image source={{ uri: item.imageUrl }} style={styles.rewardImage} resizeMode="contain" />
          <View style={commonSharedStyles.itemDetailsContainer}>
            <Text style={styles.rewardName}>{item.name}</Text>
            <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>
              {item.cost} Tickets
            </Text>
            {/* Show affordability status */}
            {canAfford === false && (
              <Text style={styles.cannotAffordText}>(Need {item.cost - currentBalance} more)</Text>
            )}
            {canAfford === null && !balanceError && (
              <Text style={styles.loadingAffordText}>(Checking balance...)</Text>
            )}
            {balanceError && <Text style={styles.cannotAffordText}>(Balance Error)</Text>}
          </View>
          {/* Show checkmark if selected */}
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Redeem Reward</Text>
          <Text style={modalSharedStyles.modalContextInfo}>For: {studentName}</Text>
          <Text style={modalSharedStyles.modalContextInfo}>
            Current Balance:{' '}
            {balanceLoading ? 'Loading...' : balanceError ? 'Error' : `${currentBalance} Tickets`}
          </Text>
          {/* Display errors */}
          {balanceError && (
            <Text style={commonSharedStyles.errorText}>
              Balance Error: {balanceErrorMsg?.message}
            </Text>
          )}
          {isErrorRewards && (
            <Text style={commonSharedStyles.errorText}>Rewards Error: {errorRewards?.message}</Text>
          )}

          {/* Loading indicator for rewards list */}
          {isLoadingRewards && (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
          )}

          {/* Rewards List */}
          {!isLoadingRewards && !isErrorRewards && (
            <FlatList
              style={modalSharedStyles.modalListContainer}
              data={rewardsCatalog} // Already sorted by cost in API fetch? If not, add sort here.
              renderItem={renderRewardItem}
              keyExtractor={item => item.id}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <Text style={appSharedStyles.emptyListText}>No rewards available.</Text>
              }
              extraData={selectedRewardId || currentBalance} // Re-render list if selection or balance changes
            />
          )}

          {/* Footer Buttons */}
          <View style={modalSharedStyles.buttonContainer}>
            <Button
              title={redeemMutation.isPending ? 'Redeeming...' : `Redeem Selected`}
              onPress={handleConfirmRedemption}
              disabled={isConfirmDisabled}
              color={colors.success}
            />
            <Button
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={redeemMutation.isPending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Styles
const styles = StyleSheet.create({
  rewardItemBase: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    borderRadius: 6,
    backgroundColor: colors.backgroundPrimary,
  },
  rewardItemUnaffordable: {
    opacity: 0.6,
    backgroundColor: colors.backgroundGrey, // Grey out unaffordable items
  },
  rewardItemSelected: {
    borderColor: colors.success, // Highlight selected item
    borderWidth: 2,
    backgroundColor: colors.backgroundHighlight,
  },
  rewardImage: {
    width: 50,
    height: 50,
    marginRight: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundGrey, // Placeholder bg
  },
  rewardName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cannotAffordText: {
    fontSize: 12,
    color: colors.danger, // Use danger color for clarity
    fontStyle: 'italic',
    marginTop: 2,
  },
  loadingAffordText: {
    fontSize: 12,
    color: colors.textLight,
    fontStyle: 'italic',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 24,
    color: colors.success, // Use success color for checkmark
    marginLeft: 'auto', // Push checkmark to the right
  },
  separator: {
    height: 8,
  },
});

export default RedeemRewardModal;
