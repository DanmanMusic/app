import React, { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  View,
  Text,
  Button,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  // Alert, // Keep or remove depending on feedback preference
} from 'react-native';
// Import TQ hooks

// Import API functions
import {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../../api/announcements';
// Import Type
import { Announcement } from '../../mocks/mockAnnouncements';
// Import Prop Type
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { AdminAnnouncementsSectionProps } from '../../types/componentProps'; // Adjust path

// Import common components/styles
// Assuming AnnouncementListItemStudent is defined elsewhere (e.g., StudentView or common)
import { AnnouncementListItemStudent } from '../../views/StudentView'; // Adjust path if moved
import ConfirmationModal from '../common/ConfirmationModal';

import { adminSharedStyles } from './adminSharedStyles';

// Import Modals used by this section
import CreateAnnouncementModal from './modals/CreateAnnouncementModal';
import EditAnnouncementModal from './modals/EditAnnouncementModal';

// --- Main Section Component ---
export const AdminAnnouncementsSection: React.FC<AdminAnnouncementsSectionProps> = () => {
  // --- State for Modals ---
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [announcementToEdit, setAnnouncementToEdit] = useState<Announcement | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  const queryClient = useQueryClient();

  // --- TQ Query for fetching announcements ---
  const {
    data: announcements = [], // Default to empty array
    isLoading,
    isError,
    error,
  } = useQuery<Announcement[], Error>({
    queryKey: ['announcements'], // Unique key for announcements data
    queryFn: fetchAnnouncements, // API function
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  // --- TQ Mutations for CRUD operations ---
  // Note: Create/Edit mutations are handled within their respective modals.
  // We only need the Delete mutation here for the confirmation flow.

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement, // API function for deleting
    onSuccess: (_, deletedAnnouncementId) => {
      console.log(`Announcement ${deletedAnnouncementId} deleted successfully via mutation.`);
      // Invalidate the query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      closeDeleteModal(); // Close the confirmation modal
    },
    onError: (err, deletedAnnouncementId) => {
      console.error(`Error deleting announcement ${deletedAnnouncementId}:`, err);
      alert(
        `Failed to delete announcement: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
      closeDeleteModal();
    },
  });

  // --- Event Handlers ---
  // Open Modals
  const handleAddPress = () => setIsCreateModalVisible(true);
  const handleEditPress = (announcement: Announcement) => {
    setAnnouncementToEdit(announcement);
    setIsEditModalVisible(true);
  };
  const handleDeletePress = (announcement: Announcement) => {
    setAnnouncementToDelete(announcement);
    setIsDeleteModalVisible(true);
  };

  // Close Modals
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

  // Confirm Delete Action
  const handleDeleteConfirm = () => {
    if (announcementToDelete && !deleteMutation.isPending) {
      deleteMutation.mutate(announcementToDelete.id); // Trigger the mutation
    }
  };

  // Helper for error display
  const getErrorMessage = () => {
    if (!error) return 'An unknown error occurred.';
    return `Error loading announcements: ${error.message}`;
  };

  return (
    <View>
      {/* Section Title */}
      <Text style={appSharedStyles.sectionTitle}>
        {' '}
        Announcements & Challenges ({announcements.length}){' '}
      </Text>
      {/* Add Button */}
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button title="Create New Announcement" onPress={handleAddPress} />
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

      {/* Announcements List */}
      {!isLoading && !isError && (
        <FlatList
          data={announcements} // Use fetched data (already sorted by API/handler)
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={appSharedStyles.itemContainer}>
              {/* Use the imported list item component */}
              <AnnouncementListItemStudent item={item} />
              {/* Action Buttons */}
              <View style={adminSharedStyles.itemActions}>
                <Button
                  title="Edit"
                  onPress={() => handleEditPress(item)} // Open edit modal
                  disabled={deleteMutation.isPending} // Disable while deleting
                />
                <Button
                  title="Delete"
                  onPress={() => handleDeletePress(item)} // Open delete confirmation
                  color={colors.danger}
                  disabled={deleteMutation.isPending} // Disable while deleting
                />
              </View>
            </View>
          )}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No announcements found.</Text>
          )}
        />
      )}

      {/* Modals Rendered Here */}
      <CreateAnnouncementModal
        visible={isCreateModalVisible}
        onClose={closeCreateModal}
        // Handles own create mutation
      />
      <EditAnnouncementModal
        visible={isEditModalVisible}
        announcementToEdit={announcementToEdit}
        onClose={closeEditModal}
        // Handles own update mutation
      />
      <ConfirmationModal
        visible={isDeleteModalVisible}
        title="Confirm Delete"
        message={`Are you sure you want to delete the announcement "${announcementToDelete?.title || ''}"? This cannot be undone.`}
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete Announcement'}
        onConfirm={handleDeleteConfirm} // Trigger delete mutation
        onCancel={closeDeleteModal}
        confirmDisabled={deleteMutation.isPending} // Disable confirm while deleting
      />
    </View>
  );
};

// Styles for this section
const styles = StyleSheet.create({
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
  // Add any other specific styles needed for this section
});
