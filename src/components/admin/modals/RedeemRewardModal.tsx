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
import { fetchRewards } from '../../../api/rewards';
import { redeemReward } from '../../../api/tickets';
import { RewardItem } from '../../../mocks/mockRewards';
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { colors } from '../../../styles/colors';
import { RedeemRewardModalProps } from '../../../types/componentProps';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';

const RedeemRewardModal: React.FC<RedeemRewardModalProps> = ({
  visible,
  onClose,
  studentId,
  studentName,
  currentBalance,
  redeemerId,
}) => {
  const queryClient = useQueryClient();
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);

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
    onSuccess: transaction => {
      console.log('Reward redeemed successfully via mutation:', transaction);
      queryClient.invalidateQueries({ queryKey: ['balance', studentId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history', { studentId }] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history'] });
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Reward redeemed successfully.',
        position: 'bottom',
      });
    },
    onError: error => {
      console.error('Error redeeming reward via mutation:', error);
      Toast.show({
        type: 'error',
        text1: 'Redemption Failed',
        text2: error instanceof Error ? error.message : 'Could not redeem reward.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  useEffect(() => {
    if (visible) {
      setSelectedRewardId(null);
      redeemMutation.reset();
    }
  }, [visible, studentId]);

  const handleSelectItem = (reward: RewardItem) => {
    if (currentBalance >= reward.cost) {
      setSelectedRewardId(reward.id);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Re-assign Failed',
        text2: `Insufficient Tickets - You need ${reward.cost - currentBalance} more tickets.`,
        position: 'bottom',
        visibilityTime: 4000,
      });
      setSelectedRewardId(null);
    }
  };

  const handleConfirmRedemption = () => {
    if (!selectedRewardId) {
      Toast.show({
        type: 'error',
        text1: 'Re-assign Failed',
        text2: 'No Reward Selected - Please select a reward to redeem.',
        position: 'bottom',
        visibilityTime: 4000,
      });

      return;
    }
    const selectedReward = rewardsCatalog.find(r => r.id === selectedRewardId);
    if (!selectedReward) {
      Toast.show({
        type: 'error',
        text1: 'Re-assign Failed',
        text2: 'Error - Selected reward not found.',
        position: 'bottom',
        visibilityTime: 4000,
      });

      return;
    }

    if (currentBalance < selectedReward.cost) {
      Toast.show({
        type: 'error',
        text1: 'Re-assign Failed',
        text2: `Insufficient Tickets - Cannot redeem ${selectedReward.name}.`,
        position: 'bottom',
        visibilityTime: 4000,
      });

      return;
    }

    redeemMutation.mutate({
      studentId,
      rewardId: selectedRewardId,
      redeemerId,
    });
  };

  const selectedReward = rewardsCatalog.find(r => r.id === selectedRewardId);

  const renderRewardItem = ({ item }: { item: RewardItem }) => {
    const canAfford = currentBalance >= item.cost;
    const isSelected = item.id === selectedRewardId;

    return (
      <TouchableOpacity
        onPress={() => handleSelectItem(item)}
        disabled={!canAfford || redeemMutation.isPending}
      >
        <View
          style={[
            styles.rewardItemBase,
            !canAfford && styles.rewardItemUnaffordable,
            isSelected && styles.rewardItemSelected,
          ]}
        >
          <Image source={{ uri: item.imageUrl }} style={styles.rewardImage} resizeMode="contain" />
          <View style={commonSharedStyles.itemDetailsContainer}>
            <Text style={styles.rewardName}>{item.name}</Text>
            <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>
              {item.cost} Tickets
            </Text>
            {!canAfford && (
              <Text style={styles.cannotAffordText}>(Need {item.cost - currentBalance} more)</Text>
            )}
          </View>
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
          <Text style={modalSharedStyles.modalContextInfo}>Balance: {currentBalance} Tickets</Text>

          {isLoadingRewards && (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
          )}

          {isErrorRewards && (
            <Text style={commonSharedStyles.errorText}>
              Error loading rewards: {errorRewards?.message}
            </Text>
          )}

          {!isLoadingRewards && !isErrorRewards && (
            <FlatList
              style={modalSharedStyles.modalListContainer}
              data={rewardsCatalog.sort((a, b) => a.cost - b.cost)}
              renderItem={renderRewardItem}
              keyExtractor={item => item.id}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <Text style={appSharedStyles.emptyListText}>No rewards available.</Text>
              }
            />
          )}
          {redeemMutation.isPending && (
            <View style={modalSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalSharedStyles.loadingText}>Redeeming...</Text>
            </View>
          )}
          {redeemMutation.isError && (
            <Text style={[commonSharedStyles.errorText, { marginTop: 5 }]}>
              Redemption Failed:{' '}
              {redeemMutation.error instanceof Error ? redeemMutation.error.message : 'Error'}
            </Text>
          )}
          <View style={modalSharedStyles.buttonContainer}>
            <Button
              title={
                redeemMutation.isPending
                  ? 'Processing...'
                  : `Redeem Selected (${selectedReward?.cost ?? 0} Tickets)`
              }
              onPress={handleConfirmRedemption}
              disabled={!selectedRewardId || isLoadingRewards || redeemMutation.isPending}
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
  rewardItemUnaffordable: { opacity: 0.6, backgroundColor: colors.backgroundGrey },
  rewardItemSelected: {
    borderColor: colors.primary,
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
  },
  rewardName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  cannotAffordText: { fontSize: 12, color: colors.textLight, fontStyle: 'italic', marginTop: 2 },
  checkmark: { fontSize: 24, color: colors.primary, marginLeft: 10 },
  separator: { height: 8 },
});

export default RedeemRewardModal;
