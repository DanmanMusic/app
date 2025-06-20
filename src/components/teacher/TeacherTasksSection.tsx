// src/components/teacher/TeacherTasksSection.tsx
import React from 'react';

import { View, Text, FlatList, ActivityIndicator } from 'react-native';

import { useQuery } from '@tanstack/react-query';

import { fetchTaskLibrary } from '../../api/taskLibrary';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { TeacherTasksSectionProps } from '../../types/componentProps';
import { TaskLibraryItem } from '../../types/dataTypes';
import { TeacherTaskLibraryItem } from './TeacherTaskLibraryItem';
import { CustomButton } from '../common/CustomButton';
import { InboxArrowDownIcon, MagnifyingGlassIcon, PlusIcon } from 'react-native-heroicons/solid';

export const TeacherTasksSection: React.FC<TeacherTasksSectionProps> = ({
  onInitiateAssignTaskGeneral,
  onViewAllTasks,
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
    queryKey: ['task-library', { viewer: 'teacher' }],
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
          { marginBottom: 20, alignItems: 'flex-start' },
        ]}
      >
        <CustomButton
          title="Assign Task"
          onPress={onInitiateAssignTaskGeneral}
          color={colors.primary}
          leftIcon={<InboxArrowDownIcon color={colors.textWhite} size={18} />}
        />
        <CustomButton
          title="View All Assigned Tasks"
          onPress={onViewAllTasks}
          color={colors.primary}
          leftIcon={<MagnifyingGlassIcon color={colors.textWhite} size={18} />}
        />
      </View>

      <Text style={[commonSharedStyles.baseSubTitleText, commonSharedStyles.baseMarginTopBottom]}>
        Task Library ({taskLibrary.length})
      </Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <CustomButton
          title="Create New Library Task"
          onPress={onInitiateCreateTask}
          color={colors.success}
          leftIcon={<PlusIcon color={colors.textWhite} size={18} />}
        />
      </View>

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
            renderItem={({ item }) => (
              <TeacherTaskLibraryItem
                item={item}
                onEdit={onInitiateEditTask}
                onDelete={onInitiateDeleteTask}
                disabled={deleteTaskMutationPending}
              />
            )}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ paddingBottom: 10 }}
          />
        ) : (
          <Text style={commonSharedStyles.baseEmptyText}>Task library is empty. Create one!</Text>
        ))}
    </View>
  );
};
