// src/components/admin/AdminTasksSection.tsx
import React from 'react';
import { View, Text, Button, FlatList, ActivityIndicator } from 'react-native';

// Import the Supabase-backed API function
import { fetchTaskLibrary } from '../../api/taskLibrary'; // This now fetches from Supabase

// Import common components and styles
import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles'; // For error text
import { adminSharedStyles } from '../../styles/adminSharedStyles'; // For sub-title style
import { colors } from '../../styles/colors';
import { AdminTaskLibraryItem } from '../common/AdminTaskLibraryItem'; // Renders individual items

// Prop types and React Query hook
import { AdminTasksSectionProps } from '../../types/componentProps';
import { useQuery } from '@tanstack/react-query';
import { TaskLibraryItem } from '../../types/dataTypes'; // Type used by the query

// Note: The props interface likely still expects the data and handlers
// We will fetch the data here using useQuery

export const AdminTasksSection: React.FC<AdminTasksSectionProps> = ({
  // Remove props that are now handled internally by useQuery
  onInitiateAssignTask,
  onInitiateCreateTask,
  onInitiateEditTask,
  onInitiateDeleteTask,
  deleteTaskMutationPending, // Keep this prop to disable buttons during delete
}) => {

  // Fetch Task Library data using React Query
  const {
    data: taskLibrary = [], // Default to empty array
    isLoading,
    isError,
    error,
  } = useQuery<TaskLibraryItem[], Error>({
    queryKey: ['task-library'], // Standard query key for the library
    queryFn: fetchTaskLibrary, // Use the API function that hits Supabase
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Helper to format error message
  const getErrorMessage = () => {
    if (!error) return 'An unknown error occurred.';
    return `Error loading task library: ${error.message}`;
  };

  return (
    <View>
      {/* Section Title */}
      <Text style={appSharedStyles.sectionTitle}>Task Management</Text>

      {/* Assign Task Button (General) */}
      <View style={{ alignItems: 'flex-start', marginBottom: 20, gap: 5 }}>
        <Button
          title="Assign Task to Student"
          onPress={onInitiateAssignTask}
          // Disable if library is loading? Optional UX choice.
          // disabled={isLoading || deleteTaskMutationPending}
          disabled={deleteTaskMutationPending}
        />
      </View>

      {/* Task Library Sub-section */}
      <Text style={adminSharedStyles.sectionSubTitle}>Task Library ({taskLibrary.length})</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button
          title="Create New Task Library Item"
          onPress={onInitiateCreateTask}
          disabled={deleteTaskMutationPending || isLoading} // Disable if loading or deleting
        />
      </View>

      {/* Loading State */}
      {isLoading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <View style={commonSharedStyles.errorContainer}>
          <Text style={commonSharedStyles.errorText}>{getErrorMessage()}</Text>
        </View>
      )}

      {/* Task Library List */}
      {!isLoading && !isError && (
        <FlatList
          data={taskLibrary} // Data comes directly from useQuery
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AdminTaskLibraryItem
              item={item}
              onEdit={onInitiateEditTask} // Pass handler down
              onDelete={onInitiateDeleteTask} // Pass handler down
              disabled={deleteTaskMutationPending} // Disable item actions during delete
            />
          )}
          scrollEnabled={false} // Assuming parent ScrollView handles scrolling
          ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No task library items found.</Text>
          )}
        />
      )}
    </View>
  );
};