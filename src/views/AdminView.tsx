// src/views/AdminView.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Button,
  // Alert, // Only needed for prompt/confirm if used directly
  FlatList,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import NEW user type
import { User, UserRole } from '../types/userTypes';

import { AssignedTask, TaskVerificationStatus } from '../mocks/mockAssignedTasks';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { RewardItem } from '../mocks/mockRewards';
import { TicketTransaction } from '../mocks/mockTickets';
import { Announcement } from '../mocks/mockAnnouncements';
import { Instrument } from '../mocks/mockInstruments';

// Import NEW helper
import { getTaskTitle, getInstrumentNames, getUserDisplayName } from '../utils/helpers';

// PupilViewProps uses the new User type indirectly
import { PupilViewProps } from './PupilView';

import { AdminDashboardSection } from '../components/admin/AdminDashboardSection';
import { AdminUsersSection } from '../components/admin/AdminUsersSection';
import { AdminTasksSection } from '../components/admin/AdminTasksSection';
import { AdminRewardsSection } from '../components/admin/AdminRewardsSection';
import { AdminHistorySection } from '../components/admin/AdminHistorySection';
import { AdminAnnouncementsSection } from '../components/admin/AdminAnnouncementsSection';
import { AdminInstrumentsSection } from '../components/admin/AdminInstrumentsSection';
import { AdminStudentDetailView } from '../components/admin/AdminStudentDetailView';
// CreateUserModal not directly needed here, handled in AdminUsersSection
import EditUserModal from '../components/admin/EditUserModal';
// ConfirmationModal is now rendered inside AdminStudentDetailView

import TaskVerificationModal from '../components/TaskVerificationModal';

import { adminSharedStyles } from '../components/admin/adminSharedStyles';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';


// Updated simplified types to reflect new User structure implicitly
// The 'name' field will hold the formatted display name generated in App.tsx
export interface SimplifiedStudent {
  id: string;
  name: string; // Display name
  instrumentIds?: string[];
  balance: number;
}

export interface SimplifiedUser {
  id: string;
  name: string; // Display name
  role: UserRole;
}

type AdminSection =
  | 'dashboard'
  | 'dashboard-pending-verification'
  | 'users'
  | 'tasks'
  | 'rewards'
  | 'history'
  | 'announcements'
  | 'instruments';

interface AdminViewProps {
  user: User; // Use new User type
  allUsers: User[]; // Use new User type
  allPupils: SimplifiedStudent[]; // Name is display name
  allTeachers: SimplifiedUser[]; // Name is display name
  allParents: SimplifiedUser[]; // Name is display name
  allAssignedTasks: AssignedTask[];
  taskLibrary: TaskLibraryItem[];
  rewardsCatalog: RewardItem[];
  allTicketHistory: TicketTransaction[];
  announcements: Announcement[];
  mockInstruments: Instrument[];

  onManualTicketAdjust: (studentId: string, amount: number, notes: string) => void;
  onRedeemReward: (studentId: string, rewardId: string) => void;
  onVerifyTask: (taskId: string, status: TaskVerificationStatus, points: number) => void;
  onAssignTask: (taskId: string, studentId: string) => void;
  onReassignTaskMock: (originalTaskId: string, studentId: string) => void;

  // Use specific signature for CreateUser
  onCreateUser: (userData: Omit<User, 'id'>) => void;
  // Use specific signature for EditUser
  onEditUser: (userId: string, userData: Partial<Omit<User, 'id'>>) => void;
  onDeleteUser: (userId: string) => void;
  // Keep others generic for now
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
  getStudentData: (studentId: string) => PupilViewProps | undefined; // PupilViewProps uses new User type
}

// Styles for pending list items
const adminPendingListStyles = StyleSheet.create({
  pendingItem: {
    backgroundColor: colors.backgroundPrimary,
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderWarning,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: colors.textPrimary,
  },
  pendingDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 3,
  },
});


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
  onReassignTaskMock,
  onCreateUser,
  onEditUser,
  onDeleteUser,
  onCreateTaskLibraryItem,
  onEditTaskLibraryItem,
  onDeleteTaskLibraryItem,
  onCreateReward,
  onEditReward,
  onDeleteReward,
  onCreateAnnouncement,
  onEditAnnouncement,
  onDeleteAnnouncement,
  onCreateInstrument,
  onEditInstrument,
  onDeleteInstrument,
  getStudentData,
}) => {
  const [viewingSection, setViewingSection] = React.useState<AdminSection>('dashboard');
  const [viewingStudentId, setViewingStudentId] = React.useState<string | null>(null);

  const [isVerificationModalVisible, setIsVerificationModalVisible] = React.useState(false);
  const [taskToVerify, setTaskToVerify] = React.useState<AssignedTask | null>(null);

  // State moved from AdminUsersSection
  const [isCreateUserModalVisible, setIsCreateUserModalVisible] = useState(false);

  const [isEditUserModalVisible, setIsEditUserModalVisible] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null); // Use new User type


  const viewingStudentData = React.useMemo(() => {
    // getStudentData returns PupilViewProps which contains the full User object
    return viewingStudentId ? getStudentData(viewingStudentId) : null;
  }, [viewingStudentId, getStudentData]);

  const pendingVerifications = allAssignedTasks.filter(
    task => task.isComplete && task.verificationStatus === 'pending'
  );

  // Function to handle viewing/managing a user
  const handleViewManageUser = (userId: string, role: UserRole) => { // Role is required
    if (role === 'pupil') {
      // Navigate to the detailed student view
      setViewingStudentId(userId);
      setViewingSection('users'); // Conceptually stay in users section
    } else {
       // Find the full user object from the state passed by App.tsx
       const selectedUser = allUsers.find(u => u.id === userId);
       if (selectedUser) {
         // Set the user to be edited and show the edit modal
         setUserToEdit(selectedUser);
         setIsEditUserModalVisible(true);
       } else {
         // Handle error if user not found (shouldn't happen with mock data)
         alert('Error - Could not find user details.');
       }
    }
  };


  const handleBackFromStudentDetail = () => {
    setViewingStudentId(null);
    setViewingSection('users'); // Return to the main users list
  };

   const handleInitiateVerificationModal = (task: AssignedTask) => {
    setTaskToVerify(task);
    setIsVerificationModalVisible(true);
  };

  const handleCloseVerificationModal = () => {
    setIsVerificationModalVisible(false);
    setTaskToVerify(null);
  };

  // Function to close the Edit User modal
  const handleCloseEditUserModal = () => {
    setIsEditUserModalVisible(false);
    setUserToEdit(null);
  };

  // Wrapper for Create User prop call
  const handleCreateUser = (newUserData: Omit<User, 'id'>) => {
      onCreateUser(newUserData); // Call prop passed from App.tsx (which handles state)
      setIsCreateUserModalVisible(false); // Close modal after creation attempt
  };

   // Wrapper for Edit User prop call
   const handleEditUserSubmit = (userId: string, updatedData: Partial<Omit<User, 'id'>>) => {
      onEditUser(userId, updatedData); // Call prop passed from App.tsx (which handles state)
      handleCloseEditUserModal(); // Close modal after edit attempt
   };

   // Wrapper for Delete User prop call (called from Edit Modal)
   const handleDeleteUserSubmit = (userId: string) => {
      onDeleteUser(userId); // Call prop passed from App.tsx (which handles state)
      handleCloseEditUserModal(); // Close modal after delete attempt
   };


  // If viewing a specific student, render the detail view
  if (viewingStudentId && viewingStudentData) {
    return (
      <AdminStudentDetailView
        studentData={viewingStudentData} // Contains full User object
        taskLibrary={taskLibrary}
        mockInstruments={mockInstruments}
        adminUserName={getUserDisplayName(user)} // Use helper for logged-in admin's name
        onManualTicketAdjust={onManualTicketAdjust}
        onRedeemReward={onRedeemReward}
        onAssignTask={onAssignTask}
        onEditUser={onEditUser} // Pass down original prop from App
        onDeleteUser={onDeleteUser} // Pass down original prop from App
        onBack={handleBackFromStudentDetail}
      />
    );
  }

  // Otherwise, render the main Admin dashboard/section view
  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
       {/* Header */}
       <View style={appSharedStyles.headerContainer}>
         {/* Conditional Back Button */}
         {viewingSection !== 'dashboard' && viewingSection !== 'dashboard-pending-verification' && (
            <Button title="← Back" onPress={() => setViewingSection('dashboard')} />
         )}
         {viewingSection === 'dashboard-pending-verification' && (
             <Button title="← Back to Dashboard" onPress={() => setViewingSection('dashboard')} />
         )}
         {/* Use helper for display name */}
        <Text style={appSharedStyles.header}>Admin: {getUserDisplayName(user)}</Text>
        {/* Spacer for alignment */}
        <View style={{ width: viewingSection !== 'dashboard' && viewingSection !== 'dashboard-pending-verification' ? 50 : 0 }} />
      </View>

      {/* Main Scrollable Content */}
      <ScrollView style={appSharedStyles.container}>
         {/* Navigation Buttons (conditionally rendered) */}
         {viewingSection !== 'dashboard-pending-verification' && (
           <View style={adminSharedStyles.adminNav}>
             <Button
               title="Dashboard"
               onPress={() => setViewingSection('dashboard')}
               color={viewingSection === 'dashboard' ? colors.primary : colors.secondary}
             />
             <Button
               title="Users"
               onPress={() => setViewingSection('users')}
               color={viewingSection === 'users' ? colors.primary : colors.secondary}
             />
             <Button
               title="Tasks"
               onPress={() => setViewingSection('tasks')}
               color={viewingSection === 'tasks' ? colors.primary : colors.secondary}
             />
             <Button
               title="Rewards"
               onPress={() => setViewingSection('rewards')}
               color={viewingSection === 'rewards' ? colors.primary : colors.secondary}
             />
             <Button
               title="History"
               onPress={() => setViewingSection('history')}
               color={viewingSection === 'history' ? colors.primary : colors.secondary}
             />
             <Button
               title="Announcements"
               onPress={() => setViewingSection('announcements')}
               color={viewingSection === 'announcements' ? colors.primary : colors.secondary}
             />
             <Button
               title="Instruments"
               onPress={() => setViewingSection('instruments')}
               color={viewingSection === 'instruments' ? colors.primary : colors.secondary}
             />
           </View>
         )}


        {/* Render the selected section */}
        {viewingSection === 'dashboard' && (
          <AdminDashboardSection
            allPupils={allPupils} // Simplified list with display names
            allTeachers={allTeachers} // Simplified list with display names
            allParents={allParents} // Simplified list with display names
            allAssignedTasks={allAssignedTasks}
            onViewPendingVerifications={() => setViewingSection('dashboard-pending-verification')}
          />
        )}

        {viewingSection === 'dashboard-pending-verification' && (
             <View>
               <Text style={appSharedStyles.sectionTitle}>Pending Verifications ({pendingVerifications.length})</Text>
               {pendingVerifications.length > 0 ? (
                 <FlatList
                   data={pendingVerifications.sort(
                     (a, b) =>
                       new Date(a.completedDate || a.assignedDate).getTime() -
                       new Date(b.completedDate || b.assignedDate).getTime()
                   )}
                   keyExtractor={item => item.id}
                   renderItem={({ item }) => {
                     // Find student from allUsers (full user object) to get name parts
                     const student = allUsers.find(s => s.id === item.studentId && s.role === 'pupil');
                     const taskDetail = taskLibrary.find(t => t.id === item.taskId);
                     const baseTickets = taskDetail?.baseTickets ?? 0;
                     const completedDateTime = item.completedDate
                        ? new Date(item.completedDate).toLocaleString()
                        : 'N/A';

                     return (
                       <View style={adminPendingListStyles.pendingItem}>
                         <Text style={adminPendingListStyles.pendingTitle}>
                           Task: {getTaskTitle(item.taskId, taskLibrary)}
                         </Text>
                         <Text style={adminPendingListStyles.pendingDetail}>
                           {/* Use helper for display name */}
                           Student: {student ? getUserDisplayName(student) : 'Unknown Student'}
                         </Text>
                         <Text style={adminPendingListStyles.pendingDetail}>
                           Potential Tickets: {baseTickets}
                         </Text>
                         <Text style={adminPendingListStyles.pendingDetail}>
                           Completed: {completedDateTime}
                         </Text>
                         <View style={{ marginTop: 10 }}>
                           <Button title="Verify Task" onPress={() => handleInitiateVerificationModal(item)} />
                         </View>
                       </View>
                     );
                   }}
                   scrollEnabled={false}
                   ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                   ListEmptyComponent={() => (
                     <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text>
                   )}
                 />
               ) : (
                 <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text>
               )}
             </View>
        )}


        {viewingSection === 'users' && (
          <AdminUsersSection
            allPupils={allPupils} // Simplified list
            allTeachers={allTeachers} // Simplified list
            allParents={allParents} // Simplified list
            mockInstruments={mockInstruments}
            onCreateUser={handleCreateUser} // Pass wrapper
            onViewManageUser={handleViewManageUser}
            onAssignTask={onAssignTask}
            taskLibrary={taskLibrary}
            isCreateUserModalVisible={isCreateUserModalVisible}
            setIsCreateUserModalVisible={setIsCreateUserModalVisible}
            allUsers={allUsers} // Pass full user list needed for Create Modal lookups
          />
        )}

        {viewingSection === 'tasks' && (
          <AdminTasksSection
            taskLibrary={taskLibrary}
            allPupils={allPupils} // Simplified list for student selection prompt
            onCreateTaskLibraryItem={onCreateTaskLibraryItem}
            onEditTaskLibraryItem={onEditTaskLibraryItem}
            onDeleteTaskLibraryItem={onDeleteTaskLibraryItem}
            onAssignTask={onAssignTask}
          />
        )}

        {viewingSection === 'rewards' && (
          <AdminRewardsSection
            rewardsCatalog={rewardsCatalog}
            onCreateReward={onCreateReward}
            onEditReward={onEditReward}
            onDeleteReward={onDeleteReward}
          />
        )}

        {viewingSection === 'history' && (
          <AdminHistorySection allTicketHistory={allTicketHistory} />
        )}

        {viewingSection === 'announcements' && (
          <AdminAnnouncementsSection
            announcements={announcements}
            onCreateAnnouncement={onCreateAnnouncement}
            onEditAnnouncement={onEditAnnouncement}
            onDeleteAnnouncement={onDeleteAnnouncement}
          />
        )}

        {viewingSection === 'instruments' && (
          <AdminInstrumentsSection
            mockInstruments={mockInstruments}
            onCreateInstrument={onCreateInstrument}
            onEditInstrument={onEditInstrument}
            onDeleteInstrument={onDeleteInstrument}
          />
        )}
      </ScrollView>

       {/* Modals Rendered at AdminView Level */}

       {/* Verification Modal */}
       <TaskVerificationModal
           visible={isVerificationModalVisible}
           task={taskToVerify}
           taskLibrary={taskLibrary}
           allUsers={allUsers} // Pass full user list from state
           onClose={handleCloseVerificationModal}
           onVerifyTask={onVerifyTask}
           onReassignTaskMock={onReassignTaskMock}
         />

         {/* Create User Modal is rendered inside AdminUsersSection, controlled by state here */}
         {/* (Ensure AdminUsersSection receives isCreateUserModalVisible and setIsCreateUserModalVisible) */}

         {/* Edit User Modal */}
         <EditUserModal
            visible={isEditUserModalVisible}
            userToEdit={userToEdit} // Pass the full user object
            onClose={handleCloseEditUserModal}
            onEditUser={handleEditUserSubmit} // Pass wrapper
            onDeleteUser={handleDeleteUserSubmit} // Pass wrapper
            // Pass full pupil list needed for modal display/logic
            allPupils={allUsers.filter(u => u.role === 'pupil')}
            // mockInstruments={mockInstruments} // Not needed in EditUserModal currently
         />

         {/* ConfirmationModal is rendered inside AdminStudentDetailView */}

    </SafeAreaView>
  );
};