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
  Alert,
} from 'react-native';
import { fetchRewards } from '../../../api/rewards';
import { redeemReward } from '../../../api/tickets'; // Import the API function
import { RewardItem } from '../../../mocks/mockRewards';
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { colors } from '../../../styles/colors';
import { RedeemRewardModalProps } from '../../../types/componentProps'; // Import the props
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';

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

  // Fetch Rewards Catalog
  const {
    data: rewardsCatalog = [],
    isLoading: isLoadingRewards,
    isError: isErrorRewards,
    error: errorRewards,
  } = useQuery<RewardItem[], Error>({
    queryKey: ['rewards'], // Use the same key as other places fetching rewards
    queryFn: fetchRewards,
    staleTime: 10 * 60 * 1000, // Cache for 10 mins
    enabled: visible, // Only fetch when the modal is visible
  });

  // Redeem Mutation
  const redeemMutation = useMutation({
    mutationFn: redeemReward,
    onSuccess: transaction => {
      console.log('Reward redeemed successfully via mutation:', transaction);
      // Invalidate queries to update UI
      queryClient.invalidateQueries({ queryKey: ['balance', studentId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history', { studentId }] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history'] }); // Invalidate global history too

      const redeemedItem = rewardsCatalog.find(r => r.id === selectedRewardId);
      Alert.alert(
        'Success',
        `Successfully redeemed "${redeemedItem?.name || 'Reward'}" for ${studentName}.`
      );
      onClose(); // Close modal on success
    },
    onError: error => {
      console.error('Error redeeming reward via mutation:', error);
      Alert.alert(
        'Redemption Failed',
        error instanceof Error ? error.message : 'An unknown error occurred.'
      );
      // Keep modal open on error for user to try again or cancel
    },
  });

  // Reset selection when modal opens/closes or student changes
  useEffect(() => {
    if (visible) {
      setSelectedRewardId(null);
      redeemMutation.reset(); // Reset mutation state
    }
  }, [visible, studentId]); // Depend on visible and studentId

  const handleSelectItem = (reward: RewardItem) => {
    if (currentBalance >= reward.cost) {
      setSelectedRewardId(reward.id);
    } else {
      Alert.alert('Insufficient Tickets', `You need ${reward.cost - currentBalance} more tickets.`);
      setSelectedRewardId(null); // Deselect if cannot afford
    }
  };

  const handleConfirmRedemption = () => {
    if (!selectedRewardId) {
      Alert.alert('No Reward Selected', 'Please select a reward to redeem.');
      return;
    }
    const selectedReward = rewardsCatalog.find(r => r.id === selectedRewardId);
    if (!selectedReward) {
      Alert.alert('Error', 'Selected reward not found.');
      return;
    }
    // Double-check affordability before mutation (though API should also check)
    if (currentBalance < selectedReward.cost) {
      Alert.alert('Insufficient Tickets', `Cannot redeem ${selectedReward.name}.`);
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
        disabled={!canAfford || redeemMutation.isPending} // Disable if cannot afford or redeeming
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
              data={rewardsCatalog.sort((a, b) => a.cost - b.cost)} // Sort by cost
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

// Reward Item Specific Styling
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
