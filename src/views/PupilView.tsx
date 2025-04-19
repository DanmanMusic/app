// src/views/PupilView.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Button, Image, TouchableOpacity, Alert } from 'react-native'; // Ensure Image is imported
import { SafeAreaView } from 'react-native-safe-area-context';

// Import types for mock data
import { User } from '../mocks/mockUsers';
import { AssignedTask, TaskVerificationStatus } from '../mocks/mockAssignedTasks';
import { TicketTransaction } from '../mocks/mockTickets';
import { RewardItem } from '../mocks/mockRewards';
import { Announcement } from '../mocks/mockAnnouncements';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { Instrument } from '../mocks/mockInstruments';

// Import helpers
import { getTaskTitle, getInstrumentNames } from '../utils/helpers';


// Export the interface so App.tsx (and others) can import it
export interface PupilViewProps {
    user: User;
    balance: number;
    assignedTasks: AssignedTask[];
    history: TicketTransaction[];
    rewardsCatalog: RewardItem[];
    announcements: Announcement[];
    taskLibrary: TaskLibraryItem[];
    mockInstruments: Instrument[]; // Pass instruments list
    // Mock function for marking task complete, passed down from App.tsx
    onMarkTaskComplete: (taskId: string) => void;
    // Add other mock action functions relevant to PupilView later
}

// Render item for FlatList of Assigned Tasks (uses onMarkComplete prop)
const AssignedTaskItem = ({ task, onMarkComplete, taskLibrary }: { task: AssignedTask; onMarkComplete: (taskId: string) => void; taskLibrary: TaskLibraryItem[]; }) => (
    <View style={styles.taskItemContainer}>
        <Text style={styles.taskItemTitle}>{getTaskTitle(task.taskId, taskLibrary)}</Text>
        <Text style={styles.taskItemStatus}>
            Status: {task.isComplete ? (task.verificationStatus === 'pending' ? 'Complete (Pending Verification)' : `Verified`) : 'Assigned'}
        </Text>
        {task.actualPointsAwarded !== undefined && task.verificationStatus !== 'pending' && (
             <Text style={styles.taskItemPoints}>Awarded: {task.actualPointsAwarded ?? 0} Tickets</Text>
        )}
        {task.completedDate && <Text style={styles.taskItemDetail}>Completed: {new Date(task.completedDate).toLocaleDateString()}</Text>}
        {task.verifiedDate && task.verificationStatus !== 'pending' && <Text style={styles.taskItemDetail}>Verified: {new Date(task.verifiedDate).toLocaleDateString()}</Text>}


        {!task.isComplete && (
             // Call the passed down onMarkComplete prop
             <Button title="Mark Complete" onPress={() => onMarkComplete(task.id)} />
        )}
         {task.isComplete && task.verificationStatus === 'pending' && (
              <Text style={styles.pendingNote}>Awaiting teacher verification...</Text>
         )}
    </View>
);

// Render item for FlatList of Rewards (updated to use Image)
const RewardItemPupil = ({ item, currentBalance, isGoal }: { item: RewardItem; currentBalance: number; isGoal: boolean; }) => {
    const canEarn = currentBalance >= item.cost;
    const ticketsNeeded = item.cost - currentBalance;

    return (
        <View style={[styles.rewardItemContainer, canEarn ? styles.rewardItemAffordable : {}, isGoal ? styles.rewardItemGoal : {}]}>
             {/* Use Image component with source from item.imageUrl */}
             {/* Error handling (onError) or loading indicator could be added in a real app */}
             <Image
                 source={{ uri: item.imageUrl }}
                 style={styles.rewardImage} // Use a specific image style
                 resizeMode="contain" // Ensure the image fits well
             />
            <View style={styles.rewardDetails}>
                <Text style={styles.rewardName}>{item.name}</Text>
                <Text style={styles.rewardCost}>{item.cost} Tickets</Text>
                 {item.description && <Text style={styles.rewardDescription}>{item.description}</Text>}
                {canEarn ? (
                    <Text style={styles.rewardEligibilityAvailable}>Available Now!</Text>
                ) : (
                    <Text style={styles.rewardEligibilityNeeded}>Need {ticketsNeeded} more tickets</Text>
                )}
            </View>
        </View>
    );
};

// Render item for FlatList of Ticket History
export const TicketHistoryItem = ({ item }: { item: TicketTransaction }) => (
    <View style={styles.historyItemContainer}>
        <Text style={styles.historyItemTimestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
        <Text style={styles.historyItemDetails}>
            {item.type === 'task_award' ? 'Task Award' :
             item.type === 'manual_add' ? 'Manual Add' :
             item.type === 'manual_subtract' ? 'Manual Subtract' :
             item.type === 'redemption' ? 'Redemption' : item.type}: {' '}
            <Text style={[styles.historyItemAmount, item.amount > 0 ? styles.historyItemAmountPositive : styles.historyItemAmountNegative]}>
                 {item.amount > 0 ? `+${item.amount}` : item.amount} Tickets
             </Text>
        </Text>
        {item.notes && <Text style={styles.historyItemNotes}>{item.notes}</Text>}
    </View>
);

// Render item for FlatList of Announcements
export const AnnouncementItemPupil = ({ item }: { item: Announcement }) => (
     <View style={styles.announcementItemContainer}>
        <Text style={styles.announcementTitle}>{item.title}</Text>
        <Text style={styles.announcementMessage}>{item.message}</Text>
        <Text style={styles.announcementDate}>{new Date(item.date).toLocaleDateString()}</Text>
    </View>
);


export const PupilView: React.FC<PupilViewProps> = ({ user, balance, assignedTasks, history, rewardsCatalog, announcements, taskLibrary, mockInstruments, onMarkTaskComplete }) => {

     // State for the selected goal item ID (mock)
     const [goalRewardId, setGoalRewardId] = useState<string | null>(null);
     const goalReward = rewardsCatalog.find(reward => reward.id === goalRewardId);
     const progressTowardGoal = goalReward ? (balance / goalReward.cost) * 100 : 0;


    // Mock function for setting a goal (placeholder)
    const handleSetGoal = () => {
        // In a real app, this would show a modal or navigate to the catalog
        // to let the user pick a reward item to set as their goal.
        // For now, simulate setting the Fender Strat (reward-6) as a goal if not set, or clear if set.
        const mockGoalId = 'reward-6'; // Fender Strat
         const mockGoalItem = rewardsCatalog.find(r => r.id === mockGoalId);


        if (goalRewardId === mockGoalId) {
            setGoalRewardId(null); // Clear goal if already set to this
            Alert.alert("Goal Cleared", `You are no longer saving for the ${mockGoalItem?.name || 'item'}.`);
        } else {
             setGoalRewardId(mockGoalId); // Set this as the goal
             Alert.alert("Goal Set!", `You are now saving for the ${mockGoalItem?.name || 'item'}!`);
        }
    };


    // Filter tasks for display
     const activeTasks = assignedTasks.filter(task => !task.isComplete);
     const pendingVerificationTasks = assignedTasks.filter(task => task.isComplete && task.verificationStatus === 'pending');
     // Show recently completed/verified tasks that are NOT pending
     const recentlyCompletedTasks = assignedTasks.filter(task => task.isComplete && task.verificationStatus !== 'pending').sort((a, b) => new Date(b.verifiedDate || b.completedDate || '').getTime() - new Date(a.verifiedDate || a.completedDate || '').getTime());


    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container}>
                <Text style={styles.header}>Welcome, {user.name}!</Text>
                <Text style={styles.instrumentText}>Instrument(s): {getInstrumentNames(user.instrumentIds, mockInstruments)}</Text>
                <Text style={styles.balance}>Current Tickets: {balance}</Text>

                {/* My Goal Section */}
                <Text style={styles.sectionTitle}>My Goal</Text>
                 {goalReward ? (
                     <View style={styles.goalContainer}>
                         {/* Use Image for goal item if available */}
                         <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                              <Image
                                  source={{ uri: goalReward.imageUrl }}
                                   style={styles.goalImage} // Specific style for goal image
                                   resizeMode="contain"
                              />
                             <View style={{flex: 1, marginLeft: 10}}>
                                 <Text style={styles.goalText}>Saving for: {goalReward.name}</Text>
                                 <Text style={{fontSize: 14, color: '#555'}}>{goalReward.cost} Tickets</Text>
                             </View>
                         </View>

                         <Text style={styles.progressText}>Progress: {balance} / {goalReward.cost} ({progressTowardGoal.toFixed(1)}%)</Text>
                         <View style={styles.progressBarBackground}>
                            <View style={[styles.progressBarFill, { width: `${Math.min(progressTowardGoal, 100)}%` }]} />
                         </View>
                         <Button title="Change Goal (Mock)" onPress={handleSetGoal} />
                     </View>
                 ) : (
                     <View style={styles.goalContainer}>
                         <Text style={styles.goalText}>No goal set yet.</Text>
                         <Button title="Set a Goal" onPress={handleSetGoal} />
                     </View>
                 )}


                {/* Rewards Catalog Section (showing all items) */}
                <Text style={styles.sectionTitle}>Rewards Catalog</Text>
                 <FlatList
                     data={rewardsCatalog.sort((a, b) => a.cost - b.cost)}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <RewardItemPupil item={item} currentBalance={balance} isGoal={item.id === goalRewardId} />
                    )}
                    ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                     ListEmptyComponent={() => <Text style={styles.emptyListText}>No rewards found.</Text>}
                    scrollEnabled={false}
                     contentContainerStyle={styles.listContentContainer}
                 />


                <Text style={styles.sectionTitle}>Assigned Tasks ({activeTasks.length})</Text>
                <FlatList
                    data={activeTasks}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <AssignedTaskItem task={item} onMarkComplete={onMarkTaskComplete} taskLibrary={taskLibrary} />}
                     ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                    ListEmptyComponent={() => <Text style={styles.emptyListText}>No active tasks assigned.</Text>}
                    scrollEnabled={false}
                     contentContainerStyle={styles.listContentContainer}
                />

                {pendingVerificationTasks.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Pending Verification ({pendingVerificationTasks.length})</Text>
                         <FlatList
                             data={pendingVerificationTasks}
                             keyExtractor={(item) => item.id}
                             renderItem={({ item }) => <AssignedTaskItem task={item} onMarkComplete={onMarkTaskComplete} taskLibrary={taskLibrary} />}
                              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                            ListEmptyComponent={() => <Text style={styles.emptyListText}>None</Text>}
                            scrollEnabled={false}
                             contentContainerStyle={styles.listContentContainer}
                         />
                    </>
                )}

                 {recentlyCompletedTasks.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Recently Completed Tasks ({recentlyCompletedTasks.length})</Text>
                         <FlatList
                             data={recentlyCompletedTasks}
                             keyExtractor={(item) => item.id}
                             renderItem={({ item }) => <AssignedTaskItem task={item} onMarkComplete={onMarkTaskComplete} taskLibrary={taskLibrary} />}
                              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                            ListEmptyComponent={() => <Text style={styles.emptyListText}>None</Text>}
                            scrollEnabled={false}
                             contentContainerStyle={styles.listContentContainer}
                         />
                    </>
                )}


                 <Text style={styles.sectionTitle}>Recent History</Text>
                 <FlatList
                     data={history.slice(0, 5)}
                     keyExtractor={(item) => item.id}
                     renderItem={({ item }) => <TicketHistoryItem item={item} />}
                      ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                     ListEmptyComponent={() => <Text style={styles.emptyListText}>No history yet.</Text>}
                    scrollEnabled={false}
                     contentContainerStyle={styles.listContentContainer}
                 />
                 {history.length > 5 && (
                     <View style={{alignItems: 'flex-start', marginTop: 10}}>
                        <Button title="View Full History (Mock)" onPress={() => alert('Navigate to full history screen')} />
                     </View>
                 )}


                <Text style={styles.sectionTitle}>Announcements</Text>
                 <FlatList
                     data={announcements.slice(0, 3)}
                     keyExtractor={(item) => item.id}
                     renderItem={({ item }) => <AnnouncementItemPupil item={item} />}
                     ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                     ListEmptyComponent={() => <Text style={styles.emptyListText}>No announcements.</Text>}
                    scrollEnabled={false}
                     contentContainerStyle={styles.listContentContainer}
                 />
                 {announcements.length > 3 && (
                      <View style={{alignItems: 'flex-start', marginTop: 10}}>
                         <Button title="View All Announcements (Mock)" onPress={() => alert('Navigate to all announcements screen')} />
                      </View>
                 )}


                {/* Add navigation buttons if needed */}
                <View style={{marginTop: 20, marginBottom: 40}}>
                </View>


            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f8f8f8',
    },
    container: {
        flex: 1,
        padding: 15,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    instrumentText: {
        fontSize: 16,
        color: '#555',
        marginBottom: 10,
    },
    balance: {
        fontSize: 28,
        color: 'gold',
        fontWeight: 'bold',
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 15,
        color: '#444',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingBottom: 5,
    },
    listContentContainer: {
        // Added for FlatLists when scrollEnabled={false}
    },
     emptyListText: {
        textAlign: 'center',
        color: '#777',
        marginTop: 5,
     },
    // My Goal Styles
    goalContainer: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#007bff',
        marginBottom: 20,
    },
     goalImage: { // New style for goal image
         width: 50,
         height: 50,
         borderRadius: 4,
         borderWidth: 1,
         borderColor: '#ddd',
     },
     goalText: {
         fontSize: 16,
         fontWeight: '600',
         // Adjusted margin below if using flex row
     },
     progressText: {
         fontSize: 14,
         color: '#555',
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
          backgroundColor: 'gold',
          borderRadius: 5,
      },
    // Task Item Styles
    taskItemContainer: {
        backgroundColor: '#fff',
        padding: 12,
        marginBottom: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    taskItemTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    taskItemStatus: {
        fontSize: 14,
        color: '#555',
        marginBottom: 8,
    },
    taskItemPoints: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'green',
    },
     taskItemDetail: { // Added style for dates etc.
         fontSize: 12,
         color: '#666',
         marginBottom: 2,
     },
     pendingNote: {
         fontSize: 13,
         color: 'orange',
         fontStyle: 'italic',
     },
    // Reward Item Styles
    rewardItemContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
     rewardItemAffordable: {
         borderColor: 'green',
         borderWidth: 2,
     },
      rewardItemGoal: {
         borderColor: '#007bff',
         borderWidth: 2,
         backgroundColor: '#eef7ff',
      },
     rewardImage: { // New style for reward item image
         width: 60, // Match previous placeholder size
         height: 60, // Match previous placeholder size
         marginRight: 15,
         borderRadius: 4,
         // backgroundColor: '#eee', // Background isn't needed if image loads
         borderWidth: 1,
         borderColor: '#ccc',
     },
    // Removed rewardImagePlaceholder and rewardImagePlaceholderText
    rewardDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    rewardName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
    },
    rewardCost: {
        fontSize: 14,
        color: 'gold',
        fontWeight: '600',
        marginVertical: 2,
    },
     rewardDescription: {
        fontSize: 13,
        color: '#666',
     },
     rewardEligibilityAvailable: {
        fontSize: 13,
        fontStyle: 'italic',
        color: 'green',
     },
      rewardEligibilityNeeded: {
        fontSize: 13,
        fontStyle: 'italic',
        color: '#007bff',
     },
    // History Item Styles
    historyItemContainer: {
        backgroundColor: '#e9e9e9',
        padding: 10,
        marginBottom: 5,
        borderRadius: 6,
         borderWidth: 1,
         borderColor: '#ddd',
    },
    historyItemTimestamp: {
        fontSize: 12,
        color: '#888',
        marginBottom: 4,
    },
    historyItemDetails: {
        fontSize: 14,
        color: '#555',
    },
     historyItemAmount: {
         fontWeight: 'bold',
     },
     historyItemAmountPositive: {
         color: 'green',
     },
     historyItemAmountNegative: {
         color: 'red',
     },
     historyItemNotes: {
         fontSize: 13,
         color: '#666',
         marginTop: 4,
         fontStyle: 'italic',
     },
    // Announcement Item Styles
     announcementItemContainer: {
         backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
     announcementTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    announcementMessage: {
        fontSize: 14,
        color: '#555',
    },
    announcementDate: {
        fontSize: 12,
        color: '#888',
        marginTop: 8,
        textAlign: 'right',
    },
});