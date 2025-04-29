import React from 'react';
import { View, Text, Button, FlatList, ActivityIndicator } from 'react-native';

import { fetchTaskLibrary } from '../../api/taskLibrary';

import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { adminSharedStyles } from '../../styles/adminSharedStyles';
import { colors } from '../../styles/colors';
import { AdminTaskLibraryItem } from '../common/AdminTaskLibraryItem';

import { AdminTasksSectionProps } from '../../types/componentProps';
import { useQuery } from '@tanstack/react-query';
import { TaskLibraryItem } from '../../types/dataTypes';

export const AdminTasksSection: React.FC<AdminTasksSectionProps> = ({
  onInitiateAssignTask,
  onInitiateCreateTask,
  onInitiateEditTask,
  onInitiateDeleteTask,
  deleteTaskMutationPending,
}) => {
  const {
    data: taskLibrary = [],
    isLoading,
    isError,
    error,
  } = useQuery<TaskLibraryItem[], Error>({
    queryKey: ['task-library'],
    queryFn: fetchTaskLibrary,
    staleTime: 5 * 60 * 1000,
  });

  const getErrorMessage = () => {
    if (!error) return 'An unknown error occurred.';
    return `Error loading task library: ${error.message}`;
  };

  return (
    <View>
      <Text style={appSharedStyles.sectionTitle}>Task Management</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 20, gap: 5 }}>
        <Button
          title="Assign Task to Student"
          onPress={onInitiateAssignTask}
          disabled={deleteTaskMutationPending}
        />
      </View>
      <Text style={adminSharedStyles.sectionSubTitle}>Task Library ({taskLibrary.length})</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button
          title="Create New Task Library Item"
          onPress={onInitiateCreateTask}
          disabled={deleteTaskMutationPending || isLoading}
        />
      </View>
      {isLoading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
      )}
      {isError && !isLoading && (
        <View style={commonSharedStyles.errorContainer}>
          <Text style={commonSharedStyles.errorText}>{getErrorMessage()}</Text>
        </View>
      )}
      {!isLoading && !isError && (
        <FlatList
          data={taskLibrary}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AdminTaskLibraryItem
              item={item}
              onEdit={onInitiateEditTask}
              onDelete={onInitiateDeleteTask}
              disabled={deleteTaskMutationPending}
            />
          )}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No task library items found.</Text>
          )}
        />
      )}
    </View>
  );
};
