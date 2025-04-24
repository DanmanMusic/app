import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Button,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchAnnouncements } from '../api/announcements';
import { updateAssignedTask } from '../api/assignedTasks';
import { fetchInstruments } from '../api/instruments';
import { fetchRewards } from '../api/rewards';
import { fetchStudentBalance } from '../api/tickets';
import PaginationControls from '../components/admin/PaginationControls';
import SetGoalModal from '../components/student/modals/SetGoalModal';
import { useAuth } from '../contexts/AuthContext';
import { usePaginatedStudentHistory } from '../hooks/usePaginatedStudentHistory';
import { usePaginatedStudentTasks } from '../hooks/usePaginatedStudentTasks';
import { Announcement } from '../mocks/mockAnnouncements';
import { Instrument } from '../mocks/mockInstruments';
import { RewardItem } from '../mocks/mockRewards';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';
import { StudentViewProps } from '../types/componentProps';
import { User } from '../types/userTypes';
import { getInstrumentNames, getUserDisplayName } from '../utils/helpers';
import { TicketHistoryItem } from '../components/common/TicketHistoryItem';
import { RewardItemStudent } from '../components/common/RewardItemStudent';
import { AssignedTaskItem } from '../components/common/AssignedTaskItem';
import { AnnouncementListItem } from '../components/common/AnnouncementListItem';

type StudentTab = 'dashboard' | 'tasks' | 'rewards' | 'announcements';

export const StudentView: React.FC<StudentViewProps> = ({ studentIdToView }) => {
  const { currentUserId: loggedInUserId, currentUserRole } = useAuth();

  const queryClient = useQueryClient();

  const targetStudentId = studentIdToView ?? loggedInUserId;

  const {
    data: user,
    isLoading: userLoading,
    isError: userError,
    error: userErrorMsg,
  } = useQuery<User, Error>({
    queryKey: ['user', targetStudentId],
    queryFn: async () => {
      console.log(`[StudentView] TQ fetching user ${targetStudentId}`);
      if (!targetStudentId) throw new Error('No target student ID provided');
      const response = await fetch(`/api/users/${targetStudentId}`);
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Student data fetch failed (status ${response.status})`);
      }
      const userData = await response.json();
      if (!userData || userData.role !== 'student')
        throw new Error('Fetched user is not a student');
      return userData;
    },
    enabled: !!targetStudentId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: balance = 0,
    isLoading: balanceLoading,
    isError: balanceError,
    error: balanceErrorMsg,
  } = useQuery<number, Error>({
    queryKey: ['balance', targetStudentId],
    queryFn: () => fetchStudentBalance(targetStudentId!),
    enabled: !!targetStudentId && !userError,
    staleTime: 1 * 60 * 1000,
  });

  const {
    data: rewardsCatalog = [],
    isLoading: rewardsLoading,
    isError: rewardsError,
    error: rewardsErrorMsg,
  } = useQuery<RewardItem[], Error>({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
    staleTime: 10 * 60 * 1000,
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
    data: mockInstruments = [],
    isLoading: instrumentsLoading,
    isError: instrumentsError,
    error: instrumentsErrorMsg,
  } = useQuery<Instrument[], Error>({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
  });

  const {
    tasks: paginatedTasks,
    currentPage: tasksCurrentPage,
    totalPages: tasksTotalPages,
    setPage: setTasksPage,
    isLoading: tasksLoading,
    isError: tasksError,
    error: tasksErrorObject,
    totalTasksCount,
  } = usePaginatedStudentTasks(targetStudentId);
  const {
    history: paginatedHistory,
    currentPage: historyCurrentPage,
    totalPages: historyTotalPages,
    setPage: setHistoryPage,
    isLoading: historyLoading,
    isError: historyError,
    error: historyErrorObject,
    totalItems: totalHistoryCount,
  } = usePaginatedStudentHistory(targetStudentId);

  const markCompleteMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      updateAssignedTask({ assignmentId, updates: { isComplete: true } }),
    onSuccess: updatedTask => {
      console.log(`Task ${updatedTask.id} marked complete via mutation.`);
      queryClient.invalidateQueries({
        queryKey: ['assigned-tasks', { studentId: targetStudentId }],
      });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      Alert.alert('Success', 'Task marked as complete!');
    },
    onError: (error, assignmentId) => {
      console.error(`Error marking task ${assignmentId} complete:`, error);
      Alert.alert(
        'Error',
        `Failed to mark task complete: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    },
  });

  const studentAnnouncements = useMemo(
    () =>
      [...allAnnouncements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [allAnnouncements]
  );
  const [goalRewardId, setGoalRewardId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StudentTab>('dashboard');
  const [isSetGoalModalVisible, setIsSetGoalModalVisible] = useState(false);

  const goalReward = rewardsCatalog.find(reward => reward.id === goalRewardId);
  const rawProgressTowardGoal = goalReward ? (balance / goalReward.cost) * 100 : 0;
  const clampedProgress = Math.min(rawProgressTowardGoal, 100);
  const goalMet = rawProgressTowardGoal >= 100;

  const handleSetGoalPress = () => setIsSetGoalModalVisible(true);
  const handleGoalSelected = (newGoalId: string | null) => {
    setGoalRewardId(newGoalId);
    setIsSetGoalModalVisible(false);
  };
  const handleMarkTaskComplete = (assignmentId: string) => {
    markCompleteMutation.mutate(assignmentId);
  };

  const canMarkComplete = loggedInUserId === targetStudentId || currentUserRole === 'parent';

  const isLoading = userLoading || instrumentsLoading;
  if (isLoading) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (userError) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text style={appSharedStyles.textDanger}>
            Error loading student data: {userErrorMsg?.message}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text style={appSharedStyles.textDanger}>Error: Student data not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (user.status === 'inactive') {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text style={appSharedStyles.header}>Account Inactive</Text>
          <Text>This student account is currently inactive.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const studentDisplayName = getUserDisplayName(user);

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.container}>
        {!studentIdToView && (
          <Text style={appSharedStyles.header}>Welcome, {studentDisplayName}!</Text>
        )}
        <Text style={appSharedStyles.instrumentText}>
          Instrument(s): {getInstrumentNames(user.instrumentIds, mockInstruments)}
        </Text>
        {balanceLoading ? (
          <Text style={[appSharedStyles.balance, appSharedStyles.textGold]}>
            Loading balance...
          </Text>
        ) : balanceError ? (
          <Text style={[appSharedStyles.balance, appSharedStyles.textDanger]}>
            Error loading balance: {balanceErrorMsg?.message}
          </Text>
        ) : (
          <Text style={[appSharedStyles.balance, appSharedStyles.textGold]}>
            Current Tickets: {balance}
          </Text>
        )}
        <View style={appSharedStyles.tabContainer}>
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
        <View style={appSharedStyles.contentArea}>
          {activeTab === 'dashboard' && (
            <ScrollView>
              <Text style={appSharedStyles.sectionTitle}>My Goal</Text>
              {rewardsLoading && <ActivityIndicator color={colors.primary} />}
              {rewardsError && (
                <Text style={appSharedStyles.textDanger}>Error loading rewards for goal.</Text>
              )}
              {!rewardsLoading &&
                !rewardsError &&
                (goalReward ? (
                  <View style={appSharedStyles.goalContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <Image
                        source={{ uri: goalReward.imageUrl }}
                        style={appSharedStyles.goalImage}
                        resizeMode="contain"
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={appSharedStyles.goalText}>Saving for: {goalReward.name}</Text>
                        <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>
                          {goalReward.cost} Tickets
                        </Text>
                      </View>
                    </View>
                    {goalMet ? (
                      <Text style={appSharedStyles.progressText}>
                        Progress: {goalReward.cost} / {goalReward.cost} (100.0%)
                        {balance > goalReward.cost &&
                          ` with ${balance - goalReward.cost} remaining`}
                      </Text>
                    ) : (
                      <Text style={appSharedStyles.progressText}>
                        Progress: {balance} / {goalReward.cost} ({clampedProgress.toFixed(1)}%)
                      </Text>
                    )}
                    <View style={appSharedStyles.progressBarBackground}>
                      <View
                        style={[
                          appSharedStyles.progressBarFill,
                          {
                            width: `${clampedProgress}%`,
                            backgroundColor: goalMet ? colors.success : colors.gold,
                          },
                        ]}
                      />
                    </View>
                    <Button title="Change Goal" onPress={handleSetGoalPress} />
                  </View>
                ) : (
                  <View style={appSharedStyles.goalContainer}>
                    <Text style={appSharedStyles.goalText}>No goal set yet.</Text>
                    <Button title="Set a Goal" onPress={handleSetGoalPress} />
                  </View>
                ))}
              <Text style={appSharedStyles.sectionTitle}>Recent History</Text>
              {historyLoading && (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
              )}
              {historyError && (
                <Text style={appSharedStyles.textDanger}>
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
                    <Text style={appSharedStyles.emptyListText}>No history yet.</Text>
                  )}
                  scrollEnabled={false}
                  contentContainerStyle={appSharedStyles.listContentContainer}
                />
              )}
              {!historyLoading && !historyError && totalHistoryCount > paginatedHistory.length && (
                <View style={{ alignItems: 'flex-start', marginTop: 10 }}>
                  <Button
                    title="View Full History"
                    onPress={() => alert('TODO: Navigate to full history screen/tab')}
                  />
                </View>
              )}
              <View style={{ height: 30 }} />
            </ScrollView>
          )}
          {activeTab === 'tasks' && (
            <>
              {tasksLoading && (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
              )}
              {tasksError && (
                <Text style={appSharedStyles.textDanger}>
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
                    <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text>
                  )}
                  ListFooterComponent={
                    tasksTotalPages > 1 ? (
                      <PaginationControls
                        currentPage={tasksCurrentPage}
                        totalPages={tasksTotalPages}
                        onPageChange={setTasksPage}
                      />
                    ) : null
                  }
                  contentContainerStyle={appSharedStyles.listContentContainer}
                />
              )}
            </>
          )}

          {activeTab === 'rewards' && (
            <>
              {rewardsLoading && (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
              )}
              {rewardsError && (
                <Text style={[appSharedStyles.textDanger, { textAlign: 'center', marginTop: 10 }]}>
                  Error loading rewards: {rewardsErrorMsg?.message}
                </Text>
              )}
              {!rewardsLoading && !rewardsError && (
                <FlatList
                  data={rewardsCatalog.sort((a, b) => a.cost - b.cost)}
                  keyExtractor={item => `reward-${item.id}`}
                  renderItem={({ item }) => (
                    <RewardItemStudent
                      item={item}
                      currentBalance={balance}
                      isGoal={item.id === goalRewardId}
                    />
                  )}
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
              {announcementsLoading && (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
              )}
              {announcementsError && (
                <Text style={[appSharedStyles.textDanger, { textAlign: 'center', marginTop: 10 }]}>
                  Error loading announcements: {announcementsErrorMsg?.message}
                </Text>
              )}
              {!announcementsLoading && !announcementsError && (
                <FlatList
                  data={studentAnnouncements}
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
      </View>
      <SetGoalModal
        visible={isSetGoalModalVisible}
        onClose={() => setIsSetGoalModalVisible(false)}
        currentBalance={balance}
        currentGoalId={goalRewardId}
        onSetGoal={handleGoalSelected}
      />
    </SafeAreaView>
  );
};
