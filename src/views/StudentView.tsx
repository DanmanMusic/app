// src/views/StudentView.tsx
import React, { useState, useMemo } from 'react';

import { View, Text, ScrollView, FlatList, Button, Image, ActivityIndicator } from 'react-native';

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import PaginationControls from '../components/admin/PaginationControls';
import { AnnouncementListItem } from '../components/common/AnnouncementListItem';
import { AssignedTaskItem } from '../components/common/AssignedTaskItem';
import EditMyInfoModal from '../components/common/EditMyInfoModal';
import { RewardItemStudent } from '../components/common/RewardItemStudent';
import SetEmailPasswordModal from '../components/common/SetEmailPasswordModal';
import { SharedHeader } from '../components/common/SharedHeader';
import { TicketHistoryItem } from '../components/common/TicketHistoryItem';
import SetGoalModal from '../components/student/modals/SetGoalModal';

import { usePaginatedStudentHistory } from '../hooks/usePaginatedStudentHistory';
import { usePaginatedStudentTasks } from '../hooks/usePaginatedStudentTasks';

import { useAuth } from '../contexts/AuthContext';

import { colors } from '../styles/colors';
import { commonSharedStyles } from '../styles/commonSharedStyles';

import { StudentViewProps } from '../types/componentProps';
import { Announcement, Instrument, RewardItem, User } from '../types/dataTypes';

import { getInstrumentNames, getUserDisplayName } from '../utils/helpers';

import { fetchAnnouncements } from '../api/announcements';
import { updateAssignedTask } from '../api/assignedTasks';
import { fetchInstruments } from '../api/instruments';
import { fetchRewards } from '../api/rewards';
import { fetchStudentBalance } from '../api/tickets';
import { fetchTeachers, fetchUserProfile, updateStudentGoal } from '../api/users';

type StudentTab = 'dashboard' | 'tasks' | 'rewards' | 'announcements';

export const StudentView: React.FC<StudentViewProps> = ({ studentIdToView }) => {
  const { currentUserId: loggedInUserId, currentUserRole } = useAuth();
  const queryClient = useQueryClient();

  const targetStudentId = studentIdToView ?? loggedInUserId;
  const [activeTab, setActiveTab] = useState<StudentTab>('dashboard');
  const [isEditInfoModalVisible, setIsEditInfoModalVisible] = useState(false);
  const [isSetGoalModalVisible, setIsSetGoalModalVisible] = useState(false);
  const [isSetCredentialsModalVisible, setIsSetCredentialsModalVisible] = useState(false);

  const {
    data: user,
    isLoading: userLoading,
    isError: userError,
    error: userErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', targetStudentId],
    queryFn: () => fetchUserProfile(targetStudentId!),
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
    enabled: !!user && user.status === 'active',
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
    data: instruments = [],
    isLoading: instrumentsLoading,
    isError: instrumentsError,
    error: _instrumentsErrorMsg,
  } = useQuery<Instrument[], Error>({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
  });

  const {
    data: activeTeachers = [],
    isLoading: teachersLoading,
    isError: teachersError,
    error: _teachersErrorMsg,
  } = useQuery<User[], Error>({
    queryKey: ['teachers', { status: 'active', context: 'studentViewLookup' }],
    queryFn: async () => {
      const result = await fetchTeachers({ page: 1, limit: 1000 });
      return (result?.items || []).filter(t => t.status === 'active');
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const teacherNames = useMemo(() => {
    if (!user || !user.linkedTeacherIds || user.linkedTeacherIds.length === 0) return 'None';
    if (teachersLoading) return 'Loading...';
    if (teachersError) return 'Error';

    return (
      user.linkedTeacherIds
        .map(id => {
          const teacher = activeTeachers.find(t => t.id === id);
          return teacher ? getUserDisplayName(teacher) : `Unknown (${id.substring(0, 6)}...)`;
        })
        .join(', ') || 'N/A'
    );
  }, [user, activeTeachers, teachersLoading, teachersError]);

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
      console.log('[StudentView] Goal updated successfully via mutation:', updatedProfileSubset);

      const profileQueryKey = ['userProfile', targetStudentId];
      const previousUserData = queryClient.getQueryData<User | null>(profileQueryKey);

      if (previousUserData) {
        const updatedUserData: User = {
          ...previousUserData,
          current_goal_reward_id: updatedProfileSubset.current_goal_reward_id,
        };
        queryClient.setQueryData(profileQueryKey, updatedUserData);
        console.log('[StudentView] Manually updated profile cache with new goal ID.');
      } else {
        console.warn(
          '[StudentView] Could not find previous user data in cache to update goal immediately.'
        );
        queryClient.invalidateQueries({ queryKey: profileQueryKey });
      }

      Toast.show({
        type: 'success',
        text1: 'Goal Updated!',
        position: 'bottom',
      });
      setIsSetGoalModalVisible(false);
    },
    onError: (error: Error) => {
      console.error('[StudentView] Error updating goal:', error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error.message || 'Could not update goal.',
        position: 'bottom',
      });
      setIsSetGoalModalVisible(false);
    },
  });

  const handleCloseEditInfoModal = () => setIsEditInfoModalVisible(false);

  const studentGoalRewardId = useMemo(() => user?.current_goal_reward_id, [user]);

  const goalReward = useMemo(
    () => rewardsCatalog.find(reward => reward.id === studentGoalRewardId),
    [rewardsCatalog, studentGoalRewardId]
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

  const handleSetGoalPress = () => setIsSetGoalModalVisible(true);

  const handleGoalSelected = (newGoalId: string | null) => {
    if (!targetStudentId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Student ID not found.',
        position: 'bottom',
      });
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

  return (
    <SafeAreaView style={commonSharedStyles.flex1}>
      <View style={[commonSharedStyles.flex1, commonSharedStyles.baseMargin]}>
        {!studentIdToView && (
          <View
            style={[
              commonSharedStyles.baseRow,
              commonSharedStyles.baseAlignCenter,
              commonSharedStyles.justifySpaceBetween,
            ]}
          >
            <SharedHeader
              onSetLoginPress={() => setIsSetCredentialsModalVisible(true)}
              onEditInfoPress={() => setIsEditInfoModalVisible(true)}
            />
          </View>
        )}

        <View style={commonSharedStyles.baseMarginTopBottom}>
          {balanceLoading ? (
            <Text style={[commonSharedStyles.baseTitleText, { color: colors.gold }]}>
              Loading balance...
            </Text>
          ) : balanceError ? (
            <Text style={[commonSharedStyles.errorText]}>
              Error loading balance: {balanceErrorMsg?.message}
            </Text>
          ) : (
            <View
              style={[
                commonSharedStyles.baseRow,
                commonSharedStyles.baseGap,
                { marginBottom: 2 },
                commonSharedStyles.baseAlignCenter,
              ]}
            >
              <Text style={commonSharedStyles.baseTitleText}>Balance:</Text>
              <Text
                style={[commonSharedStyles.baseTitleText, { fontSize: 22, color: colors.gold }]}
              >
                {balance} Tickets
              </Text>
            </View>
          )}

          <View
            style={[commonSharedStyles.baseRow, commonSharedStyles.baseGap, { marginBottom: 2 }]}
          >
            <Text style={commonSharedStyles.baseTitleText}>Instrument(s):</Text>
            <Text style={[commonSharedStyles.baseTitleText, commonSharedStyles.bold]}>
              {instrumentsError ? 'Error' : getInstrumentNames(user.instrumentIds, instruments)}
            </Text>
          </View>
          <View
            style={[commonSharedStyles.baseRow, commonSharedStyles.baseGap, { marginBottom: 2 }]}
          >
            <Text style={commonSharedStyles.baseTitleText}>Teacher(s):</Text>
            <Text style={[commonSharedStyles.baseTitleText, commonSharedStyles.bold]}>
              {teachersLoading ? 'Loading...' : teacherNames}
            </Text>
          </View>
        </View>

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
        <View style={commonSharedStyles.flex1}>
          {activeTab === 'dashboard' && (
            <ScrollView>
              <Text
                style={[commonSharedStyles.baseTitleText, commonSharedStyles.baseMarginTopBottom]}
              >
                My Goal
              </Text>
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
                      <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifyCenter]}>
                        <Button
                          title="Change Goal"
                          onPress={handleSetGoalPress}
                          color={colors.primary}
                        />
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
                    <Button
                      title="Set a Goal"
                      onPress={handleSetGoalPress}
                      color={colors.primary}
                    />
                  </View>
                ))}
              <View style={commonSharedStyles.baseMarginTopBottom}>
                <Text style={[commonSharedStyles.baseTitleText, { marginBottom: 5 }]}>
                  Tasks ({totalTasksCount})
                </Text>
                {totalTasksCount > 0 ? (
                  <View style={commonSharedStyles.baseRow}>
                    <Button
                      title="View My Tasks"
                      onPress={() => setActiveTab('tasks')}
                      color={colors.success}
                    />
                  </View>
                ) : (
                  <Text style={commonSharedStyles.baseEmptyText}>No tasks yet.</Text>
                )}
              </View>
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
                  scrollEnabled={false}
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
                  data={rewardsCatalog}
                  keyExtractor={item => `reward-${item.id}`}
                  renderItem={({ item }) => (
                    <RewardItemStudent
                      item={item}
                      currentBalance={balance}
                      isGoal={item.id === studentGoalRewardId}
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
                  data={studentAnnouncements}
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
      <EditMyInfoModal visible={isEditInfoModalVisible} onClose={handleCloseEditInfoModal} />
      <SetEmailPasswordModal
        visible={isSetCredentialsModalVisible}
        onClose={() => setIsSetCredentialsModalVisible(false)}
      />
      <SetGoalModal
        visible={isSetGoalModalVisible}
        onClose={() => setIsSetGoalModalVisible(false)}
        currentBalance={balance}
        currentGoalId={studentGoalRewardId ?? null}
        onSetGoal={handleGoalSelected}
      />
    </SafeAreaView>
  );
};
