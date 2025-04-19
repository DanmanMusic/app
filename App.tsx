import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import mock data and types
import { mockUsers, UserRole, User } from './src/mocks/mockUsers';
import { mockTicketBalances as initialMockTicketBalances, mockTicketHistory as initialMockTicketHistory, TicketTransaction, TransactionType } from './src/mocks/mockTickets';
import { mockAllAssignedTasks as initialMockAllAssignedTasks, AssignedTask, TaskVerificationStatus } from './src/mocks/mockAssignedTasks';
import { mockRewardsCatalog, RewardItem } from './src/mocks/mockRewards';
import { mockAnnouncements, Announcement } from './src/mocks/mockAnnouncements';
import { mockTaskLibrary, TaskLibraryItem } from './src/mocks/mockTaskLibrary';
import { mockInstruments, Instrument } from './src/mocks/mockInstruments';

// Import helpers
import { getTaskTitle, getInstrumentNames } from './src/utils/helpers'; // IMPORT HELPERS

// Import your planned main views
import { PublicView } from './src/views/PublicView';
import { PupilView, PupilViewProps } from './src/views/PupilView';
import { TeacherView } from './src/views/TeacherView';
import { ParentView } from './src/views/ParentView';
import { AdminView } from './src/views/AdminView';

// Define the possible simulation states
type MockAuthState = {
  role: UserRole | 'public';
  userId?: string;
  viewingStudentId?: string;
}

// --- Temporary Development View Selector Component ---
const DevelopmentViewSelector = ({ onSelectView }: { onSelectView: (state: MockAuthState) => void }) => {
  return (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorTitle}>Development Mode: Select User Role</Text>

       <Button
          title="View as Public (Not Logged In)"
          onPress={() => onSelectView({ role: 'public' })}
          color="#ccc"
        />

      {Object.values(mockUsers).map(user => (
          <Button
              key={user.id}
              title={`Login as ${user.name} (${user.role})`}
              onPress={() => {
                  let viewingStudentId: string | undefined;
                  if (user.role === 'pupil') {
                      viewingStudentId = user.id;
                  } else if (user.role === 'parent' && user.linkedStudentIds && user.linkedStudentIds.length > 0) {
                      viewingStudentId = user.linkedStudentIds[0];
                  } else if (user.role === 'teacher' && user.linkedStudentIds && user.linkedStudentIds.length > 0) {
                       viewingStudentId = user.linkedStudentIds[0];
                  }

                  onSelectView({ role: user.role, userId: user.id, viewingStudentId });
              }}
              color={user.role === 'admin' ? 'red' : user.role === 'teacher' ? 'blue' : user.role === 'parent' ? 'green' : 'purple'}
          />
      ))}
    </View>
  );
};

// --- Main App Component ---
export default function App() {
  // State to hold the simulated auth state in DEV mode
  const [mockAuthState, setMockAuthState] = useState<MockAuthState | null>(null);

  // State to hold mutable copies of mock data that can change
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([]);
  const [ticketBalances, setTicketBalances] = useState<Record<string, number>>({});
  const [ticketHistory, setTicketHistory] = useState<TicketTransaction[]>([]);
   // Add state for other mutable data like announcements, rewards catalog if Admin can change them on mobile mock


  // Initialize state with mock data on first render
  useEffect(() => {
    setAssignedTasks(initialMockAllAssignedTasks);
    setTicketBalances(initialMockTicketBalances);
    setTicketHistory(initialMockTicketHistory);
  }, []);


  const isAuthenticated = !!mockAuthState;
  const currentUserRole: UserRole | 'public' = mockAuthState?.role || 'public';
  const currentUserId: string | undefined = mockAuthState?.userId;
  const currentViewingStudentId: string | undefined = mockAuthState?.viewingStudentId;


   // --- Mock Action Functions (Simulating Backend Updates) ---

   const simulateMarkTaskComplete = (taskId: string) => {
       setAssignedTasks(prevTasks =>
           prevTasks.map(task =>
               task.id === taskId && !task.isComplete
                   ? { ...task, isComplete: true, completedDate: new Date().toISOString(), verificationStatus: 'pending' }
                   : task
           )
       );
       Alert.alert("Task Marked Complete", "Waiting for teacher verification!");
   };

   const simulateVerifyTask = (taskId: string, status: TaskVerificationStatus, actualPoints: number) => {
        setAssignedTasks(prevTasks =>
            prevTasks.map(task =>
                task.id === taskId && task.isComplete && task.verificationStatus === 'pending'
                    ? {
                          ...task,
                          verificationStatus: status,
                          verifiedDate: new Date().toISOString(),
                          actualPointsAwarded: actualPoints,
                      }
                    : task
            )
        );

        if (status === 'verified' || status === 'partial') {
            const task = assignedTasks.find(t => t.id === taskId);
             if (task) {
                 const studentId = task.studentId;
                 const points = actualPoints;

                 setTicketBalances(prevBalances => ({
                      ...prevBalances,
                      [studentId]: (prevBalances[studentId] || 0) + points,
                 }));

                 setTicketHistory(prevHistory => [
                     ...prevHistory,
                      {
                          id: `tx-${Date.now()}-${Math.random()}`,
                          studentId: studentId,
                          timestamp: new Date().toISOString(),
                          amount: points,
                          type: 'task_award',
                          sourceId: taskId,
                          // Use imported helper
                          notes: `Task: ${getTaskTitle(task.taskId, mockTaskLibrary)} (${status})`,
                      }
                 ]);
             }
        }

        Alert.alert("Task Verified", `Status: ${status}, Awarded: ${actualPoints} tickets`);

        // NOTE: The "Re-assign" logic is not included here, just the verification part.
   };

    const simulateManualTicketAdjustment = (studentId: string, amount: number, notes: string) => {
        setTicketBalances(prevBalances => ({
             ...prevBalances,
             [studentId]: (prevBalances[studentId] || 0) + amount,
        }));
         setTicketHistory(prevHistory => [
              ...prevHistory,
              {
                  id: `tx-${Date.now()}-${Math.random()}`,
                  studentId: studentId,
                  timestamp: new Date().toISOString(),
                  amount: amount,
                  type: amount > 0 ? 'manual_add' : 'manual_subtract',
                  sourceId: `manual-${Date.now()}`,
                  notes: notes,
              }
         ]);
         Alert.alert("Balance Adjusted", `Adjusted ${amount} tickets for student ${studentId}.`);
    };

     const simulateRedeemReward = (studentId: string, rewardId: string) => {
         const reward = mockRewardsCatalog.find(r => r.id === rewardId);
         if (!reward) {
             Alert.alert("Error", "Reward not found.");
             return;
         }
         const cost = reward.cost;
         const currentBalance = ticketBalances[studentId] || 0;

         if (currentBalance < cost) {
              Alert.alert("Cannot Redeem", `Student ${studentId} needs ${cost - currentBalance} more tickets for ${reward.name}.`);
             return;
         }

         simulateManualTicketAdjustment(studentId, -cost, `Redeemed: ${reward.name}`);
         // TODO: Simulate triggering a public announcement here
         Alert.alert("Reward Redeemed", `${reward.name} redeemed for ${studentId}! ${cost} tickets deducted.`);
     };


   // Helper to get data for a specific student ID for mock views, using STATE DATA
  const getMockStudentData = (studentId: string): PupilViewProps | undefined => {
      const studentUser = mockUsers[studentId];
      if (!studentUser || studentUser.role !== 'pupil') return undefined;

      return {
          user: studentUser,
          balance: ticketBalances[studentId] || 0, // Use STATE balance
          assignedTasks: assignedTasks.filter(task => task.studentId === studentId), // Use STATE assignedTasks
          history: ticketHistory.filter(tx => tx.studentId === studentId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), // Use STATE history, sort by date
          rewardsCatalog: mockRewardsCatalog, // Static
          announcements: mockAnnouncements, // Static
          taskLibrary: mockTaskLibrary, // Static
          mockInstruments: mockInstruments, // Pass instruments list
          // Pass down mock action functions relevant to PupilView
          onMarkTaskComplete: simulateMarkTaskComplete,
          // Other Pupil-specific actions like onSetGoal will be added later
      };
  };


  // Select which main view to render based on role
  const renderMainView = () => {
    switch (currentUserRole) {
      case 'public':
        return <PublicView rewardsCatalog={mockRewardsCatalog} announcements={mockAnnouncements} />;

      case 'pupil':
        if (!currentUserId) return <Text>Error: Pupil ID not set in mock state.</Text>;
        const pupilData = getMockStudentData(currentUserId);
        if (!pupilData) return <Text>Error: Mock data not found for pupil ID: {currentUserId}</Text>;
        return <PupilView {...pupilData} />;

      case 'teacher':
         if (!currentUserId) return <Text>Error: Teacher ID not set in mock state.</Text>;
         const teacherUser = mockUsers[currentUserId];

         const allPupilUsers = Object.values(mockUsers).filter(u => u.role === 'pupil');

         const teacherMockData = {
             user: teacherUser,
             // Pass simplified student data for lists, using STATE balance and instrumentIds
             allStudents: allPupilUsers.map(student => ({
                id: student.id,
                name: student.name,
                instrumentIds: student.instrumentIds,
                balance: ticketBalances[student.id] || 0,
             })),
             // Pass simplified linked student data for lists, using STATE balance and instrumentIds
             studentsLinkedToTeacher: allPupilUsers.filter(u => teacherUser.linkedStudentIds?.includes(u.id))
                .map(student => ({
                    id: student.id,
                    name: student.name,
                    instrumentIds: student.instrumentIds,
                    balance: ticketBalances[student.id] || 0,
                })),
             // Use STATE assignedTasks for pending verifications
             pendingVerifications: assignedTasks.filter(task => task.isComplete && task.verificationStatus === 'pending'),
             taskLibrary: mockTaskLibrary, // Static
             allAssignedTasks: assignedTasks, // Use STATE assignedTasks
             rewardsCatalog: mockRewardsCatalog, // Static
              mockInstruments: mockInstruments, // Pass instruments list
             // Pass down mock action functions relevant to TeacherView
             onVerifyTask: simulateVerifyTask,
             onAssignTask: (taskId: string, studentId: string) => Alert.alert("Assign Task Mock", `Simulate assigning ${taskId} to ${studentId}`), // Placeholder
             // Pass helper to get full student mock data using STATE data
             getStudentData: getMockStudentData,
         };
        return <TeacherView {...teacherMockData} />;

      case 'parent':
        if (!currentUserId) return <Text>Error: Parent ID not set in mock state.</Text>;
        const parentUser = mockUsers[currentUserId];
        const linkedStudents = Object.values(mockUsers).filter(u => parentUser.linkedStudentIds?.includes(u.id) && u.role === 'pupil');

         const parentMockData = {
             user: parentUser,
             // Pass simplified linked student data for lists, using STATE balance and instrumentIds
             linkedStudents: linkedStudents.map(student => ({
                id: student.id,
                name: student.name,
                instrumentIds: student.instrumentIds,
                balance: ticketBalances[student.id] || 0,
             })),
             currentViewingStudentId: currentViewingStudentId,
             // Pass data for the currently selected student, similar to PupilView, using STATE data
             currentViewingStudentData: currentViewingStudentId ? getMockStudentData(currentViewingStudentId) : undefined,
             // Pass the function to update the currently viewed student ID in App's state
             setViewingStudentId: (studentId: string) => setMockAuthState(prev => prev ? { ...prev, viewingStudentId: studentId } : null),
             // Pass down mock action functions relevant to ParentView (same as Pupil)
             onMarkTaskComplete: simulateMarkTaskComplete,
             mockInstruments: mockInstruments, // Pass instruments list
         };
        return <ParentView {...parentMockData} />;

       case 'admin':
         if (!currentUserId) return <Text>Error: Admin ID not set in mock state.</Text>;
         const adminUser = mockUsers[currentUserId];
         const allPupilUsersAdmin = Object.values(mockUsers).filter(u => u.role === 'pupil');
         const allTeachers = Object.values(mockUsers).filter(u => u.role === 'teacher');
         const allParents = Object.values(mockUsers).filter(u => u.role === 'parent');

          const adminMockData = {
             user: adminUser,
             allUsers: Object.values(mockUsers),
              // Pass simplified pupil data for lists, using STATE balance and instrumentIds
             allPupils: allPupilUsersAdmin.map(student => ({
                 id: student.id,
                 name: student.name,
                 instrumentIds: student.instrumentIds,
                 balance: ticketBalances[student.id] || 0,
             })),
             allTeachers: allTeachers, // Full user objects for now
             allParents: allParents, // Full user objects for now
             allAssignedTasks: assignedTasks, // Use STATE assignedTasks
             taskLibrary: mockTaskLibrary, // Static
             rewardsCatalog: mockRewardsCatalog, // Static
             allTicketHistory: ticketHistory, // Use STATE history
             announcements: mockAnnouncements, // Static
             mockInstruments: mockInstruments, // Pass instruments list

             // Pass down mock action functions relevant to AdminView
             onManualTicketAdjust: simulateManualTicketAdjustment,
             onRedeemReward: simulateRedeemReward,
             onVerifyTask: simulateVerifyTask,
             onAssignTask: (taskId: string, studentId: string) => Alert.alert("Assign Task Mock", `Simulate assigning ${taskId} to ${studentId}`), // Placeholder
             // Mock functions for CRUD (User, Task Library, Rewards, Announcements, Instruments) - placeholder alerts
             onCreateUser: (userData: any) => Alert.alert("Mock Create User", JSON.stringify(userData)),
             onEditUser: (userId: string, userData: any) => Alert.alert("Mock Edit User", `${userId}: ${JSON.stringify(userData)}`),
             onDeleteUser: (userId: string) => Alert.alert("Mock Delete User", userId),
             onCreateTaskLibraryItem: (taskData: any) => Alert.alert("Mock Create Task Lib", JSON.stringify(taskData)),
             onEditTaskLibraryItem: (taskId: string, taskData: any) => Alert.alert("Mock Edit Task Lib", `${taskId}: ${JSON.stringify(taskData)}`),
             onDeleteTaskLibraryItem: (taskId: string) => Alert.alert("Mock Delete Task Lib", taskId),
             onCreateReward: (rewardData: any) => Alert.alert("Mock Create Reward", JSON.stringify(rewardData)),
             onEditReward: (rewardId: string, rewardData: any) => Alert.alert("Mock Edit Reward", `${rewardId}: ${JSON.stringify(rewardData)}`),
             onDeleteReward: (rewardId: string) => Alert.alert("Mock Delete Reward", rewardId),
             onCreateAnnouncement: (announcementData: any) => Alert.alert("Mock Create Announcement", JSON.stringify(announcementData)),
             onEditAnnouncement: (announcementId: string, announcementData: any) => Alert.alert("Mock Edit Announcement", `${announcementId}: ${JSON.stringify(announcementData)}`),
             onDeleteAnnouncement: (announcementId: string) => Alert.alert("Mock Delete Announcement", announcementId),
             onCreateInstrument: (instrumentData: any) => Alert.alert("Mock Create Instrument", JSON.stringify(instrumentData)),
             onEditInstrument: (instrumentId: string, instrumentData: any) => Alert.alert("Mock Edit Instrument", `${instrumentId}: ${JSON.stringify(instrumentData)}`),
             onDeleteInstrument: (instrumentId: string) => Alert.alert("Mock Delete Instrument", instrumentId),
              // Pass helper to get full student mock data using STATE data
             getStudentData: getMockStudentData,
         };
        return <AdminView {...adminMockData} />;

      default:
        // Fallback
        return <Text>Loading or Authentication Required.</Text>;
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="auto" />

        {/* Render selector in DEV ONLY if no mock user is selected */}
        {__DEV__ && !mockAuthState ? (
          <DevelopmentViewSelector onSelectView={setMockAuthState} />
        ) : (
          // Render the main app views
          renderMainView()
        )}

        {/* Button to reset mock auth state back to selector in DEV ONLY */}
        {__DEV__ && mockAuthState && (
            <View style={styles.resetButtonContainer}>
                 <Button title="Reset Mock View" onPress={() => setMockAuthState(null)} />
            </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  selectorContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 10, // Space between buttons
  },
  selectorTitle: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
   resetButtonContainer: {
       position: 'absolute',
       bottom: 20,
       left: 20,
       right: 20,
   }
});