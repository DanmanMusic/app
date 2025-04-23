// src/components/teacher/TeacherTasksSection.tsx
import React from 'react';
import { View, Text, FlatList, Button, ActivityIndicator } from 'react-native'; // Removed StyleSheet as not needed yet

import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';

import { TaskLibraryItemTeacher } from '../../views/TeacherView'; // Assuming this stays in TeacherView or moves to common
import { adminSharedStyles } from '../admin/adminSharedStyles'; // Re-use styles if applicable
import { appSharedStyles } from '../../styles/appSharedStyles';
// import { colors } from '../../styles/colors'; // Import if needed

interface TeacherTasksSectionProps {
    taskLibrary: TaskLibraryItem[];
    isLoading: boolean; // Loading state for task library query
    isError: boolean;   // Error state
    assignTaskMutationPending: boolean; // Is assign task mutation running?
    onInitiateAssignTaskGeneral: () => void; // Callback to open assign task modal
}

export const TeacherTasksSection: React.FC<TeacherTasksSectionProps> = ({
    taskLibrary,
    isLoading,
    isError,
    assignTaskMutationPending,
    onInitiateAssignTaskGeneral,
}) => {
    return (
        <View>
            <Text style={appSharedStyles.sectionTitle}>Task Management</Text>
            {/* Assign Task Button */}
            <View style={{ alignItems: 'flex-start', marginBottom: 20 }}>
              <Button title="Assign Task" onPress={onInitiateAssignTaskGeneral} disabled={assignTaskMutationPending}/>
            </View>
            {/* Task Library List */}
            <Text style={adminSharedStyles.sectionSubTitle}> Task Library ({taskLibrary.length}) </Text>
            {isLoading && <ActivityIndicator color={appSharedStyles.primary}/>}
            {isError && <Text style={appSharedStyles.textDanger}>Error loading task library.</Text>}
            {!isLoading && !isError && ( taskLibrary.length > 0 ? (
               <FlatList
                data={taskLibrary.sort((a, b) => a.title.localeCompare(b.title))} // Sort library tasks
                keyExtractor={item => item.id}
                renderItem={({ item }) => <TaskLibraryItemTeacher item={item} />} // Move/import component
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            ) : (
              <Text style={appSharedStyles.emptyListText}>Task library is empty.</Text>
            ))}
        </View>
    );
};