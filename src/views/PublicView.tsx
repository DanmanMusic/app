import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { View, Text, FlatList, Button, ActivityIndicator, StyleSheet } from 'react-native';
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
      <View style={styles.outerContainer}>
        <View style={styles.headerSection}>
          <Text style={[appSharedStyles.header, appSharedStyles.publicHeader]}>
            Danmans Music School
          </Text>
          <Text style={appSharedStyles.subheader}>Virtual Ticket Rewards Program</Text>
        </View>
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
        <View style={styles.contentArea}>
          {activeTab === 'welcome' && (
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>
                Welcome! Check out the latest announcements and the cool rewards you can earn.
              </Text>
              <Text style={styles.welcomeText}>Login required to track progress.</Text>
            </View>
          )}

          {activeTab === 'rewards' && (
            <>
              {isLoadingRewards && (
                <ActivityIndicator
                  style={styles.loadingIndicator}
                  size="large"
                  color={colors.primary}
                />
              )}
              {isErrorRewards && (
                <Text
                  style={[
                    commonSharedStyles.errorText,
                    commonSharedStyles.textCenter,
                    styles.errorMargin,
                  ]}
                >
                  Error loading rewards catalog: {getErrorMessage(errorRewards)}
                </Text>
              )}
              {!isLoadingRewards && !isErrorRewards && (
                <FlatList
                  data={rewardsCatalog}
                  keyExtractor={item => `reward-${item.id}`}
                  renderItem={({ item }) => <RewardItemPublic item={item} />}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  ListEmptyComponent={() => (
                    <Text style={appSharedStyles.emptyListText}>
                      No rewards currently available.
                    </Text>
                  )}
                  contentContainerStyle={styles.listContentContainer}
                />
              )}
            </>
          )}

          {activeTab === 'announcements' && (
            <>
              {isLoadingAnnouncements && (
                <ActivityIndicator
                  style={styles.loadingIndicator}
                  size="large"
                  color={colors.primary}
                />
              )}
              {isErrorAnnouncements && (
                <Text
                  style={[
                    commonSharedStyles.errorText,
                    commonSharedStyles.textCenter,
                    styles.errorMargin,
                  ]}
                >
                  Error loading announcements: {getErrorMessage(errorAnnouncements)}
                </Text>
              )}
              {!isLoadingAnnouncements && !isErrorAnnouncements && (
                <FlatList
                  data={announcements}
                  keyExtractor={item => `announcement-${item.id}`}
                  renderItem={({ item }) => <AnnouncementListItem item={item} />}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  ListEmptyComponent={() => (
                    <Text style={appSharedStyles.emptyListText}>No announcements found.</Text>
                  )}
                  contentContainerStyle={styles.listContentContainer}
                />
              )}
            </>
          )}
        </View>
        <View style={styles.footerContainer}>
          <Text style={appSharedStyles.footer}>Ready to track progress?</Text>
          <Button title="Login / Enter PIN" onPress={onLoginPress} color={colors.primary} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  headerSection: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 5,
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 15,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeText: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  loadingIndicator: {
    marginTop: 30,
  },
  errorMargin: {
    marginTop: 20,
  },
  separator: {
    height: 10,
  },
  listContentContainer: {
    paddingBottom: 20,
  },
  footerContainer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: colors.borderSecondary,
    alignItems: 'center',
    backgroundColor: colors.backgroundPrimary,
    gap: 10,
  },
});
