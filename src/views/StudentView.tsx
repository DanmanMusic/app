// src/views/StudentView.tsx
import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { View, Text, ScrollView, FlatList, Button, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// API Imports (Most now use Supabase, writes deferred where noted)
import { fetchAnnouncements } from '../api/announcements';     // Uses Supabase
import { updateAssignedTask } from '../api/assignedTasks';     // Uses Supabase (verify logic deferred)
import { fetchInstruments } from '../api/instruments';         // Uses Supabase
import { fetchRewards } from '../api/rewards';             // Uses Supabase
import { fetchStudentBalance } from '../api/tickets';           // Uses Supabase (summing)
import { fetchUserProfile } from '../api/users';             // Uses Supabase

// Component Imports
import PaginationControls from '../components/admin/PaginationControls';
import SetGoalModal from '../components/student/modals/SetGoalModal';
import { TicketHistoryItem } from '../components/common/TicketHistoryItem';
import { RewardItemStudent } from '../components/common/RewardItemStudent';
import { AssignedTaskItem } from '../components/common/AssignedTaskItem';
import { AnnouncementListItem } from '../components/common/AnnouncementListItem';

// Hook Imports (Use Supabase-backed hooks)
import { useAuth } from '../contexts/AuthContext';
import { usePaginatedStudentHistory } from '../hooks/usePaginatedStudentHistory';
import { usePaginatedStudentTasks } from '../hooks/usePaginatedStudentTasks';

// Type Imports
import { Announcement, Instrument, RewardItem, User } from '../types/dataTypes';
import { StudentViewProps } from '../types/componentProps';

// Style & Helper Imports
import { appSharedStyles } from '../styles/appSharedStyles';
import { commonSharedStyles } from '../styles/commonSharedStyles';
import { colors } from '../styles/colors';
import { getInstrumentNames, getUserDisplayName } from '../utils/helpers';
import Toast from 'react-native-toast-message';

type StudentTab = 'dashboard' | 'tasks' | 'rewards' | 'announcements';

export const StudentView: React.FC<StudentViewProps> = ({ studentIdToView }) => {
  const { currentUserId: loggedInUserId, currentUserRole } = useAuth();
  const queryClient = useQueryClient();

  const targetStudentId = studentIdToView ?? loggedInUserId;

  // State for UI
  const [activeTab, setActiveTab] = useState<StudentTab>('dashboard');
  const [goalRewardId, setGoalRewardId] = useState<string | null>(null);
  const [isSetGoalModalVisible, setIsSetGoalModalVisible] = useState(false);

  // --- Data Fetching using React Query ---

  // Fetch User Profile (Explicitly use fetchUserProfile)
  const {
    data: user,
    isLoading: userLoading,
    isError: userError,
    error: userErrorMsg,
  } = useQuery<User | null, Error>({ // User can be null if not found
    queryKey: ['userProfile', targetStudentId], // Use consistent key
    queryFn: () => fetchUserProfile(targetStudentId!), // Use specific Supabase API
    enabled: !!targetStudentId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Student Balance (Uses Supabase summing)
  const {
    data: balance = 0,
    isLoading: balanceLoading,
    isError: balanceError,
    error: balanceErrorMsg,
  } = useQuery<number, Error>({
    queryKey: ['balance', targetStudentId],
    queryFn: () => fetchStudentBalance(targetStudentId!),
    enabled: !!user && user.status === 'active', // Depend on user being loaded and active
    staleTime: 1 * 60 * 1000,
  });

  // Fetch Rewards Catalog (Uses Supabase)
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

  // Fetch Announcements (Uses Supabase)
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

  // Fetch Instruments (Uses Supabase)
  const {
    data: instruments = [],
    isLoading: instrumentsLoading,
    isError: instrumentsError,
    error: instrumentsErrorMsg,
  } = useQuery<Instrument[], Error>({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
  });

  // Fetch Paginated Tasks (Uses Supabase hook)
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

  // Fetch Paginated History (Uses Supabase hook)
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
  // Mark Task Complete (Uses Supabase updateAssignedTask, but balance logic deferred)
  const markCompleteMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      updateAssignedTask({ assignmentId, updates: { isComplete: true } }),
    onSuccess: updatedTask => {
      console.log(`[StudentView] Task ${updatedTask.id} marked complete via mutation.`);
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks', { studentId: targetStudentId }] });
      // Might need to invalidate balance/history if verification happened automatically, but currently doesn't
      // queryClient.invalidateQueries({ queryKey: ['balance', targetStudentId] });
      // queryClient.invalidateQueries({ queryKey: ['ticket-history', { studentId: targetStudentId }] });
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

  // --- Memoized Data & Calculations --- (Remain the same)
  const studentAnnouncements = useMemo(() => [...allAnnouncements], [allAnnouncements]);
  const goalReward = useMemo(() => rewardsCatalog.find(reward => reward.id === goalRewardId), [rewardsCatalog, goalRewardId]);
  const rawProgressTowardGoal = useMemo(() => goalReward ? (balance / goalReward.cost) * 100 : 0, [balance, goalReward]);
  const clampedProgress = useMemo(() => Math.min(Math.max(rawProgressTowardGoal, 0), 100), [rawProgressTowardGoal]);
  const goalMet = useMemo(() => rawProgressTowardGoal >= 100, [rawProgressTowardGoal]);
  const canMarkComplete = useMemo(() => loggedInUserId === targetStudentId || currentUserRole === 'parent', [loggedInUserId, targetStudentId, currentUserRole]);

  // --- Event Handlers --- (Remain the same)
  const handleSetGoalPress = () => setIsSetGoalModalVisible(true);
  const handleGoalSelected = (newGoalId: string | null) => { setGoalRewardId(newGoalId); setIsSetGoalModalVisible(false); };
  const handleMarkTaskComplete = (assignmentId: string) => { if (!markCompleteMutation.isPending) { markCompleteMutation.mutate(assignmentId); } };

  // --- Loading & Error States ---
  const isLoadingCore = userLoading || instrumentsLoading;

  if (isLoadingCore) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Student Data...</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (userError || !user) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text style={[commonSharedStyles.errorText, commonSharedStyles.textCenter]}>
            Error loading student data: {userErrorMsg?.message || 'Student not found.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  if (user.role !== 'student') { // Added check
      return (
         <SafeAreaView style={appSharedStyles.safeArea}>
             <View style={appSharedStyles.container}>
                 <Text style={commonSharedStyles.errorText}>Error: User is not a student.</Text>
             </View>
         </SafeAreaView>
      );
  }
  if (user.status === 'inactive') {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text style={appSharedStyles.header}>Account Inactive</Text>
          <Text style={commonSharedStyles.textCenter}>This student account is currently inactive.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const studentDisplayName = getUserDisplayName(user);

  // --- Render Logic --- (Remains the same structure)
  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.container}>
        {/* Header Section */}
        {!studentIdToView && <Text style={appSharedStyles.header}>Welcome, {studentDisplayName}!</Text>}
        <Text style={appSharedStyles.instrumentText}>Instrument(s): {instrumentsError ? 'Error' : getInstrumentNames(user.instrumentIds, instruments)}</Text>
        {balanceLoading ? <Text style={[appSharedStyles.balance, appSharedStyles.textGold]}>Loading balance...</Text> : balanceError ? <Text style={[appSharedStyles.balance, commonSharedStyles.errorText]}>Error loading balance: {balanceErrorMsg?.message}</Text> : <Text style={[appSharedStyles.balance, appSharedStyles.textGold]}>Current Tickets: {balance}</Text>}

        {/* Tab Navigation */}
        <View style={appSharedStyles.tabContainer}>{/* Buttons remain the same */}<Button title="Dashboard" onPress={() => setActiveTab('dashboard')} color={activeTab === 'dashboard' ? colors.primary : colors.secondary} /><Button title="Tasks" onPress={() => setActiveTab('tasks')} color={activeTab === 'tasks' ? colors.primary : colors.secondary} /><Button title="Rewards" onPress={() => setActiveTab('rewards')} color={activeTab === 'rewards' ? colors.primary : colors.secondary} /><Button title="Announcements" onPress={() => setActiveTab('announcements')} color={activeTab === 'announcements' ? colors.primary : colors.secondary} /></View>

        {/* Tab Content Area */}
        <View style={appSharedStyles.contentArea}>
          {activeTab === 'dashboard' && (<ScrollView>{/* Dashboard content remains the same */}<Text style={appSharedStyles.sectionTitle}>My Goal</Text>{rewardsLoading && <ActivityIndicator color={colors.primary} />}{rewardsError && (<Text style={commonSharedStyles.errorText}>Error loading rewards for goal.</Text>)}{!rewardsLoading && !rewardsError && (goalReward ? (<View style={appSharedStyles.goalContainer}><View style={commonSharedStyles.itemContentRow}><Image source={{ uri: goalReward.imageUrl }} style={appSharedStyles.goalImage} resizeMode="contain" /><View style={styles.goalDetails}><Text style={appSharedStyles.goalText}>Saving for: {goalReward.name}</Text><Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>{goalReward.cost} Tickets</Text></View></View><Text style={appSharedStyles.progressText}>Progress: {balance} / {goalReward.cost} ({clampedProgress.toFixed(1)}%) {goalMet && balance > goalReward.cost && ` (+${balance - goalReward.cost} extra)`}</Text><View style={appSharedStyles.progressBarBackground}><View style={[appSharedStyles.progressBarFill,{ width: `${clampedProgress}%`, backgroundColor: goalMet ? colors.success : colors.gold,},]} /></View><Button title="Change Goal" onPress={handleSetGoalPress} /></View>) : (<View style={appSharedStyles.goalContainer}><Text style={appSharedStyles.goalText}>No goal set yet.</Text><Button title="Set a Goal" onPress={handleSetGoalPress} /></View>))}<Text style={appSharedStyles.sectionTitle}>Recent History ({totalHistoryCount})</Text>{historyLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />}{historyError && (<Text style={commonSharedStyles.errorText}>Error loading history: {historyErrorObject?.message}</Text>)}{!historyLoading && !historyError && (<FlatList data={paginatedHistory} keyExtractor={item => `history-${item.id}`} renderItem={({ item }) => <TicketHistoryItem item={item} />} ItemSeparatorComponent={() => <View style={{ height: 5 }} />} ListEmptyComponent={() => (<Text style={appSharedStyles.emptyListText}>No history yet.</Text>)} scrollEnabled={false} contentContainerStyle={appSharedStyles.listContentContainer} ListHeaderComponent={historyFetching ? <ActivityIndicator size="small" color={colors.secondary}/> : null} ListFooterComponent={ historyTotalPages > 1 ? (<PaginationControls currentPage={historyCurrentPage} totalPages={historyTotalPages} onPageChange={setHistoryPage} />) : null } />)}<View style={{ height: 30 }} /></ScrollView>)}
          {activeTab === 'tasks' && (<>{/* Tasks content remains the same */}{tasksLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />}{tasksError && (<Text style={commonSharedStyles.errorText}>Error loading tasks: {tasksErrorObject?.message}</Text>)}{!tasksLoading && !tasksError && (<FlatList data={paginatedTasks} keyExtractor={item => `task-${item.id}`} renderItem={({ item }) => (<AssignedTaskItem task={item} onMarkComplete={handleMarkTaskComplete} canMark={canMarkComplete} isLoading={markCompleteMutation.isPending && markCompleteMutation.variables === item.id} />)} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListEmptyComponent={() => (<Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text>)} ListHeaderComponent={tasksFetching ? <ActivityIndicator size="small" color={colors.secondary}/> : null} ListFooterComponent={ tasksTotalPages > 1 ? (<PaginationControls currentPage={tasksCurrentPage} totalPages={tasksTotalPages} onPageChange={setTasksPage} />) : <View style={{ height: 20 }} /> } contentContainerStyle={appSharedStyles.listContentContainer} />)}</>)}
          {activeTab === 'rewards' && (<>{/* Rewards content remains the same */}{rewardsLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />}{rewardsError && (<Text style={[commonSharedStyles.errorText, commonSharedStyles.textCenter]}>Error loading rewards: {rewardsErrorMsg?.message}</Text>)}{!rewardsLoading && !rewardsError && (<FlatList data={rewardsCatalog} keyExtractor={item => `reward-${item.id}`} renderItem={({ item }) => (<RewardItemStudent item={item} currentBalance={balance} isGoal={item.id === goalRewardId} />)} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListEmptyComponent={() => (<Text style={appSharedStyles.emptyListText}>No rewards found.</Text>)} contentContainerStyle={appSharedStyles.listContentContainer} ListFooterComponent={<View style={{ height: 20 }} />} />)}</>)}
          {activeTab === 'announcements' && (<>{/* Announcements content remains the same */}{announcementsLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />}{announcementsError && (<Text style={[commonSharedStyles.errorText, commonSharedStyles.textCenter]}>Error loading announcements: {announcementsErrorMsg?.message}</Text>)}{!announcementsLoading && !announcementsError && (<FlatList data={studentAnnouncements} keyExtractor={item => `announcement-${item.id}`} renderItem={({ item }) => <AnnouncementListItem item={item} />} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListEmptyComponent={() => (<Text style={appSharedStyles.emptyListText}>No announcements found.</Text>)} contentContainerStyle={appSharedStyles.listContentContainer} ListFooterComponent={<View style={{ height: 20 }} />} />)}</>)}
        </View>
      </View>

      {/* Set Goal Modal */}
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

// Local Styles (Remain the same)
const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
    },
    loadingText: {
        marginTop: 10,
        color: colors.textSecondary,
        fontSize: 16,
    },
    goalDetails: {
        flex: 1,
        marginLeft: 10,
    },
});