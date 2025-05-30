import React from 'react';

import { View, Text, Button, FlatList, ActivityIndicator } from 'react-native';

import { useQuery } from '@tanstack/react-query';

import { fetchTaskLibrary } from '../../api/taskLibrary';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { AdminTasksSectionProps } from '../../types/componentProps';
import { TaskLibraryItem } from '../../types/dataTypes';
import { AdminTaskLibraryItem } from '../common/AdminTaskLibraryItem';

export const AdminTasksSection: React.FC<AdminTasksSectionProps> = ({
  onInitiateAssignTask,
  onInitiateCreateTask,
  onInitiateEditTask,
  onInitiateDeleteTask,
  onViewVerifications,
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
    <>
      <View style={commonSharedStyles.baseMargin}>
        <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifyCenter]}>
          <Text
            style={[
              commonSharedStyles.baseTitleText,
              commonSharedStyles.baseMarginTopBottom,
              commonSharedStyles.bold,
            ]}
          >
            Task Management
          </Text>
        </View>
        <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseGap]}>
          <Button
            title="Assign Task to Student"
            onPress={onInitiateAssignTask}
            color={colors.primary}
            disabled={deleteTaskMutationPending}
          />
          <Button
            title="View All Assigned Tasks"
            onPress={() => onViewVerifications(false)}
            color={colors.primary}
          />
        </View>
        <Text style={[commonSharedStyles.baseSubTitleText, commonSharedStyles.baseMarginTopBottom]}>
          Task Library ({taskLibrary.length})
        </Text>
        <View style={[commonSharedStyles.baseRow]}>
          <Button
            title="Create New Task Library Item"
            onPress={onInitiateCreateTask}
            disabled={deleteTaskMutationPending || isLoading}
            color={colors.success}
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
            style={commonSharedStyles.baseMarginTopBottom}
            ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
            ListEmptyComponent={() => (
              <Text style={commonSharedStyles.baseEmptyText}>No task library items found.</Text>
            )}
          />
        )}
      </View>
    </>
  );
};
