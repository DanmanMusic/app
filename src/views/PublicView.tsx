// src/views/PublicView.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Image } from 'react-native'; // Ensure Image is imported
import { SafeAreaView } from 'react-native-safe-area-context';

// Import types for mock data
import { RewardItem } from '../mocks/mockRewards';
import { Announcement } from '../mocks/mockAnnouncements';

interface PublicViewProps {
  rewardsCatalog: RewardItem[];
  announcements: Announcement[];
}

// Render item for FlatList of Rewards (using Image component)
const RewardItemPublic = ({ item }: { item: RewardItem }) => (
  <View style={styles.rewardItemContainer}>
    {/* Use Image component with source from item.imageUrl */}
    {/* Error handling (onError) or loading indicator could be added in a real app */}
    <Image
      source={{ uri: item.imageUrl }}
      style={styles.rewardImage} // Use a specific image style
      resizeMode="contain" // Ensure the image fits well
    />
    <View style={styles.rewardDetails}>
      <Text style={styles.rewardName}>{item.name}</Text>
      <Text style={styles.rewardCost}>{item.cost} Tickets</Text>
      {item.description && <Text style={styles.rewardDescription}>{item.description}</Text>}
    </View>
  </View>
);

// Render item for FlatList of Announcements
const AnnouncementItem = ({ item }: { item: Announcement }) => (
  <View style={styles.announcementItemContainer}>
    <Text style={styles.announcementTitle}>{item.title}</Text>
    <Text style={styles.announcementMessage}>{item.message}</Text>
    <Text style={styles.announcementDate}>{new Date(item.date).toLocaleDateString()}</Text>
  </View>
);

export const PublicView: React.FC<PublicViewProps> = ({ rewardsCatalog, announcements }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.header}>Danmans Music School</Text>
        <Text style={styles.subheader}>Virtual Ticket Rewards Program</Text>

        <Text style={styles.sectionTitle}>Rewards Catalog</Text>
        <FlatList
          data={rewardsCatalog.sort((a, b) => a.cost - b.cost)} // Sort by cost
          keyExtractor={item => item.id}
          renderItem={({ item }) => <RewardItemPublic item={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={() => <Text style={styles.emptyListText}>No rewards found.</Text>}
          scrollEnabled={false}
          contentContainerStyle={styles.listContentContainer}
        />

        <Text style={styles.sectionTitle}>Announcements</Text>
        <FlatList
          data={announcements.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )} // Sort by date
          keyExtractor={item => item.id}
          renderItem={({ item }) => <AnnouncementItem item={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={() => (
            <Text style={styles.emptyListText}>No announcements found.</Text>
          )}
          scrollEnabled={false}
          contentContainerStyle={styles.listContentContainer}
        />

        <Text style={styles.footer}>Login to track your progress and earn tickets!</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  container: {
    flex: 1,
    padding: 15,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 5,
  },
  subheader: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 25,
    color: '#555',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 15,
    color: '#444',
  },
  // Styles for Reward Items
  rewardItemContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  rewardImage: {
    // New style for reward item image (copied from PupilView with minor size change if needed)
    width: 80, // Slightly larger for public view? Or keep same? Let's keep 80x80 for public
    height: 80,
    marginRight: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  // Removed rewardImagePlaceholder and rewardImagePlaceholderText
  rewardDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  rewardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  rewardCost: {
    fontSize: 15,
    color: 'gold',
    fontWeight: '600',
    marginVertical: 3,
  },
  rewardDescription: {
    fontSize: 14,
    color: '#666',
  },
  // Styles for Announcement Items
  announcementItemContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  announcementMessage: {
    fontSize: 14,
    color: '#555',
  },
  announcementDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    textAlign: 'right',
  },
  emptyListText: {
    textAlign: 'center',
    color: '#777',
    marginTop: 10,
  },
  listContentContainer: {
    paddingBottom: 5,
  },
  footer: {
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 20,
    fontSize: 16,
    color: '#666',
  },
});
