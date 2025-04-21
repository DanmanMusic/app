// src/views/StudentView.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView, // Keep ScrollView for some tabs
  FlatList,
  Button,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import User type
import { User } from '../types/userTypes';

// Other required types
import { AssignedTask } from '../mocks/mockAssignedTasks';
import { TicketTransaction } from '../mocks/mockTickets';
import { RewardItem } from '../mocks/mockRewards';
import { Announcement } from '../mocks/mockAnnouncements';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { Instrument } from '../mocks/mockInstruments';

// Import helper functions
import { getTaskTitle, getInstrumentNames, getUserDisplayName } from '../utils/helpers';

// Shared styles and colors
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';

// Import the new modal
import SetGoalModal from '../components/student/modals/SetGoalModal';

// Props interface uses the User type
export interface StudentViewProps {
  user: User;
  balance: number;
  assignedTasks: AssignedTask[];
  history: TicketTransaction[];
  rewardsCatalog: RewardItem[];
  announcements: Announcement[];
  taskLibrary: TaskLibraryItem[];
  mockInstruments: Instrument[];
  onMarkTaskComplete: (taskId: string) => void;
}

// --- Sub-Components (AssignedTaskItem, RewardItemStudent, TicketHistoryItem, AnnouncementListItemStudent) ---

// Component to render an assigned task item
const AssignedTaskItem = ({
  task,
  onMarkComplete,
  taskLibrary,
}: {
  task: AssignedTask;
  onMarkComplete: (taskId: string) => void;
  taskLibrary: TaskLibraryItem[];
}) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={appSharedStyles.itemTitle}>{getTaskTitle(task.taskId, taskLibrary)}</Text>
    <Text style={styles.taskItemStatus}>
      Status:{' '}
      {task.isComplete
        ? task.verificationStatus === 'pending'
          ? 'Complete (Pending Verification)'
          : `Verified`
        : 'Assigned'}
    </Text>
    {task.actualPointsAwarded !== undefined && task.verificationStatus !== 'pending' && (
      <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textSuccess]}>Awarded: {task.actualPointsAwarded ?? 0} Tickets</Text>
    )}
    {task.completedDate && (
      <Text style={appSharedStyles.itemDetailText}>
        Completed: {new Date(task.completedDate).toLocaleDateString()}
      </Text>
    )}
    {task.verifiedDate && task.verificationStatus !== 'pending' && (
      <Text style={appSharedStyles.itemDetailText}>
        Verified: {new Date(task.verifiedDate).toLocaleDateString()}
      </Text>
    )}
    {!task.isComplete && (
      <Button title="Mark Complete" onPress={() => onMarkComplete(task.id)} />
    )}
    {task.isComplete && task.verificationStatus === 'pending' && (
      <Text style={styles.pendingNote}>Awaiting teacher verification...</Text>
    )}
  </View>
);

// Component to render a reward item in the catalog
const RewardItemStudent = ({
  item,
  currentBalance,
  isGoal,
}: {
  item: RewardItem;
  currentBalance: number;
  isGoal: boolean;
}) => {
  const canEarn = currentBalance >= item.cost;
  const ticketsNeeded = item.cost - currentBalance;
  return (
    <View style={[ appSharedStyles.itemContainer, canEarn ? styles.rewardItemAffordable : {}, isGoal ? styles.rewardItemGoal : {}, ]}>
      <View style={styles.rewardItemContent}>
        <Image source={{ uri: item.imageUrl }} style={styles.rewardImage} resizeMode="contain"/>
        <View style={styles.rewardDetails}>
          <Text style={styles.rewardName}>{item.name}</Text>
          <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>{item.cost} Tickets</Text>
          {item.description && <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>}
          {canEarn ? (<Text style={[appSharedStyles.itemDetailText, appSharedStyles.textSuccess]}>Available Now!</Text>) : (<Text style={[appSharedStyles.itemDetailText, { color: colors.textPrimary }]}>Need {ticketsNeeded} more tickets</Text>)}
        </View>
      </View>
    </View>
  );
};

// Component to render a ticket history item
export const TicketHistoryItem = ({ item }: { item: TicketTransaction }) => (
  <View style={styles.historyItemContainer}>
    <Text style={styles.historyItemTimestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
    <Text style={styles.historyItemDetails}>
      {item.type === 'task_award' ? 'Task Award' : item.type === 'manual_add' ? 'Manual Add' : item.type === 'manual_subtract' ? 'Manual Subtract' : item.type === 'redemption' ? 'Redemption' : item.type}
      :{' '}
      <Text style={[ styles.historyItemAmount, item.amount > 0 ? { color: colors.success } : { color: colors.danger }, ]}>
        {item.amount > 0 ? `+${item.amount}` : item.amount} Tickets
      </Text>
    </Text>
    {item.notes && <Text style={styles.historyItemNotes}>{item.notes}</Text>}
  </View>
);

// Component to render an announcement item
export const AnnouncementListItemStudent = ({ item }: { item: Announcement }) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={styles.announcementTitle}>{item.title}</Text>
    <Text style={appSharedStyles.itemDetailText}>{item.message}</Text>
    <Text style={styles.announcementDate}>{new Date(item.date).toLocaleDateString()}</Text>
  </View>
);


// --- Main StudentView Component ---
export const StudentView: React.FC<StudentViewProps> = ({
  user,
  balance,
  assignedTasks,
  history,
  rewardsCatalog,
  announcements,
  taskLibrary,
  mockInstruments,
  onMarkTaskComplete,
}) => {
  // State for goal setting
  const [goalRewardId, setGoalRewardId] = useState<string | null>(null);
  // State for active tab
  type StudentTab = 'dashboard' | 'tasks' | 'rewards' | 'announcements';
  const [activeTab, setActiveTab] = useState<StudentTab>('dashboard');
  // State for modal visibility
  const [isSetGoalModalVisible, setIsSetGoalModalVisible] = useState(false);

  const goalReward = rewardsCatalog.find(reward => reward.id === goalRewardId);
  // Calculate raw progress (can exceed 100)
  const rawProgressTowardGoal = goalReward ? (balance / goalReward.cost) * 100 : 0;
  // Calculate clamped progress for display and bar width (max 100)
  const clampedProgress = Math.min(rawProgressTowardGoal, 100);
  // Determine if goal is met for color change and text display
  const goalMet = rawProgressTowardGoal >= 100;

  // Handler to open the goal modal
  const handleSetGoalPress = () => {
    setIsSetGoalModalVisible(true);
  };

  // Callback function for the modal to update the goal
  const handleGoalSelected = (newGoalId: string | null) => {
    setGoalRewardId(newGoalId); // Update the goal ID state
    setIsSetGoalModalVisible(false); // Close the modal
    // Optional: Show confirmation alert
    if (newGoalId) {
        const selectedReward = rewardsCatalog.find(r => r.id === newGoalId);
        alert(`Goal updated! Saving for ${selectedReward?.name || 'item'}.`);
    } else {
        alert('Goal cleared!');
    }
  };


  // Filter tasks for display
  const activeTasks = assignedTasks.filter(task => !task.isComplete);
  const pendingVerificationTasks = assignedTasks.filter(
    task => task.isComplete && task.verificationStatus === 'pending'
  );
  const recentlyCompletedTasks = assignedTasks
    .filter(task => task.isComplete && task.verificationStatus !== 'pending')
    .sort(
      (a, b) =>
        new Date(b.verifiedDate || b.completedDate || '').getTime() -
        new Date(a.verifiedDate || a.completedDate || '').getTime()
    );

  // Generate student's display name
  const studentDisplayName = getUserDisplayName(user);

  // --- Render Main Tabbed View ---
  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.container}>
        {/* Header */}
        <Text style={appSharedStyles.header}>Welcome, {studentDisplayName}!</Text>
        <Text style={styles.instrumentText}>
          Instrument(s): {getInstrumentNames(user.instrumentIds, mockInstruments)}
        </Text>
        <Text style={[styles.balance, appSharedStyles.textGold]}>Current Tickets: {balance}</Text>

        {/* Tab Header Buttons */}
        <View style={styles.tabContainer}>
           <Button title="Dashboard" onPress={() => setActiveTab('dashboard')} color={activeTab === 'dashboard' ? colors.primary : colors.secondary}/>
           <Button title="Tasks" onPress={() => setActiveTab('tasks')} color={activeTab === 'tasks' ? colors.primary : colors.secondary}/>
           <Button title="Rewards" onPress={() => setActiveTab('rewards')} color={activeTab === 'rewards' ? colors.primary : colors.secondary}/>
           <Button title="Announcements" onPress={() => setActiveTab('announcements')} color={activeTab === 'announcements' ? colors.primary : colors.secondary}/>
        </View>

        {/* Conditional Content Area */}
        <View style={styles.contentArea}>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <ScrollView>
              {/* My Goal Section */}
              <Text style={appSharedStyles.sectionTitle}>My Goal</Text>
              {goalReward ? (
                <View style={styles.goalContainer}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Image source={{ uri: goalReward.imageUrl }} style={styles.goalImage} resizeMode="contain"/>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.goalText}>Saving for: {goalReward.name}</Text>
                      <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>{goalReward.cost} Tickets</Text>
                    </View>
                  </View>
                  {/* --- Corrected PROGRESS TEXT --- */}
                  {goalMet ? (
                     <Text style={styles.progressText}>
                        Progress: {goalReward.cost} / {goalReward.cost} (100.0%)
                        {/* Add surplus text only if balance is strictly greater */}
                        {balance > goalReward.cost && ` with ${balance - goalReward.cost} remaining`}
                     </Text>
                  ) : (
                     <Text style={styles.progressText}>
                        Progress: {balance} / {goalReward.cost} ({clampedProgress.toFixed(1)}%)
                     </Text>
                  )}
                  {/* --- END Corrected PROGRESS TEXT --- */}
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                            width: `${clampedProgress}%`,
                            backgroundColor: goalMet ? colors.success : colors.gold
                        }
                      ]}
                    />
                  </View>
                  <Button title="Change Goal" onPress={handleSetGoalPress} />
                </View>
              ) : (
                <View style={styles.goalContainer}>
                  <Text style={styles.goalText}>No goal set yet.</Text>
                  <Button title="Set a Goal" onPress={handleSetGoalPress} />
                </View>
              )}

              {/* Recent History Section */}
              <Text style={appSharedStyles.sectionTitle}>Recent History</Text>
              <FlatList data={history.slice(0, 5)} keyExtractor={item => `history-${item.id}`} renderItem={({ item }) => <TicketHistoryItem item={item} />} ItemSeparatorComponent={() => <View style={{ height: 5 }} />} ListEmptyComponent={() => (<Text style={appSharedStyles.emptyListText}>No history yet.</Text>)} scrollEnabled={false} contentContainerStyle={styles.listContentContainer}/>
              {history.length > 5 && (<View style={{ alignItems: 'flex-start', marginTop: 10 }}><Button title="View Full History (Mock)" onPress={() => alert('Navigate to full history screen')} /></View>)}

               <View style={{ height: 30 }} />
            </ScrollView>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <ScrollView>
              <Text style={appSharedStyles.sectionTitle}>Active Tasks ({activeTasks.length})</Text>
              <FlatList data={activeTasks} keyExtractor={item => `active-task-${item.id}`} renderItem={({ item }) => (<AssignedTaskItem task={item} onMarkComplete={onMarkTaskComplete} taskLibrary={taskLibrary}/>)} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListEmptyComponent={() => (<Text style={appSharedStyles.emptyListText}>No active tasks assigned.</Text>)} scrollEnabled={false} contentContainerStyle={styles.listContentContainer}/>
              {pendingVerificationTasks.length > 0 && (<>
                  <Text style={appSharedStyles.sectionTitle}>Pending Verification ({pendingVerificationTasks.length})</Text>
                  <FlatList data={pendingVerificationTasks} keyExtractor={item => `pending-task-${item.id}`} renderItem={({ item }) => (<AssignedTaskItem task={item} onMarkComplete={onMarkTaskComplete} taskLibrary={taskLibrary}/>)} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListEmptyComponent={() => <Text style={appSharedStyles.emptyListText}>None</Text>} scrollEnabled={false} contentContainerStyle={styles.listContentContainer}/>
                </>)}
              {recentlyCompletedTasks.length > 0 && (<>
                  <Text style={appSharedStyles.sectionTitle}>Recently Completed Tasks ({recentlyCompletedTasks.length})</Text>
                  <FlatList data={recentlyCompletedTasks} keyExtractor={item => `completed-task-${item.id}`} renderItem={({ item }) => (<AssignedTaskItem task={item} onMarkComplete={onMarkTaskComplete} taskLibrary={taskLibrary}/>)} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListEmptyComponent={() => <Text style={appSharedStyles.emptyListText}>None</Text>} scrollEnabled={false} contentContainerStyle={styles.listContentContainer}/>
                </>)}
              <View style={{ height: 30 }} />
            </ScrollView>
          )}

          {/* Rewards Tab */}
          {activeTab === 'rewards' && (
            <FlatList data={rewardsCatalog.sort((a, b) => a.cost - b.cost)} keyExtractor={item => `reward-${item.id}`} renderItem={({ item }) => (<RewardItemStudent item={item} currentBalance={balance} isGoal={item.id === goalRewardId}/>)} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListEmptyComponent={() => <Text style={appSharedStyles.emptyListText}>No rewards found.</Text>} contentContainerStyle={styles.listContentContainer} ListFooterComponent={<View style={{ height: 20 }}/>} />
          )}

          {/* Announcements Tab */}
          {activeTab === 'announcements' && (
             <FlatList data={announcements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())} keyExtractor={item => `announcement-${item.id}`} renderItem={({ item }) => <AnnouncementListItemStudent item={item} />} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListEmptyComponent={() => <Text style={appSharedStyles.emptyListText}>No announcements found.</Text>} contentContainerStyle={styles.listContentContainer} ListFooterComponent={<View style={{ height: 20 }}/>} />
          )}
        </View>
      </View>

      {/* Render the SetGoalModal */}
      <SetGoalModal
          visible={isSetGoalModalVisible}
          onClose={() => setIsSetGoalModalVisible(false)}
          rewardsCatalog={rewardsCatalog}
          currentBalance={balance}
          currentGoalId={goalRewardId}
          onSetGoal={handleGoalSelected}
      />
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  instrumentText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  balance: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center', // Kept 'center'
    flexWrap: 'wrap',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    gap: 10, // Kept gap
  },
  contentArea: {
    flex: 1,
  },
  listContentContainer: {
    paddingBottom: 5,
  },
  goalContainer: {
    backgroundColor: colors.backgroundPrimary,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    marginBottom: 20,
  },
  goalImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  goalText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  progressText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: '#eee',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  taskItemStatus: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  pendingNote: {
    fontSize: 13,
    color: colors.warning,
    fontStyle: 'italic',
    marginTop: 5,
  },
  rewardItemAffordable: {
    borderColor: colors.success,
    borderWidth: 2,
  },
  rewardItemGoal: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.backgroundHighlight,
  },
  rewardItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardImage: {
    width: 60,
    height: 60,
    marginRight: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
  },
  rewardDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  rewardName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  historyItemContainer: {
    ...appSharedStyles.itemContainer,
    backgroundColor: colors.backgroundGrey,
    padding: 10,
    marginBottom: 5,
    borderRadius: 6,
  },
  historyItemTimestamp: {
    fontSize: 12,
    color: colors.textVeryLight,
    marginBottom: 4,
  },
  historyItemDetails: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  historyItemAmount: {
    fontWeight: 'bold',
  },
  historyItemNotes: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  announcementDate: {
    fontSize: 12,
    color: colors.textVeryLight,
    marginTop: 8,
    textAlign: 'right',
  },
});