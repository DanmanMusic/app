// src/components/admin/AdminRewardsSection.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { View, Text, Button, FlatList, ActivityIndicator } from 'react-native';

// API functions (fetchRewards & deleteReward now use Supabase)
import { fetchRewards, deleteReward } from '../../api/rewards';

import { RewardItem } from '../../types/dataTypes';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles'; // For error text & item rendering
import { adminSharedStyles } from '../../styles/adminSharedStyles'; // For item actions layout
import { colors } from '../../styles/colors';

// Common component & Modals (Modals updated for Supabase)
import ConfirmationModal from '../common/ConfirmationModal';
import CreateRewardModal from './modals/CreateRewardModal'; // Uses Supabase createReward
import EditRewardModal from './modals/EditRewardModal';     // Uses Supabase updateReward
import { AdminRewardItem } from '../common/AdminRewardItem'; // Uses item.imageUrl
import Toast from 'react-native-toast-message';

export const AdminRewardsSection = () => {
  // State for managing modals
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [rewardToEdit, setRewardToEdit] = useState<RewardItem | null>(null);
  const [rewardToDelete, setRewardToDelete] = useState<RewardItem | null>(null);

  const queryClient = useQueryClient();

  // Fetch Rewards data using React Query (calls Supabase fetchRewards)
  const {
    data: rewardsCatalog = [],
    isLoading,
    isError,
    error,
  } = useQuery<RewardItem[], Error>({
    queryKey: ['rewards'], // Query key remains the same
    queryFn: fetchRewards, // This function fetches from Supabase
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Mutation for deleting a reward (calls Supabase deleteReward)
  const deleteMutation = useMutation({
    mutationFn: deleteReward,
    onSuccess: (_, deletedRewardId) => {
      console.log(`[AdminRewardsSection] Reward item ${deletedRewardId} deleted successfully via mutation.`);
      queryClient.invalidateQueries({ queryKey: ['rewards'] }); // Refetch the rewards list
      closeDeleteModal(); // Close the confirmation modal
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Reward deleted.',
        position: 'bottom',
      });
    },
    onError: (err, deletedRewardId) => {
      console.error(`[AdminRewardsSection] Error deleting reward item ${deletedRewardId}:`, err);
      closeDeleteModal(); // Still close modal on error
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
        text2: err instanceof Error ? err.message : 'Could not delete reward.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  // --- Modal Visibility Handlers ---
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
    setRewardToEdit(null); // Clear the item being edited
  };

  const closeDeleteModal = () => {
    setIsDeleteModalVisible(false);
    setRewardToDelete(null); // Clear the item marked for deletion
    deleteMutation.reset(); // Reset mutation state if needed
  };

  // --- Action Handlers ---
  const handleDeleteConfirm = () => {
    // Only proceed if a reward is selected and mutation is not already running
    if (rewardToDelete && !deleteMutation.isPending) {
      deleteMutation.mutate(rewardToDelete.id);
    }
  };

  // Helper to format error messages
  const getErrorMessage = () => {
    if (!error) return 'An unknown error occurred.';
    return `Error loading rewards catalog: ${error.message}`;
  };

  // --- Render Logic ---
  return (
    <View>
      {/* Section Title */}
      <Text style={appSharedStyles.sectionTitle}>Rewards Catalog ({rewardsCatalog.length})</Text>

      {/* Add Button */}
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button
           title="Add New Reward"
           onPress={handleAddPress}
           disabled={deleteMutation.isPending} // Disable if delete is in progress
         />
      </View>

      {/* Loading State */}
      {isLoading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <View style={commonSharedStyles.errorContainer}>
          <Text style={commonSharedStyles.errorText}>{getErrorMessage()}</Text>
        </View>
      )}

      {/* Data Display */}
      {!isLoading && !isError && (
        <FlatList
          data={rewardsCatalog} // Data comes from the useQuery hook (Supabase)
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AdminRewardItem // This component displays item.imageUrl correctly
              item={item}
              onEdit={handleEditPress}
              onDelete={handleDeletePress}
              disabled={deleteMutation.isPending} // Disable actions while deleting
            />
          )}
          scrollEnabled={false} // Assuming this section is part of a larger ScrollView
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No rewards found in the catalog.</Text>
          )}
          // Add padding at the bottom if needed within a ScrollView
          // contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {/* Modals */}
      <CreateRewardModal
        visible={isCreateModalVisible}
        onClose={closeCreateModal}
      />
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