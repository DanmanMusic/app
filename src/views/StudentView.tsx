// src/views/StudentView.tsx
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Button, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Contexts
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

// Components
import SetGoalModal from '../components/student/modals/SetGoalModal';
import PaginationControls from '../components/admin/PaginationControls'; // Re-use admin pagination controls

// Hooks
import { usePaginatedStudentTasks } from '../hooks/usePaginatedStudentTasks'; // <-- Import hook
import { usePaginatedStudentHistory } from '../hooks/usePaginatedStudentHistory'; // <-- Import hook

// Mocks & Types
import { AssignedTask } from '../mocks/mockAssignedTasks';
import { TicketTransaction } from '../mocks/mockTickets';
import { RewardItem } from '../mocks/mockRewards';
import { Announcement } from '../mocks/mockAnnouncements';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary'; // Keep for AssignedTaskItem prop if needed

// Utils & Styles
import { getInstrumentNames, getUserDisplayName } from '../utils/helpers'; // Removed getTaskTitle
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';

// Props: studentIdToView is optional (used by ParentView)
export interface StudentViewProps {
  studentIdToView?: string;
}

// --- AssignedTaskItem Component ---
// Updated to use direct properties and accept optional canMark prop
const AssignedTaskItem = ({
  task,
  // taskLibrary, // Removed dependency
  onMarkComplete,
  canMark, // Flag indicating if current user can mark complete
}: {
  task: AssignedTask;
  // taskLibrary: TaskLibraryItem[];
  onMarkComplete?: (taskId: string) => void; // Marking complete is optional now
  canMark?: boolean;
}) => {
    const taskStatus = task.isComplete
        ? task.verificationStatus === 'pending'
          ? 'Complete (Pending Verification)'
          : `Verified (${task.verificationStatus || '?'})`
        : 'Assigned';
    const showMarkCompleteButton = !task.isComplete && canMark && onMarkComplete;

    return (
        <View style={appSharedStyles.itemContainer}>
            <Text style={appSharedStyles.itemTitle}>{task.taskTitle}</Text>
            <Text style={styles.taskItemStatus}>Status: {taskStatus}</Text>
            {task.actualPointsAwarded !== undefined && task.verificationStatus !== 'pending' && (
            <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textSuccess]}>
                Awarded: {task.actualPointsAwarded ?? 0} Tickets
            </Text>
            )}
            {task.completedDate && ( <Text style={appSharedStyles.itemDetailText}> Completed: {new Date(task.completedDate).toLocaleDateString()} </Text> )}
            {task.verifiedDate && task.verificationStatus !== 'pending' && ( <Text style={appSharedStyles.itemDetailText}> Verified: {new Date(task.verifiedDate).toLocaleDateString()} </Text> )}

            {/* Mark Complete Button */}
            {showMarkCompleteButton && (
                <Button title="Mark Complete" onPress={() => onMarkComplete(task.id)} />
            )}
            {/* Display disabled state if applicable but cannot mark */}
            {!task.isComplete && !showMarkCompleteButton && (
                <Button title="Mark Complete" disabled={true} />
            )}

            {task.isComplete && task.verificationStatus === 'pending' && ( <Text style={styles.pendingNote}>Awaiting teacher verification...</Text> )}
        </View>
    );
};


// --- RewardItemStudent Component (unchanged) ---
const RewardItemStudent = ({ item, currentBalance, isGoal, }: { item: RewardItem; currentBalance: number; isGoal: boolean; }) => { const canEarn = currentBalance >= item.cost; const ticketsNeeded = item.cost - currentBalance; return ( <View style={[ appSharedStyles.itemContainer, canEarn ? styles.rewardItemAffordable : {}, isGoal ? styles.rewardItemGoal : {}, ]}> <View style={styles.rewardItemContent}> <Image source={{ uri: item.imageUrl }} style={styles.rewardImage} resizeMode="contain" /> <View style={styles.rewardDetails}> <Text style={styles.rewardName}>{item.name}</Text> <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}> {item.cost} Tickets </Text> {item.description && ( <Text style={appSharedStyles.itemDetailText}>{item.description}</Text> )} {canEarn ? ( <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textSuccess]}> Available Now! </Text> ) : ( <Text style={[appSharedStyles.itemDetailText, { color: colors.textPrimary }]}> Need {ticketsNeeded} more tickets </Text> )} </View> </View> </View> ); };
// --- TicketHistoryItem Component (unchanged) ---
export const TicketHistoryItem = ({ item }: { item: TicketTransaction }) => ( <View style={styles.historyItemContainer}> <Text style={styles.historyItemTimestamp}>{new Date(item.timestamp).toLocaleString()}</Text> <Text style={styles.historyItemDetails}> {item.type === 'task_award' ? 'Task Award' : item.type === 'manual_add' ? 'Manual Add' : item.type === 'manual_subtract' ? 'Manual Subtract' : item.type === 'redemption' ? 'Redemption' : item.type} :{' '} <Text style={[ styles.historyItemAmount, item.amount > 0 ? { color: colors.success } : { color: colors.danger }, ]} > {item.amount > 0 ? `+${item.amount}` : item.amount} Tickets </Text> </Text> {item.notes && <Text style={styles.historyItemNotes}>{item.notes}</Text>} </View> );
// --- AnnouncementListItemStudent Component (unchanged) ---
export const AnnouncementListItemStudent = ({ item }: { item: Announcement }) => ( <View style={appSharedStyles.itemContainer}> <Text style={styles.announcementTitle}>{item.title}</Text> <Text style={appSharedStyles.itemDetailText}>{item.message}</Text> <Text style={styles.announcementDate}>{new Date(item.date).toLocaleDateString()}</Text> </View> );


export const StudentView: React.FC<StudentViewProps> = ({ studentIdToView }) => {
  const { currentUserId: loggedInUserId, currentUserRole } = useAuth();
  const {
    currentMockUsers,
    ticketBalances,
    // assignedTasks: allAssignedTasks, // No longer needed directly
    // ticketHistory: allTicketHistory, // No longer needed directly
    rewardsCatalog,
    announcements: allAnnouncements, // Keep for announcement tab
    // taskLibrary, // No longer needed directly
    mockInstruments,
    simulateMarkTaskComplete, // Keep for mark complete button
  } = useData();

  const targetStudentId = studentIdToView ?? loggedInUserId; // Determine whose view this is

  // Get basic user info and balance directly
  const user = targetStudentId ? currentMockUsers[targetStudentId] : null;
  const balance = targetStudentId ? ticketBalances[targetStudentId] || 0 : 0;

  // Use pagination hooks for tasks and history
   const {
    tasks: paginatedTasks,
    currentPage: tasksCurrentPage,
    totalPages: tasksTotalPages,
    setPage: setTasksPage,
    totalTasksCount,
  } = usePaginatedStudentTasks(targetStudentId);

  const {
      history: paginatedHistory,
      currentPage: historyCurrentPage,
      totalPages: historyTotalPages,
      setPage: setHistoryPage,
      totalHistoryCount,
  } = usePaginatedStudentHistory(targetStudentId);


  // Memos for derived data
  // Removed memos for studentAssignedTasks, studentHistory
  const studentAnnouncements = useMemo( () => allAnnouncements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [allAnnouncements] );

  // State for UI
  const [goalRewardId, setGoalRewardId] = useState<string | null>(null); // Keep goal state
  type StudentTab = 'dashboard' | 'tasks' | 'rewards' | 'announcements';
  const [activeTab, setActiveTab] = useState<StudentTab>('dashboard');
  const [isSetGoalModalVisible, setIsSetGoalModalVisible] = useState(false);

  // Derived goal info (unchanged)
  const goalReward = rewardsCatalog.find(reward => reward.id === goalRewardId);
  const rawProgressTowardGoal = goalReward ? (balance / goalReward.cost) * 100 : 0;
  const clampedProgress = Math.min(rawProgressTowardGoal, 100);
  const goalMet = rawProgressTowardGoal >= 100;

  // Handlers (unchanged)
  const handleSetGoalPress = () => setIsSetGoalModalVisible(true);
  const handleGoalSelected = (newGoalId: string | null) => { setGoalRewardId(newGoalId); setIsSetGoalModalVisible(false); if (newGoalId) { const selectedReward = rewardsCatalog.find(r => r.id === newGoalId); alert(`Goal updated! Saving for ${selectedReward?.name || 'item'}.`); } else { alert('Goal cleared!'); } };

  // Determine if the current viewer can mark tasks complete
  const canMarkComplete = loggedInUserId === targetStudentId || currentUserRole === 'parent';

   // Filter tasks for dashboard display (e.g., active and pending)
   // Note: This filters the *entire* set, not just the current page.
   // Consider if dashboard needs separate logic or just shows first page from hook.
   const activeAndPendingTasks = useMemo(
        () => paginatedTasks.filter(task => !task.isComplete || task.verificationStatus === 'pending'),
        [paginatedTasks] // Depends on the current page data from the hook
    );


  // Main component checks
  if (!user || user.role !== 'student') { return ( <SafeAreaView style={appSharedStyles.safeArea}><View style={appSharedStyles.container}><Text>Error: Could not load student data for ID {targetStudentId}.</Text></View></SafeAreaView> ); }
  if (user.status === 'inactive') { return ( <SafeAreaView style={appSharedStyles.safeArea}><View style={appSharedStyles.container}><Text style={appSharedStyles.header}>Account Inactive</Text><Text>This student account is currently inactive.</Text></View></SafeAreaView> ); }

  const studentDisplayName = getUserDisplayName(user);

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.container}>
        {/* Header Info (unchanged) */}
        {!studentIdToView && ( <Text style={appSharedStyles.header}>Welcome, {studentDisplayName}!</Text> )}
        <Text style={styles.instrumentText}> Instrument(s): {getInstrumentNames(user.instrumentIds, mockInstruments)} </Text>
        <Text style={[styles.balance, appSharedStyles.textGold]}>Current Tickets: {balance}</Text>

        {/* Tab Navigation (unchanged) */}
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
              {/* Goal Section (unchanged) */}
              <Text style={appSharedStyles.sectionTitle}>My Goal</Text>
              {goalReward ? ( <View style={styles.goalContainer}> <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}> <Image source={{ uri: goalReward.imageUrl }} style={styles.goalImage} resizeMode="contain" /> <View style={{ flex: 1, marginLeft: 10 }}> <Text style={styles.goalText}>Saving for: {goalReward.name}</Text> <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}> {goalReward.cost} Tickets </Text> </View> </View> {goalMet ? ( <Text style={styles.progressText}> Progress: {goalReward.cost} / {goalReward.cost} (100.0%) {balance > goalReward.cost && ` with ${balance - goalReward.cost} remaining`} </Text> ) : ( <Text style={styles.progressText}> Progress: {balance} / {goalReward.cost} ({clampedProgress.toFixed(1)}%) </Text> )} <View style={styles.progressBarBackground}> <View style={[ styles.progressBarFill, { width: `${clampedProgress}%`, backgroundColor: goalMet ? colors.success : colors.gold, }, ]} /> </View> <Button title="Change Goal" onPress={handleSetGoalPress} /> </View> ) : ( <View style={styles.goalContainer}> <Text style={styles.goalText}>No goal set yet.</Text> <Button title="Set a Goal" onPress={handleSetGoalPress} /> </View> )}

              {/* Recent History - Use Paginated Data */}
              <Text style={appSharedStyles.sectionTitle}>Recent History</Text>
              <FlatList
                data={paginatedHistory} // Use first page from hook
                keyExtractor={item => `history-${item.id}`}
                renderItem={({ item }) => <TicketHistoryItem item={item} />}
                ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>No history yet.</Text> )}
                scrollEnabled={false}
                contentContainerStyle={styles.listContentContainer}
                // Optionally add pagination if showing more than one page here
                // ListFooterComponent={ historyTotalPages > 1 ? (...) : null }
              />
              {/* Button to navigate to full history tab/view (if created) */}
               {totalHistoryCount > paginatedHistory.length && ( // Show if more pages exist
                    <View style={{ alignItems: 'flex-start', marginTop: 10 }}>
                        <Button title="View Full History" onPress={() => alert('Navigate to full history screen/tab')} />
                    </View>
                )}

              <View style={{ height: 30 }} />
            </ScrollView>
          )}

          {/* Tasks Tab - Use Paginated Data */}
          {activeTab === 'tasks' && (
            <FlatList
              data={paginatedTasks} // Use paginated data from hook
              keyExtractor={item => `task-${item.id}`}
              renderItem={({ item }) => (
                <AssignedTaskItem
                  task={item}
                  onMarkComplete={simulateMarkTaskComplete}
                  canMark={canMarkComplete}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text> )}
              // Add Pagination Controls as Footer
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
              // No need for parent ScrollView if FlatList handles all content
            />
          )}

          {/* Rewards Tab (unchanged) */}
          {activeTab === 'rewards' && ( <FlatList data={rewardsCatalog.sort((a, b) => a.cost - b.cost)} keyExtractor={item => `reward-${item.id}`} renderItem={({ item }) => ( <RewardItemStudent item={item} currentBalance={balance} isGoal={item.id === goalRewardId} /> )} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>No rewards found.</Text> )} contentContainerStyle={styles.listContentContainer} ListFooterComponent={<View style={{ height: 20 }} />} /> )}

          {/* Announcements Tab (unchanged) */}
          {activeTab === 'announcements' && ( <FlatList data={studentAnnouncements} keyExtractor={item => `announcement-${item.id}`} renderItem={({ item }) => <AnnouncementListItemStudent item={item} />} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>No announcements found.</Text> )} contentContainerStyle={styles.listContentContainer} ListFooterComponent={<View style={{ height: 20 }} />} /> )}
        </View>
      </View>

      {/* Set Goal Modal (unchanged) */}
      <SetGoalModal visible={isSetGoalModalVisible} onClose={() => setIsSetGoalModalVisible(false)} rewardsCatalog={rewardsCatalog} currentBalance={balance} currentGoalId={goalRewardId} onSetGoal={handleGoalSelected} />
    </SafeAreaView>
  );
};

// Styles (add inactive style if needed, adjust others)
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
    // inactiveItemStyle: { opacity: 0.7 } // Add if needed for inactive display
});