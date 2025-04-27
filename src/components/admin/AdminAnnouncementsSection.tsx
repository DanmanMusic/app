// src/components/admin/AdminAnnouncementsSection.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { View, Text, Button, FlatList, ActivityIndicator } from 'react-native';

// Import Supabase-backed API functions
import { fetchAnnouncements, deleteAnnouncement } from '../../api/announcements'; // These now hit Supabase

import { Announcement } from '../../types/dataTypes';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles'; // For error display
import { adminSharedStyles } from '../../styles/adminSharedStyles'; // For item actions layout
import { colors } from '../../styles/colors';

// Import Modals & List Item (Modals are refactored)
import ConfirmationModal from '../common/ConfirmationModal';
import CreateAnnouncementModal from './modals/CreateAnnouncementModal'; // Uses Supabase create
import EditAnnouncementModal from './modals/EditAnnouncementModal';     // Uses Supabase update
import { AnnouncementListItem } from '../common/AnnouncementListItem'; // Displays data
import Toast from 'react-native-toast-message';

export const AdminAnnouncementsSection = () => {
  // State for managing modals
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [announcementToEdit, setAnnouncementToEdit] = useState<Announcement | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  const queryClient = useQueryClient();

  // Fetch Announcements using React Query (calls Supabase fetchAnnouncements)
  const {
    data: announcements = [], // Default to empty array
    isLoading,
    isError,
    error,
  } = useQuery<Announcement[], Error>({
    queryKey: ['announcements'], // Query key remains the same
    queryFn: fetchAnnouncements, // Uses the Supabase API function
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  // Mutation for deleting an announcement (calls Supabase deleteAnnouncement)
  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: (_, deletedAnnouncementId) => {
      console.log(`[AdminAnnSection] Announcement ${deletedAnnouncementId} deleted successfully.`);
      queryClient.invalidateQueries({ queryKey: ['announcements'] }); // Refetch the list
      closeDeleteModal(); // Close confirmation modal
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Announcement deleted.',
        position: 'bottom',
      });
    },
    onError: (err, deletedAnnouncementId) => {
      console.error(`[AdminAnnSection] Error deleting announcement ${deletedAnnouncementId}:`, err);
      closeDeleteModal();
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
        text2: err instanceof Error ? err.message : 'Could not delete announcement.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  // --- Modal Visibility Handlers ---
  const handleAddPress = () => setIsCreateModalVisible(true);

  const handleEditPress = (announcement: Announcement) => {
    setAnnouncementToEdit(announcement);
    setIsEditModalVisible(true);
  };

  const handleDeletePress = (announcement: Announcement) => {
    setAnnouncementToDelete(announcement);
    setIsDeleteModalVisible(true);
  };

  const closeCreateModal = () => setIsCreateModalVisible(false);

  const closeEditModal = () => {
    setIsEditModalVisible(false);
    setAnnouncementToEdit(null);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalVisible(false);
    setAnnouncementToDelete(null);
    deleteMutation.reset(); // Reset mutation state
  };

  // --- Action Handler ---
  const handleDeleteConfirm = () => {
    if (announcementToDelete && !deleteMutation.isPending) {
      deleteMutation.mutate(announcementToDelete.id);
    }
  };

  // Helper for error message display
  const getErrorMessage = () => {
    if (!error) return 'An unknown error occurred.';
    return `Error loading announcements: ${error.message}`;
  };

  // --- Render Logic ---
  return (
    <View>
      {/* Section Title */}
      <Text style={appSharedStyles.sectionTitle}>
        Announcements & Challenges ({announcements.length})
      </Text>

      {/* Add Button */}
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button
          title="Create New Announcement"
          onPress={handleAddPress}
          disabled={isLoading || deleteMutation.isPending} // Disable if loading or deleting
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
          data={announcements} // Data from useQuery (Supabase)
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            // Container View for each item + actions
            <View style={appSharedStyles.itemContainer}>
              <AnnouncementListItem item={item} /> {/* Displays announcement content */}
              {/* Action buttons specific to admin */}
              <View style={adminSharedStyles.itemActions}>
                <Button
                  title="Edit"
                  onPress={() => handleEditPress(item)}
                  disabled={deleteMutation.isPending} // Disable during delete
                />
                <Button
                  title="Delete"
                  onPress={() => handleDeletePress(item)}
                  color={colors.danger}
                  disabled={deleteMutation.isPending} // Disable during delete
                />
              </View>
            </View>
          )}
          scrollEnabled={false} // Assuming parent ScrollView
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No announcements found.</Text>
          )}
        />
      )}

      {/* Modals */}
      <CreateAnnouncementModal
        visible={isCreateModalVisible}
        onClose={closeCreateModal}
      />
      <EditAnnouncementModal
        visible={isEditModalVisible}
        announcementToEdit={announcementToEdit}
        onClose={closeEditModal}
      />
      <ConfirmationModal
        visible={isDeleteModalVisible}
        title="Confirm Delete"
        message={`Are you sure you want to delete the announcement "${announcementToDelete?.title || ''}"? This cannot be undone.`}
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete Announcement'}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
        confirmDisabled={deleteMutation.isPending}
      />
    </View>
  );
};