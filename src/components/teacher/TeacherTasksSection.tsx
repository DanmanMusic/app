import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { View, Text, FlatList, Button, ActivityIndicator } from 'react-native';

import { fetchTaskLibrary } from '../../api/taskLibrary';

import { TaskLibraryItem } from '../../types/dataTypes';
import { TaskLibraryItemTeacher } from '../common/TaskLibraryItemTeacher';
import { TeacherTasksSectionProps } from '../../types/componentProps';

import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';

export const TeacherTasksSection: React.FC<TeacherTasksSectionProps> = ({
  onInitiateAssignTaskGeneral,
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
    <View>
      <Text style={appSharedStyles.sectionTitle}>Task Management</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 20 }}>
        <Button title="Assign Task" onPress={onInitiateAssignTaskGeneral} />
      </View>
      <Text style={appSharedStyles.sectionSubTitle}> Task Library ({taskLibrary.length}) </Text>
      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />}
      {isError && (
        <Text style={appSharedStyles.textDanger}>Error loading task library: {error?.message}</Text>
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
          <Text style={appSharedStyles.emptyListText}>Task library is empty.</Text>
        ))}
    </View>
  );
};
