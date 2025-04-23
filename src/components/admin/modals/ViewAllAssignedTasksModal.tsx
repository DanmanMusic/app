import React, { useState, useMemo } from 'react'; // Added useMemo
import {
  Modal, View, Text, StyleSheet, Button, FlatList, ActivityIndicator, Alert
} from 'react-native';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

import {
  usePaginatedAssignedTasks,
  TaskAssignmentFilterStatus,
  StudentTaskFilterStatus,
} from '../../../hooks/usePaginatedAssignedTasks';
import { deleteAssignedTask } from '../../../api/assignedTasks';
// --- Import existing fetch functions ---
import { fetchStudents, fetchTeachers, fetchParents } from '../../../api/users';

import PaginationControls from '../PaginationControls';
import ConfirmationModal from '../../common/ConfirmationModal';
import { AssignedTask } from '../../../mocks/mockAssignedTasks';
import { User } from '../../../types/userTypes'; // Include SimplifiedStudent
import { ViewAllAssignedTasksModalProps } from '../../../types/componentProps';

import { getUserDisplayName } from '../../../utils/helpers';
import { colors } from '../../../styles/colors';
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { adminSharedStyles } from '../adminSharedStyles';

// --- Sub-Component: AssignedTaskDetailItem (Needs allUsers prop) ---
const AssignedTaskDetailItem = ({ item, allUsers, onInitiateVerification, onDelete, disabled }: { item: AssignedTask; allUsers: User[]; onInitiateVerification?: (task: AssignedTask) => void; onDelete: (assignmentId: string) => void; disabled?: boolean; }) => {
    const student = allUsers.find(u => u.id === item.studentId);
    const assigner = allUsers.find(u => u.id === item.assignedById);
    const verifier = item.verifiedById ? allUsers.find(u => u.id === item.verifiedById) : null;
    const getStatusText = () => { /* ... status logic ... */ };
    const allowDelete = (!item.isComplete || item.verificationStatus === 'pending') && student?.status === 'active';
    const allowVerify = item.isComplete && item.verificationStatus === 'pending' && student?.status === 'active';

    return ( <View style={adminSharedStyles.taskItem}> <Text style={adminSharedStyles.taskItemTitle}>{item.taskTitle}</Text> <Text style={appSharedStyles.itemDetailText}> Student: {student ? getUserDisplayName(student) : item.studentId} {student && ` (${student.status})`} </Text> <Text style={adminSharedStyles.taskItemStatus}>Status: Status</Text> <Text style={appSharedStyles.itemDetailText}> Assigned: {new Date(item.assignedDate).toLocaleDateString()} by{' '} {assigner ? getUserDisplayName(assigner) : item.assignedById} </Text> {item.completedDate && ( <Text style={appSharedStyles.itemDetailText}> Completed: {new Date(item.completedDate).toLocaleDateString()} </Text> )} {item.verifiedDate && item.verificationStatus !== 'pending' && ( <Text style={appSharedStyles.itemDetailText}> Verified: {new Date(item.verifiedDate).toLocaleDateString()} by{' '} {verifier ? getUserDisplayName(verifier) : item.verifiedById}{' '} </Text> )} {item.actualPointsAwarded !== undefined && item.verificationStatus !== 'pending' && ( <Text style={adminSharedStyles.taskItemTickets}> Awarded: {item.actualPointsAwarded ?? 0} Tickets </Text> )} {item.isComplete && item.verificationStatus === 'pending' && ( <Text style={adminSharedStyles.pendingNote}>Awaiting verification...</Text> )} <View style={adminSharedStyles.assignedTaskActions}> {allowVerify && onInitiateVerification && ( <Button title="Verify" onPress={() => onInitiateVerification(item)} disabled={disabled} /> )} {allowDelete && ( <Button title="Remove" onPress={() => onDelete(item.id)} color={colors.danger} disabled={!allowDelete || disabled} /> )} </View> </View> );
};
// --- End Sub-Component ---


// --- Main Modal Component ---
export const ViewAllAssignedTasksModal: React.FC<ViewAllAssignedTasksModalProps> = ({
  visible,
  onClose,
  onInitiateVerification,
}) => {
  const queryClient = useQueryClient();

  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);

  // --- Hook for Paginated Tasks (Existing) ---
  const { tasks, currentPage, totalPages, totalItems, setPage, assignmentFilter, setAssignmentFilter, studentStatusFilter, setStudentStatusFilter, isLoading: isLoadingTasks, isFetching: isFetchingTasks, isError: isErrorTasks, error: errorTasks } = usePaginatedAssignedTasks('pending', 'active');

  // --- Queries to Fetch Users for Lookups ---
  // Fetch Students (page 1, large limit) - note: returns SimplifiedStudent
  const { data: studentData, isLoading: isLoadingStudents } = useQuery({
      queryKey: ['students', { page: 1, limit: 1000, filter: 'all' }],
      queryFn: () => fetchStudents({ page: 1, filter: 'all' }), // Assuming fetchStudents takes limit
      staleTime: 5 * 60 * 1000,
  });

  // Fetch Teachers (page 1, large limit)
  const { data: teacherData, isLoading: isLoadingTeachers } = useQuery({
      queryKey: ['teachers', { page: 1, limit: 1000 }],
      queryFn: () => fetchTeachers({ page: 1 }), // Assuming fetchTeachers takes limit
      staleTime: 5 * 60 * 1000,
  });

  // Fetch Parents (page 1, large limit)
  const { data: parentData, isLoading: isLoadingParents } = useQuery({
      queryKey: ['parents', { page: 1, limit: 1000 }],
      queryFn: () => fetchParents({ page: 1 }), // Assuming fetchParents takes limit
      staleTime: 5 * 60 * 1000,
  });

  // Fetch Admins (assuming few, fetch all) - TODO: Need fetchAdmins or use fetchUsers({role: 'admin'})
   const { data: adminData, isLoading: isLoadingAdmins } = useQuery({
       queryKey: ['users', { role: 'admin' }], // Or specific key ['admins']
       queryFn: async () => { // Example using fetch directly if fetchUsers isn't ready
           const response = await fetch('/api/users?role=admin&limit=100'); // Fetch admins
           if (!response.ok) return [];
           const result = await response.json();
           return result.items || [];
       },
       staleTime: 15 * 60 * 1000, // Cache admins longer
   });

  // --- Combine fetched users into one list for lookups ---
  const allUsers = useMemo(() => {
      // Important: fetchStudents returns SimplifiedStudent, others return User.
      // We need to reconcile this or ensure fetchStudents returns User for lookups.
      // Assuming for now we only need ID/Name from students for lookup, which SimplifiedStudent has.
      // Ideally, all fetch functions return the full User object for consistency here.
      const studentsForLookup = (studentData?.students ?? []).map(s => ({ ...s, role: 'student' } as unknown as User)); // Map Simplified to User-like structure
      const teachersForLookup = teacherData?.items ?? [];
      const parentsForLookup = parentData?.items ?? [];
      const adminsForLookup = adminData ?? [];

      // Combine all into a single array
      return [
          ...studentsForLookup,
          ...teachersForLookup,
          ...parentsForLookup,
          ...adminsForLookup,
      ];
      // Add dependencies on all the raw data results
  }, [studentData, teacherData, parentData, adminData]);

  // Overall loading state for users needed for lookups
  const isLoadingUsers = isLoadingStudents || isLoadingTeachers || isLoadingParents || isLoadingAdmins;
  // --- End User Fetching ---


  // --- Delete Mutation (Existing) ---
  const deleteMutation = useMutation({ /* ... mutation options ... */ });

  // --- Event Handlers (Existing) ---
  const handleDeleteTask = (assignmentId: string) => { /* ... */ };
  const handleConfirmDeleteAction = () => { /* ... */ };
  const closeDeleteConfirmModal = () => { /* ... */ };
  const getErrorMessage = () => { /* ... error message logic ... */ };

  // Find the task object for the confirmation modal message
  const taskToDeleteObject = tasks.find(task => task.id === taskToDeleteId);

  // Combine loading states
  const isDataLoading = isLoadingTasks || isLoadingUsers; // Check both tasks and users loading

  return (
    <>
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            {/* Header */}
            <View style={modalStyles.modalHeader}>
              <Text style={modalStyles.modalTitle}>Assigned Tasks ({totalItems})</Text>
              {isFetchingTasks && !isLoadingTasks && ( <ActivityIndicator size="small" color={colors.primary} style={{ position: 'absolute', right: 15, top: 15 }} /> )}
            </View>

            {/* Filters */}
            <View style={modalStyles.filterSection}>
                {/* Filter Rows JSX */}
                 <View style={modalStyles.filterRow}> <Text style={modalStyles.filterLabel}>Task Status:</Text> <Button title="All" onPress={() => setAssignmentFilter('all')} color={assignmentFilter === 'all' ? colors.primary : colors.secondary} /> <Button title="Assigned" onPress={() => setAssignmentFilter('assigned')} color={assignmentFilter === 'assigned' ? colors.primary : colors.secondary} /> <Button title="Pending" onPress={() => setAssignmentFilter('pending')} color={assignmentFilter === 'pending' ? colors.warning : colors.secondary} /> <Button title="Completed" onPress={() => setAssignmentFilter('completed')} color={assignmentFilter === 'completed' ? colors.success : colors.secondary} /> </View>
                 <View style={modalStyles.filterRow}> <Text style={modalStyles.filterLabel}>Student Status:</Text> <Button title="Active" onPress={() => setStudentStatusFilter('active')} color={studentStatusFilter === 'active' ? colors.success : colors.secondary} /> <Button title="Inactive" onPress={() => setStudentStatusFilter('inactive')} color={studentStatusFilter === 'inactive' ? colors.secondary : colors.secondary} /> <Button title="All" onPress={() => setStudentStatusFilter('all')} color={studentStatusFilter === 'all' ? colors.info : colors.secondary} /> </View>
            </View>

            {/* Content Area */}
            {/* Show loading if tasks OR user lookups are loading */}
            {isDataLoading && ( <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} /> )}
            {isErrorTasks && !isLoadingTasks && ( <View style={modalStyles.errorContainer}><Text style={modalStyles.errorText}>Error</Text></View> )}
            {/* TODO: Add error handling for user fetch errors */}

            {!isDataLoading && !isErrorTasks && (
              <FlatList
                style={modalStyles.listContainer}
                data={tasks}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <AssignedTaskDetailItem
                    item={item}
                    allUsers={allUsers} // Pass the combined user list
                    onInitiateVerification={onInitiateVerification}
                    onDelete={handleDeleteTask}
                    disabled={deleteMutation.isPending && taskToDeleteId === item.id}
                  />
                )}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={ <Text style={[appSharedStyles.emptyListText, { padding: 20 }]}> No tasks match the current filters. </Text> }
                contentContainerStyle={{ paddingBottom: 10 }}
              />
            )}

            {/* Footer */}
            <View style={modalStyles.footer}>
              {!isDataLoading && !isErrorTasks && totalPages > 1 && (
                <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
              )}
              <View style={{ marginTop: totalPages > 1 ? 10 : 0 }}>
                <Button title="Close" onPress={onClose} color={colors.secondary} disabled={deleteMutation.isPending} />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={isDeleteConfirmVisible}
        title="Confirm Removal"
        message={`Are you sure you want to remove the assigned task "${taskToDeleteObject?.taskTitle || 'selected task'}"? This cannot be undone.`}
        confirmText={deleteMutation.isPending ? 'Removing...' : 'Remove Task'}
        onConfirm={handleConfirmDeleteAction}
        onCancel={closeDeleteConfirmModal}
        confirmDisabled={deleteMutation.isPending}
      />
    </>
  );
};

// --- Styles ---
const modalStyles = StyleSheet.create({
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', },
    modalView: { margin: 10, backgroundColor: colors.backgroundSecondary, borderRadius: 10, padding: 0, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '95%', maxHeight: '90%', },
    modalHeader: { width: '100%', padding: 15, borderBottomWidth: 1, borderBottomColor: colors.borderPrimary, backgroundColor: colors.backgroundPrimary, borderTopLeftRadius: 10, borderTopRightRadius: 10, alignItems: 'center', },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
    filterSection: { width: '100%', backgroundColor: colors.backgroundPrimary, borderBottomWidth: 1, borderBottomColor: colors.borderSecondary, paddingBottom: 10, },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 5, gap: 8, alignItems: 'center', },
    filterLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginRight: 5 },
    listContainer: { width: '100%', flex: 1, paddingHorizontal: 10, paddingTop: 10 },
    footer: { width: '100%', paddingBottom: 10, paddingTop: 5, borderTopWidth: 1, borderTopColor: colors.borderPrimary, backgroundColor: colors.backgroundPrimary, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, alignItems: 'center', },
    errorContainer: { marginVertical: 20, padding: 15, alignItems: 'center', backgroundColor: '#ffebee', borderColor: colors.danger, borderWidth: 1, borderRadius: 5, },
    errorText: { color: colors.danger, fontSize: 14, textAlign: 'center' },
});