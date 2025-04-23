// src/components/teacher/TeacherTasksSection.tsx
import React from 'react';
import { View, Text, FlatList, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query'; // Import useQuery

// Import API and Types
import { fetchTaskLibrary } from '../../api/taskLibrary';
import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';
// Import updated props type
import { TeacherTasksSectionProps } from '../../types/componentProps'; // Adjust path

// Import styles and components
import { appSharedStyles } from '../../styles/appSharedStyles';
import { adminSharedStyles } from '../admin/adminSharedStyles';
import { colors } from '../../styles/colors';
// Import sub-component (or define locally)
import { TaskLibraryItemTeacher } from '../../views/TeacherView'; // Adjust path


// Use updated props interface
export const TeacherTasksSection: React.FC<TeacherTasksSectionProps> = ({
  assignTaskMutationPending, // Keep mutation state prop
  onInitiateAssignTaskGeneral, // Keep callback prop
}) => {

  // --- Fetch Task Library using TQ ---
  const {
      data: taskLibrary = [], // Fetch internally
      isLoading,              // Use internal loading state
      isError,                // Use internal error state
      error,                  // Use internal error object
  } = useQuery<TaskLibraryItem[], Error>({
      queryKey: ['task-library'],
      queryFn: fetchTaskLibrary,
      staleTime: 10 * 60 * 1000, // Cache library for 10 mins
  });
  // --- End Fetch ---

  return (
    <View>
      <Text style={appSharedStyles.sectionTitle}>Task Management</Text>
      {/* Assign Task Button */}
      <View style={{ alignItems: 'flex-start', marginBottom: 20 }}>
        <Button
          title="Assign Task"
          onPress={onInitiateAssignTaskGeneral} // Use callback prop
          disabled={assignTaskMutationPending} // Use prop for disabled state
        />
      </View>
      {/* Task Library List */}
      <Text style={adminSharedStyles.sectionSubTitle}> Task Library ({taskLibrary.length}) </Text>
      {/* Use internal loading/error states */}
      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />}
      {isError && <Text style={appSharedStyles.textDanger}>Error loading task library: {error?.message}</Text>}
      {!isLoading && !isError && (
          taskLibrary.length > 0 ? (
           <FlatList
            data={taskLibrary.sort((a, b) => a.title.localeCompare(b.title))}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <TaskLibraryItemTeacher item={item} />} // Move/import component
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        ) : (
          <Text style={appSharedStyles.emptyListText}>Task library is empty.</Text>
        )
      )}
    </View>
  );
};

// Local styles if needed
const styles = StyleSheet.create({
    taskLibraryItemTickets: { fontSize: 13, color: colors.textSecondary, marginTop: 5, fontStyle: 'italic' },
});