// src/components/admin/AdminTasksSection.tsx
import React from 'react';
import { View, Text, StyleSheet, Button, Alert, FlatList, Platform } from 'react-native';

// Import types
import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';
import { SimplifiedStudent } from '../../views/AdminView';

// Import helpers
import { getTaskTitle } from '../../utils/helpers';

// Import shared styles
import { adminSharedStyles } from './adminSharedStyles';


interface AdminTasksSectionProps {
    taskLibrary: TaskLibraryItem[];
    allPupils: SimplifiedStudent[];
    onCreateTaskLibraryItem: (taskData: any) => void;
    onEditTaskLibraryItem: (taskId: string, taskData: any) => void;
    onDeleteTaskLibraryItem: (taskId: string) => void;
    onAssignTask: (taskId: string, studentId: string) => void;
}

// Render item for Task Library list in Admin view - Use shared styles
// Keep (Mock) for Edit/Delete, Keep for Assign Task (prompts)
const AdminTaskLibraryItem = ({ item, onEditDelete, onAssignTaskToStudent }: {
     item: TaskLibraryItem;
     onEditDelete: (taskId: string, action: 'edit' | 'delete') => void;
     onAssignTaskToStudent?: (taskId: string) => void;
    }) => (
     <View style={adminSharedStyles.item}>
         <Text style={adminSharedStyles.itemTitle}>{item.title} ({item.basePoints} pts)</Text>
         <Text>{item.description}</Text>
         <Text style={adminSharedStyles.detailText}>{item.basePoints} Base Points</Text>
         <View style={adminSharedStyles.itemActions}>
             {/* Keep (Mock) as it only alerts */}
             <Button title="Edit (Mock)" onPress={() => onEditDelete(item.id, 'edit')} />
             {/* Keep (Mock) as it only alerts */}
             <Button title="Delete (Mock)" onPress={() => onEditDelete(item.id, 'delete')} color="red" />
              {/* Keep (Mock) as it triggers assign prompt */}
              {onAssignTaskToStudent && <Button title="Assign Task (Mock)" onPress={() => onAssignTaskToStudent(item.id)} />}
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
              "Assign Task",
              `Assign task "${getTaskTitle(taskId, taskLibrary)}" to which student ID? (e.g., student-1)`,
              [
                  { text: "Cancel", style: "cancel" },
                  {
                      text: "Assign",
                      onPress: (studentId) => {
                           if (studentId && allPupils.some(p => p.id === studentId)) {
                              onAssignTask(taskId, studentId);
                          } else {
                              Alert.alert("Invalid Student ID", "Please enter a valid student ID.");
                          }
                      }
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
            <Text style={adminSharedStyles.sectionTitle}>Task Management</Text>
            <View style={{ alignItems: 'flex-start', marginBottom: 20 }}>
                {/* Keep (Mock Flow) as the full multi-student flow isn't implemented */}
                <Button title="Initiate Assign Task (Mock Flow)" onPress={() => Alert.alert("Mock Assign Task Flow", "Simulate admin workflow to assign a task (select student(s), select task).")} />
                {/* Keep (Mock) as it only alerts */}
                <Button title="View All Assigned Tasks (Mock)" onPress={() => alert('Simulate admin viewing all assigned tasks list across all students.')} />
            </View>

            <Text style={adminSharedStyles.sectionSubTitle}>Task Library ({taskLibrary.length})</Text>
            <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
                 {/* Keep (Mock) as it only alerts */}
                <Button title="Create New Task Library Item (Mock)" onPress={() => onCreateTaskLibraryItem({})} />
            </View>
            <FlatList
                data={taskLibrary.sort((a, b) => a.title.localeCompare(b.title))}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <AdminTaskLibraryItem
                        item={item}
                        onEditDelete={handleEditDeleteTaskLibraryItem}
                        onAssignTaskToStudent={handleAssignTaskFromLibrary}
                    />
                )}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                ListEmptyComponent={() => <Text style={adminSharedStyles.emptyListText}>No task library items found.</Text>}
            />
        </View>
    );
};