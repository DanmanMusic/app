
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../contexts/DataContext';
import { RewardItem } from '../mocks/mockRewards';
import { Announcement } from '../mocks/mockAnnouncements';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';

interface PublicViewProps {}

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

const AnnouncementListItem = ({ item }: { item: Announcement }) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={styles.announcementTitle}>{item.title}</Text>
    <Text style={appSharedStyles.itemDetailText}>{item.message}</Text>
    <Text style={styles.announcementDate}>{new Date(item.date).toLocaleDateString()}</Text>
  </View>
);

type PublicTab = 'welcome' | 'rewards' | 'announcements';

export const PublicView: React.FC<PublicViewProps> = () => {  
  const { rewardsCatalog, announcements } = useData();
  const [activeTab, setActiveTab] = useState<PublicTab>('welcome');
  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.container}>
        <Text style={[appSharedStyles.header, styles.publicHeader]}>Danmans Music School</Text>
        <Text style={styles.subheader}>Virtual Ticket Rewards Program</Text>

        {}
        <View style={styles.tabContainer}>
          <Button
            title="Welcome"
            onPress={() => setActiveTab('welcome')}
            color={activeTab === 'welcome' ? colors.primary : colors.secondary}
          />
          <Button
            title="Announcements"
            onPress={() => setActiveTab('announcements')}
            color={activeTab === 'announcements' ? colors.primary : colors.secondary}
          />
          <Button
            title="Rewards Catalog"
            onPress={() => setActiveTab('rewards')}
            color={activeTab === 'rewards' ? colors.primary : colors.secondary}
          />
        </View>

        {}
        <View style={styles.contentArea}>
          {activeTab === 'welcome' && (
            <View style={styles.tabContentPlaceholder}>
              {}
            </View>
          )}

          {activeTab === 'rewards' && (
            <FlatList
              
              data={rewardsCatalog.sort((a, b) => a.cost - b.cost)}
              keyExtractor={item => `reward-${item.id}`}
              renderItem={({ item }) => <RewardItemPublic item={item} />}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              ListEmptyComponent={() => <Text style={appSharedStyles.emptyListText}>No rewards found.</Text>}
              contentContainerStyle={styles.listContentContainer}
              ListFooterComponent={<View style={{ height: 20 }}/>}
            />
          )}

          {activeTab === 'announcements' && (
            <FlatList              
              data={announcements.sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
              )}
              keyExtractor={item => `announcement-${item.id}`}
              renderItem={({ item }) => <AnnouncementListItem item={item} />}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              ListEmptyComponent={() => (
                <Text style={appSharedStyles.emptyListText}>No announcements found.</Text>
              )}
              contentContainerStyle={styles.listContentContainer}
              ListFooterComponent={<View style={{ height: 20 }}/>}
            />
          )}
        </View>

        <Text style={styles.footer}>Login to track your progress and earn tickets!</Text>
      </View>
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
    marginBottom: 20,
    color: colors.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    gap: 10,
  },
  contentArea: {
    flex: 1,
  },
  tabContentPlaceholder: {
    flex: 1,
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
    marginTop: 20,
    marginBottom: 10,
    fontSize: 16,
    color: colors.textSecondary,
  },
});