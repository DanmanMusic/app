// src/views/AdminView.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Alert, FlatList } from 'react-native'; // Added FlatList
import { SafeAreaView } from 'react-native-safe-area-context';

// Import types for mock data
import { User, UserRole } from '../mocks/mockUsers';
import { AssignedTask, TaskVerificationStatus } from '../mocks/mockAssignedTasks';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { RewardItem } from '../mocks/mockRewards';
import { TicketTransaction } from '../mocks/mockTickets';
import { Announcement } from '../mocks/mockAnnouncements';
import { Instrument } from '../mocks/mockInstruments';

// Import helpers
import { getTaskTitle, getInstrumentNames } from '../utils/helpers'; // IMPORT HELPERS
import { AnnouncementItemPupil, PupilViewProps, TicketHistoryItem } from './PupilView';

// Simplified student data for lists in Admin views
interface SimplifiedStudent {
    id: string;
    name: string;
    instrumentIds?: string[];
    balance: number;
}

// Simplified user data for lists in Admin views (Teachers/Parents)
interface SimplifiedUser {
     id: string;
     name: string;
     role: UserRole;
     // Add other relevant summary fields
}


interface AdminViewProps {
    user: User;
    allUsers: User[]; // Full list for potential display/management
    allPupils: SimplifiedStudent[]; // Simplified for lists
    allTeachers: SimplifiedUser[]; // Simplified for lists
    allParents: SimplifiedUser[]; // Simplified for lists
    allAssignedTasks: AssignedTask[];
    taskLibrary: TaskLibraryItem[];
    rewardsCatalog: RewardItem[];
    allTicketHistory: TicketTransaction[];
    announcements: Announcement[];
    mockInstruments: Instrument[]; // Pass instruments list

    // Mock functions for Admin actions
    onManualTicketAdjust: (studentId: string, amount: number, notes: string) => void;
    onRedeemReward: (studentId: string, rewardId: string) => void; // Simplified mock
    onVerifyTask: (taskId: string, status: TaskVerificationStatus, points: number) => void; // Admin can verify
     onAssignTask: (taskId: string | 'custom', studentId: string | string[], customDetails?: any) => void; // More complex assign mock
    onCreateUser: (userData: any) => void;
    onEditUser: (userId: string, userData: any) => void;
    onDeleteUser: (userId: string) => void;
    onCreateTaskLibraryItem: (taskData: any) => void;
    onEditTaskLibraryItem: (taskId: string, taskData: any) => void;
    onDeleteTaskLibraryItem: (taskId: string) => void;
    onCreateReward: (rewardData: any) => void;
    onEditReward: (rewardId: string, rewardData: any) => void;
    onDeleteReward: (rewardId: string) => void;
    onCreateAnnouncement: (announcementData: any) => void;
    onEditAnnouncement: (announcementId: string, announcementData: any) => void;
    onDeleteAnnouncement: (announcementId: string) => void;
    onCreateInstrument: (instrumentData: any) => void;
    onEditInstrument: (instrumentId: string, instrumentData: any) => void;
    onDeleteInstrument: (instrumentId: string) => void;
    getStudentData: (studentId: string) => PupilViewProps | undefined; // Helper to get full student mock data
}


// Render item for User lists in Admin view
const AdminUserItem = ({ user, onViewManage }: { user: SimplifiedUser; onViewManage: (userId: string) => void }) => (
    <View style={adminStyles.item}>
        <Text>{user.name} ({user.role})</Text>
        <Button title="View/Manage (Mock)" onPress={() => onViewManage(user.id)} />
    </View>
);

// Render item for Pupil lists in Admin view
const AdminPupilItem = ({ pupil, mockInstruments, onViewManage }: { pupil: SimplifiedStudent; mockInstruments: Instrument[]; onViewManage: (pupilId: string) => void }) => (
    <View style={adminStyles.item}>
        <Text>{pupil.name} (Pupil)</Text> {/* Static 'Pupil' text fix */}
         <Text>Instrument(s): {getInstrumentNames(pupil.instrumentIds, mockInstruments)}</Text> {/* Use helper */}
        <Text>Balance: {pupil.balance} Tickets</Text>
        <Button title="View/Manage (Mock)" onPress={() => onViewManage(pupil.id)} />
    </View>
);


// Render item for Task Library list in Admin view
const AdminTaskLibraryItem = ({ item, onEditDelete }: { item: TaskLibraryItem; onEditDelete: (taskId: string, action: 'edit' | 'delete') => void }) => (
     <View style={adminStyles.item}>
         <Text style={adminStyles.itemTitle}>{item.title} ({item.basePoints} pts)</Text>
         <Text>{item.description}</Text>
         <View style={adminStyles.itemActions}>
             <Button title="Edit (Mock)" onPress={() => onEditDelete(item.id, 'edit')} />
             <Button title="Delete (Mock)" onPress={() => onEditDelete(item.id, 'delete')} color="red" />
         </View>
     </View>
);

// Render item for Reward Catalog list in Admin view
const AdminRewardItem = ({ item, onEditDelete }: { item: RewardItem; onEditDelete: (rewardId: string, action: 'edit' | 'delete') => void }) => (
    <View style={adminStyles.item}>
        <Text style={adminStyles.itemTitle}>{item.name} ({item.cost} tickets)</Text>
        {/* Placeholder for Image */}
        <View style={adminStyles.imagePlaceholder}><Text>Image</Text></View>
        <View style={adminStyles.itemActions}>
             <Button title="Edit (Mock)" onPress={() => onEditDelete(item.id, 'edit')} />
             <Button title="Delete (Mock)" onPress={() => onEditDelete(item.id, 'delete')} color="red" />
         </View>
    </View>
);

// Render item for Instrument list in Admin view
const AdminInstrumentItem = ({ item, onEditDelete }: { item: Instrument; onEditDelete: (instrumentId: string, action: 'edit' | 'delete') => void }) => (
    <View style={adminStyles.item}>
         <Text style={adminStyles.itemTitle}>{item.name}</Text>
         <View style={adminStyles.itemActions}>
             <Button title="Edit (Mock)" onPress={() => onEditDelete(item.id, 'edit')} />
             <Button title="Delete (Mock)" onPress={() => onEditDelete(item.id, 'delete')} color="red" />
         </View>
    </View>
);


export const AdminView: React.FC<AdminViewProps> = ({
    user,
    allUsers,
    allPupils,
    allTeachers,
    allParents,
    allAssignedTasks,
    taskLibrary,
    rewardsCatalog,
    allTicketHistory,
    announcements,
    mockInstruments,
    onManualTicketAdjust,
    onRedeemReward,
    onVerifyTask,
    onAssignTask,
    onCreateUser, onEditUser, onDeleteUser,
    onCreateTaskLibraryItem, onEditTaskLibraryItem, onDeleteTaskLibraryItem,
    onCreateReward, onEditReward, onDeleteReward,
    onCreateAnnouncement, onEditAnnouncement, onDeleteAnnouncement,
    onCreateInstrument, onEditInstrument, onDeleteInstrument,
    getStudentData
}) => {

    const [viewingSection, setViewingSection] = React.useState<'dashboard' | 'users' | 'tasks' | 'rewards' | 'history' | 'announcements' | 'instruments'>('dashboard'); // Added 'instruments'
    const [viewingStudentId, setViewingStudentId] = React.useState<string | null>(null);

    // Simulate viewing a student's detailed profile
    const viewingStudentData = viewingStudentId ? getStudentData(viewingStudentId) : null;

    // Mock handlers for list item actions
    const handleEditDeleteTaskLibraryItem = (taskId: string, action: 'edit' | 'delete') => {
        if (action === 'edit') onEditTaskLibraryItem(taskId, {}); // Pass mock data
        else onDeleteTaskLibraryItem(taskId);
    };

    const handleEditDeleteRewardItem = (rewardId: string, action: 'edit' | 'delete') => {
        if (action === 'edit') onEditReward(rewardId, {}); // Pass mock data
        else onDeleteReward(rewardId);
    };

     const handleEditDeleteInstrumentItem = (instrumentId: string, action: 'edit' | 'delete') => {
        if (action === 'edit') onEditInstrument(instrumentId, {}); // Pass mock data
        else onDeleteInstrument(instrumentId);
     };

     const handleViewManageUser = (userId: string, role: UserRole | 'public') => {
        if (role === 'pupil') {
            setViewingStudentId(userId); // Drill down to pupil view mock
        } else {
            Alert.alert("Mock User Management", `Simulate managing ${role} user: ${userId}`);
            // In a real app, this might navigate to a different management screen
        }
     };


    // If we are viewing a specific student's profile (mock drill-down)
    if (viewingStudentId && viewingStudentData) {
        return (
             <SafeAreaView style={adminStyles.safeArea}>
                  <View style={adminStyles.headerContainer}>
                    <Button title="← Back to Admin" onPress={() => setViewingStudentId(null)} />
                     <Text style={adminStyles.header}>Admin: {user.name}</Text>
                     <View style={{width: 50}}/> {/* Spacer */}
                  </View>
                  <ScrollView style={adminStyles.container}>
                       <Text style={adminStyles.sectionTitle}>Viewing Student: {viewingStudentData.user.name}</Text>
                       <Text>ID: {viewingStudentData.user.id}</Text>
                       <Text>Instrument(s): {getInstrumentNames(viewingStudentData.user.instrumentIds, mockInstruments)}</Text> {/* Use helper */}
                        <Text>Balance: {viewingStudentData.balance} Tickets</Text>

                        {/* Add buttons for Admin actions on this student */}
                        <View style={adminStyles.adminStudentActions}>
                             <Button title="Adjust Tickets (Mock)" onPress={() => onManualTicketAdjust(viewingStudentData.user.id, 100, "Manual Test")} /> {/* Example mock call */}
                             {/* Need UI to select reward for redemption */}
                              <Button title="Redeem Reward (Mock)" onPress={() => onRedeemReward(viewingStudentData.user.id, 'reward-6')} /> {/* Example mock call for Fender Strat */}
                        </View>

                        {/* Show some student details */}
                         <Text style={adminStyles.sectionTitle}>Assigned Tasks ({viewingStudentData.assignedTasks.length})</Text>
                          {/* Could list tasks here */}
                           {viewingStudentData.assignedTasks.map((task: AssignedTask) => (
                                <View key={task.id} style={adminStyles.taskItem}>
                                     <Text style={adminStyles.taskItemTitle}>{getTaskTitle(task.taskId, taskLibrary)}</Text> {/* Use helper */}
                                     <Text>Status: {task.isComplete ? (task.verificationStatus === 'pending' ? 'Complete (Pending Verification)' : `Verified`) : 'Assigned'}</Text>
                                </View>
                           ))}

                          <Text style={adminStyles.sectionTitle}>History ({viewingStudentData.history.length})</Text>
                           {/* Could list history here */}
                            {viewingStudentData.history.slice(0, 5).map((tx: TicketTransaction) => (
                                <View key={tx.id} style={adminStyles.historyItem}>
                                     <Text style={adminStyles.historyItemDetails}>{tx.timestamp} - {tx.type}: {tx.amount} tickets {tx.notes && `(${tx.notes})`}</Text>
                                </View>
                            ))}


                  </ScrollView>
             </SafeAreaView>
        );
    }


    // Default Admin Dashboard View
    return (
        <SafeAreaView style={adminStyles.safeArea}>
             <View style={adminStyles.headerContainer}>
                 <Text style={adminStyles.header}>Admin Dashboard: {user.name}</Text>
             </View>
            <ScrollView style={adminStyles.container}>

                 {/* Simple Navigation between Admin sections */}
                 <View style={adminStyles.adminNav}>
                     <Button title="Dashboard" onPress={() => setViewingSection('dashboard')} />
                     <Button title="Users" onPress={() => setViewingSection('users')} />
                     <Button title="Tasks" onPress={() => setViewingSection('tasks')} />
                     <Button title="Rewards" onPress={() => setViewingSection('rewards')} />
                     <Button title="History" onPress={() => setViewingSection('history')} />
                     <Button title="Announcements" onPress={() => setViewingSection('announcements')} />
                     <Button title="Instruments" onPress={() => setViewingSection('instruments')} /> {/* Added Instruments */}
                 </View>


                {/* Render content based on selected section */}
                {viewingSection === 'dashboard' && (
                    <View>
                         <Text style={adminStyles.sectionTitle}>Overview</Text>
                         <Text>Total Pupils: {allPupils.length}</Text>
                         <Text>Total Teachers: {allTeachers.length}</Text>
                         <Text>Total Parents: {allParents.length}</Text>
                         <Text>Tasks Pending Verification: {allAssignedTasks.filter(task => task.isComplete && task.verificationStatus === 'pending').length}</Text>
                         {/* Add more dashboard stats */}
                          <View style={{marginTop: 20}}>
                             <Button title="View Pending Verifications (Mock)" onPress={() => {
                                 // Simulate navigating to a specific pending verification screen/modal
                                 Alert.alert("View Pending Verifications", "Simulating view pending verifications");
                             }} />
                          </View>
                    </View>
                )}

                {viewingSection === 'users' && (
                     <View>
                         <Text style={adminStyles.sectionTitle}>Users</Text>
                          <View style={{alignItems: 'flex-start', marginBottom: 10}}>
                             <Button title="Create New User (Mock)" onPress={() => onCreateUser({})} /> {/* Mock call */}
                          </View>

                         <Text style={adminStyles.sectionSubTitle}>Pupils ({allPupils.length})</Text>
                         <FlatList
                            data={allPupils.sort((a, b) => a.name.localeCompare(b.name))}
                            keyExtractor={(item) => item.id}
                            renderItem={({item}) => <AdminPupilItem pupil={item} mockInstruments={mockInstruments} onViewManage={(id) => handleViewManageUser(id, 'pupil')} />}
                            scrollEnabled={false}
                            ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                            ListEmptyComponent={() => <Text style={adminStyles.emptyListText}>No pupils found.</Text>}
                         />

                         <Text style={adminStyles.sectionSubTitle}>Teachers ({allTeachers.length})</Text>
                          <FlatList
                            data={allTeachers.map(t => ({id: t.id, name: t.name, role: t.role}) as SimplifiedUser).sort((a, b) => a.name.localeCompare(b.name))} // Map to SimplifiedUser
                            keyExtractor={(item) => item.id}
                            renderItem={({item}) => <AdminUserItem user={item} onViewManage={(id) => handleViewManageUser(id, 'teacher')} />}
                            scrollEnabled={false}
                            ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                            ListEmptyComponent={() => <Text style={adminStyles.emptyListText}>No teachers found.</Text>}
                         />

                         <Text style={adminStyles.sectionSubTitle}>Parents ({allParents.length})</Text>
                         <FlatList
                            data={allParents.map(p => ({id: p.id, name: p.name, role: p.role}) as SimplifiedUser).sort((a, b) => a.name.localeCompare(b.name))} // Map to SimplifiedUser
                            keyExtractor={(item) => item.id}
                            renderItem={({item}) => <AdminUserItem user={item} onViewManage={(id) => handleViewManageUser(id, 'parent')} />}
                            scrollEnabled={false}
                            ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                            ListEmptyComponent={() => <Text style={adminStyles.emptyListText}>No parents found.</Text>}
                         />
                     </View>
                )}

                 {viewingSection === 'tasks' && (
                    <View>
                        <Text style={adminStyles.sectionTitle}>Task Management</Text>
                         <View style={{alignItems: 'flex-start', marginBottom: 10}}>
                            <Button title="Manage Task Library (Mock)" onPress={() => setViewingSection('dashboard')} /> {/* Placeholder link, could be a modal or new screen */}
                            <Button title="View All Assigned Tasks (Mock)" onPress={() => alert('Simulate viewing all assigned tasks list')} />
                             <Button title="Assign Task (Mock)" onPress={() => onAssignTask('tasklib-1', ['student-1'])} /> {/* Example mock call */}
                         </View>

                          <Text style={adminStyles.sectionSubTitle}>Task Library ({taskLibrary.length})</Text>
                           <View style={{alignItems: 'flex-start', marginBottom: 10}}>
                               <Button title="Create New Task Library Item (Mock)" onPress={() => onCreateTaskLibraryItem({})} /> {/* Mock call */}
                           </View>
                           <FlatList
                                data={taskLibrary.sort((a, b) => a.title.localeCompare(b.title))}
                                keyExtractor={(item) => item.id}
                                renderItem={({item}) => <AdminTaskLibraryItem item={item} onEditDelete={handleEditDeleteTaskLibraryItem} />}
                                scrollEnabled={false}
                                ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                                ListEmptyComponent={() => <Text style={adminStyles.emptyListText}>No task library items found.</Text>}
                            />
                    </View>
                 )}

                 {viewingSection === 'rewards' && (
                    <View>
                        <Text style={adminStyles.sectionTitle}>Rewards Catalog</Text>
                         <View style={{alignItems: 'flex-start', marginBottom: 10}}>
                             <Button title="Add New Reward (Mock)" onPress={() => onCreateReward({})} /> {/* Mock call */}
                         </View>
                         <FlatList
                            data={rewardsCatalog.sort((a, b) => a.cost - b.cost)}
                            keyExtractor={(item) => item.id}
                            renderItem={({item}) => <AdminRewardItem item={item} onEditDelete={handleEditDeleteRewardItem} />}
                            scrollEnabled={false}
                            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                             ListEmptyComponent={() => <Text style={adminStyles.emptyListText}>No rewards found.</Text>}
                         />
                    </View>
                 )}

                 {viewingSection === 'history' && (
                    <View>
                        <Text style={adminStyles.sectionTitle}>Full Ticket History ({allTicketHistory.length})</Text>
                         <FlatList
                            data={allTicketHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())} // Sort latest first
                            keyExtractor={(item) => item.id}
                            renderItem={({item}) => <TicketHistoryItem item={item} />} // Reuse TicketHistoryItem from PupilView
                            scrollEnabled={false}
                            ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                             ListEmptyComponent={() => <Text style={adminStyles.emptyListText}>No history entries found.</Text>}
                         />
                    </View>
                 )}

                 {viewingSection === 'announcements' && (
                     <View>
                        <Text style={adminStyles.sectionTitle}>Announcements & Challenges ({announcements.length})</Text>
                          <View style={{alignItems: 'flex-start', marginBottom: 10}}>
                             <Button title="Create New Announcement (Mock)" onPress={() => onCreateAnnouncement({})} /> {/* Mock call */}
                          </View>
                           <FlatList
                                data={announcements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())} // Sort latest first
                                keyExtractor={(item) => item.id}
                                renderItem={({item}) => <AnnouncementItemPupil item={item} />} // Reuse AnnouncementItemPupil from PupilView
                                scrollEnabled={false}
                                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                                 ListEmptyComponent={() => <Text style={adminStyles.emptyListText}>No announcements found.</Text>}
                           />
                     </View>
                 )}

                 {viewingSection === 'instruments' && (
                    <View>
                        <Text style={adminStyles.sectionTitle}>Instruments ({mockInstruments.length})</Text>
                         <View style={{alignItems: 'flex-start', marginBottom: 10}}>
                             <Button title="Add New Instrument (Mock)" onPress={() => onCreateInstrument({})} /> {/* Mock call */}
                         </View>
                          <FlatList
                                data={mockInstruments.sort((a, b) => a.name.localeCompare(b.name))}
                                keyExtractor={(item) => item.id}
                                renderItem={({item}) => <AdminInstrumentItem item={item} onEditDelete={handleEditDeleteInstrumentItem} />}
                                scrollEnabled={false}
                                ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                                 ListEmptyComponent={() => <Text style={adminStyles.emptyListText}>No instruments found.</Text>}
                           />
                    </View>
                 )}

            </ScrollView>
        </SafeAreaView>
    );
};

// You'll need styles from PupilView's style object for the reused components above
// For simplicity in this single file, I've included minimal definitions or copied basics.
// In a real app, you'd use a shared styles file or library.
// --- Base styles from PupilView/PublicView for reuse ---
const styles = StyleSheet.create({ // Define or import a common style object if reusing widely
    taskItemContainer: {}, taskItemTitle: {}, taskItemStatus: {}, taskItemPoints: {}, pendingNote: {},
    rewardItemContainer: {}, rewardItemAffordable: {}, rewardItemGoal: {}, rewardImagePlaceholder: {},
    rewardImagePlaceholderText: {}, rewardDetails: {}, rewardName: {}, rewardCost: {},
    rewardDescription: {}, rewardEligibilityAvailable: {}, rewardEligibilityNeeded: {},
    historyItemContainer: {}, historyItemTimestamp: {}, historyItemDetails: {},
    historyItemAmount: {}, historyItemAmountPositive: {}, historyItemAmountNegative: {}, historyItemNotes: {},
    announcementItemContainer: {}, announcementTitle: {}, announcementMessage: {}, announcementDate: {},
});

const adminStyles = StyleSheet.create({ // Use a different style object for AdminView to avoid name clashes
    safeArea: {
        flex: 1,
        backgroundColor: '#f8f8f8',
    },
    container: {
        flex: 1,
        padding: 15,
    },
     headerContainer: {
         flexDirection: 'row',
         justifyContent: 'space-between',
         alignItems: 'center',
         paddingHorizontal: 15,
         paddingTop: 10,
         paddingBottom: 5,
         borderBottomWidth: 1,
         borderBottomColor: '#ccc',
     },
     header: {
        fontSize: 22,
        fontWeight: 'bold',
        flexShrink: 1,
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
     sectionSubTitle: {
         fontSize: 16,
         fontWeight: 'bold',
         marginTop: 15,
         marginBottom: 10,
         color: '#555',
     },
    adminNav: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 20,
         gap: 8, // Space between buttons
    },
    item: {
        backgroundColor: '#fff',
        padding: 12,
        marginBottom: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    itemTitle: {
         fontSize: 16,
         fontWeight: 'bold',
         marginBottom: 5,
    },
    itemActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 10,
    },
     imagePlaceholder: {
         width: 60,
         height: 60,
         marginVertical: 5,
         borderRadius: 4,
         backgroundColor: '#eee',
         justifyContent: 'center',
         alignItems: 'center',
         borderWidth: 1,
         borderColor: '#ccc',
    },
     emptyListText: {
        textAlign: 'center',
        color: '#777',
        marginTop: 5,
     },
    // Reused styles from PupilView/TeacherView for consistency when drilling down
     taskItem: { ...StyleSheet.flatten(styles.taskItemContainer), padding: 10, marginBottom: 8 }, // Adapt style
     taskItemTitle: { ...StyleSheet.flatten(styles.taskItemTitle), fontSize: 15 }, // Adapt style
     historyItem: { ...StyleSheet.flatten(styles.historyItemContainer), padding: 8, marginBottom: 5 }, // Adapt style
      historyItemDetails: { ...StyleSheet.flatten(styles.historyItemDetails), fontSize: 13 }, // Adapt style
     announcementItemContainer: { ...StyleSheet.flatten(styles.announcementItemContainer), padding: 10, marginBottom: 8 }, // Adapt style
     announcementTitle: { ...StyleSheet.flatten(styles.announcementTitle), fontSize: 15 }, // Adapt style
     announcementMessage: { ...StyleSheet.flatten(styles.announcementMessage), fontSize: 13 }, // Adapt style
      announcementDate: { ...StyleSheet.flatten(styles.announcementDate), fontSize: 11 }, // Adapt style
    adminStudentActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 15,
        marginBottom: 20,
    }

});

