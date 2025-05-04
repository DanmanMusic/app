// src/views/StudentView.tsx
import React, { useState, useMemo } from 'react'; // Removed useEffect as it's no longer needed for local goal state
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { View, Text, ScrollView, FlatList, Button, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// API Imports
import { fetchAnnouncements } from '../api/announcements';
import { updateAssignedTask } from '../api/assignedTasks';
import { fetchInstruments } from '../api/instruments';
import { fetchRewards } from '../api/rewards';
import { fetchStudentBalance } from '../api/tickets';
import { fetchUserProfile, updateStudentGoal } from '../api/users'; // Import updateStudentGoal

// Component Imports
import PaginationControls from '../components/admin/PaginationControls';
import SetGoalModal from '../components/student/modals/SetGoalModal';
import SetEmailPasswordModal from '../components/common/SetEmailPasswordModal';
import { TicketHistoryItem } from '../components/common/TicketHistoryItem';
import { RewardItemStudent } from '../components/common/RewardItemStudent';
import { AssignedTaskItem } from '../components/common/AssignedTaskItem';
import { AnnouncementListItem } from '../components/common/AnnouncementListItem';
import { SharedHeader } from '../components/common/SharedHeader';

// Context & Hooks Imports
import { useAuth } from '../contexts/AuthContext';
import { usePaginatedStudentHistory } from '../hooks/usePaginatedStudentHistory';
import { usePaginatedStudentTasks } from '../hooks/usePaginatedStudentTasks';

// Type Imports
import { Announcement, Instrument, RewardItem, User } from '../types/dataTypes';
import { StudentViewProps } from '../types/componentProps';

// Style & Helper Imports
import { commonSharedStyles } from '../styles/commonSharedStyles';
import { colors } from '../styles/colors';
import { getInstrumentNames } from '../utils/helpers';

type StudentTab = 'dashboard' | 'tasks' | 'rewards' | 'announcements';

export const StudentView: React.FC<StudentViewProps> = ({ studentIdToView }) => {
  const { currentUserId: loggedInUserId, currentUserRole } = useAuth();
  const queryClient = useQueryClient();

  const targetStudentId = studentIdToView ?? loggedInUserId;

  // State for UI control
  const [activeTab, setActiveTab] = useState<StudentTab>('dashboard');
  const [isSetGoalModalVisible, setIsSetGoalModalVisible] = useState(false);
  const [isSetCredentialsModalVisible, setIsSetCredentialsModalVisible] = useState(false);
  // Local state for goalRewardId is REMOVED

  // --- Data Fetching Queries ---
  const {
    data: user,
    isLoading: userLoading,
    isError: userError,
    error: userErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', targetStudentId],
    queryFn: () => fetchUserProfile(targetStudentId!),
    enabled: !!targetStudentId,
    staleTime: 5 * 60 * 1000, // Re-fetch profile data occasionally
  });

  const {
    data: balance = 0,
    isLoading: balanceLoading,
    isError: balanceError,
    error: balanceErrorMsg,
  } = useQuery<number, Error>({
    queryKey: ['balance', targetStudentId],
    queryFn: () => fetchStudentBalance(targetStudentId!),
    enabled: !!user && user.status === 'active',
    staleTime: 1 * 60 * 1000, // Re-fetch balance more frequently
  });

  const {
    data: rewardsCatalog = [],
    isLoading: rewardsLoading,
    isError: rewardsError,
    error: rewardsErrorMsg,
  } = useQuery<RewardItem[], Error>({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
    staleTime: 10 * 60 * 1000, // Rewards change less often
  });

  const {
    data: allAnnouncements = [],
    isLoading: announcementsLoading,
    isError: announcementsError,
    error: announcementsErrorMsg,
  } = useQuery<Announcement[], Error>({
    queryKey: ['announcements'],
    queryFn: fetchAnnouncements,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: instruments = [],
    isLoading: instrumentsLoading,
    isError: instrumentsError,
    error: instrumentsErrorMsg,
  } = useQuery<Instrument[], Error>({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity, // Instruments rarely change
  });

  // --- Paginated Data Hooks ---
  const {
    tasks: paginatedTasks,
    currentPage: tasksCurrentPage,
    totalPages: tasksTotalPages,
    setPage: setTasksPage,
    isLoading: tasksLoading,
    isFetching: tasksFetching,
    isError: tasksError,
    error: tasksErrorObject,
    totalItems: totalTasksCount,
  } = usePaginatedStudentTasks(targetStudentId);

  const {
    history: paginatedHistory,
    currentPage: historyCurrentPage,
    totalPages: historyTotalPages,
    setPage: setHistoryPage,
    isLoading: historyLoading,
    isFetching: historyFetching,
    isError: historyError,
    error: historyErrorObject,
    totalItems: totalHistoryCount,
  } = usePaginatedStudentHistory(targetStudentId);

  // --- Mutations ---
  const markCompleteMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      updateAssignedTask({ assignmentId, updates: { isComplete: true } }),
    onSuccess: updatedTask => {
      console.log(`[StudentView] Task ${updatedTask.id} marked complete via mutation.`);
      queryClient.invalidateQueries({
        queryKey: ['assigned-tasks', { studentId: targetStudentId }],
      });
      Toast.show({
        type: 'success',
        text1: 'Task Complete!',
        text2: 'Marked as complete. Awaiting verification.',
        position: 'bottom',
      });
    },
    onError: (error: Error, assignmentId) => {
      console.error(`[StudentView] Error marking task ${assignmentId} complete:`, error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Could not mark task complete.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: (variables: { studentId: string; rewardId: string | null }) =>
      updateStudentGoal(variables.studentId, variables.rewardId),
    onSuccess: updatedProfileSubset => {
      // API returns { id, current_goal_reward_id }
      console.log('[StudentView] Goal updated successfully via mutation:', updatedProfileSubset);

      // --- START Immediate Cache Update ---
      const profileQueryKey = ['userProfile', targetStudentId];
      // Get the current cached user data
      const previousUserData = queryClient.getQueryData<User | null>(profileQueryKey);

      if (previousUserData) {
        // Create the updated user data object
        const updatedUserData: User = {
          ...previousUserData,
          current_goal_reward_id: updatedProfileSubset.current_goal_reward_id, // Use the ID from the API response
        };
        // Immediately update the cache
        queryClient.setQueryData(profileQueryKey, updatedUserData);
        console.log('[StudentView] Manually updated profile cache with new goal ID.');
      } else {
        console.warn(
          '[StudentView] Could not find previous user data in cache to update goal immediately.'
        );
        // If cache is empty, invalidation is the only way
        queryClient.invalidateQueries({ queryKey: profileQueryKey });
      }

      Toast.show({
        type: 'success',
        text1: 'Goal Updated!',
        position: 'bottom',
      });
      setIsSetGoalModalVisible(false); // Close modal on success
    },
    onError: (error: Error) => {
      console.error('[StudentView] Error updating goal:', error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error.message || 'Could not update goal.',
        position: 'bottom',
      });
      // Keep modal open on error? Or close? Closing for now based on previous logic.
      setIsSetGoalModalVisible(false);
    },
  });

  // ... (rest of the component)

  // --- Memos and Derived State ---
  const studentGoalRewardId = useMemo(() => user?.current_goal_reward_id, [user]); // Use profile data

  const goalReward = useMemo(
    () => rewardsCatalog.find(reward => reward.id === studentGoalRewardId), // Use studentGoalRewardId
    [rewardsCatalog, studentGoalRewardId] // Update dependency
  );

  const studentAnnouncements = useMemo(() => [...allAnnouncements], [allAnnouncements]);

  const rawProgressTowardGoal = useMemo(
    () => (goalReward ? (balance / goalReward.cost) * 100 : 0),
    [balance, goalReward]
  );
  const clampedProgress = useMemo(
    () => Math.min(Math.max(rawProgressTowardGoal, 0), 100),
    [rawProgressTowardGoal]
  );
  const goalMet = useMemo(() => rawProgressTowardGoal >= 100, [rawProgressTowardGoal]);
  const canMarkComplete = useMemo(
    () => loggedInUserId === targetStudentId || currentUserRole === 'parent',
    [loggedInUserId, targetStudentId, currentUserRole]
  );

  // --- Handlers ---
  const handleSetGoalPress = () => setIsSetGoalModalVisible(true);

  const handleGoalSelected = (newGoalId: string | null) => {
    if (!targetStudentId) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Student ID not found.' });
      return;
    }
    if (updateGoalMutation.isPending) return;

    console.log(`[StudentView] handleGoalSelected called. New Goal ID: ${newGoalId}`);
    updateGoalMutation.mutate({ studentId: targetStudentId, rewardId: newGoalId });
  };

  const handleMarkTaskComplete = (assignmentId: string) => {
    if (!markCompleteMutation.isPending) {
      markCompleteMutation.mutate(assignmentId);
    }
  };

  // --- Loading and Error Handling ---
  const isLoadingCore = userLoading || instrumentsLoading;

  if (isLoadingCore) {
    return (
      <SafeAreaView style={commonSharedStyles.flex1}>
        <View style={commonSharedStyles.baseCentered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={commonSharedStyles.baseSecondaryText}>Loading Student Data...</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (userError || !user) {
    return (
      <SafeAreaView style={commonSharedStyles.flex1}>
        <View style={commonSharedStyles.baseCentered}>
          <Text style={[commonSharedStyles.errorText, commonSharedStyles.textCenter]}>
            Error loading student data: {userErrorMsg?.message || 'Student not found.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  if (user.role !== 'student') {
    return (
      <SafeAreaView style={commonSharedStyles.flex1}>
        <View style={commonSharedStyles.baseCentered}>
          <Text style={commonSharedStyles.errorText}>Error: User is not a student.</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (user.status === 'inactive') {
    return (
      <SafeAreaView style={commonSharedStyles.flex1}>
        <View style={commonSharedStyles.baseCentered}>
          <Text style={commonSharedStyles.baseHeaderText}>Account Inactive</Text>
          <Text style={commonSharedStyles.textCenter}>
            This student account is currently inactive.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Render ---
  return (
    <SafeAreaView style={commonSharedStyles.flex1}>
      <View style={[commonSharedStyles.flex1, commonSharedStyles.baseMargin]}>
        {/* Render header only if not being viewed by parent */}
        {!studentIdToView && (
          <View
            style={[
              commonSharedStyles.baseRow,
              commonSharedStyles.baseAlignCenter,
              commonSharedStyles.justifySpaceBetween,
            ]}
          >
            <SharedHeader onSetLoginPress={() => setIsSetCredentialsModalVisible(true)} />
          </View>
        )}

        {/* Instrument and Balance Info */}
        <View style={commonSharedStyles.baseMarginTopBottom}>
          <Text style={commonSharedStyles.baseTitleText}>
            Instrument(s):{' '}
            {instrumentsError ? 'Error' : getInstrumentNames(user.instrumentIds, instruments)}
          </Text>
          {balanceLoading ? (
            <Text style={[commonSharedStyles.baseTitleText, { color: colors.gold }]}>
              Loading balance...
            </Text>
          ) : balanceError ? (
            <Text style={[commonSharedStyles.errorText]}>
              Error loading balance: {balanceErrorMsg?.message}
            </Text>
          ) : (
            <Text style={[commonSharedStyles.baseTitleText, { color: colors.gold }]}>
              Current Tickets: {balance}
            </Text>
          )}
        </View>

        {/* Tab Navigation Buttons */}
        <View
          style={[
            commonSharedStyles.baseRow,
            commonSharedStyles.baseGap,
            commonSharedStyles.baseMarginTopBottom,
            commonSharedStyles.justifyCenter,
          ]}
        >
          <Button
            title="Dashboard"
            onPress={() => setActiveTab('dashboard')}
            color={activeTab === 'dashboard' ? colors.primary : colors.secondary}
          />
          <Button
            title="Tasks"
            onPress={() => setActiveTab('tasks')}
            color={activeTab === 'tasks' ? colors.primary : colors.secondary}
          />
          <Button
            title="Rewards"
            onPress={() => setActiveTab('rewards')}
            color={activeTab === 'rewards' ? colors.primary : colors.secondary}
          />
          <Button
            title="Announcements"
            onPress={() => setActiveTab('announcements')}
            color={activeTab === 'announcements' ? colors.primary : colors.secondary}
          />
        </View>

        {/* Tab Content Area */}
        <View style={commonSharedStyles.flex1}>
          {activeTab === 'dashboard' && (
            <ScrollView>
              <Text
                style={[commonSharedStyles.baseTitleText, commonSharedStyles.baseMarginTopBottom]}
              >
                My Goal
              </Text>
              {/* Goal Display */}
              {rewardsLoading && <ActivityIndicator color={colors.primary} />}
              {rewardsError && (
                <Text style={commonSharedStyles.errorText}>Error loading rewards for goal.</Text>
              )}
              {!rewardsLoading &&
                !rewardsError &&
                (goalReward ? (
                  <View style={commonSharedStyles.baseItem}>
                    <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseGap]}>
                      <Image
                        source={{ uri: goalReward.imageUrl }}
                        style={commonSharedStyles.goalImage}
                        resizeMode="contain"
                      />
                      <View style={commonSharedStyles.flex1}>
                        <Text style={commonSharedStyles.baseTitleText}>
                          Saving for: {goalReward.name}
                        </Text>
                        <Text
                          style={[commonSharedStyles.baseSecondaryText, { color: colors.gold }]}
                        >
                          {goalReward.cost} Tickets
                        </Text>
                      </View>
                    </View>
                    <Text style={[commonSharedStyles.baseSecondaryText, { marginBottom: 5 }]}>
                      Progress: {balance} / {goalReward.cost} ({clampedProgress.toFixed(1)}%){' '}
                      {goalMet &&
                        balance > goalReward.cost &&
                        ` (+${balance - goalReward.cost} extra)`}
                    </Text>
                    <View style={commonSharedStyles.progressBarBackground}>
                      <View
                        style={[
                          commonSharedStyles.progressBarFill,
                          {
                            width: `${clampedProgress}%`,
                            backgroundColor: goalMet ? colors.success : colors.gold,
                          },
                        ]}
                      />
                    </View>
                    <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifyCenter]}>
                      <Button title="Change Goal" onPress={handleSetGoalPress} />
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      commonSharedStyles.baseItem,
                      commonSharedStyles.baseRow,
                      commonSharedStyles.justifySpaceBetween,
                    ]}
                  >
                    <Text
                      style={[
                        commonSharedStyles.baseSubTitleText,
                        commonSharedStyles.baseSelfAlignCenter,
                      ]}
                    >
                      No goal set yet.
                    </Text>
                    <Button title="Set a Goal" onPress={handleSetGoalPress} />
                  </View>
                ))}
              {/* History Display */}
              <Text
                style={[commonSharedStyles.baseTitleText, commonSharedStyles.baseMarginTopBottom]}
              >
                Recent History ({totalHistoryCount})
              </Text>
              {historyLoading && (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
              )}
              {historyError && (
                <Text style={commonSharedStyles.errorText}>
                  Error loading history: {historyErrorObject?.message}
                </Text>
              )}
              {!historyLoading && !historyError && (
                <FlatList
                  data={paginatedHistory}
                  keyExtractor={item => `history-${item.id}`}
                  renderItem={({ item }) => <TicketHistoryItem item={item} />}
                  ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                  ListEmptyComponent={() => (
                    <Text style={commonSharedStyles.baseEmptyText}>No history yet.</Text>
                  )}
                  scrollEnabled={false} // Prevent nested scrolling issues
                  contentContainerStyle={{ paddingBottom: 5 }}
                  ListHeaderComponent={
                    historyFetching ? (
                      <ActivityIndicator size="small" color={colors.secondary} />
                    ) : null
                  }
                  ListFooterComponent={
                    historyTotalPages > 1 ? (
                      <PaginationControls
                        currentPage={historyCurrentPage}
                        totalPages={historyTotalPages}
                        onPageChange={setHistoryPage}
                      />
                    ) : null
                  }
                />
              )}
              <View style={{ height: 30 }} />
            </ScrollView>
          )}

          {activeTab === 'tasks' && (
            <>
              {tasksLoading && (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
              )}
              {tasksError && (
                <Text style={commonSharedStyles.errorText}>
                  Error loading tasks: {tasksErrorObject?.message}
                </Text>
              )}
              {!tasksLoading && !tasksError && (
                <FlatList
                  data={paginatedTasks}
                  keyExtractor={item => `task-${item.id}`}
                  renderItem={({ item }) => (
                    <AssignedTaskItem
                      task={item}
                      onMarkComplete={handleMarkTaskComplete}
                      canMark={canMarkComplete}
                      isLoading={
                        markCompleteMutation.isPending && markCompleteMutation.variables === item.id
                      }
                    />
                  )}
                  ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                  ListEmptyComponent={() => (
                    <Text style={commonSharedStyles.baseEmptyText}>No tasks assigned.</Text>
                  )}
                  ListHeaderComponent={
                    tasksFetching ? (
                      <ActivityIndicator size="small" color={colors.secondary} />
                    ) : null
                  }
                  ListFooterComponent={
                    tasksTotalPages > 1 ? (
                      <PaginationControls
                        currentPage={tasksCurrentPage}
                        totalPages={tasksTotalPages}
                        onPageChange={setTasksPage}
                      />
                    ) : (
                      <View style={{ height: 20 }} />
                    )
                  }
                  contentContainerStyle={{ paddingBottom: 5 }}
                />
              )}
            </>
          )}

          {activeTab === 'rewards' && (
            <>
              {rewardsLoading && (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
              )}
              {rewardsError && (
                <Text style={[commonSharedStyles.errorText, commonSharedStyles.textCenter]}>
                  Error loading rewards: {rewardsErrorMsg?.message}
                </Text>
              )}
              {!rewardsLoading && !rewardsError && (
                <FlatList
                  data={rewardsCatalog} // Catalog is already sorted by cost in the query
                  keyExtractor={item => `reward-${item.id}`}
                  renderItem={({ item }) => (
                    <RewardItemStudent
                      item={item}
                      currentBalance={balance}
                      isGoal={item.id === studentGoalRewardId} // Use studentGoalRewardId
                    />
                  )}
                  ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                  ListEmptyComponent={() => (
                    <Text style={commonSharedStyles.baseEmptyText}>No rewards found.</Text>
                  )}
                  contentContainerStyle={{ paddingBottom: 5 }}
                  ListFooterComponent={<View style={{ height: 20 }} />}
                />
              )}
            </>
          )}

          {activeTab === 'announcements' && (
            <>
              {announcementsLoading && (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
              )}
              {announcementsError && (
                <Text style={[commonSharedStyles.errorText, commonSharedStyles.textCenter]}>
                  Error loading announcements: {announcementsErrorMsg?.message}
                </Text>
              )}
              {!announcementsLoading && !announcementsError && (
                <FlatList
                  data={studentAnnouncements} // Use memoized announcements
                  keyExtractor={item => `announcement-${item.id}`}
                  renderItem={({ item }) => (
                    <View style={commonSharedStyles.baseItem}>
                      <AnnouncementListItem item={item} />
                    </View>
                  )}
                  ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                  ListEmptyComponent={() => (
                    <Text style={commonSharedStyles.baseEmptyText}>No announcements found.</Text>
                  )}
                  contentContainerStyle={{ paddingBottom: 5 }}
                  ListFooterComponent={<View style={{ height: 20 }} />}
                />
              )}
            </>
          )}
        </View>
      </View>

      {/* Modals */}
      <SetEmailPasswordModal
        visible={isSetCredentialsModalVisible}
        onClose={() => setIsSetCredentialsModalVisible(false)}
      />
      <SetGoalModal
        visible={isSetGoalModalVisible}
        onClose={() => setIsSetGoalModalVisible(false)}
        currentBalance={balance}
        currentGoalId={studentGoalRewardId ?? null} // Pass goal ID from user data
        onSetGoal={handleGoalSelected} // Pass the updated handler
      />
    </SafeAreaView>
  );
};
