// src/components/admin/modals/RedeemRewardModal.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Added useQuery
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

// API Imports
import { fetchRewards } from '../../../api/rewards'; // Uses Supabase
import { fetchStudentBalance, redeemReward } from '../../../api/tickets'; // Use fetchStudentBalance, redeemReward is deferred

import { RewardItem } from '../../../types/dataTypes';
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { colors } from '../../../styles/colors';
import { RedeemRewardModalProps } from '../../../types/componentProps'; // Uses updated props
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';

const RedeemRewardModal: React.FC<RedeemRewardModalProps> = ({
  visible,
  onClose,
  studentId,
  studentName,
  // currentBalance prop removed
  redeemerId,
}) => {
  const queryClient = useQueryClient();
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);

  // --- Fetch Current Balance ---
  const {
      data: currentBalance = 0,
      isLoading: balanceLoading,
      isError: balanceError,
      error: balanceErrorMsg,
  } = useQuery<number, Error>({
      queryKey: ['balance', studentId, { context: 'redeemModal' }],
      queryFn: () => fetchStudentBalance(studentId),
      enabled: visible && !!studentId, // Fetch only when modal is visible
      staleTime: 30 * 1000,
      gcTime: 2 * 60 * 1000,
  });
  // --- End Balance Fetch ---

  // Fetch Rewards Catalog (already uses Supabase)
  const {
    data: rewardsCatalog = [],
    isLoading: isLoadingRewards,
    isError: isErrorRewards,
    error: errorRewards,
  } = useQuery<RewardItem[], Error>({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
    staleTime: 10 * 60 * 1000,
    enabled: visible, // Fetch only when modal is visible
  });

  // Redeem Mutation (points to deferred API)
  const redeemMutation = useMutation({
    mutationFn: redeemReward,
    // onSuccess/onError won't run as mutate is disabled
  });

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedRewardId(null);
      redeemMutation.reset();
      // Optionally invalidate balance on open
      // queryClient.invalidateQueries({ queryKey: ['balance', studentId] });
    }
  }, [visible, studentId]); // Add studentId dependency

  // Handle selecting an item in the list
  const handleSelectItem = (reward: RewardItem) => {
    // Allow selection even if balance is loading/error initially, check on confirm
    if (!balanceLoading && currentBalance >= reward.cost) {
      setSelectedRewardId(reward.id);
    } else if (!balanceLoading && currentBalance < reward.cost) {
      Toast.show({ type: 'error', text1: 'Insufficient Tickets', text2: `Need ${reward.cost - currentBalance} more.` });
      setSelectedRewardId(null); // Deselect if cannot afford
    } else {
        // Balance might be loading or error, allow selection optimistically
        setSelectedRewardId(reward.id);
    }
  };

  // Handle confirm button press - NOW SHOWS ERROR/ALERT
  const handleConfirmRedemption = () => {
    if (!selectedRewardId) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No reward selected.' });
      return;
    }
    // Re-check balance now that it should be loaded
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
      Toast.show({ type: 'error', text1: 'Insufficient Tickets', text2: `Cannot redeem ${selectedReward.name}.` });
      return;
    }

    // --- DEFERRED ACTION ---
    Toast.show({
        type: 'info',
        text1: 'Feature Not Implemented',
        text2: 'Reward redemption requires server-side logic (Edge Function).',
        visibilityTime: 5000,
    });
    console.warn("Attempted to redeem reward, but API implementation is deferred.");
    // redeemMutation.mutate({ // DO NOT CALL MUTATE YET
    //   studentId,
    //   rewardId: selectedRewardId,
    //   redeemerId,
    // });
    // --- END DEFERRED ACTION ---
  };

  const selectedReward = rewardsCatalog.find(r => r.id === selectedRewardId);
  // Always disable confirm button as API is deferred
  const isConfirmDisabled = true;
  // const isConfirmDisabled = !selectedRewardId || isLoadingRewards || redeemMutation.isPending || balanceLoading || balanceError;

  const renderRewardItem = ({ item }: { item: RewardItem }) => {
    // Determine affordability based on fetched balance (handle loading/error state)
    const canAfford = balanceLoading ? null : balanceError ? false : currentBalance >= item.cost; // null if loading
    const isSelected = item.id === selectedRewardId;

    return (
      <TouchableOpacity
        onPress={() => handleSelectItem(item)}
        // Disable interaction if balance loading error prevents affordability check OR if redeeming
        disabled={balanceLoading || balanceError || redeemMutation.isPending}
      >
        <View
          style={[
            styles.rewardItemBase,
            // Style based on affordability *if* balance is loaded and not error
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
            {/* Show affordability message only if balance loaded and cannot afford */}
            {canAfford === false && (
              <Text style={styles.cannotAffordText}>(Need {item.cost - currentBalance} more)</Text>
            )}
             {/* Indicate loading state per item if needed */}
            {canAfford === null && <Text style={styles.loadingAffordText}>(Checking balance...)</Text>}
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
             Balance: {balanceLoading ? 'Loading...' : balanceError ? 'Error' : `${currentBalance} Tickets`}
          </Text>
           {balanceError && <Text style={commonSharedStyles.errorText}>{balanceErrorMsg?.message}</Text>}


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
              data={rewardsCatalog} // Already sorted by API
              renderItem={renderRewardItem}
              keyExtractor={item => item.id}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <Text style={appSharedStyles.emptyListText}>No rewards available.</Text>
              }
            />
          )}

           {/* Remove mutation loading/error display */}
           {/* {redeemMutation.isPending && ... } */}
           {/* {redeemMutation.isError && ... } */}

          <View style={modalSharedStyles.buttonContainer}>
            <Button
              title={`Redeem Selected (Disabled)`} // Update text
              onPress={handleConfirmRedemption} // Still calls validation/shows info toast
              disabled={isConfirmDisabled} // Always disabled
              color={colors.success}
            />
            <Button
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={redeemMutation.isPending} // Keep potentially disabling cancel
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Styles remain mostly the same, maybe add one for loading state
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
  cannotAffordText: { fontSize: 12, color: colors.danger, fontStyle: 'italic', marginTop: 2 }, // Make red
  loadingAffordText: { fontSize: 12, color: colors.textLight, fontStyle: 'italic', marginTop: 2 }, // Style for loading
  checkmark: { fontSize: 24, color: colors.primary, marginLeft: 'auto' }, // Pushed to right
  separator: { height: 8 },
});

export default RedeemRewardModal;