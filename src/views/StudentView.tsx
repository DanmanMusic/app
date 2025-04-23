// src/views/StudentView.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Button,
  Image,
  ActivityIndicator,
  Alert, // Keep Alert for now for mutation feedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

// Contexts
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

// Components
import SetGoalModal from '../components/student/modals/SetGoalModal';
import PaginationControls from '../components/admin/PaginationControls';

// Hooks
import { usePaginatedStudentTasks } from '../hooks/usePaginatedStudentTasks';
import { usePaginatedStudentHistory } from '../hooks/usePaginatedStudentHistory';

// API & Types
import { updateAssignedTask } from '../api/assignedTasks';
import { fetchRewards } from '../api/rewards';
import { fetchAnnouncements } from '../api/announcements';
import { fetchInstruments } from '../api/instruments';
import { fetchStudentBalance } from '../api/tickets';
import { AssignedTask } from '../mocks/mockAssignedTasks';
import { TicketTransaction } from '../mocks/mockTickets';
import { RewardItem } from '../mocks/mockRewards';
import { Announcement } from '../mocks/mockAnnouncements';
import { Instrument } from '../mocks/mockInstruments';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary'; // Added back for AdminStudentDetailView prop drilling

// Utils & Styles
import { getInstrumentNames, getUserDisplayName } from '../utils/helpers';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';

export interface StudentViewProps {
  studentIdToView?: string;
}

// --- AssignedTaskItem Component --- (isLoading prop remains)
const AssignedTaskItem = ({ task, onMarkComplete, canMark, isLoading }: { task: AssignedTask; onMarkComplete?: (assignmentId: string) => void; canMark?: boolean; isLoading?: boolean; }) => {
    const taskStatus = task.isComplete ? (task.verificationStatus === 'pending' ? 'Complete (Pending Verification)' : `Verified (${task.verificationStatus || '?'})`) : 'Assigned';
    const showMarkCompleteButton = !task.isComplete && canMark && onMarkComplete;
    return ( <View style={appSharedStyles.itemContainer}> <Text style={appSharedStyles.itemTitle}>{task.taskTitle}</Text> <Text style={styles.taskItemStatus}>Status: {taskStatus}</Text> {task.actualPointsAwarded !== undefined && task.verificationStatus !== 'pending' && ( <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textSuccess]}> Awarded: {task.actualPointsAwarded ?? 0} Tickets </Text> )} {task.completedDate && ( <Text style={appSharedStyles.itemDetailText}> Completed: {new Date(task.completedDate).toLocaleDateString()} </Text> )} {task.verifiedDate && task.verificationStatus !== 'pending' && ( <Text style={appSharedStyles.itemDetailText}> Verified: {new Date(task.verifiedDate).toLocaleDateString()} </Text> )} {showMarkCompleteButton && ( <Button title={isLoading ? "Marking..." : "Mark Complete"} onPress={() => onMarkComplete(task.id)} disabled={isLoading} /> )} {!task.isComplete && !canMark && ( <Button title="Mark Complete" disabled={true} /> )} {task.isComplete && task.verificationStatus === 'pending' && ( <Text style={styles.pendingNote}>Awaiting teacher verification...</Text> )} </View> );
};
// --- RewardItemStudent Component (No changes needed) ---
const RewardItemStudent = ({ item, currentBalance, isGoal, }: { item: RewardItem; currentBalance: number; isGoal: boolean; }) => { const canEarn = currentBalance >= item.cost; const ticketsNeeded = item.cost - currentBalance; return ( <View style={[ appSharedStyles.itemContainer, canEarn ? styles.rewardItemAffordable : {}, isGoal ? styles.rewardItemGoal : {}, ]}> <View style={styles.rewardItemContent}> <Image source={{ uri: item.imageUrl }} style={styles.rewardImage} resizeMode="contain" /> <View style={styles.rewardDetails}> <Text style={styles.rewardName}>{item.name}</Text> <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}> {item.cost} Tickets </Text> {item.description && ( <Text style={appSharedStyles.itemDetailText}>{item.description}</Text> )} {canEarn ? ( <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textSuccess]}> Available Now! </Text> ) : ( <Text style={[appSharedStyles.itemDetailText, { color: colors.textPrimary }]}> Need {ticketsNeeded} more tickets </Text> )} </View> </View> </View> ); };
// --- TicketHistoryItem Component (No changes needed) ---
export const TicketHistoryItem = ({ item }: { item: TicketTransaction }) => ( <View style={styles.historyItemContainer}> <Text style={styles.historyItemTimestamp}>{new Date(item.timestamp).toLocaleString()}</Text> <Text style={styles.historyItemDetails}> {item.type === 'task_award' ? 'Task Award' : item.type === 'manual_add' ? 'Manual Add' : item.type === 'manual_subtract' ? 'Manual Subtract' : item.type === 'redemption' ? 'Redemption' : item.type} :{' '} <Text style={[ styles.historyItemAmount, item.amount > 0 ? { color: colors.success } : { color: colors.danger }, ]} > {item.amount > 0 ? `+${item.amount}` : item.amount} Tickets </Text> </Text> {item.notes && <Text style={styles.historyItemNotes}>{item.notes}</Text>} </View> );
// --- AnnouncementListItemStudent Component (No changes needed) ---
export const AnnouncementListItemStudent = ({ item }: { item: Announcement }) => ( <View style={appSharedStyles.itemContainer}> <Text style={styles.announcementTitle}>{item.title}</Text> <Text style={appSharedStyles.itemDetailText}>{item.message}</Text> <Text style={styles.announcementDate}>{new Date(item.date).toLocaleDateString()}</Text> </View> );


export const StudentView: React.FC<StudentViewProps> = ({ studentIdToView }) => {
  const { currentUserId: loggedInUserId, currentUserRole } = useAuth();
  const {
    currentMockUsers,
    // ticketBalances, // Removed
  } = useData();

  const queryClient = useQueryClient();
  const targetStudentId = studentIdToView ?? loggedInUserId;

  // --- Data Fetching with TQ ---
  const { data: user } = useQuery({
    queryKey: ['user', targetStudentId],
    queryFn: async () => {
        console.log(`[StudentView] TQ fetching user ${targetStudentId}`);
        const userData = targetStudentId ? currentMockUsers[targetStudentId] : null;
        if (!userData) throw new Error("Student not found");
        return userData;
    },
    enabled: !!targetStudentId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: balance = 0, isLoading: balanceLoading, isError: balanceError } = useQuery<number, Error>({
      queryKey: ['balance', targetStudentId],
      queryFn: () => fetchStudentBalance(targetStudentId!),
      enabled: !!targetStudentId,
      staleTime: 1 * 60 * 1000,
  });

  const { data: rewardsCatalog = [] } = useQuery({ queryKey: ['rewards'], queryFn: fetchRewards, staleTime: 10 * 60 * 1000 });
  const { data: allAnnouncements = [] } = useQuery({ queryKey: ['announcements'], queryFn: fetchAnnouncements, staleTime: 5 * 60 * 1000 });
  const { data: mockInstruments = [] } = useQuery({ queryKey: ['instruments'], queryFn: fetchInstruments, staleTime: Infinity });

  // Hooks for paginated data (Still using useData versions)
  const {
    tasks: paginatedTasks, currentPage: tasksCurrentPage, totalPages: tasksTotalPages, setPage: setTasksPage,
    // REMOVED: isLoading: tasksLoading, isError: tasksError, error: tasksErrorObj,
    totalTasksCount, // Keep total count
  } = usePaginatedStudentTasks(targetStudentId);

  const {
      history: paginatedHistory, currentPage: historyCurrentPage, totalPages: historyTotalPages, setPage: setHistoryPage,
      // REMOVED: isLoading: historyLoading, isError: historyError, error: historyErrorObj,
      totalItems: totalHistoryCount, // Ensure this matches the hook's return (renamed from totalHistoryCount previously)
  } = usePaginatedStudentHistory(targetStudentId); // Use the hook that still relies on useData


  // Memos for derived data
  const studentAnnouncements = useMemo(() => [...allAnnouncements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [allAnnouncements]);

  // State for UI
  const [goalRewardId, setGoalRewardId] = useState<string | null>(null);
  type StudentTab = 'dashboard' | 'tasks' | 'rewards' | 'announcements';
  const [activeTab, setActiveTab] = useState<StudentTab>('dashboard');
  const [isSetGoalModalVisible, setIsSetGoalModalVisible] = useState(false);

  // --- Mutation for Marking Task Complete ---
  const markCompleteMutation = useMutation({
    mutationFn: (assignmentId: string) => updateAssignedTask({ assignmentId, updates: { isComplete: true } }),
    onSuccess: (updatedTask) => {
        console.log(`Task ${updatedTask.id} marked complete via mutation.`);
        queryClient.invalidateQueries({ queryKey: ['assigned-tasks', { studentId: targetStudentId }] });
        queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
        // Alert.alert("Success", "Task marked complete!"); // Removed alert
    },
    onError: (error, assignmentId) => {
        console.error(`Error marking task ${assignmentId} complete:`, error);
        Alert.alert(`Failed to mark task complete: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Derived goal info
  const goalReward = rewardsCatalog.find(reward => reward.id === goalRewardId);
  const rawProgressTowardGoal = goalReward ? (balance / goalReward.cost) * 100 : 0;
  const clampedProgress = Math.min(rawProgressTowardGoal, 100);
  const goalMet = rawProgressTowardGoal >= 100;

  // Handlers
  const handleSetGoalPress = () => setIsSetGoalModalVisible(true);
  const handleGoalSelected = (newGoalId: string | null) => { setGoalRewardId(newGoalId); setIsSetGoalModalVisible(false); };
  const handleMarkTaskComplete = (assignmentId: string) => { markCompleteMutation.mutate(assignmentId); }

  // Determine if the current viewer can mark tasks complete
  const canMarkComplete = loggedInUserId === targetStudentId || currentUserRole === 'parent';

  // --- Render Logic ---
  if (!user) { return ( <SafeAreaView style={appSharedStyles.safeArea}><View style={appSharedStyles.container}><ActivityIndicator /></View></SafeAreaView> ); }
  if (user.role !== 'student') { return ( <SafeAreaView style={appSharedStyles.safeArea}><View style={appSharedStyles.container}><Text>Error: Invalid user role.</Text></View></SafeAreaView> ); }
  if (user.status === 'inactive') { return ( <SafeAreaView style={appSharedStyles.safeArea}><View style={appSharedStyles.container}><Text style={appSharedStyles.header}>Account Inactive</Text><Text>This student account is currently inactive.</Text></View></SafeAreaView> ); }

  const studentDisplayName = getUserDisplayName(user);

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.container}>
        {/* Header Info */}
        {!studentIdToView && ( <Text style={appSharedStyles.header}>Welcome, {studentDisplayName}!</Text> )}
        <Text style={styles.instrumentText}> Instrument(s): {getInstrumentNames(user.instrumentIds, mockInstruments)} </Text>
        {/* Display Balance */}
        {balanceLoading ? (
            <Text style={[styles.balance, appSharedStyles.textGold]}>Loading balance...</Text>
        ) : balanceError ? (
            <Text style={[styles.balance, appSharedStyles.textDanger]}>Error loading balance</Text>
        ) : (
            <Text style={[styles.balance, appSharedStyles.textGold]}>Current Tickets: {balance}</Text>
        )}

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
             <Button title="Dashboard" onPress={() => setActiveTab('dashboard')} color={activeTab === 'dashboard' ? colors.primary : colors.secondary}/>
             <Button title="Tasks" onPress={() => setActiveTab('tasks')} color={activeTab === 'tasks' ? colors.primary : colors.secondary}/>
             <Button title="Rewards" onPress={() => setActiveTab('rewards')} color={activeTab === 'rewards' ? colors.primary : colors.secondary}/>
             <Button title="Announcements" onPress={() => setActiveTab('announcements')} color={activeTab === 'announcements' ? colors.primary : colors.secondary}/>
        </View>

        <View style={styles.contentArea}>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <ScrollView>
              {/* Goal Section */}
              <Text style={appSharedStyles.sectionTitle}>My Goal</Text>
              {goalReward ? ( <View style={styles.goalContainer}> <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}> <Image source={{ uri: goalReward.imageUrl }} style={styles.goalImage} resizeMode="contain" /> <View style={{ flex: 1, marginLeft: 10 }}> <Text style={styles.goalText}>Saving for: {goalReward.name}</Text> <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}> {goalReward.cost} Tickets </Text> </View> </View> {goalMet ? ( <Text style={styles.progressText}> Progress: {goalReward.cost} / {goalReward.cost} (100.0%) {balance > goalReward.cost && ` with ${balance - goalReward.cost} remaining`} </Text> ) : ( <Text style={styles.progressText}> Progress: {balance} / {goalReward.cost} ({clampedProgress.toFixed(1)}%) </Text> )} <View style={styles.progressBarBackground}> <View style={[ styles.progressBarFill, { width: `${clampedProgress}%`, backgroundColor: goalMet ? colors.success : colors.gold, }, ]} /> </View> <Button title="Change Goal" onPress={handleSetGoalPress} /> </View> ) : ( <View style={styles.goalContainer}> <Text style={styles.goalText}>No goal set yet.</Text> <Button title="Set a Goal" onPress={handleSetGoalPress} /> </View> )}

              {/* Recent History */}
              <Text style={appSharedStyles.sectionTitle}>Recent History</Text>
              {/* Removed loading/error check for history as hook doesn't provide it yet */}
              <FlatList
                data={paginatedHistory}
                keyExtractor={item => `history-${item.id}`}
                renderItem={({ item }) => <TicketHistoryItem item={item} />}
                ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>No history yet.</Text> )}
                scrollEnabled={false}
                contentContainerStyle={styles.listContentContainer}
              />
               {totalHistoryCount > paginatedHistory.length && (
                    <View style={{ alignItems: 'flex-start', marginTop: 10 }}>
                        <Button title="View Full History" onPress={() => alert('Navigate to full history screen/tab')} />
                    </View>
                )}
              <View style={{ height: 30 }} />
            </ScrollView>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <>
              {/* Removed loading/error check for tasks as hook doesn't provide it yet */}
              <FlatList
                data={paginatedTasks}
                keyExtractor={item => `task-${item.id}`}
                renderItem={({ item }) => (
                  <AssignedTaskItem
                    task={item}
                    onMarkComplete={handleMarkTaskComplete}
                    canMark={canMarkComplete}
                    isLoading={markCompleteMutation.isPending && markCompleteMutation.variables === item.id}
                  />
                )}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text> )}
                ListFooterComponent={
                  tasksTotalPages > 1 ? (
                      <PaginationControls
                          currentPage={tasksCurrentPage}
                          totalPages={tasksTotalPages}
                          onPageChange={setTasksPage}
                      />
                  ) : null
                }
                contentContainerStyle={styles.listContentContainer}
              />
            </>
          )}

          {/* Rewards Tab */}
          {activeTab === 'rewards' && ( <FlatList data={rewardsCatalog} keyExtractor={item => `reward-${item.id}`} renderItem={({ item }) => ( <RewardItemStudent item={item} currentBalance={balance} isGoal={item.id === goalRewardId} /> )} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>No rewards found.</Text> )} contentContainerStyle={styles.listContentContainer} ListFooterComponent={<View style={{ height: 20 }} />} /> )}

          {/* Announcements Tab */}
          {activeTab === 'announcements' && ( <FlatList data={studentAnnouncements} keyExtractor={item => `announcement-${item.id}`} renderItem={({ item }) => <AnnouncementListItemStudent item={item} />} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>No announcements found.</Text> )} contentContainerStyle={styles.listContentContainer} ListFooterComponent={<View style={{ height: 20 }} />} /> )}
        </View>
      </View>

      {/* Set Goal Modal */}
      <SetGoalModal visible={isSetGoalModalVisible} onClose={() => setIsSetGoalModalVisible(false)} rewardsCatalog={rewardsCatalog} currentBalance={balance} currentGoalId={goalRewardId} onSetGoal={handleGoalSelected} />
    </SafeAreaView>
  );
};

// Styles remain the same
const styles = StyleSheet.create({
    instrumentText: { fontSize: 16, color: colors.textSecondary, marginBottom: 5 },
    balance: { fontSize: 28, fontWeight: 'bold', marginBottom: 15 },
    tabContainer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.borderPrimary, gap: 10, },
    contentArea: { flex: 1 },
    listContentContainer: { paddingBottom: 5 },
    goalContainer: { backgroundColor: colors.backgroundPrimary, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: colors.borderHighlight, marginBottom: 20, },
    goalImage: { width: 50, height: 50, borderRadius: 4, borderWidth: 1, borderColor: colors.borderSecondary, },
    goalText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
    progressText: { fontSize: 14, color: colors.textSecondary, marginBottom: 5 },
    progressBarBackground: { height: 10, backgroundColor: '#eee', borderRadius: 5, overflow: 'hidden', marginBottom: 10, },
    progressBarFill: { height: '100%', borderRadius: 5 },
    taskItemStatus: { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
    pendingNote: { fontSize: 13, color: colors.warning, fontStyle: 'italic', marginTop: 5 },
    rewardItemAffordable: { borderColor: colors.success, borderWidth: 2 },
    rewardItemGoal: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.backgroundHighlight, },
    rewardItemContent: { flexDirection: 'row', alignItems: 'center' },
    rewardImage: { width: 60, height: 60, marginRight: 15, borderRadius: 4, borderWidth: 1, borderColor: colors.borderPrimary, },
    rewardDetails: { flex: 1, justifyContent: 'center' },
    rewardName: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary },
    historyItemContainer: { ...appSharedStyles.itemContainer, backgroundColor: colors.backgroundGrey, padding: 10, marginBottom: 5, borderRadius: 6, },
    historyItemTimestamp: { fontSize: 12, color: colors.textVeryLight, marginBottom: 4 },
    historyItemDetails: { fontSize: 14, color: colors.textSecondary },
    historyItemAmount: { fontWeight: 'bold' },
    historyItemNotes: { fontSize: 13, color: colors.textLight, marginTop: 4, fontStyle: 'italic' },
    announcementTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4, },
    announcementDate: { fontSize: 12, color: colors.textVeryLight, marginTop: 8, textAlign: 'right' },
});