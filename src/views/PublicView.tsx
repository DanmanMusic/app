import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { View, Text, FlatList, Button, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchAnnouncements } from '../api/announcements';
import { fetchRewards } from '../api/rewards';

import { Announcement, RewardItem } from '../types/dataTypes';

import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';
import { commonSharedStyles } from '../styles/commonSharedStyles';

import { AnnouncementListItem } from '../components/common/AnnouncementListItem';
import { RewardItemPublic } from '../components/common/RewardItemPublic';

type PublicTab = 'welcome' | 'rewards' | 'announcements';

interface PublicViewProps {
  onLoginPress: () => void;
}

export const PublicView: React.FC<PublicViewProps> = ({ onLoginPress }) => {
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
    return error.message || 'Failed to load data.';
  };

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.itemOuter}>
        <View style={appSharedStyles.headerSection}>
          <Text style={[appSharedStyles.header, appSharedStyles.publicHeader]}>
            Danmans Music School
          </Text>
          <Text style={appSharedStyles.subheader}>Virtual Ticket Rewards Program</Text>
        </View>
        <View style={appSharedStyles.containerRowCentered}>
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
            <View style={appSharedStyles.itemFlexCenter}>
              <Text style={appSharedStyles.textWelcome}>
                Welcome! Check out the latest announcements and the cool rewards you can earn.
              </Text>
              <Text style={appSharedStyles.textWelcome}>Login required to track progress.</Text>
            </View>
          )}

          {activeTab === 'rewards' && (
            <>
              {isLoadingRewards && <ActivityIndicator size="large" color={colors.primary} />}
              {isErrorRewards && (
                <Text style={[commonSharedStyles.errorText, appSharedStyles.textCenter]}>
                  Error loading rewards catalog: {getErrorMessage(errorRewards)}
                </Text>
              )}
              {!isLoadingRewards && !isErrorRewards && (
                <FlatList
                  data={rewardsCatalog}
                  keyExtractor={item => `reward-${item.id}`}
                  renderItem={({ item }) => <RewardItemPublic item={item} />}
                  ItemSeparatorComponent={() => <View style={appSharedStyles.separator} />}
                  ListEmptyComponent={() => (
                    <Text style={appSharedStyles.emptyListText}>
                      No rewards currently available.
                    </Text>
                  )}
                  contentContainerStyle={appSharedStyles.containerListContent}
                />
              )}
            </>
          )}

          {activeTab === 'announcements' && (
            <>
              {isLoadingAnnouncements && <ActivityIndicator size="large" color={colors.primary} />}
              {isErrorAnnouncements && (
                <Text style={[commonSharedStyles.errorText, appSharedStyles.textCenter]}>
                  Error loading announcements: {getErrorMessage(errorAnnouncements)}
                </Text>
              )}
              {!isLoadingAnnouncements && !isErrorAnnouncements && (
                <FlatList
                  data={announcements}
                  keyExtractor={item => `announcement-${item.id}`}
                  renderItem={({ item }) => <AnnouncementListItem item={item} />}
                  ItemSeparatorComponent={() => <View style={appSharedStyles.separator} />}
                  ListEmptyComponent={() => (
                    <Text style={appSharedStyles.emptyListText}>No announcements found.</Text>
                  )}
                  contentContainerStyle={appSharedStyles.containerListContent}
                />
              )}
            </>
          )}
        </View>
        <View style={appSharedStyles.containerFooter}>
          <Text style={appSharedStyles.footer}>Ready to track progress?</Text>
          <Button title="Login / Enter PIN" onPress={onLoginPress} color={colors.primary} />
        </View>
      </View>
    </SafeAreaView>
  );
};
