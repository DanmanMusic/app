// src/components/admin/AdminStudentDetailView.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Button,
  FlatList,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator, // Added
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query'; // Added TQ

// Components
import { TicketHistoryItem } from '../../views/StudentView';
import DeactivateOrDeleteUserModal from '../common/DeactivateOrDeleteUserModal';
import EditUserModal from '../common/EditUserModal';
import PaginationControls from './PaginationControls';
import ManualTicketAdjustmentModal from './modals/ManualTicketAdjustmentModal';

// Hooks
import { usePaginatedStudentTasks } from '../../hooks/usePaginatedStudentTasks';
import { usePaginatedStudentHistory } from '../../hooks/usePaginatedStudentHistory';

// API & Types
import { fetchStudentBalance } from '../../api/tickets'; // Fetch balance
import { fetchInstruments } from '../../api/instruments'; // Fetch instruments
import { fetchTaskLibrary } from '../../api/taskLibrary'; // Fetch task library
import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';
import { Instrument } from '../../mocks/mockInstruments';
import { User } from '../../types/userTypes';
// Removed: StudentProfileData import
import { AssignedTask } from '../../mocks/mockAssignedTasks';

// Utils & Styles
import { getInstrumentNames, getUserDisplayName } from '../../utils/helpers';
import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';

// --- Updated Props ---
interface AdminStudentDetailViewProps {
  student: User; // Receive the full student User object
  adminUserName: string;
  // Removed: studentData, taskLibrary, mockInstruments props
  // Still need allUsers for the EditUserModal's teacher list for now
  allUsers: User[];
  // Keep simulation props for now
  onRedeemReward: (studentId: string, rewardId: string) => void;
  onAssignTask: () => void;
  onBack: () => void;
  onDeleteAssignment?: (assignmentId: string) => void;
  onInitiateVerification?: (task: AssignedTask) => void;
}

export const AdminStudentDetailView: React.FC<AdminStudentDetailViewProps> = ({
  student, // Use the passed student object
  adminUserName,
  allUsers,
  // Removed: studentData, taskLibrary, mockInstruments
  onRedeemReward,
  onAssignTask,
  onBack,
  onDeleteAssignment,
  onInitiateVerification,
}) => {
  const user = student; // Rename for clarity within component

  // --- State for Modals ---
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [isAdjustmentModalVisible, setIsAdjustmentModalVisible] = useState(false);

  // --- Fetch required data with TQ ---
  const { data: balance = 0, isLoading: balanceLoading } = useQuery({
      queryKey: ['balance', user?.id],
      queryFn: () => fetchStudentBalance(user.id),
      enabled: !!user?.id,
      staleTime: 1 * 60 * 1000,
  });
  const { data: fetchedInstruments = [], isLoading: instrumentsLoading } = useQuery<Instrument[], Error>({
    queryKey: ['instruments'], queryFn: fetchInstruments, staleTime: Infinity, gcTime: Infinity,
  });
  // Task Library might not be strictly needed here if AssignTaskModal fetches its own
  // But keep it if other parts rely on it for display maybe?
  const { data: fetchedTaskLibrary = [], isLoading: taskLibraryLoading } = useQuery<TaskLibraryItem[], Error>({
      queryKey: ['task-library'], queryFn: fetchTaskLibrary, staleTime: 5 * 60 * 1000,
  });

  // --- Pagination Hooks ---
  // These still use DataContext until they are refactored to use TQ/API
  const {
      tasks: paginatedTasks, currentPage: tasksCurrentPage, totalPages: tasksTotalPages,
      setPage: setTasksPage, totalTasksCount,
  } = usePaginatedStudentTasks(user?.id);
  const {
      history: paginatedHistory, currentPage: historyCurrentPage, totalPages: historyTotalPages,
      setPage: setHistoryPage, totalItems: totalHistoryCount,
  } = usePaginatedStudentHistory(user?.id);

  // --- Derived Data & Memos ---
  const studentDisplayName = getUserDisplayName(user);
  const studentStatusText = user.status === 'active' ? 'Active' : 'Inactive';
  const isStudentActive = user.status === 'active';
  // Filter teachers from the passed allUsers prop
  const allTeachers = useMemo(() => allUsers.filter(u => u.role === 'teacher'), [allUsers]);

  // --- Handlers --- (mostly unchanged)
  const handleAssignTaskClick = () => { onAssignTask(); };
  const handleEditStudent = () => { setIsEditModalVisible(true); };
  const handleManageStatus = () => { setIsStatusModalVisible(true); };
  const closeStatusModal = () => { setIsStatusModalVisible(false); };
  const handleLoginAsStudent = () => { alert(`Simulating QR Code Generation for ${studentDisplayName} (${user.id})...`); };
  const handleBackClick = () => { onBack(); };
  const closeEditModal = () => { setIsEditModalVisible(false); };
  const handleRemoveAssignedTask = (assignmentId: string) => { if (onDeleteAssignment) { onDeleteAssignment(assignmentId); } else { alert(`Mock Remove Assigned Task ${assignmentId}`); } };
  const handleVerifyTaskClick = (task: AssignedTask) => { if (onInitiateVerification) { onInitiateVerification(task); } else { console.warn("onInitiateVerification not provided"); alert(`Mock Verify Task ${task.taskTitle}`); } };
  const handleOpenAdjustmentModal = () => { setIsAdjustmentModalVisible(true); };
  const handleCloseAdjustmentModal = () => { setIsAdjustmentModalVisible(false); };

  // --- Loading State ---
  if (instrumentsLoading || taskLibraryLoading) {
      return <SafeAreaView style={appSharedStyles.safeArea}><ActivityIndicator style={{marginTop: 30}} size="large" /></SafeAreaView>
  }

  return (
    <>
      <SafeAreaView style={appSharedStyles.safeArea}>
        {/* Header */}
        <View style={styles.headerContainer}>
            <Button title="← Back to Admin" onPress={handleBackClick} />
            <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail"> {studentDisplayName}'s Details </Text>
            <View style={styles.headerActions}>
                <Button title="Login (QR)" onPress={handleLoginAsStudent} color={colors.info} disabled={!isStudentActive} />
                <Button title="Edit" onPress={handleEditStudent} color={colors.warning} />
                <Button title="Status" onPress={handleManageStatus} color={colors.secondary} />
            </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView style={appSharedStyles.container}>
          <Text style={appSharedStyles.sectionTitle}>Viewing Student: {studentDisplayName}</Text>
          <Text style={appSharedStyles.itemDetailText}>ID: {user.id}</Text>
          <Text style={appSharedStyles.itemDetailText}> Status: <Text style={{fontWeight: 'bold', color: isStudentActive ? colors.success : colors.secondary}}>{studentStatusText}</Text> </Text>
          {/* Use fetched instruments */}
          <Text style={appSharedStyles.itemDetailText}> Instrument(s): {getInstrumentNames(user.instrumentIds, fetchedInstruments)} </Text>
          {user.linkedTeacherIds && user.linkedTeacherIds.length > 0 && ( <Text style={appSharedStyles.itemDetailText}> Linked Teacher IDs: {user.linkedTeacherIds.join(', ')} </Text> )}
          {/* Display Balance */}
          {balanceLoading ? (
              <Text style={[appSharedStyles.itemDetailText, { fontWeight: 'bold' }]}> Balance: Loading...</Text>
          ) : (
              <Text style={[appSharedStyles.itemDetailText, { fontWeight: 'bold' }]}> Balance: {balance} Tickets </Text>
          )}

          {/* Action Buttons */}
          <View style={adminSharedStyles.adminStudentActions}>
              <Button title="Adjust Tickets" onPress={handleOpenAdjustmentModal} disabled={!isStudentActive || balanceLoading} />
              <Button title="Redeem Reward (Mock)" onPress={() => onRedeemReward(user.id, 'reward-6')} disabled={!isStudentActive} />
              <Button title="Assign Task" onPress={handleAssignTaskClick} disabled={!isStudentActive} />
          </View>

          {/* Assigned Tasks */}
          <Text style={appSharedStyles.sectionTitle}>Assigned Tasks ({totalTasksCount})</Text>
          {/* TODO: Refactor usePaginatedStudentTasks hook to use TQ */}
          {totalTasksCount > 0 ? (
            <FlatList
              data={paginatedTasks}
              keyExtractor={item => item.id}
              renderItem={({ item }) => { const allowDelete = (!item.isComplete || item.verificationStatus === 'pending') && isStudentActive; const allowVerify = item.isComplete && item.verificationStatus === 'pending' && isStudentActive; const taskStatus = item.isComplete ? (item.verificationStatus === 'pending' ? 'Complete (Pending Verification)' : `Verified (${item.verificationStatus || 'status unknown'})`) : 'Assigned'; return ( <View style={adminSharedStyles.taskItem}> <Text style={adminSharedStyles.taskItemTitle}>{item.taskTitle}</Text> <Text style={adminSharedStyles.taskItemStatus}>Status: {taskStatus}</Text> {item.completedDate && (<Text style={appSharedStyles.itemDetailText}>Completed: {new Date(item.completedDate).toLocaleDateString()}</Text>)} {item.verifiedDate && item.verificationStatus !== 'pending' && (<Text style={appSharedStyles.itemDetailText}>Verified: {new Date(item.verifiedDate).toLocaleDateString()}</Text>)} {item.actualPointsAwarded !== undefined && item.verificationStatus !== 'pending' && (<Text style={adminSharedStyles.taskItemTickets}>Awarded: {item.actualPointsAwarded ?? 0} Tickets</Text>)} {item.isComplete && item.verificationStatus === 'pending' && (<Text style={adminSharedStyles.pendingNote}>Awaiting verification...</Text>)} <View style={adminSharedStyles.assignedTaskActions}> {onInitiateVerification && ( <Button title="Verify" onPress={() => handleVerifyTaskClick(item)} disabled={!allowVerify} /> )} {onDeleteAssignment && ( <Button title="Remove" onPress={() => handleRemoveAssignedTask(item.id)} color={colors.danger} disabled={!allowDelete} /> )} </View> </View> ); }}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text> )}
              ListFooterComponent={ tasksTotalPages > 1 ? ( <PaginationControls currentPage={tasksCurrentPage} totalPages={tasksTotalPages} onPageChange={setTasksPage} /> ) : null }
              contentContainerStyle={{ paddingBottom: 10 }}
            />
          ) : (
            <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text>
          )}

          {/* History */}
          <Text style={appSharedStyles.sectionTitle}>History ({totalHistoryCount})</Text>
           {/* TODO: Refactor usePaginatedStudentHistory hook to use TQ */}
          {totalHistoryCount > 0 ? (
            <FlatList
              data={paginatedHistory}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <TicketHistoryItem item={item} />}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
              ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>No history yet.</Text> )}
               ListFooterComponent={ historyTotalPages > 1 ? ( <PaginationControls currentPage={historyCurrentPage} totalPages={historyTotalPages} onPageChange={setHistoryPage} /> ) : null }
              contentContainerStyle={{ paddingBottom: 10 }}
            />
          ) : (
            <Text style={appSharedStyles.emptyListText}>No history yet.</Text>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Modals */}
      <DeactivateOrDeleteUserModal visible={isStatusModalVisible} user={user} onClose={closeStatusModal} />
      <EditUserModal visible={isEditModalVisible} userToEdit={user} onClose={closeEditModal} mockInstruments={fetchedInstruments} allTeachers={allTeachers} />
      <ManualTicketAdjustmentModal
        visible={isAdjustmentModalVisible}
        onClose={handleCloseAdjustmentModal}
        studentId={user.id}
        studentName={studentDisplayName}
        currentBalance={balance}
      />
    </>
  );
};

// Styles remain the same
const styles = StyleSheet.create({
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderPrimary, backgroundColor: colors.backgroundPrimary, },
  headerSideContainer: { minWidth: 60, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'center', marginHorizontal: 5, },
  headerActions: { flexDirection: 'row', gap: 10 },
});