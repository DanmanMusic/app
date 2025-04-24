import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { View, Text, Button, FlatList, Image, ActivityIndicator } from 'react-native';
import { fetchRewards, deleteReward } from '../../api/rewards';
import { RewardItem } from '../../mocks/mockRewards';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { AdminRewardsSectionProps } from '../../types/componentProps';
import ConfirmationModal from '../common/ConfirmationModal';
import { adminSharedStyles } from '../../styles/adminSharedStyles';
import CreateRewardModal from './modals/CreateRewardModal';
import EditRewardModal from './modals/EditRewardModal';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

const AdminRewardItem = ({
  item,
  onEdit,
  onDelete,
  disabled,
}: {
  item: RewardItem;
  onEdit: (reward: RewardItem) => void;
  onDelete: (reward: RewardItem) => void;
  disabled?: boolean;
}) => (
  <View style={appSharedStyles.itemContainer}>
    <View style={commonSharedStyles.itemContentRow}>
      <Image source={{ uri: item.imageUrl }} style={commonSharedStyles.itemImageMedium} resizeMode="contain" />
      <View style={commonSharedStyles.itemDetailsContainer}>
        <Text style={appSharedStyles.itemTitle}>{item.name}</Text>
        <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>
          {item.cost} Tickets
        </Text>
        {item.description && <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>}
      </View>
    </View>
    {}
    <View style={adminSharedStyles.itemActions}>
      <Button title="Edit" onPress={() => onEdit(item)} disabled={disabled} />
      <Button
        title="Delete"
        onPress={() => onDelete(item)}
        color={colors.danger}
        disabled={disabled}
      />
    </View>
  </View>
);

export const AdminRewardsSection: React.FC<AdminRewardsSectionProps> = () => {
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
    },
    onError: (err, deletedRewardId) => {
      console.error(`Error deleting reward item ${deletedRewardId}:`, err);

      alert(`Failed to delete reward: ${err instanceof Error ? err.message : 'Unknown error'}`);
      closeDeleteModal();
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