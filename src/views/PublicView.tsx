import React, { useState } from 'react';

import { View, Text, FlatList, Button, ActivityIndicator } from 'react-native';

import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchAnnouncements } from '../api/announcements';
import { fetchRewards } from '../api/rewards';
import { AnnouncementListItem } from '../components/common/AnnouncementListItem';
import { RewardItemPublic } from '../components/common/RewardItemPublic';
import { colors } from '../styles/colors';
import { commonSharedStyles } from '../styles/commonSharedStyles';
import { Announcement, RewardItem } from '../types/dataTypes';

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
    <SafeAreaView style={[commonSharedStyles.flex1]}>
      <View>
        <View style={commonSharedStyles.baseMarginTopBottom}>
          <Text
            style={[
              commonSharedStyles.baseHeaderTextLarge,
              commonSharedStyles.textCenter,
              commonSharedStyles.baseMarginTopBottom,
            ]}
          >
            Danmans Music School
          </Text>
          <Text style={[commonSharedStyles.baseSubTitleText, commonSharedStyles.textCenter]}>
            Virtual Ticket Rewards Program
          </Text>
        </View>
        <View
          style={[
            commonSharedStyles.baseRow,
            commonSharedStyles.baseCentered,
            commonSharedStyles.baseGap,
            commonSharedStyles.baseMarginTopBottom,
          ]}
        >
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
      </View>
      <View style={commonSharedStyles.flex1}>
        {activeTab === 'welcome' && (
          <View
            style={[
              commonSharedStyles.flex1,
              commonSharedStyles.baseRow,
              commonSharedStyles.justifyCenter,
            ]}
          >
            <Text style={[commonSharedStyles.baseSubTitleText, { paddingTop: 100 }]}>
              Welcome! Check out the latest announcements and the cool rewards you can earn.
            </Text>
          </View>
        )}

        {activeTab === 'rewards' && (
          <>
            {isLoadingRewards && <ActivityIndicator size="large" color={colors.primary} />}
            {isErrorRewards && (
              <Text style={[commonSharedStyles.errorText, commonSharedStyles.textCenter]}>
                Error loading rewards catalog: {getErrorMessage(errorRewards)}
              </Text>
            )}
            {!isLoadingRewards && !isErrorRewards && (
              <FlatList
                data={rewardsCatalog}
                keyExtractor={item => `reward-${item.id}`}
                renderItem={({ item }) => <RewardItemPublic item={item} />}
                ItemSeparatorComponent={() => <View style={commonSharedStyles.separator} />}
                ListEmptyComponent={() => (
                  <Text style={commonSharedStyles.baseEmptyText}>
                    No rewards currently available.
                  </Text>
                )}
              />
            )}
          </>
        )}

        {activeTab === 'announcements' && (
          <>
            {isLoadingAnnouncements && <ActivityIndicator size="large" color={colors.primary} />}
            {isErrorAnnouncements && (
              <Text style={[commonSharedStyles.errorText, commonSharedStyles.textCenter]}>
                Error loading announcements: {getErrorMessage(errorAnnouncements)}
              </Text>
            )}
            {!isLoadingAnnouncements && !isErrorAnnouncements && (
              <FlatList
                data={announcements}
                keyExtractor={item => `announcement-${item.id}`}
                renderItem={({ item }) => (
                  <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseItem]}>
                    <AnnouncementListItem item={item} />
                  </View>
                )}
                ItemSeparatorComponent={() => <View style={commonSharedStyles.separator} />}
                ListEmptyComponent={() => (
                  <Text style={commonSharedStyles.baseEmptyText}>No announcements found.</Text>
                )}
              />
            )}
          </>
        )}
      </View>
      <View
        style={[
          commonSharedStyles.baseMarginTopBottom,
          commonSharedStyles.baseColumn,
          commonSharedStyles.baseAlignCenter,
        ]}
      >
        <Text
          style={[
            commonSharedStyles.baseSubTitleText,
            commonSharedStyles.textCenter,
            commonSharedStyles.baseMargin,
          ]}
        >
          Ready to track progress?
        </Text>
        <Button title="Login / Enter PIN" onPress={onLoginPress} color={colors.primary} />
      </View>
    </SafeAreaView>
  );
};
