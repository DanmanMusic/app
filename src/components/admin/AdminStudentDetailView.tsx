// src/components/admin/AdminStudentDetailView.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Button,
  // Alert, // Only needed for prompt/other simple messages if used directly
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
} from 'react-native';

console.log('[AdminStudentDetailView] File loaded/rendered');

// Import NEW User type indirectly via PupilViewProps
import { PupilViewProps, TicketHistoryItem } from '../../views/PupilView';
import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';
import { Instrument } from '../../mocks/mockInstruments';
import { User } from '../../types/userTypes'; // Import User type for clarity if needed

// Import the ConfirmationModal used for delete actions
import ConfirmationModal from '../common/ConfirmationModal';

// Import NEW helper for display names
import { getTaskTitle, getInstrumentNames, getUserDisplayName } from '../../utils/helpers';

import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';


interface AdminStudentDetailViewProps {
  studentData: PupilViewProps; // Contains the full User object with new fields
  taskLibrary: TaskLibraryItem[];
  mockInstruments: Instrument[];
  adminUserName: string; // This is already a display name from AdminView

  onManualTicketAdjust: (studentId: string, amount: number, notes: string) => void;
  onRedeemReward: (studentId: string, rewardId: string) => void;
  onAssignTask: (taskId: string, studentId: string) => void;
  // Expects the specific EditUser signature from App.tsx
  onEditUser: (userId: string, userData: Partial<Omit<User, 'id'>>) => void;
  onDeleteUser: (userId: string) => void;

  onBack: () => void;
}

export const AdminStudentDetailView: React.FC<AdminStudentDetailViewProps> = ({
  studentData,
  taskLibrary,
  mockInstruments,
  adminUserName, // This is the display name of the logged-in admin
  onManualTicketAdjust,
  onRedeemReward,
  onAssignTask,
  onEditUser,
  onDeleteUser,
  onBack,
}) => {
  // user object now has firstName, lastName, nickname?
  const { user, balance, assignedTasks, history } = studentData;

  // State for the delete confirmation modal
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);

  // Generate the display name for the student being viewed
  const studentDisplayName = getUserDisplayName(user);

  console.log(`[AdminStudentDetailView] Rendering for user: ${user?.id} (${studentDisplayName})`);
  console.log(`[AdminStudentDetailView] Prop check - onEditUser type: ${typeof onEditUser}`);
  console.log(`[AdminStudentDetailView] Prop check - onDeleteUser type: ${typeof onDeleteUser}`);


  // Handler for assigning a task
  const handleAssignTaskToStudent = () => {
     // Use the display name in the mock alert
     alert(`Mock Assign Task for ${studentDisplayName}`);
    // Could use Alert.prompt or a modal later
    // Alert.prompt(...)
  };

  // Handler for the Edit button
  const handleEditStudent = () => {
     console.log(`[AdminStudentDetailView] handleEditStudent called for user: ${user.id}`);
     // Call the prop passed from App.tsx via AdminView
     // Pass the relevant fields according to the expected signature
     onEditUser(user.id, {
        firstName: user.firstName,
        lastName: user.lastName,
        nickname: user.nickname,
        // Pass other potentially editable fields if necessary (role, instruments etc. are usually handled elsewhere)
     });
  }

  // Handler to open the delete confirmation modal
  const handleDeleteStudent = () => {
     console.log(`[AdminStudentDetailView] handleDeleteStudent called for user: ${user.id}. Opening confirm modal.`);
     setIsDeleteConfirmVisible(true); // Show the custom modal
  }

  // Handler for confirming deletion in the modal
  const confirmDelete = () => {
    console.log(`[AdminStudentDetailView] Delete confirmed in Modal. Calling onDeleteUser prop...`);
    setIsDeleteConfirmVisible(false); // Close modal
    onDeleteUser(user.id); // Call the prop passed from App.tsx via AdminView
  }

  // Handler for canceling deletion in the modal
  const cancelDelete = () => {
     console.log('[AdminStudentDetailView] Delete cancelled in Modal.');
     setIsDeleteConfirmVisible(false); // Close modal
  }


  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      {/* Header */}
      <View style={appSharedStyles.headerContainer}>
        <Button title="← Back to Admin" onPress={onBack} />
         {/* Use display name in header */}
        <Text style={appSharedStyles.header} numberOfLines={1} ellipsizeMode="tail">
          {studentDisplayName}'s Details
        </Text>
        {/* Action Buttons in Header */}
        <View style={styles.headerActions}>
           <Button title="Edit" onPress={handleEditStudent} color={colors.warning} />
           <Button title="Delete" onPress={handleDeleteStudent} color={colors.danger} />
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={appSharedStyles.container}>

         {/* Basic Student Info */}
         {/* Use display name */}
        <Text style={appSharedStyles.sectionTitle}>Viewing Student: {studentDisplayName}</Text>
        <Text style={appSharedStyles.itemDetailText}>ID: {user.id}</Text>
        <Text style={appSharedStyles.itemDetailText}>
          Instrument(s): {getInstrumentNames(user.instrumentIds, mockInstruments)}
        </Text>
        <Text style={[appSharedStyles.itemDetailText, { fontWeight: 'bold' }]}>
          Balance: {balance} Tickets
        </Text>

        {/* Action Buttons for Student */}
        <View style={adminSharedStyles.adminStudentActions}>
          <Button
            title="Adjust Tickets (Mock)"
            onPress={() =>
               // Prop call uses simple alert in App.tsx
               onManualTicketAdjust(user.id, 100, `Admin adjustment by ${adminUserName}`)
            }
          />
          <Button
            title="Redeem Reward (Mock)"
            onPress={() =>
               // Prop call uses simple alert in App.tsx
               onRedeemReward(user.id, 'reward-6')
            }
          />
          <Button title="Assign Task (Mock)" onPress={handleAssignTaskToStudent} />
        </View>

        {/* Assigned Tasks List */}
        <Text style={appSharedStyles.sectionTitle}>Assigned Tasks ({assignedTasks.length})</Text>
        {/* Task list rendering doesn't directly show student name, no changes needed here */}
        {assignedTasks.length > 0 ? (
           <FlatList
             data={assignedTasks.sort(
               (a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime()
             )}
             keyExtractor={item => item.id}
             renderItem={({ item }) => (
               <View style={adminSharedStyles.taskItem}>
                 <Text style={adminSharedStyles.taskItemTitle}>
                   {getTaskTitle(item.taskId, taskLibrary)}
                 </Text>
                 <Text style={adminSharedStyles.taskItemStatus}>
                   Status:{' '}
                   {item.isComplete
                     ? item.verificationStatus === 'pending'
                       ? 'Complete (Pending Verification)'
                       : `Verified (${item.verificationStatus})`
                     : 'Assigned'}
                 </Text>
                 {item.completedDate && (
                   <Text style={appSharedStyles.itemDetailText}>
                     Completed: {new Date(item.completedDate).toLocaleDateString()}
                   </Text>
                 )}
                 {item.verifiedDate && item.verificationStatus !== 'pending' && (
                   <Text style={appSharedStyles.itemDetailText}>
                     Verified: {new Date(item.verifiedDate).toLocaleDateString()}
                   </Text>
                 )}
                 {item.actualPointsAwarded !== undefined &&
                   item.verificationStatus !== 'pending' && (
                     <Text style={adminSharedStyles.taskItemTickets}>
                       Awarded: {item.actualPointsAwarded ?? 0} Tickets
                     </Text>
                   )}
                 {item.isComplete && item.verificationStatus === 'pending' && (
                   <Text style={adminSharedStyles.pendingNote}>Awaiting verification...</Text>
                 )}

                 <View style={adminSharedStyles.assignedTaskActions}>
                   {item.isComplete && item.verificationStatus === 'pending' && (
                     <Button
                       title="Verify (Mock)"
                       onPress={() =>
                         // Prop call uses simple alert in App.tsx
                         alert(`Mock Verify Task ${item.id}`)
                         // onInitiateVerificationModal(item) // Or eventually call the modal prop
                       }
                     />
                   )}
                   <Button
                     title="Delete Task (Mock)"
                     onPress={() =>
                        // Prop call uses simple alert in App.tsx
                        alert(`Mock Delete Assigned Task ${item.id}`)
                     }
                     color={colors.danger}
                   />
                 </View>
               </View>
             )}
             scrollEnabled={false}
             ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
             ListEmptyComponent={() => (
               <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text>
             )}
           />
         ) : (
           <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text>
         )}

         {/* History List */}
         <Text style={appSharedStyles.sectionTitle}>History ({history.length})</Text>
         {/* History list rendering doesn't show student name, no changes needed */}
         <FlatList
           data={history.slice(0, 5)}
           keyExtractor={item => item.id}
           renderItem={({ item }) => <TicketHistoryItem item={item} />}
           scrollEnabled={false}
           ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
           ListEmptyComponent={() => (
             <Text style={appSharedStyles.emptyListText}>No history yet.</Text>
           )}
         />
         {history.length > 5 && (
           <View style={{ alignItems: 'flex-start', marginTop: 10 }}>
             <Button
               title="View Full History (Mock)"
               onPress={() => alert('Navigate to full history screen')} // Simple alert ok
             />
           </View>
         )}

      </ScrollView>

       {/* Render the Confirmation Modal for Deletion */}
       <ConfirmationModal
         visible={isDeleteConfirmVisible}
         title="Confirm Deletion"
         // Use the display name in the message
         message={`Are you sure you want to delete student ${studentDisplayName} (${user?.id || ''})? This action cannot be undone.`}
         confirmText="Delete User"
         onConfirm={confirmDelete}
         onCancel={cancelDelete}
       />

    </SafeAreaView>
  );
};

// Styles for header actions
const styles = StyleSheet.create({
   headerActions: {
      flexDirection: 'row',
      gap: 10,
   },
});