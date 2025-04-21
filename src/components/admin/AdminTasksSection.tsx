
import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, Alert, FlatList, Platform } from 'react-native';

import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';
import { SimplifiedStudent } from '../../views/AdminView';
import { getTaskTitle } from '../../utils/helpers';
import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';

import CreateTaskLibraryModal from './modals/CreateTaskLibraryModal';
import EditTaskLibraryModal from './modals/EditTaskLibraryModal';
import ConfirmationModal from '../common/ConfirmationModal';
import AssignTaskModal from './modals/AssignTaskModal';
import ViewAllAssignedTasksModal from './modals/ViewAllAssignedTasksModal';
import { AssignedTask } from '../../mocks/mockAssignedTasks';
import { User } from '../../types/userTypes';


interface AdminTasksSectionProps {
  taskLibrary: TaskLibraryItem[];
  allStudents: SimplifiedStudent[];
  allUsers: User[];
  allAssignedTasks: AssignedTask[];
  onCreateTaskLibraryItem: (taskData: Omit<TaskLibraryItem, 'id'>) => void;
  onEditTaskLibraryItem: (taskId: string, taskData: Partial<Omit<TaskLibraryItem, 'id'>>) => void;
  onDeleteTaskLibraryItem: (taskId: string) => void;
  onAssignTask: (taskId: string, studentId: string) => void;
  onInitiateVerification?: (task: AssignedTask) => void;
  onDeleteAssignment?: (taskId: string) => void;
}

const AdminTaskLibraryItem = ({
    item,
    onEdit,
    onDelete,
    onTriggerAssignFlow,
}: {
    item: TaskLibraryItem;
    onEdit: (task: TaskLibraryItem) => void;
    onDelete: (task: TaskLibraryItem) => void;
    onTriggerAssignFlow: (taskId: string) => void;
}) => (
    <View style={appSharedStyles.itemContainer}>
        <Text style={appSharedStyles.itemTitle}>
            {item.title} ({item.baseTickets} pts)
        </Text>
        <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>
        <View style={adminSharedStyles.itemActions}>
            <Button title="Edit" onPress={() => onEdit(item)} />
            <Button title="Delete" onPress={() => onDelete(item)} color={colors.danger} />
            <Button title="Assign (Mock)" onPress={() => onTriggerAssignFlow(item.id)} />
        </View>
    </View>
);


export const AdminTasksSection: React.FC<AdminTasksSectionProps> = ({
  taskLibrary,
  allStudents,
  allUsers,
  allAssignedTasks,
  onCreateTaskLibraryItem,
  onEditTaskLibraryItem,
  onDeleteTaskLibraryItem,
  onAssignTask,
  onInitiateVerification,
  onDeleteAssignment,
}) => {
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskLibraryItem | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskLibraryItem | null>(null);
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [isViewAllModalVisible, setIsViewAllModalVisible] = useState(false);


  const handleAddPress = () => setIsCreateModalVisible(true);
  const handleEditPress = (task: TaskLibraryItem) => { setTaskToEdit(task); setIsEditModalVisible(true); };
  const handleDeletePress = (task: TaskLibraryItem) => { setTaskToDelete(task); setIsDeleteModalVisible(true); };

  const closeCreateModal = () => setIsCreateModalVisible(false);
  const closeEditModal = () => { setIsEditModalVisible(false); setTaskToEdit(null); };
  const closeDeleteModal = () => { setIsDeleteModalVisible(false); setTaskToDelete(null); };
  const closeAssignModal = () => setIsAssignModalVisible(false);
  const closeViewAllModal = () => setIsViewAllModalVisible(false);

  const handleCreateConfirm = (taskData: Omit<TaskLibraryItem, 'id'>) => { onCreateTaskLibraryItem(taskData); closeCreateModal(); };
  const handleEditConfirm = (taskId: string, taskData: Partial<Omit<TaskLibraryItem, 'id'>>) => { onEditTaskLibraryItem(taskId, taskData); closeEditModal(); };
  const handleDeleteConfirm = () => { if (taskToDelete) { onDeleteTaskLibraryItem(taskToDelete.id); } closeDeleteModal(); };


  const handleAssignTaskFromLibraryItem = (taskId: string) => {
    Alert.prompt(
      'Assign Task',
      `Assign task "${getTaskTitle(taskId, taskLibrary)}" to which student ID? (e.g., student-1)`,
      [ { text: 'Cancel', style: 'cancel' }, { text: 'Assign', onPress: studentIdInput => { const studentId = studentIdInput?.trim(); if (studentId && allStudents.some(p => p.id === studentId)) { onAssignTask(taskId, studentId); } else { Alert.alert('Invalid Student ID', `Student ID "${studentId || ''}" not found.`); } } }, ],
      Platform.OS === 'ios' ? 'default' : 'plain-text'
    );
  };


  const handleInitiateAssignTaskFlow = () => {
      setIsAssignModalVisible(true);
  };
  const handleViewAllAssignedTasks = () => {
      setIsViewAllModalVisible(true);
  };

  return (
    <View>
      <Text style={appSharedStyles.sectionTitle}>Task Management</Text>

      <View style={{ alignItems: 'flex-start', marginBottom: 20, gap: 5 }}>

        <Button
          title="Assign Task to Student"
          onPress={handleInitiateAssignTaskFlow}
        />
        <Button
          title="View All Assigned Tasks"
          onPress={handleViewAllAssignedTasks}
        />
      </View>

      <Text style={adminSharedStyles.sectionSubTitle}>Task Library ({taskLibrary.length})</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button
          title="Create New Task Library Item"
          onPress={handleAddPress}
        />
      </View>
      <FlatList
        data={taskLibrary}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <AdminTaskLibraryItem
            item={item}
            onEdit={handleEditPress}
            onDelete={handleDeletePress}
            onTriggerAssignFlow={handleAssignTaskFromLibraryItem}
          />
        )}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
        ListEmptyComponent={() => (
          <Text style={appSharedStyles.emptyListText}>No task library items found.</Text>
        )}
      />


       <CreateTaskLibraryModal visible={isCreateModalVisible} onClose={closeCreateModal} onCreateConfirm={handleCreateConfirm} />
       <EditTaskLibraryModal visible={isEditModalVisible} taskToEdit={taskToEdit} onClose={closeEditModal} onEditConfirm={handleEditConfirm} />
       <ConfirmationModal visible={isDeleteModalVisible} title="Confirm Delete" message={`Are you sure you want to delete the library task "${taskToDelete?.title || ''}"? This might affect currently assigned tasks using it.`} confirmText="Delete Task" onConfirm={handleDeleteConfirm} onCancel={closeDeleteModal} />

       <AssignTaskModal
            visible={isAssignModalVisible}
            onClose={closeAssignModal}
            allStudents={allStudents}
            taskLibrary={taskLibrary}
            onAssignTask={onAssignTask}
       />
       <ViewAllAssignedTasksModal
            visible={isViewAllModalVisible}
            onClose={closeViewAllModal}
            allAssignedTasks={allAssignedTasks}
            taskLibrary={taskLibrary}
            allUsers={allUsers}
            onInitiateVerification={onInitiateVerification}
            onDeleteAssignment={onDeleteAssignment}
       />
    </View>
  );
};