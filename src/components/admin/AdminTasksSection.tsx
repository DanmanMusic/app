// src/components/admin/AdminTasksSection.tsx
import React from 'react';
import { View, Text, StyleSheet, Button, Alert, FlatList, Platform } from 'react-native';

import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';
import { SimplifiedStudent } from '../../views/AdminView';

import { getTaskTitle } from '../../utils/helpers';

import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';


interface AdminTasksSectionProps {
  taskLibrary: TaskLibraryItem[];
  allPupils: SimplifiedStudent[];
  onCreateTaskLibraryItem: (taskData: any) => void;
  onEditTaskLibraryItem: (taskId: string, taskData: any) => void;
  onDeleteTaskLibraryItem: (taskId: string) => void;
  onAssignTask: (taskId: string, studentId: string) => void;
}

const AdminTaskLibraryItem = ({
  item,
  onEditDelete,
  onAssignTaskToStudent,
}: {
  item: TaskLibraryItem;
  onEditDelete: (taskId: string, action: 'edit' | 'delete') => void;
  onAssignTaskToStudent?: (taskId: string) => void;
}) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={appSharedStyles.itemTitle}>
      {item.title} ({item.baseTickets} pts)
    </Text>
    <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>
    <Text style={appSharedStyles.itemDetailText}>{item.baseTickets} Base Tickets</Text>
    <View style={adminSharedStyles.itemActions}>
      <Button title="Edit (Mock)" onPress={() => onEditDelete(item.id, 'edit')} />
      <Button title="Delete (Mock)" onPress={() => onEditDelete(item.id, 'delete')} color={colors.danger} />
      {onAssignTaskToStudent && (
        <Button title="Assign Task (Mock)" onPress={() => onAssignTaskToStudent(item.id)} />
      )}
    </View>
  </View>
);

export const AdminTasksSection: React.FC<AdminTasksSectionProps> = ({
  taskLibrary,
  allPupils,
  onCreateTaskLibraryItem,
  onEditTaskLibraryItem,
  onDeleteTaskLibraryItem,
  onAssignTask,
}) => {
  const handleAssignTaskFromLibrary = (taskId: string) => {
    Alert.prompt(
      'Assign Task',
      `Assign which task ID from library to student "${getTaskTitle(taskId, taskLibrary)}" to which student ID? (e.g., student-1)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: studentId => {
            if (studentId && allPupils.some(p => p.id === studentId)) {
              onAssignTask(taskId, studentId);
            } else {
              Alert.alert('Invalid Student ID', 'Please enter a valid student ID.');
            }
          },
        },
      ],
      Platform.OS === 'ios' ? 'default' : 'plain-text'
    );
  };

  const handleEditDeleteTaskLibraryItem = (taskId: string, action: 'edit' | 'delete') => {
    if (action === 'edit') onCreateTaskLibraryItem({});
    else onDeleteTaskLibraryItem(taskId);
  };

  return (
    <View>
      <Text style={appSharedStyles.sectionTitle}>Task Management</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 20 }}>
        <Button
          title="Initiate Assign Task (Mock Flow)"
          onPress={() =>
            Alert.alert(
              'Mock Assign Task Flow',
              'Simulate admin workflow to assign a task (select student(s), select task).'
            )
          }
        />
        <Button
          title="View All Assigned Tasks (Mock)"
          onPress={() =>
            alert('Simulate admin viewing all assigned tasks list across all students.')
          }
        />
      </View>

      <Text style={adminSharedStyles.sectionSubTitle}>Task Library ({taskLibrary.length})</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button
          title="Create New Task Library Item (Mock)"
          onPress={() => onCreateTaskLibraryItem({})}
        />
      </View>
      <FlatList
        data={taskLibrary.sort((a, b) => a.title.localeCompare(b.title))}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <AdminTaskLibraryItem
            item={item}
            onEditDelete={handleEditDeleteTaskLibraryItem}
            onAssignTaskToStudent={handleAssignTaskFromLibrary}
          />
        )}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
        ListEmptyComponent={() => (
          <Text style={appSharedStyles.emptyListText}>No task library items found.</Text>
        )}
      />
    </View>
  );
};