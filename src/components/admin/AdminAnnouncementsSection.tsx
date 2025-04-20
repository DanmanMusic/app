// src/components/admin/AdminAnnouncementsSection.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, FlatList } from 'react-native';

import { Announcement } from '../../mocks/mockAnnouncements';
import { AnnouncementItemPupil } from '../../views/StudentView'; // Reusing Student view for display

import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';

// Import Modals
import CreateAnnouncementModal from './modals/CreateAnnouncementModal';
import EditAnnouncementModal from './modals/EditAnnouncementModal';
import ConfirmationModal from '../common/ConfirmationModal'; // Reusable confirmation


interface AdminAnnouncementsSectionProps {
  announcements: Announcement[];
  // Use specific types for functions passed down
  onCreateAnnouncement: (announcementData: Omit<Announcement, 'id' | 'date'>) => void;
  onEditAnnouncement: (announcementId: string, announcementData: Partial<Omit<Announcement, 'id' | 'date'>>) => void;
  onDeleteAnnouncement: (announcementId: string) => void;
}

export const AdminAnnouncementsSection: React.FC<AdminAnnouncementsSectionProps> = ({
  announcements,
  onCreateAnnouncement,
  onEditAnnouncement,
  onDeleteAnnouncement,
}) => {
  // State for modals
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [announcementToEdit, setAnnouncementToEdit] = useState<Announcement | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  // --- Modal Open Handlers ---
  const handleAddPress = () => setIsCreateModalVisible(true);

  const handleEditPress = (announcement: Announcement) => {
    setAnnouncementToEdit(announcement);
    setIsEditModalVisible(true);
  };

  const handleDeletePress = (announcement: Announcement) => {
    setAnnouncementToDelete(announcement);
    setIsDeleteModalVisible(true);
  };

  // --- Modal Close Handlers ---
  const closeCreateModal = () => setIsCreateModalVisible(false);
  const closeEditModal = () => { setIsEditModalVisible(false); setAnnouncementToEdit(null); };
  const closeDeleteModal = () => { setIsDeleteModalVisible(false); setAnnouncementToDelete(null); };

  // --- Modal Confirmation Handlers ---
  const handleCreateConfirm = (announcementData: Omit<Announcement, 'id' | 'date'>) => {
    onCreateAnnouncement(announcementData);
    closeCreateModal();
  };

  const handleEditConfirm = (
    announcementId: string,
    announcementData: Partial<Omit<Announcement, 'id' | 'date'>>
  ) => {
    onEditAnnouncement(announcementId, announcementData);
    closeEditModal();
  };

  const handleDeleteConfirm = () => {
    if (announcementToDelete) {
      onDeleteAnnouncement(announcementToDelete.id);
    }
    closeDeleteModal();
  };


  return (
    <View>
      <Text style={appSharedStyles.sectionTitle}>
        Announcements & Challenges ({announcements.length})
      </Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button title="Create New Announcement" onPress={handleAddPress} />
      </View>
      <FlatList
        // Use announcements passed down from App state
        data={announcements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={appSharedStyles.itemContainer}>
            {/* Reusing Student view item for display is fine for mock */}
            <AnnouncementItemPupil item={item} />
            <View style={adminSharedStyles.itemActions}>
              {/* Wire up Edit/Delete buttons */}
              <Button title="Edit" onPress={() => handleEditPress(item)} />
              <Button
                title="Delete"
                onPress={() => handleDeletePress(item)}
                color={colors.danger}
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

      {/* Render Modals */}
      <CreateAnnouncementModal
        visible={isCreateModalVisible}
        onClose={closeCreateModal}
        onCreateConfirm={handleCreateConfirm}
      />
      <EditAnnouncementModal
        visible={isEditModalVisible}
        announcementToEdit={announcementToEdit}
        onClose={closeEditModal}
        onEditConfirm={handleEditConfirm}
      />
      <ConfirmationModal
        visible={isDeleteModalVisible}
        title="Confirm Delete"
        message={`Are you sure you want to delete the announcement "${announcementToDelete?.title || ''}"? This cannot be undone.`}
        confirmText="Delete Announcement"
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
      />
    </View>
  );
};