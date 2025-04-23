// src/components/admin/AdminStudentDetailView.tsx
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Button, FlatList, SafeAreaView, StyleSheet } from 'react-native';

// Components
import { TicketHistoryItem } from '../../views/StudentView';
import DeactivateOrDeleteUserModal from '../common/DeactivateOrDeleteUserModal';
import EditUserModal from '../common/EditUserModal';
import PaginationControls from './PaginationControls';

// Hooks
import { usePaginatedStudentTasks } from '../../hooks/usePaginatedStudentTasks';
import { usePaginatedStudentHistory } from '../../hooks/usePaginatedStudentHistory';

// Types & Mocks
import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';
import { Instrument } from '../../mocks/mockInstruments';
import { User, UserStatus } from '../../types/userTypes';
import { StudentProfileData } from '../../types/dataTypes';
import { AssignedTask } from '../../mocks/mockAssignedTasks';

// Utils & Styles
import { getInstrumentNames, getUserDisplayName } from '../../utils/helpers';
import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';

// Update props interface - remove onToggleUserStatus simulation prop
interface AdminStudentDetailViewProps {
  studentData: StudentProfileData;
  taskLibrary: TaskLibraryItem[];
  mockInstruments: Instrument[];
  allUsers: User[];
  adminUserName: string;
  onManualTicketAdjust: (studentId: string, amount: number, notes: string) => void;
  onRedeemReward: (studentId: string, rewardId: string) => void;
  onAssignTask: () => void;
  // Removed: onToggleUserStatus: (userId: string) => void;
  onBack: () => void;
  onDeleteAssignment?: (assignmentId: string) => void;
  onInitiateVerification?: (task: AssignedTask) => void;
}

export const AdminStudentDetailView: React.FC<AdminStudentDetailViewProps> = ({
  studentData,
  taskLibrary,
  mockInstruments,
  allUsers,
  adminUserName,
  onManualTicketAdjust,
  onRedeemReward,
  onAssignTask,
  // onToggleUserStatus, // Removed from destructuring
  onBack,
  onDeleteAssignment,
  onInitiateVerification,
}) => {
  const { user, balance } = studentData;

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);

  const {
      tasks: paginatedTasks,
      currentPage: tasksCurrentPage,
      totalPages: tasksTotalPages,
      setPage: setTasksPage,
      totalTasksCount,
  } = usePaginatedStudentTasks(user?.id);

  const {
      history: paginatedHistory,
      currentPage: historyCurrentPage,
      totalPages: historyTotalPages,
      setPage: setHistoryPage,
      totalHistoryCount,
  } = usePaginatedStudentHistory(user?.id);

  const studentDisplayName = getUserDisplayName(user);
  const studentStatusText = user.status === 'active' ? 'Active' : 'Inactive';
  const isStudentActive = user.status === 'active';
  const allTeachers = useMemo(() => allUsers.filter(u => u.role === 'teacher'), [allUsers]);

  const handleAssignTaskClick = () => { onAssignTask(); };
  const handleEditStudent = () => { setIsEditModalVisible(true); };
  const handleManageStatus = () => { setIsStatusModalVisible(true); };
  const closeStatusModal = () => { setIsStatusModalVisible(false); };
  // Removed: handleToggleStatusConfirm (modal handles its own submission now)
  // Removed: handlePermanentDeleteConfirm (modal handles its own submission now)
  const handleLoginAsStudent = () => { alert(`Simulating QR Code Generation for ${studentDisplayName} (${user.id})...`); };
  const handleBackClick = () => { onBack(); };
  const closeEditModal = () => { setIsEditModalVisible(false); };
  const handleRemoveAssignedTask = (assignmentId: string) => { if (onDeleteAssignment) { onDeleteAssignment(assignmentId); } else { alert(`Mock Remove Assigned Task ${assignmentId}`); } };
  const handleVerifyTaskClick = (task: AssignedTask) => { if (onInitiateVerification) { onInitiateVerification(task); } else { console.warn("onInitiateVerification not provided"); alert(`Mock Verify Task ${task.taskTitle}`); } };

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={styles.headerContainer}>
          <Button title="← Back to Admin" onPress={handleBackClick} />
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail"> {studentDisplayName}'s Details </Text>
          <View style={styles.headerActions}>
              <Button title="Login (QR)" onPress={handleLoginAsStudent} color={colors.info} disabled={!isStudentActive} />
              <Button title="Edit" onPress={handleEditStudent} color={colors.warning} />
              <Button title="Status" onPress={handleManageStatus} color={colors.secondary} />
          </View>
      </View>

      <ScrollView style={appSharedStyles.container}>
        <Text style={appSharedStyles.sectionTitle}>Viewing Student: {studentDisplayName}</Text>
        <Text style={appSharedStyles.itemDetailText}>ID: {user.id}</Text>
        <Text style={appSharedStyles.itemDetailText}> Status: <Text style={{fontWeight: 'bold', color: isStudentActive ? colors.success : colors.secondary}}>{studentStatusText}</Text> </Text>
        <Text style={appSharedStyles.itemDetailText}> Instrument(s): {getInstrumentNames(user.instrumentIds, mockInstruments)} </Text>
        {user.linkedTeacherIds && user.linkedTeacherIds.length > 0 && ( <Text style={appSharedStyles.itemDetailText}> Linked Teacher IDs: {user.linkedTeacherIds.join(', ')} </Text> )}
        <Text style={[appSharedStyles.itemDetailText, { fontWeight: 'bold' }]}> Balance: {balance} Tickets </Text>

        <View style={adminSharedStyles.adminStudentActions}>
            <Button title="Adjust Tickets (Mock)" onPress={() => onManualTicketAdjust(user.id, 100, `Admin adjustment by ${adminUserName}`)} disabled={!isStudentActive} />
            <Button title="Redeem Reward (Mock)" onPress={() => onRedeemReward(user.id, 'reward-6')} disabled={!isStudentActive} />
            <Button title="Assign Task" onPress={handleAssignTaskClick} disabled={!isStudentActive} />
        </View>

        <Text style={appSharedStyles.sectionTitle}>Assigned Tasks ({totalTasksCount})</Text>
        {totalTasksCount > 0 ? (
          <FlatList
            data={paginatedTasks}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
                const allowDelete = (!item.isComplete || item.verificationStatus === 'pending') && isStudentActive;
                const allowVerify = item.isComplete && item.verificationStatus === 'pending' && isStudentActive;
                const taskStatus = item.isComplete ? (item.verificationStatus === 'pending' ? 'Complete (Pending Verification)' : `Verified (${item.verificationStatus || 'status unknown'})`) : 'Assigned';
                return (
                    <View style={adminSharedStyles.taskItem}>
                        <Text style={adminSharedStyles.taskItemTitle}>{item.taskTitle}</Text>
                        <Text style={adminSharedStyles.taskItemStatus}>Status: {taskStatus}</Text>
                        {item.completedDate && (<Text style={appSharedStyles.itemDetailText}>Completed: {new Date(item.completedDate).toLocaleDateString()}</Text>)}
                        {item.verifiedDate && item.verificationStatus !== 'pending' && (<Text style={appSharedStyles.itemDetailText}>Verified: {new Date(item.verifiedDate).toLocaleDateString()}</Text>)}
                        {item.actualPointsAwarded !== undefined && item.verificationStatus !== 'pending' && (<Text style={adminSharedStyles.taskItemTickets}>Awarded: {item.actualPointsAwarded ?? 0} Tickets</Text>)}
                        {item.isComplete && item.verificationStatus === 'pending' && (<Text style={adminSharedStyles.pendingNote}>Awaiting verification...</Text>)}
                        <View style={adminSharedStyles.assignedTaskActions}>
                            {onInitiateVerification && ( <Button title="Verify" onPress={() => handleVerifyTaskClick(item)} disabled={!allowVerify} /> )}
                            {onDeleteAssignment && ( <Button title="Remove" onPress={() => handleRemoveAssignedTask(item.id)} color={colors.danger} disabled={!allowDelete} /> )}
                        </View>
                    </View>
                );
             }}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text> )}
            ListFooterComponent={
                tasksTotalPages > 1 ? (
                    <PaginationControls
                        currentPage={tasksCurrentPage}
                        totalPages={tasksTotalPages}
                        onPageChange={setTasksPage}
                    />
                ) : null
            }
            contentContainerStyle={{ paddingBottom: 10 }}
          />
        ) : (
          <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text>
        )}

        <Text style={appSharedStyles.sectionTitle}>History ({totalHistoryCount})</Text>
        {totalHistoryCount > 0 ? (
          <FlatList
            data={paginatedHistory}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <TicketHistoryItem item={item} />}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
            ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>No history yet.</Text> )}
             ListFooterComponent={
                historyTotalPages > 1 ? (
                    <PaginationControls
                        currentPage={historyCurrentPage}
                        totalPages={historyTotalPages}
                        onPageChange={setHistoryPage}
                    />
                ) : null
            }
            contentContainerStyle={{ paddingBottom: 10 }}
          />
        ) : (
          <Text style={appSharedStyles.emptyListText}>No history yet.</Text>
        )}
      </ScrollView>

      {/* Status Modal - Remove onToggleUserStatus prop */}
      <DeactivateOrDeleteUserModal
        visible={isStatusModalVisible}
        user={user}
        onClose={closeStatusModal}
        // onToggleUserStatus={handleToggleStatusConfirm} // <-- REMOVE THIS LINE
      />

      <EditUserModal
        visible={isEditModalVisible}
        userToEdit={user}
        onClose={closeEditModal}
        mockInstruments={mockInstruments}
        allTeachers={allTeachers}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderPrimary, backgroundColor: colors.backgroundPrimary, },
  headerSideContainer: { minWidth: 60, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'center', marginHorizontal: 5, },
  headerActions: { flexDirection: 'row', gap: 10 },
});