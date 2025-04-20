// src/views/PublicView.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import types for mock data
import { RewardItem } from '../mocks/mockRewards';
import { Announcement } from '../mocks/mockAnnouncements';

// Import shared styles and colors
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';

interface PublicViewProps {
  rewardsCatalog: RewardItem[];
  announcements: Announcement[];
}

const RewardItemPublic = ({ item }: { item: RewardItem }) => (
  <View style={appSharedStyles.itemContainer}>
    <View style={styles.rewardItemContent}>
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.rewardImage}
        resizeMode="contain"
      />
      <View style={styles.rewardDetails}>
        <Text style={styles.rewardName}>{item.name}</Text>
        <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>{item.cost} Tickets</Text>
        {item.description && <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>}
      </View>
    </View>
  </View>
);

const AnnouncementItem = ({ item }: { item: Announcement }) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={styles.announcementTitle}>{item.title}</Text>
    <Text style={appSharedStyles.itemDetailText}>{item.message}</Text>
    <Text style={styles.announcementDate}>{new Date(item.date).toLocaleDateString()}</Text>
  </View>
);

export const PublicView: React.FC<PublicViewProps> = ({ rewardsCatalog, announcements }) => {
  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <ScrollView style={appSharedStyles.container}>
        <Text style={[appSharedStyles.header, styles.publicHeader]}>Danmans Music School</Text>
        <Text style={styles.subheader}>Virtual Ticket Rewards Program</Text>

        <Text style={appSharedStyles.sectionTitle}>Rewards Catalog</Text>
        <FlatList
          data={rewardsCatalog.sort((a, b) => a.cost - b.cost)}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <RewardItemPublic item={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={() => <Text style={appSharedStyles.emptyListText}>No rewards found.</Text>}
          scrollEnabled={false}
          contentContainerStyle={styles.listContentContainer}
        />

        <Text style={appSharedStyles.sectionTitle}>Announcements</Text>
        <FlatList
          data={announcements.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <AnnouncementItem item={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No announcements found.</Text>
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
  publicHeader: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 5,
  },
  subheader: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 25,
    color: colors.textSecondary,
  },
  rewardItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardImage: {
    width: 80,
    height: 80,
    marginRight: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
  },
  rewardDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  rewardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  announcementDate: {
    fontSize: 12,
    color: colors.textVeryLight,
    marginTop: 8,
    textAlign: 'right',
  },
  listContentContainer: {
    paddingBottom: 5,
  },
  footer: {
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 20,
    fontSize: 16,
    color: colors.textSecondary,
  },
});