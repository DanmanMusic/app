// src/components/admin/AdminAnnouncementsSection.tsx
import React from 'react';
import { View, Text, StyleSheet, Button, Alert, FlatList } from 'react-native';

// Import types
import { Announcement } from '../../mocks/mockAnnouncements';

// Reuse AnnouncementItemPupil component from PupilView
import { AnnouncementItemPupil } from '../../views/PupilView';

// Import shared styles
import { adminSharedStyles } from './adminSharedStyles';

interface AdminAnnouncementsSectionProps {
  announcements: Announcement[];
  onCreateAnnouncement: (announcementData: any) => void;
  onEditAnnouncement: (announcementId: string, announcementData: any) => void;
  onDeleteAnnouncement: (announcementId: string) => void;
}

export const AdminAnnouncementsSection: React.FC<AdminAnnouncementsSectionProps> = ({
  announcements,
  onCreateAnnouncement,
  onEditAnnouncement,
  onDeleteAnnouncement,
}) => {
  const handleEditAnnouncement = (announcementId: string) => {
    onEditAnnouncement(announcementId, {});
  };
  const handleDeleteAnnouncement = (announcementId: string) => {
    onDeleteAnnouncement(announcementId);
  };

  return (
    <View>
      <Text style={adminSharedStyles.sectionTitle}>
        Announcements & Challenges ({announcements.length})
      </Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        {/* Keep (Mock) as it only alerts */}
        <Button title="Create New Announcement (Mock)" onPress={() => onCreateAnnouncement({})} />
      </View>
      <FlatList
        data={announcements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={adminSharedStyles.item}>
            <AnnouncementItemPupil item={item} />
            <View style={adminSharedStyles.itemActions}>
              {/* Keep (Mock) as it only alerts */}
              <Button title="Edit (Mock)" onPress={() => handleEditAnnouncement(item.id)} />
              {/* Keep (Mock) as it only alerts */}
              <Button
                title="Delete (Mock)"
                onPress={() => handleDeleteAnnouncement(item.id)}
                color="red"
              />
            </View>
          </View>
        )}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={() => (
          <Text style={adminSharedStyles.emptyListText}>No announcements found.</Text>
        )}
      />
    </View>
  );
};
