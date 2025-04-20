// src/components/admin/AdminAnnouncementsSection.tsx
import React from 'react';
import { View, Text, StyleSheet, Button, Alert, FlatList } from 'react-native';

import { Announcement } from '../../mocks/mockAnnouncements';

import { AnnouncementItemPupil } from '../../views/PupilView';

import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';


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
      <Text style={appSharedStyles.sectionTitle}>
        Announcements & Challenges ({announcements.length})
      </Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button title="Create New Announcement (Mock)" onPress={() => onCreateAnnouncement({})} />
      </View>
      <FlatList
        data={announcements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={appSharedStyles.itemContainer}>
            <AnnouncementItemPupil item={item} />
            <View style={adminSharedStyles.itemActions}>
              <Button title="Edit (Mock)" onPress={() => handleEditAnnouncement(item.id)} />
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
          <Text style={appSharedStyles.emptyListText}>No announcements found.</Text>
        )}
      />
    </View>
  );
};