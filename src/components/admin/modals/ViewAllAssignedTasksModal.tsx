// src/components/admin/modals/ViewAllAssignedTasksModal.tsx
import React from 'react'; // Removed useState, useMemo, useEffect
import { Modal, View, Text, StyleSheet, Button, FlatList } from 'react-native';

// Hooks
import { usePaginatedAssignedTasks, TaskAssignmentFilterStatus, StudentTaskFilterStatus } from '../../../hooks/usePaginatedAssignedTasks'; // <-- Import hook and types

// Components
import PaginationControls from '../PaginationControls'; // <-- Import pagination controls

// Mocks & Types (TaskLibraryItem might still be needed if detail item uses it)
import { AssignedTask } from '../../../mocks/mockAssignedTasks';
import { TaskLibraryItem } from '../../../mocks/mockTaskLibrary'; // Keep if needed by AssignedTaskDetailItem
import { User } from '../../../types/userTypes';

// Utils & Styles
import { getUserDisplayName } from '../../../utils/helpers'; // Keep for display
import { colors } from '../../../styles/colors';
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { adminSharedStyles } from '../adminSharedStyles';

// --- Modal Styles ---
const modalStyles = StyleSheet.create({
  centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', },
  modalView: { margin: 10, backgroundColor: colors.backgroundSecondary, borderRadius: 10, padding: 0, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '95%', maxHeight: '90%', },
  modalHeader: { width: '100%', padding: 15, borderBottomWidth: 1, borderBottomColor: colors.borderPrimary, backgroundColor: colors.backgroundPrimary, borderTopLeftRadius: 10, borderTopRightRadius: 10, alignItems: 'center', },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  // Filter Container Styles
  filterSection: { width: '100%', backgroundColor: colors.backgroundPrimary, borderBottomWidth: 1, borderBottomColor: colors.borderSecondary, paddingBottom: 10, },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 5, gap: 8, alignItems: 'center', },
  filterLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginRight: 5, },
  // List container
  listContainer: { width: '100%', flex: 1, // Allow list to take available space
                    paddingHorizontal: 10, paddingTop: 10 },
  // Footer
  footer: { width: '100%', paddingBottom: 10, // Padding below pagination
             paddingTop: 5, // Reduced top padding
             borderTopWidth: 1, borderTopColor: colors.borderPrimary, backgroundColor: colors.backgroundPrimary, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, alignItems: 'center' }, // Center the close button
});

// --- Assigned Task Detail Item Component ---
// No changes needed here assuming it uses the props correctly
const AssignedTaskDetailItem = ({
  item,
  // taskLibrary, // Does it still need this? Let's assume not for now.
  allUsers,
  onInitiateVerification,
  onDeleteAssignment,
}: {
  item: AssignedTask;
  // taskLibrary: TaskLibraryItem[];
  allUsers: User[];
  onInitiateVerification?: (task: AssignedTask) => void;
  onDeleteAssignment?: (taskId: string) => void;
}) => {
  const student = allUsers.find(u => u.id === item.studentId);
  const assigner = allUsers.find(u => u.id === item.assignedById);
  const verifier = item.verifiedById ? allUsers.find(u => u.id === item.verifiedById) : null;

  const getStatusText = () => { /* ... as before ... */ if (item.isComplete) { if (item.verificationStatus === 'pending') return 'Complete (Pending Verification)'; if (item.verificationStatus) return `Verified (${item.verificationStatus})`; return 'Completed (Unknown Status)'; } return 'Assigned'; };

  const allowDelete = (!item.isComplete || item.verificationStatus === 'pending') && student?.status === 'active'; // Prevent deleting tasks for inactive students?

  return (
    <View style={adminSharedStyles.taskItem}>
      <Text style={adminSharedStyles.taskItemTitle}>{item.taskTitle}</Text> {/* Use direct title */}
      <Text style={appSharedStyles.itemDetailText}>
        Student: {student ? getUserDisplayName(student) : item.studentId}
         {student && ` (${student.status})`} {/* Show student status */}
      </Text>
      <Text style={adminSharedStyles.taskItemStatus}>Status: {getStatusText()}</Text>
      <Text style={appSharedStyles.itemDetailText}>
        Assigned: {new Date(item.assignedDate).toLocaleDateString()} by{' '}
        {assigner ? getUserDisplayName(assigner) : item.assignedById}
      </Text>
      {item.completedDate && ( <Text style={appSharedStyles.itemDetailText}> Completed: {new Date(item.completedDate).toLocaleDateString()} </Text> )}
      {item.verifiedDate && item.verificationStatus !== 'pending' && ( <Text style={appSharedStyles.itemDetailText}> Verified: {new Date(item.verifiedDate).toLocaleDateString()} by{' '} {verifier ? getUserDisplayName(verifier) : item.verifiedById} </Text> )}
      {item.actualPointsAwarded !== undefined && item.verificationStatus !== 'pending' && ( <Text style={adminSharedStyles.taskItemTickets}> Awarded: {item.actualPointsAwarded ?? 0} Tickets </Text> )}
      {item.isComplete && item.verificationStatus === 'pending' && ( <Text style={adminSharedStyles.pendingNote}>Awaiting verification...</Text> )}
      <View style={adminSharedStyles.assignedTaskActions}>
        {item.isComplete && item.verificationStatus === 'pending' && onInitiateVerification && student?.status === 'active' && ( // Only allow verify if student active
          <Button title="Verify" onPress={() => onInitiateVerification(item)} />
        )}
        {onDeleteAssignment && (
          <Button
            title="Remove" // Changed label from "Remove (Mock)"
            onPress={() => onDeleteAssignment(item.id)}
            color={colors.danger}
            disabled={!allowDelete} // Disable based on task/student status
          />
        )}
      </View>
    </View>
  );
};

// --- Main Modal Component ---
interface ViewAllAssignedTasksModalProps {
  visible: boolean;
  onClose: () => void;
  // Removed direct data props: allAssignedTasks, taskLibrary
  allUsers: User[]; // Still needed for display names
  onInitiateVerification?: (task: AssignedTask) => void;
  onDeleteAssignment?: (taskId: string) => void;
}

const ViewAllAssignedTasksModal: React.FC<ViewAllAssignedTasksModalProps> = ({
  visible,
  onClose,
  allUsers, // Pass through
  onInitiateVerification,
  onDeleteAssignment,
}) => {
  // Use the hook to manage state and data
  const {
    tasks, // This is the paginated list for the current page
    currentPage,
    totalPages,
    setPage,
    assignmentFilter,
    setAssignmentFilter,
    studentStatusFilter,
    setStudentStatusFilter,
    // isLoading, // Use later
    // error, // Use later
  } = usePaginatedAssignedTasks('pending', 'active'); // Set initial filters here

  // Removed internal state and memos for filtering/sorting

  // Reset filters when modal becomes visible (optional, hook might handle page reset)
  // useEffect(() => {
  //   if (visible) {
  //     setAssignmentFilter('pending');
  //     setStudentStatusFilter('active');
  //     setPage(1); // Ensure page is reset too if needed
  //   }
  // }, [visible, setAssignmentFilter, setStudentStatusFilter, setPage]);


  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          {/* Header */}
          <View style={modalStyles.modalHeader}>
             {/* TODO: Update title to show total count from hook if added later */}
            <Text style={modalStyles.modalTitle}>Assigned Tasks</Text>
          </View>

          {/* Filters */}
          <View style={modalStyles.filterSection}>
            {/* Assignment Status Filter */}
            <View style={modalStyles.filterRow}>
                <Text style={modalStyles.filterLabel}>Task Status:</Text>
                <Button title="All" onPress={() => setAssignmentFilter('all')} color={assignmentFilter === 'all' ? colors.primary : colors.secondary} />
                <Button title="Assigned" onPress={() => setAssignmentFilter('assigned')} color={assignmentFilter === 'assigned' ? colors.primary : colors.secondary} />
                <Button title="Pending" onPress={() => setAssignmentFilter('pending')} color={assignmentFilter === 'pending' ? colors.primary : colors.secondary} />
                <Button title="Completed" onPress={() => setAssignmentFilter('completed')} color={assignmentFilter === 'completed' ? colors.primary : colors.secondary} />
            </View>
             {/* Student Status Filter */}
            <View style={modalStyles.filterRow}>
                 <Text style={modalStyles.filterLabel}>Student Status:</Text>
                 <Button title="Active" onPress={() => setStudentStatusFilter('active')} color={studentStatusFilter === 'active' ? colors.success : colors.secondary} />
                 <Button title="Inactive" onPress={() => setStudentStatusFilter('inactive')} color={studentStatusFilter === 'inactive' ? colors.warning : colors.secondary} />
                 <Button title="All" onPress={() => setStudentStatusFilter('all')} color={studentStatusFilter === 'all' ? colors.info : colors.secondary} />
            </View>
          </View>

          {/* List */}
          <FlatList
            style={modalStyles.listContainer}
            data={tasks} // Use paginated data from hook
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <AssignedTaskDetailItem
                item={item}
                allUsers={allUsers}
                onInitiateVerification={onInitiateVerification}
                onDeleteAssignment={onDeleteAssignment}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={
              <Text style={[appSharedStyles.emptyListText, { padding: 20 }]}>
                No tasks match the current filters.
              </Text>
            }
            // No FooterComponent needed here for pagination, moved below list
            contentContainerStyle={{ paddingBottom: 10 }} // Space at bottom of list
          />

          {/* Footer with Pagination and Close Button */}
          <View style={modalStyles.footer}>
             {/* Pagination Controls */}
            {totalPages > 1 && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setPage}
                />
            )}
             {/* Close Button */}
             <View style={{marginTop: totalPages > 1 ? 10 : 0 }}>
                 <Button title="Close" onPress={onClose} color={colors.secondary}/>
             </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ViewAllAssignedTasksModal;