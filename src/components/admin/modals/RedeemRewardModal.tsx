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
import { fetchStudentBalance, redeemReward } from '../../../api/tickets';

import { RewardItem } from '../../../types/dataTypes';
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
  redeemerId,
}) => {
  const queryClient = useQueryClient();
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);

  const {
    data: currentBalance = 0,
    isLoading: balanceLoading,
    isError: balanceError,
    error: balanceErrorMsg,
  } = useQuery<number, Error>({
    queryKey: ['balance', studentId, { context: 'redeemModal' }],
    queryFn: () => fetchStudentBalance(studentId),
    enabled: visible && !!studentId,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
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
  });

  useEffect(() => {
    if (visible) {
      setSelectedRewardId(null);
      redeemMutation.reset();
    }
  }, [visible, studentId]);

  const handleSelectItem = (reward: RewardItem) => {
    if (!balanceLoading && currentBalance >= reward.cost) {
      setSelectedRewardId(reward.id);
    } else if (!balanceLoading && currentBalance < reward.cost) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Tickets',
        text2: `Need ${reward.cost - currentBalance} more.`,
      });
      setSelectedRewardId(null);
    } else {
      setSelectedRewardId(reward.id);
    }
  };

  const handleConfirmRedemption = () => {
    if (!selectedRewardId) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No reward selected.' });
      return;
    }

    if (balanceLoading) {
      Toast.show({ type: 'info', text1: 'Please wait', text2: 'Balance still loading.' });
      return;
    }
    if (balanceError) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not verify balance.' });
      return;
    }

    const selectedReward = rewardsCatalog.find(r => r.id === selectedRewardId);
    if (!selectedReward) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Selected reward not found.' });
      return;
    }

    if (currentBalance < selectedReward.cost) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Tickets',
        text2: `Cannot redeem ${selectedReward.name}.`,
      });
      return;
    }

    Toast.show({
      type: 'info',
      text1: 'Feature Not Implemented',
      text2: 'Reward redemption requires server-side logic (Edge Function).',
      visibilityTime: 5000,
    });
    console.warn('Attempted to redeem reward, but API implementation is deferred.');
  };

  const selectedReward = rewardsCatalog.find(r => r.id === selectedRewardId);

  const isConfirmDisabled = true;

  const renderRewardItem = ({ item }: { item: RewardItem }) => {
    const canAfford = balanceLoading ? null : balanceError ? false : currentBalance >= item.cost;
    const isSelected = item.id === selectedRewardId;

    return (
      <TouchableOpacity
        onPress={() => handleSelectItem(item)}
        disabled={balanceLoading || balanceError || redeemMutation.isPending}
      >
        <View
          style={[
            styles.rewardItemBase,

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

            {canAfford === false && (
              <Text style={styles.cannotAffordText}>(Need {item.cost - currentBalance} more)</Text>
            )}

            {canAfford === null && (
              <Text style={styles.loadingAffordText}>(Checking balance...)</Text>
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
          <Text style={modalSharedStyles.modalContextInfo}>
            Balance:{' '}
            {balanceLoading ? 'Loading...' : balanceError ? 'Error' : `${currentBalance} Tickets`}
          </Text>
          {balanceError && (
            <Text style={commonSharedStyles.errorText}>{balanceErrorMsg?.message}</Text>
          )}

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
              data={rewardsCatalog}
              renderItem={renderRewardItem}
              keyExtractor={item => item.id}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <Text style={appSharedStyles.emptyListText}>No rewards available.</Text>
              }
            />
          )}

          <View style={modalSharedStyles.buttonContainer}>
            <Button
              title={`Redeem Selected (Disabled)`}
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
  cannotAffordText: { fontSize: 12, color: colors.danger, fontStyle: 'italic', marginTop: 2 },
  loadingAffordText: { fontSize: 12, color: colors.textLight, fontStyle: 'italic', marginTop: 2 },
  checkmark: { fontSize: 24, color: colors.primary, marginLeft: 'auto' },
  separator: { height: 8 },
});

export default RedeemRewardModal;
