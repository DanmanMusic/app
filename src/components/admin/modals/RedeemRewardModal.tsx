// src/components/admin/modals/RedeemRewardModal.tsx
import React, { useState, useEffect } from 'react';

import {
  Modal,
  View,
  Text,
  Button,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import { fetchRewards } from '../../../api/rewards';
import { fetchStudentBalance, redeemReward } from '../../../api/tickets';
import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import { RedeemRewardModalProps } from '../../../types/componentProps';
import { RewardItem } from '../../../types/dataTypes';

export const RedeemRewardModal: React.FC<RedeemRewardModalProps> = ({
  visible,
  onClose,
  studentId,
  studentName,
}) => {
  const queryClient = useQueryClient();
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);

  const {
    data: currentBalance = 0,
    isLoading: balanceLoading,
    isError: balanceError,
    error: balanceErrorMsg,
    refetch: refetchBalance,
  } = useQuery<number, Error>({
    queryKey: ['balance', studentId, { context: 'redeemModal' }],
    queryFn: () => fetchStudentBalance(studentId),
    enabled: visible && !!studentId,
    staleTime: 0,
    gcTime: 1 * 60 * 1000,
  });

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

  const redeemMutation = useMutation({
    mutationFn: redeemReward,
    onSuccess: (data, variables) => {
      console.log(
        `[RedeemRewardModal] Redemption successful for student ${variables.studentId}, reward ${variables.rewardId}. New Balance: ${data.newBalance}`
      );
      Toast.show({
        type: 'success',
        text1: 'Redemption Successful!',
        text2: data.message,
        position: 'bottom',
      });

      queryClient.invalidateQueries({ queryKey: ['balance', variables.studentId] });
      queryClient.invalidateQueries({
        queryKey: ['ticket-history', { studentId: variables.studentId }],
      });
      queryClient.invalidateQueries({ queryKey: ['ticket-history'] });

      onClose();
    },
    onError: (error: Error) => {
      console.error('[RedeemRewardModal] Redemption mutation failed:', error);
      Toast.show({
        type: 'error',
        text1: 'Redemption Failed',
        text2: error.message || 'Could not redeem reward.',
        position: 'bottom',
        visibilityTime: 5000,
      });
    },
  });

  useEffect(() => {
    if (visible) {
      setSelectedRewardId(null);
      redeemMutation.reset();

      if (studentId) {
        refetchBalance();
      }
    }
  }, [visible, studentId, refetchBalance]);

  const handleSelectItem = (reward: RewardItem) => {
    if (redeemMutation.isPending || balanceLoading) return;

    if (!balanceError && currentBalance >= reward.cost) {
      setSelectedRewardId(reward.id);
    } else if (!balanceError && currentBalance < reward.cost) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Tickets',
        text2: `Need ${reward.cost - currentBalance} more tickets.`,
        position: 'bottom',
      });
      setSelectedRewardId(null);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Cannot determine affordability due to balance error.',
        position: 'bottom',
      });
      setSelectedRewardId(null);
    }
  };

  const handleConfirmRedemption = () => {
    if (!selectedRewardId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please select a reward to redeem.',
        position: 'bottom',
      });
      return;
    }
    if (balanceLoading || redeemMutation.isPending) {
      Toast.show({
        type: 'info',
        text1: 'Please wait',
        text2: 'Processing...',
        position: 'bottom',
      });
      return;
    }
    if (balanceError) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not verify balance before redemption.',
        position: 'bottom',
      });
      return;
    }

    const selectedReward = rewardsCatalog.find(r => r.id === selectedRewardId);
    if (!selectedReward) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Selected reward data not found.',
        position: 'bottom',
      });
      return;
    }

    if (currentBalance < selectedReward.cost) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Tickets',
        text2: `Cannot redeem ${selectedReward.name}. Balance might have changed.`,
        position: 'bottom',
      });
      setSelectedRewardId(null);
      return;
    }

    console.log(
      `[RedeemRewardModal] Initiating redemption mutation for student ${studentId}, reward ${selectedRewardId}`
    );

    redeemMutation.mutate({
      studentId: studentId,
      rewardId: selectedRewardId,
    });
  };

  const selectedReward = rewardsCatalog.find(r => r.id === selectedRewardId);

  const isConfirmDisabled =
    !selectedRewardId ||
    balanceLoading ||
    redeemMutation.isPending ||
    isLoadingRewards ||
    balanceError;

  const renderRewardItem = ({ item }: { item: RewardItem }) => {
    const canAfford = balanceLoading ? null : balanceError ? false : currentBalance >= item.cost;
    const isSelected = item.id === selectedRewardId;

    return (
      <TouchableOpacity
        onPress={() => handleSelectItem(item)}
        disabled={balanceLoading || balanceError || redeemMutation.isPending || isLoadingRewards}
      >
        <View
          style={[
            commonSharedStyles.rewardItemBase,

            canAfford === false && commonSharedStyles.rewardItemUnaffordable,
            isSelected && commonSharedStyles.rewardItemSelected,
          ]}
        >
          <Image
            source={{ uri: item.imageUrl }}
            style={commonSharedStyles.rewardImage}
            resizeMode="contain"
          />
          <View style={commonSharedStyles.listItemFull}>
            <Text style={commonSharedStyles.rewardName}>{item.name}</Text>
            <Text style={[commonSharedStyles.baseSecondaryText, commonSharedStyles.textGold]}>
              {item.cost} Tickets
            </Text>

            {canAfford === false && (
              <Text style={commonSharedStyles.cannotAffordText}>
                (Need {item.cost - currentBalance} more)
              </Text>
            )}
            {canAfford === null && !balanceError && (
              <Text style={commonSharedStyles.loadingAffordText}>(Checking balance...)</Text>
            )}
            {balanceError && (
              <Text style={commonSharedStyles.cannotAffordText}>(Balance Error)</Text>
            )}
          </View>

          {isSelected && <Text style={commonSharedStyles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Redeem Reward</Text>
          <Text style={commonSharedStyles.modalContextInfo}>For: {studentName}</Text>
          <Text style={commonSharedStyles.modalContextInfo}>
            Current Balance:{' '}
            {balanceLoading ? 'Loading...' : balanceError ? 'Error' : `${currentBalance} Tickets`}
          </Text>

          {balanceError && (
            <Text style={commonSharedStyles.errorText}>
              Balance Error: {balanceErrorMsg?.message}
            </Text>
          )}
          {isErrorRewards && (
            <Text style={commonSharedStyles.errorText}>Rewards Error: {errorRewards?.message}</Text>
          )}

          {isLoadingRewards && (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
          )}

          {!isLoadingRewards && !isErrorRewards && (
            <FlatList
              style={commonSharedStyles.listItemFull}
              data={rewardsCatalog}
              renderItem={renderRewardItem}
              keyExtractor={item => item.id}
              ItemSeparatorComponent={() => <View style={commonSharedStyles.separator} />}
              ListEmptyComponent={
                <Text style={commonSharedStyles.baseEmptyText}>No rewards available.</Text>
              }
              extraData={selectedRewardId || currentBalance}
            />
          )}

          <View style={commonSharedStyles.full}>
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

export default RedeemRewardModal;
