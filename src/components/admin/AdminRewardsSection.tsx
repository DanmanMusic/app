import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { View, Text, Button, FlatList, ActivityIndicator } from 'react-native';
import { fetchRewards, deleteReward } from '../../api/rewards';
import { RewardItem } from '../../types/dataTypes';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import ConfirmationModal from '../common/ConfirmationModal';
import CreateRewardModal from './modals/CreateRewardModal';
import EditRewardModal from './modals/EditRewardModal';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { AdminRewardItem } from '../common/AdminRewardItem';
import Toast from 'react-native-toast-message';

export const AdminRewardsSection = () => {
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [rewardToEdit, setRewardToEdit] = useState<RewardItem | null>(null);
  const [rewardToDelete, setRewardToDelete] = useState<RewardItem | null>(null);

  const queryClient = useQueryClient();

  const {
    data: rewardsCatalog = [],
    isLoading,
    isError,
    error,
  } = useQuery<RewardItem[], Error>({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReward,
    onSuccess: (_, deletedRewardId) => {
      console.log(`Reward item ${deletedRewardId} deleted successfully via mutation.`);
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      closeDeleteModal();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Reward deleted.',
        position: 'bottom',
      });
    },
    onError: (err, deletedRewardId) => {
      console.error(`Error deleting reward item ${deletedRewardId}:`, err);
      closeDeleteModal();
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
        text2: err instanceof Error ? err.message : 'Could not delete reward.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  const handleAddPress = () => setIsCreateModalVisible(true);
  const handleEditPress = (reward: RewardItem) => {
    setRewardToEdit(reward);
    setIsEditModalVisible(true);
  };
  const handleDeletePress = (reward: RewardItem) => {
    setRewardToDelete(reward);
    setIsDeleteModalVisible(true);
  };

  const closeCreateModal = () => setIsCreateModalVisible(false);
  const closeEditModal = () => {
    setIsEditModalVisible(false);
    setRewardToEdit(null);
  };
  const closeDeleteModal = () => {
    setIsDeleteModalVisible(false);
    setRewardToDelete(null);
    deleteMutation.reset();
  };

  const handleDeleteConfirm = () => {
    if (rewardToDelete && !deleteMutation.isPending) {
      deleteMutation.mutate(rewardToDelete.id);
    }
  };

  const getErrorMessage = () => {
    if (!error) return 'An unknown error occurred.';
    return `Error loading rewards catalog: ${error.message}`;
  };

  return (
    <View>
      <Text style={appSharedStyles.sectionTitle}>Rewards Catalog ({rewardsCatalog.length})</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button title="Add New Reward" onPress={handleAddPress} />
      </View>
      {isLoading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
      )}
      {isError && !isLoading && (
        <View style={commonSharedStyles.errorContainer}>
          <Text style={commonSharedStyles.errorText}>{getErrorMessage()}</Text>
        </View>
      )}
      {!isLoading && !isError && (
        <FlatList
          data={rewardsCatalog}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AdminRewardItem
              item={item}
              onEdit={handleEditPress}
              onDelete={handleDeletePress}
              disabled={deleteMutation.isPending}
            />
          )}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No rewards found.</Text>
          )}
        />
      )}
      <CreateRewardModal visible={isCreateModalVisible} onClose={closeCreateModal} />
      <EditRewardModal
        visible={isEditModalVisible}
        rewardToEdit={rewardToEdit}
        onClose={closeEditModal}
      />
      <ConfirmationModal
        visible={isDeleteModalVisible}
        title="Confirm Delete"
        message={`Are you sure you want to delete the reward "${rewardToDelete?.name || ''}"? This cannot be undone.`}
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete Reward'}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
        confirmDisabled={deleteMutation.isPending}
      />
    </View>
  );
};
