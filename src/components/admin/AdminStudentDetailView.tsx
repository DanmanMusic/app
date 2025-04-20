// src/components/admin/AdminStudentDetailView.tsx
import React, { useState, useMemo } from 'react'; // Added useMemo
import {
  View,
  Text,
  ScrollView,
  Button,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
} from 'react-native';

// --- Imports ---
import { PupilViewProps, TicketHistoryItem } from '../../views/StudentView';
import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';
import { Instrument } from '../../mocks/mockInstruments';
import { User } from '../../types/userTypes';
import ConfirmationModal from '../common/ConfirmationModal';
import EditUserModal from '../common/EditUserModal';
import { getTaskTitle, getInstrumentNames, getUserDisplayName } from '../../utils/helpers';
import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';

// --- Interfaces ---
interface AdminStudentDetailViewProps {
  studentData: PupilViewProps;
  taskLibrary: TaskLibraryItem[];
  mockInstruments: Instrument[]; // Accept instruments list
  allUsers: User[]; // Accept full user list
  adminUserName: string;
  onManualTicketAdjust: (studentId: string, amount: number, notes: string) => void;
  onRedeemReward: (studentId: string, rewardId: string) => void;
  onAssignTask: (taskId: string, studentId: string) => void;
  onEditUser: (userId: string, userData: Partial<Omit<User, 'id'>>) => void;
  onDeleteUser: (userId: string) => void;
  onBack: () => void;
}

// --- Component ---
export const AdminStudentDetailView: React.FC<AdminStudentDetailViewProps> = ({
  studentData,
  taskLibrary,
  mockInstruments, // Use prop
  allUsers, // Use prop
  adminUserName,
  onManualTicketAdjust,
  onRedeemReward,
  onAssignTask,
  onEditUser,
  onDeleteUser,
  onBack,
}) => {
  // --- State ---
  const { user, balance, assignedTasks, history } = studentData;
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const studentDisplayName = getUserDisplayName(user);

  // --- Filter Teachers ---
  const allTeachers = useMemo(() => allUsers.filter(u => u.role === 'teacher'), [allUsers]);

  // --- LOG: Render ---
  console.log(`[AdminStudentDetailView Render] Viewing user: ${user.id}, isEditModalVisible: ${isEditModalVisible}`);

  // --- Handlers ---
  const handleAssignTaskToStudent = () => { alert(`Mock Assign Task for ${studentDisplayName}`); };
  const handleEditStudent = () => { console.log('[AdminStudentDetailView] handleEditStudent called, setting modal visible'); setIsEditModalVisible(true); }
  const handleDeleteStudent = () => { setIsDeleteConfirmVisible(true); };
  const confirmDelete = () => { setIsDeleteConfirmVisible(false); onDeleteUser(user.id); };
  const cancelDelete = () => { setIsDeleteConfirmVisible(false); };
  const handleLoginAsStudent = () => { alert(`Simulating QR Code Generation for ${studentDisplayName} (${user.id})...`); };
  const handleBackClick = () => { console.log('[AdminStudentDetailView] Back button clicked'); onBack(); };
  const closeEditModal = () => { console.log('[AdminStudentDetailView] closeEditModal called'); setIsEditModalVisible(false); };

  const handleEditSubmit = (userId: string, updatedData: Partial<Omit<User, 'id'>>) => {
      console.log('[AdminStudentDetailView] handleEditSubmit called for:', userId);
      onEditUser(userId, updatedData);
      closeEditModal();
  };

  // --- Render ---
  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      {/* Header */}
      <View style={appSharedStyles.headerContainer}>
         <Button title="← Back to Admin" onPress={handleBackClick} />
         <Text style={appSharedStyles.header} numberOfLines={1} ellipsizeMode="tail"> {studentDisplayName}'s Details </Text>
         <View style={styles.headerActions}>
            <Button title="Login (QR)" onPress={handleLoginAsStudent} color={colors.info} />
            <Button title="Edit" onPress={handleEditStudent} color={colors.warning} />
            <Button title="Delete" onPress={handleDeleteStudent} color={colors.danger} />
         </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={appSharedStyles.container}>
         {/* Basic Student Info */}
         <Text style={appSharedStyles.sectionTitle}>Viewing Student: {studentDisplayName}</Text>
         <Text style={appSharedStyles.itemDetailText}>ID: {user.id}</Text>
         <Text style={appSharedStyles.itemDetailText}> Instrument(s): {getInstrumentNames(user.instrumentIds, mockInstruments)} </Text>
         {user.linkedTeacherIds && user.linkedTeacherIds.length > 0 && ( <Text style={appSharedStyles.itemDetailText}> Linked Teacher IDs: {user.linkedTeacherIds.join(', ')} </Text> )}
         <Text style={[appSharedStyles.itemDetailText, { fontWeight: 'bold' }]}> Balance: {balance} Tickets </Text>

         {/* Action Buttons for Student */}
         <View style={adminSharedStyles.adminStudentActions}>
            <Button title="Adjust Tickets (Mock)" onPress={() => onManualTicketAdjust(user.id, 100, `Admin adjustment by ${adminUserName}`)} />
            <Button title="Redeem Reward (Mock)" onPress={() => onRedeemReward(user.id, 'reward-6')} />
            <Button title="Assign Task (Mock)" onPress={handleAssignTaskToStudent} />
         </View>

         {/* Assigned Tasks List */}
         <Text style={appSharedStyles.sectionTitle}>Assigned Tasks ({assignedTasks.length})</Text>
         {assignedTasks.length > 0 ? (
            <FlatList data={assignedTasks.sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime())} keyExtractor={item => item.id} renderItem={({ item }) => ( <View style={adminSharedStyles.taskItem}> <Text style={adminSharedStyles.taskItemTitle}> {getTaskTitle(item.taskId, taskLibrary)} </Text> <Text style={adminSharedStyles.taskItemStatus}> Status:{' '} {item.isComplete ? item.verificationStatus === 'pending' ? 'Complete (Pending Verification)' : `Verified (${item.verificationStatus})` : 'Assigned'} </Text> {item.completedDate && ( <Text style={appSharedStyles.itemDetailText}> Completed: {new Date(item.completedDate).toLocaleDateString()} </Text> )} {item.verifiedDate && item.verificationStatus !== 'pending' && ( <Text style={appSharedStyles.itemDetailText}> Verified: {new Date(item.verifiedDate).toLocaleDateString()} </Text> )} {item.actualPointsAwarded !== undefined && item.verificationStatus !== 'pending' && ( <Text style={adminSharedStyles.taskItemTickets}> Awarded: {item.actualPointsAwarded ?? 0} Tickets </Text> )} {item.isComplete && item.verificationStatus === 'pending' && ( <Text style={adminSharedStyles.pendingNote}>Awaiting verification...</Text> )} <View style={adminSharedStyles.assignedTaskActions}> {item.isComplete && item.verificationStatus === 'pending' && ( <Button title="Verify (Mock)" onPress={() => alert(`Mock Verify Task ${item.id}`)} /> )} <Button title="Delete Task (Mock)" onPress={() => alert(`Mock Delete Assigned Task ${item.id}`)} color={colors.danger} /> </View> </View> )} scrollEnabled={false} ItemSeparatorComponent={() => <View style={{ height: 8 }} />} ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text> )} />
         ) : ( <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text> )}

         {/* History List */}
         <Text style={appSharedStyles.sectionTitle}>History ({history.length})</Text>
         {history.length > 0 ? (
            <FlatList data={history.slice(0, 5)} keyExtractor={(item) => item.id} renderItem={({ item }) => <TicketHistoryItem item={item} />} scrollEnabled={false} ItemSeparatorComponent={() => <View style={{ height: 5 }} />} ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>No history yet.</Text> )} />
         ) : ( <Text style={appSharedStyles.emptyListText}>No history yet.</Text> )}
         {history.length > 5 && ( <View style={{ alignItems: 'flex-start', marginTop: 10 }}> <Button title="View Full History (Mock)" onPress={() => alert('Navigate to full history screen')} /> </View> )}
      </ScrollView>

       {/* --- Modals Rendered Locally --- */}
       <ConfirmationModal visible={isDeleteConfirmVisible} title="Confirm Deletion" message={`Are you sure you want to delete student ${studentDisplayName} (${user?.id || ''})? This action cannot be undone.`} confirmText="Delete User" onConfirm={confirmDelete} onCancel={cancelDelete}/>

       <EditUserModal
            visible={isEditModalVisible}
            userToEdit={user}
            onClose={closeEditModal}
            onEditUser={handleEditSubmit}
            // *** PASS LOOKUP DATA TO MODAL ***
            mockInstruments={mockInstruments}
            allTeachers={allTeachers}
        />

    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
   headerActions: { flexDirection: 'row', gap: 10, },
});