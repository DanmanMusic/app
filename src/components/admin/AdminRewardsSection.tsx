import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  FlatList,
  Image,
  ActivityIndicator,
  // Removed Alert if ConfirmationModal is used
} from 'react-native';
// Import TQ hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Import API functions
import { fetchRewards, createReward, updateReward, deleteReward } from '../../api/rewards';
// Import Types
import { RewardItem } from '../../mocks/mockRewards';
import { AdminRewardsSectionProps } from '../../types/componentProps'; // Use imported type

// Import Styles
import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';

// Import Modals used by this section
import CreateRewardModal from './modals/CreateRewardModal';
import EditRewardModal from './modals/EditRewardModal';
import ConfirmationModal from '../common/ConfirmationModal'; // For delete confirmation

// --- Sub-Component: AdminRewardItem ---
// Renders a single reward item with Edit/Delete buttons
const AdminRewardItem = ({
  item,
  onEdit,
  onDelete,
  disabled, // To disable buttons during delete mutation
}: {
  item: RewardItem;
  onEdit: (reward: RewardItem) => void;
  onDelete: (reward: RewardItem) => void;
  disabled?: boolean;
}) => (
  <View style={appSharedStyles.itemContainer}>
    <View style={styles.rewardItemContent}>
      <Image source={{ uri: item.imageUrl }} style={styles.rewardImage} resizeMode="contain" />
      <View style={styles.rewardDetails}>
        <Text style={appSharedStyles.itemTitle}>{item.name}</Text>
        <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>
          {item.cost} Tickets
        </Text>
        {item.description && <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>}
      </View>
    </View>
    {/* Action Buttons */}
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
// --- End Sub-Component ---

// --- Main Section Component ---
export const AdminRewardsSection: React.FC<AdminRewardsSectionProps> = () => { // Uses the imported prop type

  // --- State for Modals ---
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [rewardToEdit, setRewardToEdit] = useState<RewardItem | null>(null);
  const [rewardToDelete, setRewardToDelete] = useState<RewardItem | null>(null);

  const queryClient = useQueryClient();

  // --- TQ Query for fetching rewards ---
  const {
    data: rewardsCatalog = [], // Default to empty array
    isLoading,
    isError,
    error,
  } = useQuery<RewardItem[], Error>({
    queryKey: ['rewards'], // Unique key for rewards data
    queryFn: fetchRewards, // API function
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // --- TQ Mutations for CRUD operations ---
  // Note: Create and Edit mutations are likely handled *inside* their respective modals now.
  // We only need the Delete mutation here if the confirmation is triggered from the list item.

  const deleteMutation = useMutation({
    mutationFn: deleteReward, // API function for deleting
    onSuccess: (_, deletedRewardId) => {
      console.log(`Reward item ${deletedRewardId} deleted successfully via mutation.`);
      // Invalidate the rewards query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      closeDeleteModal(); // Close the confirmation modal
    },
    onError: (err, deletedRewardId) => {
      console.error(`Error deleting reward item ${deletedRewardId}:`, err);
      // Show error feedback (e.g., Alert or toast)
      alert(`Failed to delete reward: ${err instanceof Error ? err.message : 'Unknown error'}`);
      closeDeleteModal();
    },
  });

  // --- Event Handlers ---
  // Open Modals
  const handleAddPress = () => setIsCreateModalVisible(true);
  const handleEditPress = (reward: RewardItem) => {
    setRewardToEdit(reward);
    setIsEditModalVisible(true);
  };
  const handleDeletePress = (reward: RewardItem) => {
    setRewardToDelete(reward);
    setIsDeleteModalVisible(true);
  };

  // Close Modals
  const closeCreateModal = () => setIsCreateModalVisible(false);
  const closeEditModal = () => {
    setIsEditModalVisible(false);
    setRewardToEdit(null);
  };
  const closeDeleteModal = () => {
    setIsDeleteModalVisible(false);
    setRewardToDelete(null);
    deleteMutation.reset(); // Reset mutation state if modal is cancelled
  };

  // Confirm Delete Action
  const handleDeleteConfirm = () => {
    if (rewardToDelete && !deleteMutation.isPending) {
      deleteMutation.mutate(rewardToDelete.id); // Trigger the mutation
    }
  };

  // Helper for error display
  const getErrorMessage = () => {
    if (!error) return 'An unknown error occurred.';
    return `Error loading rewards catalog: ${error.message}`;
  };

  return (
    <View>
      {/* Section Title */}
      <Text style={appSharedStyles.sectionTitle}>Rewards Catalog ({rewardsCatalog.length})</Text>
      {/* Add Button */}
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button title="Add New Reward" onPress={handleAddPress} />
      </View>

      {/* Loading State */}
      {isLoading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{getErrorMessage()}</Text>
        </View>
      )}

      {/* Rewards List */}
      {!isLoading && !isError && (
        <FlatList
          data={rewardsCatalog} // Use fetched data
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AdminRewardItem
              item={item}
              onEdit={handleEditPress} // Trigger edit modal
              onDelete={handleDeletePress} // Trigger delete confirmation modal
              disabled={deleteMutation.isPending} // Disable buttons while deleting
            />
          )}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No rewards found.</Text>
          )}
        />
      )}

      {/* Modals Rendered Here */}
      <CreateRewardModal
        visible={isCreateModalVisible}
        onClose={closeCreateModal}
        // This modal handles its own create mutation internally
      />
      <EditRewardModal
        visible={isEditModalVisible}
        rewardToEdit={rewardToEdit}
        onClose={closeEditModal}
        // This modal handles its own update mutation internally
      />
      <ConfirmationModal
        visible={isDeleteModalVisible}
        title="Confirm Delete"
        message={`Are you sure you want to delete the reward "${rewardToDelete?.name || ''}"? This cannot be undone.`}
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete Reward'}
        onConfirm={handleDeleteConfirm} // Trigger delete mutation
        onCancel={closeDeleteModal}
        confirmDisabled={deleteMutation.isPending} // Disable confirm while deleting
      />
    </View>
  );
};


// Styles for this section
const styles = StyleSheet.create({
  rewardItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rewardImage: {
    width: 60,
    height: 60,
    marginRight: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
  },
  rewardDetails: {
    flex: 1,
  },
  errorContainer: {
    marginVertical: 20,
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#ffebee',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 5,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
});