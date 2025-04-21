import React, { useState, useMemo, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Button, FlatList } from 'react-native';

import { AssignedTask } from '../../../mocks/mockAssignedTasks';
import { TaskLibraryItem } from '../../../mocks/mockTaskLibrary';
import { User } from '../../../types/userTypes';
import { getTaskTitle, getUserDisplayName } from '../../../utils/helpers';
import { colors } from '../../../styles/colors';
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { adminSharedStyles } from '../adminSharedStyles';

type TaskFilterStatus = 'all' | 'assigned' | 'pending' | 'completed';

const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalView: {
    margin: 10,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    padding: 0,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '95%',
    maxHeight: '90%',
  },
  modalHeader: {
    width: '100%',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    backgroundColor: colors.backgroundPrimary,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 5,
    gap: 8,
    width: '100%',
    backgroundColor: colors.backgroundPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSecondary,
  },
  listContainer: { width: '100%', paddingHorizontal: 10, paddingTop: 10 },
  footer: {
    width: '100%',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: colors.borderPrimary,
    backgroundColor: colors.backgroundPrimary,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
});

const AssignedTaskDetailItem = ({
  item,
  taskLibrary,
  allUsers,
  onInitiateVerification,
  onDeleteAssignment,
}: {
  item: AssignedTask;
  taskLibrary: TaskLibraryItem[];
  allUsers: User[];
  onInitiateVerification?: (task: AssignedTask) => void;
  onDeleteAssignment?: (taskId: string) => void;
}) => {
  const student = allUsers.find(u => u.id === item.studentId);
  const assigner = allUsers.find(u => u.id === item.assignedById);
  const verifier = item.verifiedById ? allUsers.find(u => u.id === item.verifiedById) : null;

  const getStatusText = () => {
    if (item.isComplete) {
      if (item.verificationStatus === 'pending') return 'Complete (Pending Verification)';
      if (item.verificationStatus) return `Verified (${item.verificationStatus})`;
      return 'Completed (Unknown Status)';
    }
    return 'Assigned';
  };

  const allowDelete = !item.isComplete || item.verificationStatus === 'pending';

  return (
    <View style={adminSharedStyles.taskItem}>
      <Text style={adminSharedStyles.taskItemTitle}>{getTaskTitle(item.taskId, taskLibrary)}</Text>
      <Text style={appSharedStyles.itemDetailText}>
        Student: {student ? getUserDisplayName(student) : item.studentId}
      </Text>
      <Text style={adminSharedStyles.taskItemStatus}>Status: {getStatusText()}</Text>
      <Text style={appSharedStyles.itemDetailText}>
        Assigned: {new Date(item.assignedDate).toLocaleDateString()} by{' '}
        {assigner ? getUserDisplayName(assigner) : item.assignedById}
      </Text>
      {item.completedDate && (
        <Text style={appSharedStyles.itemDetailText}>
          Completed: {new Date(item.completedDate).toLocaleDateString()}
        </Text>
      )}
      {item.verifiedDate && item.verificationStatus !== 'pending' && (
        <Text style={appSharedStyles.itemDetailText}>
          Verified: {new Date(item.verifiedDate).toLocaleDateString()} by{' '}
          {verifier ? getUserDisplayName(verifier) : item.verifiedById}
        </Text>
      )}
      {item.actualPointsAwarded !== undefined && item.verificationStatus !== 'pending' && (
        <Text style={adminSharedStyles.taskItemTickets}>
          Awarded: {item.actualPointsAwarded ?? 0} Tickets
        </Text>
      )}
      {item.isComplete && item.verificationStatus === 'pending' && (
        <Text style={adminSharedStyles.pendingNote}>Awaiting verification...</Text>
      )}
      <View style={adminSharedStyles.assignedTaskActions}>
        {item.isComplete && item.verificationStatus === 'pending' && onInitiateVerification && (
          <Button title="Verify" onPress={() => onInitiateVerification(item)} />
        )}
        {onDeleteAssignment && allowDelete && (
          <Button
            title="Remove (Mock)"
            onPress={() => onDeleteAssignment(item.id)}
            color={colors.danger}
          />
        )}
      </View>
    </View>
  );
};

interface ViewAllAssignedTasksModalProps {
  visible: boolean;
  onClose: () => void;
  allAssignedTasks: AssignedTask[];
  taskLibrary: TaskLibraryItem[];
  allUsers: User[];
  onInitiateVerification?: (task: AssignedTask) => void;
  onDeleteAssignment?: (taskId: string) => void;
}

const ViewAllAssignedTasksModal: React.FC<ViewAllAssignedTasksModalProps> = ({
  visible,
  onClose,
  allAssignedTasks,
  taskLibrary,
  allUsers,
  onInitiateVerification,
  onDeleteAssignment,
}) => {
  const [filterStatus, setFilterStatus] = useState<TaskFilterStatus>('all');
  const sortedTasks = useMemo(
    () =>
      [...allAssignedTasks].sort(
        (a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime()
      ),
    [allAssignedTasks]
  );
  const filteredTasks = useMemo(() => {
    switch (filterStatus) {
      case 'assigned':
        return sortedTasks.filter(task => !task.isComplete);
      case 'pending':
        return sortedTasks.filter(task => task.isComplete && task.verificationStatus === 'pending');
      case 'completed':
        return sortedTasks.filter(
          task =>
            task.isComplete && task.verificationStatus && task.verificationStatus !== 'pending'
        );
      case 'all':
      default:
        return sortedTasks;
    }
  }, [sortedTasks, filterStatus]);

  useEffect(() => {
    if (visible) {
      setFilterStatus('all');
    }
  }, [visible]);

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <View style={modalStyles.modalHeader}>
            <Text style={modalStyles.modalTitle}>Assigned Tasks ({filteredTasks.length})</Text>
          </View>
          <View style={modalStyles.filterContainer}>
            <Button
              title="All"
              onPress={() => setFilterStatus('all')}
              color={filterStatus === 'all' ? colors.primary : colors.secondary}
            />
            <Button
              title="Assigned"
              onPress={() => setFilterStatus('assigned')}
              color={filterStatus === 'assigned' ? colors.primary : colors.secondary}
            />
            <Button
              title="Pending"
              onPress={() => setFilterStatus('pending')}
              color={filterStatus === 'pending' ? colors.primary : colors.secondary}
            />
            <Button
              title="Completed"
              onPress={() => setFilterStatus('completed')}
              color={filterStatus === 'completed' ? colors.primary : colors.secondary}
            />
          </View>
          <FlatList
            style={modalStyles.listContainer}
            data={filteredTasks}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <AssignedTaskDetailItem
                item={item}
                taskLibrary={taskLibrary}
                allUsers={allUsers}
                onInitiateVerification={onInitiateVerification}
                onDeleteAssignment={onDeleteAssignment}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={
              <Text style={[appSharedStyles.emptyListText, { padding: 20 }]}>
                No tasks match the current filter.
              </Text>
            }
            contentContainerStyle={{ paddingBottom: 10 }}
          />
          <View style={modalStyles.footer}>
            <Button title="Close" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ViewAllAssignedTasksModal;
