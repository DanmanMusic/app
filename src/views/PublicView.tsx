// src/views/PublicView.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { View, Text, FlatList, Button, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// API functions (Both now hit Supabase)
import { fetchAnnouncements } from '../api/announcements';
import { fetchRewards } from '../api/rewards';

import { Announcement, RewardItem } from '../types/dataTypes';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';
import { commonSharedStyles } from '../styles/commonSharedStyles'; // For error text

// Common components for rendering list items
import { AnnouncementListItem } from '../components/common/AnnouncementListItem'; // Displays Announcement data
import { RewardItemPublic } from '../components/common/RewardItemPublic';

type PublicTab = 'welcome' | 'rewards' | 'announcements';

export const PublicView = () => {
  const [activeTab, setActiveTab] = useState<PublicTab>('welcome');

  // Fetch Rewards - Uses Supabase-backed fetchRewards
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

  // Fetch Announcements - Uses Supabase-backed fetchAnnouncements
  const {
    data: announcements = [],
    isLoading: isLoadingAnnouncements,
    isError: isErrorAnnouncements,
    error: errorAnnouncements,
  } = useQuery<Announcement[], Error>({
    queryKey: ['announcements'], // Query key remains the same
    queryFn: fetchAnnouncements, // This function now fetches from Supabase
    staleTime: 5 * 60 * 1000,
  });

  // Helper to get error message text
  const getErrorMessage = (error: Error | null) => {
    if (!error) return 'An unknown error occurred.';
    return error.message || 'Failed to load data.';
  };

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.container}>
        {/* Header */}
        <Text style={[appSharedStyles.header, appSharedStyles.publicHeader]}>
          Danmans Music School
        </Text>
        <Text style={appSharedStyles.subheader}>Virtual Ticket Rewards Program</Text>

        {/* Tab Navigation */}
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

        {/* Tab Content */}
        <View style={appSharedStyles.contentArea}>
          {activeTab === 'welcome' && (
            <View style={appSharedStyles.tabContentPlaceholder}>
              <Text style={{ textAlign: 'center', padding: 20, fontSize: 16, color: colors.textSecondary }}>
                Welcome! Check out the latest announcements and the cool rewards you can earn.
                Login required to track progress.
              </Text>
            </View>
          )}

          {activeTab === 'rewards' && (
            <>
              {isLoadingRewards && (
                <ActivityIndicator style={{ marginTop: 20 }} size="large" color={colors.primary} />
              )}
              {isErrorRewards && (
                <Text style={[commonSharedStyles.errorText, commonSharedStyles.textCenter, { marginTop: 10 }]}>
                  Error loading rewards catalog: {getErrorMessage(errorRewards)}
                </Text>
              )}
              {!isLoadingRewards && !isErrorRewards && (
                <FlatList
                  data={rewardsCatalog} // Data from Supabase
                  keyExtractor={item => `reward-${item.id}`}
                  renderItem={({ item }) => <RewardItemPublic item={item} />}
                  ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                  ListEmptyComponent={() => (
                    <Text style={appSharedStyles.emptyListText}>No rewards currently available.</Text>
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
                <Text style={[commonSharedStyles.errorText, commonSharedStyles.textCenter, { marginTop: 10 }]}>
                  Error loading announcements: {getErrorMessage(errorAnnouncements)}
                </Text>
              )}
              {!isLoadingAnnouncements && !isErrorAnnouncements && (
                <FlatList
                  data={announcements} // Data from Supabase
                  keyExtractor={item => `announcement-${item.id}`}
                  renderItem={({ item }) => <AnnouncementListItem item={item} />} // Component displays data
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

        {/* Footer */}
        <Text style={appSharedStyles.footer}>Login to track your progress and earn tickets!</Text>
      </View>
    </SafeAreaView>
  );
};