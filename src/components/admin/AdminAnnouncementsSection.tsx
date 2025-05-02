// src/components/admin/AdminAnnouncementsSection.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { View, Text, Button, FlatList, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';

import { fetchAnnouncements, deleteAnnouncement } from '../../api/announcements';

import { Announcement } from '../../types/dataTypes';
// Correctly using commonSharedStyles
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { colors } from '../../styles/colors';

import ConfirmationModal from '../common/ConfirmationModal';
import CreateAnnouncementModal from './modals/CreateAnnouncementModal';
import EditAnnouncementModal from './modals/EditAnnouncementModal';
import { AnnouncementListItem } from '../common/AnnouncementListItem';

export const AdminAnnouncementsSection = () => {
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [announcementToEdit, setAnnouncementToEdit] = useState<Announcement | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  const queryClient = useQueryClient();

  const {
    data: announcements = [],
    isLoading,
    isError,
    error,
  } = useQuery<Announcement[], Error>({
    queryKey: ['announcements'],
    queryFn: fetchAnnouncements,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: (_, deletedAnnouncementId) => {
      console.log(`[AdminAnnSection] Announcement ${deletedAnnouncementId} deleted successfully.`);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      closeDeleteModal();
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
    deleteMutation.reset();
  };

  const handleDeleteConfirm = () => {
    if (announcementToDelete && !deleteMutation.isPending) {
      deleteMutation.mutate(announcementToDelete.id);
    }
  };

  const getErrorMessage = () => {
    if (!error) return 'An unknown error occurred.';
    return `Error loading announcements: ${error.message}`;
  };

  return (
    <View style={commonSharedStyles.baseMargin}>
      <Text style={[commonSharedStyles.baseTitleText, commonSharedStyles.baseMarginTopBottom]}>
        Announcements & Challenges ({announcements.length})
      </Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button
          title="Create New Announcement"
          onPress={handleAddPress}
          disabled={isLoading || deleteMutation.isPending}
        />
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
          data={announcements}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                commonSharedStyles.baseRow,
                commonSharedStyles.justifySpaceBetween,
                commonSharedStyles.baseItem,
              ]}
            >
              <AnnouncementListItem item={item} />
              <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseGap]}>
                <Button
                  title="Edit"
                  onPress={() => handleEditPress(item)}
                  disabled={deleteMutation.isPending}
                />
                <Button
                  title="Delete"
                  onPress={() => handleDeletePress(item)}
                  color={colors.danger}
                  disabled={deleteMutation.isPending}
                />
              </View>
            </View>
          )}
          scrollEnabled={false} // Assuming this list won't be long enough to need scrolling within the main view's scroll
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={() => (
            <Text style={commonSharedStyles.baseEmptyText}>No announcements found.</Text>
          )}
        />
      )}
      <CreateAnnouncementModal visible={isCreateModalVisible} onClose={closeCreateModal} />
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
