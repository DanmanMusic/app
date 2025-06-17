// src/components/student/AvailableTasks.tsx
import React, { useMemo } from 'react';
import { View, Text, Button, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import {
  fetchSelfAssignableTasks,
  selfAssignTask,
  SelfAssignableTask, // --- THE FIX: Import the type from the API file ---
} from '../../api/taskLibrary';
import { handleOpenUrl, handleViewAttachment } from '../../lib/supabaseClient';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { Attachment, Url } from '../../types/dataTypes';


interface AvailableTasksProps {
  studentId: string;
}

// REMOVED: The incorrect local re-declaration of SelfAssignableTask

interface GroupedTasks {
  [locationName: string]: SelfAssignableTask[];
}

const AvailableTasks: React.FC<AvailableTasksProps> = ({ studentId }) => {
  const queryClient = useQueryClient();

  const {
    data: availableTasks = [],
    isLoading,
    isError,
    error,
  } = useQuery<SelfAssignableTask[], Error>({
    queryKey: ['selfAssignableTasks', studentId],
    queryFn: () => fetchSelfAssignableTasks(studentId),
    enabled: !!studentId,
  });

  const assignMutation = useMutation({
    mutationFn: (variables: { taskLibraryId: string; studentId: string }) =>
      selfAssignTask(variables.taskLibraryId, variables.studentId),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Task Assigned!', text2: 'The new task is now in your list.' });
      queryClient.invalidateQueries({ queryKey: ['selfAssignableTasks', studentId] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks', { studentId }] });
    },
    onError: (err: Error) => {
      Toast.show({ type: 'error', text1: 'Assignment Failed', text2: err.message });
    },
  });

  const groupedTasks = useMemo((): GroupedTasks => {
    return availableTasks.reduce((acc, task) => {
      const locationName = task.journey_location_name || 'Uncategorized';
      if (!acc[locationName]) acc[locationName] = [];
      acc[locationName].push(task);
      return acc;
    }, {} as GroupedTasks);
  }, [availableTasks]);

  if (isLoading) return <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />;
  if (isError) return <Text style={commonSharedStyles.errorText}>Error loading available tasks: {error.message}</Text>;
  if (availableTasks.length === 0) return <Text style={commonSharedStyles.baseEmptyText}>No new journey tasks available right now.</Text>;

  return (
    <View style={{ gap: 15 }}>
      {Object.entries(groupedTasks).map(([locationName, tasks]) => (
        <View key={locationName} style={commonSharedStyles.baseItem}>
          <Text style={commonSharedStyles.baseSubTitleText}>{locationName}</Text>
          {tasks.map(task => (
            <View key={task.id} style={{ borderTopWidth: 1, borderColor: colors.borderSecondary, marginTop: 10, paddingTop: 10 }}>
              <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifySpaceBetween, commonSharedStyles.baseAlignCenter]}>
                <View style={[commonSharedStyles.flex1, { gap: 4, marginRight: 10 }]}>
                  <Text style={commonSharedStyles.itemTitle}>{task.title} ({task.base_tickets} pts)</Text>
                  {task.description && <Text style={commonSharedStyles.baseSecondaryText}>{task.description}</Text>}
                  
                  {task.urls?.map(link => (
                    <TouchableOpacity key={link.id} onPress={() => handleOpenUrl(link.url)}>
                      <Text style={commonSharedStyles.baseSecondaryText}>{link.label || 'Reference'}: <Text style={commonSharedStyles.linkText}>{link.url}</Text></Text>
                    </TouchableOpacity>
                  ))}
                  {task.attachments?.map(att => (
                    <TouchableOpacity key={att.id} onPress={() => handleViewAttachment(att.file_path)}>
                      <Text style={commonSharedStyles.baseSecondaryText}>Attachment: <Text style={commonSharedStyles.linkText}>{att.file_name}</Text></Text>
                    </TouchableOpacity>
                  ))}
                  
                </View>
                <View>
                  <Button
                    title={assignMutation.isPending ? 'Assigning...' : 'Assign to Me'}
                    onPress={() => assignMutation.mutate({ taskLibraryId: task.id, studentId })}
                    disabled={assignMutation.isPending}
                    color={colors.success}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

export default AvailableTasks;