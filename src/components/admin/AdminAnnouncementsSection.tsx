
import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  ActivityIndicator, 
  StyleSheet, 
  Alert, 
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; 


import { fetchAnnouncements, deleteAnnouncement } from '../../api/announcements'; 
import { Announcement } from '../../mocks/mockAnnouncements';


import { AnnouncementListItemStudent } from '../../views/StudentView'; 
import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import CreateAnnouncementModal from './modals/CreateAnnouncementModal';
import EditAnnouncementModal from './modals/EditAnnouncementModal';
import ConfirmationModal from '../common/ConfirmationModal';


interface AdminAnnouncementsSectionProps {
  
}

export const AdminAnnouncementsSection: React.FC<AdminAnnouncementsSectionProps> = () => {
  
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
      console.log(`Announcement ${deletedAnnouncementId} deleted successfully via mutation.`);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      closeDeleteModal();
    },
    onError: (err, deletedAnnouncementId) => {
      console.error(`Error deleting announcement ${deletedAnnouncementId}:`, err);
      closeDeleteModal();
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
    <View>
      <Text style={appSharedStyles.sectionTitle}>
        Announcements & Challenges ({announcements.length})
      </Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button title="Create New Announcement" onPress={handleAddPress} />
      </View>

      {}
      {isLoading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
      )}

      {}
      {isError && !isLoading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{getErrorMessage()}</Text>
        </View>
      )}

      {}
      {!isLoading && !isError && (
        <FlatList
          data={announcements} 
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={appSharedStyles.itemContainer}>
              {}
              <AnnouncementListItemStudent item={item} />
              <View style={adminSharedStyles.itemActions}>
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
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No announcements found.</Text>
          )}
        />
      )}

      {}
      <CreateAnnouncementModal visible={isCreateModalVisible} onClose={closeCreateModal} />
      <EditAnnouncementModal
        visible={isEditModalVisible}
        announcementToEdit={announcementToEdit}
        onClose={closeEditModal}
      />
      <ConfirmationModal
        visible={isDeleteModalVisible}
        title="Confirm Delete"
        message={`Are you sure you want to delete the announcement "${
          announcementToDelete?.title || ''
        }"? This cannot be undone.`}
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete Announcement'}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
        confirmDisabled={deleteMutation.isPending}
      />
    </View>
  );
};


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
});
