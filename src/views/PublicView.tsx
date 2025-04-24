import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { View, Text, FlatList, Button, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchAnnouncements } from '../api/announcements';
import { fetchRewards } from '../api/rewards';
import { Announcement } from '../mocks/mockAnnouncements';
import { RewardItem } from '../mocks/mockRewards';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';
import { PublicViewProps } from '../types/componentProps';
import { AnnouncementListItem } from '../components/common/AnnouncementListItem';
import { RewardItemPublic } from '../components/common/RewardItemPublic';

type PublicTab = 'welcome' | 'rewards' | 'announcements';

export const PublicView: React.FC<PublicViewProps> = () => {
  const [activeTab, setActiveTab] = useState<PublicTab>('welcome');

  const {
    data: rewardsCatalog = [],
    isLoading: isLoadingRewards,
    isError: isErrorRewards,
    error: errorRewards,
  } = useQuery<RewardItem[], Error>({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
    staleTime: 10 * 60 * 1000,
  });

  const {
    data: announcements = [],
    isLoading: isLoadingAnnouncements,
    isError: isErrorAnnouncements,
    error: errorAnnouncements,
  } = useQuery<Announcement[], Error>({
    queryKey: ['announcements'],
    queryFn: fetchAnnouncements,
    staleTime: 5 * 60 * 1000,
  });

  const getErrorMessage = (error: Error | null) => {
    if (!error) return 'An unknown error occurred.';
    return error.message;
  };

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.container}>
        <Text style={[appSharedStyles.header, appSharedStyles.publicHeader]}>
          Danmans Music School
        </Text>
        <Text style={appSharedStyles.subheader}>Virtual Ticket Rewards Program</Text>
        <View style={appSharedStyles.tabContainer}>
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
        <View style={appSharedStyles.contentArea}>
          {activeTab === 'welcome' && (
            <View style={appSharedStyles.tabContentPlaceholder}>
              <Text style={{ textAlign: 'center', padding: 20 }}>
                Welcome! Check out the announcements and rewards.
              </Text>
            </View>
          )}
          {activeTab === 'rewards' && (
            <>
              {isLoadingRewards && (
                <ActivityIndicator style={{ marginTop: 20 }} size="large" color={colors.primary} />
              )}
              {isErrorRewards && (
                <Text style={[appSharedStyles.textDanger, { textAlign: 'center', marginTop: 10 }]}>
                  Error loading rewards: {getErrorMessage(errorRewards)}
                </Text>
              )}
              {!isLoadingRewards && !isErrorRewards && (
                <FlatList
                  data={rewardsCatalog.sort((a, b) => a.cost - b.cost)}
                  keyExtractor={item => `reward-${item.id}`}
                  renderItem={({ item }) => <RewardItemPublic item={item} />}
                  ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                  ListEmptyComponent={() => (
                    <Text style={appSharedStyles.emptyListText}>No rewards found.</Text>
                  )}
                  contentContainerStyle={appSharedStyles.listContentContainer}
                  ListFooterComponent={<View style={{ height: 20 }} />}
                />
              )}
            </>
          )}
          {activeTab === 'announcements' && (
            <>
              {isLoadingAnnouncements && (
                <ActivityIndicator style={{ marginTop: 20 }} size="large" color={colors.primary} />
              )}
              {isErrorAnnouncements && (
                <Text style={[appSharedStyles.textDanger, { textAlign: 'center', marginTop: 10 }]}>
                  Error loading announcements: {getErrorMessage(errorAnnouncements)}
                </Text>
              )}
              {!isLoadingAnnouncements && !isErrorAnnouncements && (
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
                  contentContainerStyle={appSharedStyles.listContentContainer}
                  ListFooterComponent={<View style={{ height: 20 }} />}
                />
              )}
            </>
          )}
        </View>

        <Text style={appSharedStyles.footer}>Login to track your progress and earn tickets!</Text>
      </View>
    </SafeAreaView>
  );
};
