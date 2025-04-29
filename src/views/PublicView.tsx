// src/views/PublicView.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { View, Text, FlatList, Button, ActivityIndicator, StyleSheet } from 'react-native'; // Added StyleSheet
import { SafeAreaView } from 'react-native-safe-area-context';

// API functions (Both now hit Supabase)
import { fetchAnnouncements } from '../api/announcements';
import { fetchRewards } from '../api/rewards';

// Type Imports
import { Announcement, RewardItem } from '../types/dataTypes';

// Style Imports
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';
import { commonSharedStyles } from '../styles/commonSharedStyles'; // For error text

// Common components for rendering list items
import { AnnouncementListItem } from '../components/common/AnnouncementListItem';
import { RewardItemPublic } from '../components/common/RewardItemPublic';

type PublicTab = 'welcome' | 'rewards' | 'announcements';

// Define Props Interface for the component
interface PublicViewProps {
    onLoginPress: () => void; // Function passed from App.tsx to open the login modal
}

// Update Component Signature to accept props
export const PublicView: React.FC<PublicViewProps> = ({ onLoginPress }) => {
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
    queryKey: ['announcements'],
    queryFn: fetchAnnouncements,
    staleTime: 5 * 60 * 1000,
  });

  // Helper to get error message text
  const getErrorMessage = (error: Error | null) => {
    if (!error) return 'An unknown error occurred.';
    return error.message || 'Failed to load data.';
  };

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={styles.outerContainer}> {/* Use a local container */}
        {/* Header */}
        <View style={styles.headerSection}>
             <Text style={[appSharedStyles.header, appSharedStyles.publicHeader]}>
              Danmans Music School
            </Text>
            <Text style={appSharedStyles.subheader}>Virtual Ticket Rewards Program</Text>
         </View>


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

        {/* Tab Content Area */}
        {/* Use flex: 1 for the content area to push footer down */}
        <View style={styles.contentArea}>
          {activeTab === 'welcome' && (
            // Center the welcome message
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>
                Welcome! Check out the latest announcements and the cool rewards you can earn.
              </Text>
              <Text style={styles.welcomeText}>
                Login required to track progress.
              </Text>
              {/* Add Store Images here eventually */}
            </View>
          )}

          {activeTab === 'rewards' && (
            <>
              {isLoadingRewards && (
                <ActivityIndicator style={styles.loadingIndicator} size="large" color={colors.primary} />
              )}
              {isErrorRewards && (
                <Text style={[commonSharedStyles.errorText, commonSharedStyles.textCenter, styles.errorMargin]}>
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
                    <Text style={appSharedStyles.emptyListText}>No rewards currently available.</Text>
                  )}
                  // Add padding inside the list
                  contentContainerStyle={styles.listContentContainer}
                />
              )}
            </>
          )}

          {activeTab === 'announcements' && (
            <>
              {isLoadingAnnouncements && (
                <ActivityIndicator style={styles.loadingIndicator} size="large" color={colors.primary} />
              )}
              {isErrorAnnouncements && (
                <Text style={[commonSharedStyles.errorText, commonSharedStyles.textCenter, styles.errorMargin]}>
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

        {/* Footer */}
        <View style={styles.footerContainer}>
            <Text style={appSharedStyles.footer}>Ready to track progress?</Text>
            {/* Use the onLoginPress prop passed from App.tsx */}
            <Button
                title="Login / Enter PIN"
                onPress={onLoginPress}
                color={colors.primary}
             />
        </View>
      </View>
    </SafeAreaView>
  );
};

// Local Styles specific to PublicView layout
const styles = StyleSheet.create({
    outerContainer: {
        flex: 1, // Ensure the outer container takes full height
        backgroundColor: colors.backgroundSecondary, // Match SafeAreaView background
    },
    headerSection: {
        paddingHorizontal: 15,
        paddingTop: 10, // Add some top padding if needed
        paddingBottom: 5,
    },
    contentArea: {
        flex: 1, // Allow content area to expand and push footer down
        paddingHorizontal: 15, // Add horizontal padding for lists
    },
    welcomeContainer: {
        flex: 1, // Allow welcome text to center vertically
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
     welcomeText: {
        textAlign: 'center',
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: 10, // Space between lines
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
         paddingBottom: 20, // Ensure space at the bottom of the list
    },
    footerContainer: {
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: colors.borderSecondary,
        alignItems: 'center',
        backgroundColor: colors.backgroundPrimary, // Maybe different bg for footer
        gap: 10,
    }
});

// Export the component
// export default PublicView; // Usually not needed if exported directly as named export