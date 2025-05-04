// src/components/teacher/TeacherTasksSection.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { View, Text, FlatList, Button, ActivityIndicator } from 'react-native';

import { fetchTaskLibrary } from '../../api/taskLibrary';

import { TaskLibraryItem } from '../../types/dataTypes';
import { TaskLibraryItemTeacher } from '../common/TaskLibraryItemTeacher';
import { TeacherTasksSectionProps } from '../../types/componentProps'; // Will need updating

import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

// Update interface if not already done in types file
// interface TeacherTasksSectionProps {
//   onInitiateAssignTaskGeneral: () => void;
//   onViewAllTasks: () => void; // Add the new prop
// }

export const TeacherTasksSection: React.FC<TeacherTasksSectionProps> = ({
  onInitiateAssignTaskGeneral,
  onViewAllTasks, // Accept the new prop
}) => {
  const {
    data: taskLibrary = [],
    isLoading,
    isError,
    error,
  } = useQuery<TaskLibraryItem[], Error>({
    queryKey: ['task-library'],
    queryFn: fetchTaskLibrary,
    staleTime: 10 * 60 * 1000,
  });

  return (
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
      <View
        style={[
          commonSharedStyles.baseRow,
          commonSharedStyles.baseGap,
          commonSharedStyles.baseMarginTopBottom,
        ]}
      >
        <Button title="Assign Task" onPress={onInitiateAssignTaskGeneral} />
        <Button title="View All Assigned Tasks" onPress={onViewAllTasks} />
      </View>

      <Text style={[commonSharedStyles.baseSubTitleText, commonSharedStyles.baseMarginTopBottom]}>
        {' '}
        Task Library ({taskLibrary.length}){' '}
      </Text>
      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />}
      {isError && (
        <Text style={commonSharedStyles.textDanger}>
          Error loading task library: {error?.message}
        </Text>
      )}
      {!isLoading &&
        !isError &&
        (taskLibrary.length > 0 ? (
          <FlatList
            data={[...taskLibrary].sort((a, b) => a.title.localeCompare(b.title))}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <TaskLibraryItemTeacher item={item} />}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        ) : (
          <Text style={commonSharedStyles.baseEmptyText}>Task library is empty.</Text>
        ))}
    </View>
  );
};
