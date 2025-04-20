// src/views/PupilView.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Button,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import NEW user type
import { User } from '../types/userTypes';

// Other required types
import { AssignedTask } from '../mocks/mockAssignedTasks';
import { TicketTransaction } from '../mocks/mockTickets';
import { RewardItem } from '../mocks/mockRewards';
import { Announcement } from '../mocks/mockAnnouncements';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { Instrument } from '../mocks/mockInstruments';

// Import NEW helper for display names
import { getTaskTitle, getInstrumentNames, getUserDisplayName } from '../utils/helpers';

// Shared styles and colors
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';

// Props interface uses the new User type
export interface PupilViewProps {
  user: User; // Use new User type
  balance: number;
  assignedTasks: AssignedTask[];
  history: TicketTransaction[];
  rewardsCatalog: RewardItem[];
  announcements: Announcement[]; // Full list passed down
  taskLibrary: TaskLibraryItem[];
  mockInstruments: Instrument[];
  onMarkTaskComplete: (taskId: string) => void;
}

// Component to render an assigned task item (remains the same)
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

// Component to render a reward item in the catalog (remains the same)
const RewardItemPupil = ({
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
    <View
      style={[
        appSharedStyles.itemContainer,
        canEarn ? styles.rewardItemAffordable : {},
        isGoal ? styles.rewardItemGoal : {},
      ]}
    >
      <View style={styles.rewardItemContent}>
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.rewardImage}
          resizeMode="contain"
        />
        <View style={styles.rewardDetails}>
          <Text style={styles.rewardName}>{item.name}</Text>
          <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>{item.cost} Tickets</Text>
          {item.description && <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>}
          {canEarn ? (
            <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textSuccess]}>Available Now!</Text>
          ) : (
            <Text style={[appSharedStyles.itemDetailText, { color: colors.textPrimary }]}>Need {ticketsNeeded} more tickets</Text>
          )}
        </View>
      </View>
    </View>
  );
};

// Component to render a ticket history item (remains the same)
export const TicketHistoryItem = ({ item }: { item: TicketTransaction }) => (
  <View style={styles.historyItemContainer}>
    <Text style={styles.historyItemTimestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
    <Text style={styles.historyItemDetails}>
      {item.type === 'task_award'
        ? 'Task Award'
        : item.type === 'manual_add'
          ? 'Manual Add'
          : item.type === 'manual_subtract'
            ? 'Manual Subtract'
            : item.type === 'redemption'
              ? 'Redemption'
              : item.type}
      :{' '}
      <Text
        style={[
          styles.historyItemAmount,
          item.amount > 0 ? { color: colors.success } : { color: colors.danger },
        ]}
      >
        {item.amount > 0 ? `+${item.amount}` : item.amount} Tickets
      </Text>
    </Text>
    {item.notes && <Text style={styles.historyItemNotes}>{item.notes}</Text>}
  </View>
);

// Component to render an announcement item (remains the same, used in both views)
export const AnnouncementItemPupil = ({ item }: { item: Announcement }) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={styles.announcementTitle}>{item.title}</Text>
    <Text style={appSharedStyles.itemDetailText}>{item.message}</Text>
    <Text style={styles.announcementDate}>{new Date(item.date).toLocaleDateString()}</Text>
  </View>
);

// Main PupilView component
export const PupilView: React.FC<PupilViewProps> = ({
  user,
  balance,
  assignedTasks,
  history,
  rewardsCatalog,
  announcements, // Full list is passed here
  taskLibrary,
  mockInstruments,
  onMarkTaskComplete,
}) => {
  // State for goal setting
  const [goalRewardId, setGoalRewardId] = useState<string | null>(null);
  // State to control which view is shown: 'main' or 'allAnnouncements'
  const [currentSubView, setCurrentSubView] = useState<'main' | 'allAnnouncements'>('main');

  const goalReward = rewardsCatalog.find(reward => reward.id === goalRewardId);
  const progressTowardGoal = goalReward ? (balance / goalReward.cost) * 100 : 0;

  // Handler for setting/clearing the goal (remains the same)
  const handleSetGoal = () => {
    const mockGoalId = 'reward-6'; // Example goal ID
    const mockGoalItem = rewardsCatalog.find(r => r.id === mockGoalId);

    if (goalRewardId === mockGoalId) {
      setGoalRewardId(null);
      alert(`Goal Cleared - You are no longer saving for the ${mockGoalItem?.name || 'item'}.`);
    } else {
      setGoalRewardId(mockGoalId);
      alert(`Goal Set! - You are now saving for the ${mockGoalItem?.name || 'item'}!`);
    }
  };

  // Filter tasks for display (remains the same)
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

  // Generate pupil's display name
  const pupilDisplayName = getUserDisplayName(user);

  // --- Render All Announcements View ---
  if (currentSubView === 'allAnnouncements') {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        {/* Header for All Announcements */}
        <View style={appSharedStyles.headerContainer}>
          <Button title="← Back" onPress={() => setCurrentSubView('main')} />
          <Text style={appSharedStyles.header}>All Announcements</Text>
          <View style={{ width: 50 }} /> {/* Spacer */}
        </View>
        {/* Scrollable list of all announcements */}
        <FlatList
          style={appSharedStyles.container} // Use container style for padding
          data={announcements.sort( // Sort all announcements
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <AnnouncementItemPupil item={item} />} // Reuse the same component
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No announcements found.</Text>
          )}
          // Add some padding at the bottom
          ListFooterComponent={<View style={{ height: 20 }} />}
        />
      </SafeAreaView>
    );
  }

  // --- Render Main Pupil View ---
  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <ScrollView style={appSharedStyles.container}>
        {/* Welcome Header */}
        <Text style={appSharedStyles.header}>Welcome, {pupilDisplayName}!</Text>
        <Text style={styles.instrumentText}>
          Instrument(s): {getInstrumentNames(user.instrumentIds, mockInstruments)}
        </Text>
        <Text style={[styles.balance, appSharedStyles.textGold]}>Current Tickets: {balance}</Text>

        {/* My Goal Section (remains the same) */}
        <Text style={appSharedStyles.sectionTitle}>My Goal</Text>
        {goalReward ? (
          <View style={styles.goalContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Image
                source={{ uri: goalReward.imageUrl }}
                style={styles.goalImage}
                resizeMode="contain"
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.goalText}>Saving for: {goalReward.name}</Text>
                <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>{goalReward.cost} Tickets</Text>
              </View>
            </View>
            <Text style={styles.progressText}>
              Progress: {balance} / {goalReward.cost} ({progressTowardGoal.toFixed(1)}%)
            </Text>
            <View style={styles.progressBarBackground}>
              <View
                style={[styles.progressBarFill, { width: `${Math.min(progressTowardGoal, 100)}%` }]}
              />
            </View>
            <Button title="Change Goal (Mock)" onPress={handleSetGoal} />
          </View>
        ) : (
          <View style={styles.goalContainer}>
            <Text style={styles.goalText}>No goal set yet.</Text>
            <Button title="Set a Goal" onPress={handleSetGoal} />
          </View>
        )}

        {/* Rewards Catalog Section (remains the same) */}
        <Text style={appSharedStyles.sectionTitle}>Rewards Catalog</Text>
        <FlatList
          data={rewardsCatalog.sort((a, b) => a.cost - b.cost)}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <RewardItemPupil
              item={item}
              currentBalance={balance}
              isGoal={item.id === goalRewardId}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={() => <Text style={appSharedStyles.emptyListText}>No rewards found.</Text>}
          scrollEnabled={false}
          contentContainerStyle={styles.listContentContainer}
        />

        {/* Assigned Tasks Section (remains the same) */}
        <Text style={appSharedStyles.sectionTitle}>Assigned Tasks ({activeTasks.length})</Text>
        <FlatList
          data={activeTasks}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AssignedTaskItem
              task={item}
              onMarkComplete={onMarkTaskComplete}
              taskLibrary={taskLibrary}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No active tasks assigned.</Text>
          )}
          scrollEnabled={false}
          contentContainerStyle={styles.listContentContainer}
        />

        {/* Pending Verification Section (remains the same) */}
        {pendingVerificationTasks.length > 0 && (
          <>
            <Text style={appSharedStyles.sectionTitle}>
              Pending Verification ({pendingVerificationTasks.length})
            </Text>
            <FlatList
              data={pendingVerificationTasks}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <AssignedTaskItem
                  task={item}
                  onMarkComplete={onMarkTaskComplete}
                  taskLibrary={taskLibrary}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              ListEmptyComponent={() => <Text style={appSharedStyles.emptyListText}>None</Text>}
              scrollEnabled={false}
              contentContainerStyle={styles.listContentContainer}
            />
          </>
        )}

        {/* Recently Completed Section (remains the same) */}
        {recentlyCompletedTasks.length > 0 && (
          <>
            <Text style={appSharedStyles.sectionTitle}>
              Recently Completed Tasks ({recentlyCompletedTasks.length})
            </Text>
            <FlatList
              data={recentlyCompletedTasks}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <AssignedTaskItem
                  task={item}
                  onMarkComplete={onMarkTaskComplete}
                  taskLibrary={taskLibrary}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              ListEmptyComponent={() => <Text style={appSharedStyles.emptyListText}>None</Text>}
              scrollEnabled={false}
              contentContainerStyle={styles.listContentContainer}
            />
          </>
        )}

        {/* Recent History Section (remains the same) */}
        <Text style={appSharedStyles.sectionTitle}>Recent History</Text>
        <FlatList
          data={history.slice(0, 5)}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <TicketHistoryItem item={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No history yet.</Text>
          )}
          scrollEnabled={false}
          contentContainerStyle={styles.listContentContainer}
        />
        {history.length > 5 && (
          <View style={{ alignItems: 'flex-start', marginTop: 10 }}>
            <Button
              title="View Full History (Mock)"
              onPress={() => alert('Navigate to full history screen')}
            />
          </View>
        )}

        {/* Announcements Section */}
        <Text style={appSharedStyles.sectionTitle}>Announcements</Text>
        <FlatList
          data={announcements.slice(0, 3)} // Still show only first 3 here
          keyExtractor={item => item.id}
          renderItem={({ item }) => <AnnouncementItemPupil item={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={() => <Text style={appSharedStyles.emptyListText}>No announcements.</Text>}
          scrollEnabled={false}
          contentContainerStyle={styles.listContentContainer}
        />
        {announcements.length > 3 && (
          <View style={{ alignItems: 'flex-start', marginTop: 10 }}>
            <Button
              // Update button text and action
              title="View All Announcements"
              onPress={() => setCurrentSubView('allAnnouncements')} // Change state to show the full list view
            />
          </View>
        )}

        {/* Bottom Spacer */}
        <View style={{ marginTop: 20, marginBottom: 40 }}></View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Styles (remains the same)
const styles = StyleSheet.create({
  instrumentText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  balance: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 25,
  },
  listContentContainer: {
    // For FlatLists inside ScrollView with scrollEnabled=false
    // No specific style needed usually, but good to have the definition
  },
  goalContainer: {
    backgroundColor: colors.backgroundPrimary,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderHighlight, // Use highlight color for goal border
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
    backgroundColor: '#eee', // Light grey background
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.gold, // Gold fill for progress
    borderRadius: 5,
  },
  taskItemStatus: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  pendingNote: {
    fontSize: 13,
    color: colors.warning, // Use warning color
    fontStyle: 'italic',
    marginTop: 5, // Add space above note
  },
  rewardItemAffordable: {
    borderColor: colors.success, // Green border for affordable items
    borderWidth: 2,
  },
  rewardItemGoal: {
    borderColor: colors.primary, // Primary color border for the goal item
    borderWidth: 2,
    backgroundColor: colors.backgroundHighlight, // Subtle highlight background for goal
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
    ...appSharedStyles.itemContainer, // Inherit base styles
    backgroundColor: colors.backgroundGrey, // Specific background for history
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
    fontWeight: 'bold', // Make amount stand out
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