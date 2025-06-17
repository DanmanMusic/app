// src/components/teacher/TeacherStudentsSection.tsx
import React from 'react';

import { View, Text, FlatList, ActivityIndicator } from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import { usePaginatedStudentsWithStats } from '../../hooks/usePaginatedStudentsWithStats';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { TeacherStudentsSectionProps } from '../../types/componentProps';
import { AdminStudentItem } from '../common/AdminStudentItem';

export const TeacherStudentsSection: React.FC<TeacherStudentsSectionProps> = ({
  instruments,
  onViewProfile,
  onAssignTask,
}) => {
  const { currentUserId: teacherId } = useAuth();

  // Use the new, more powerful hook, filtering by this teacher's ID
  const {
    students: studentsWithStats,
    isLoading,
    isError,
    error,
    // Note: We are not using pagination/filters in this specific view, but the hook supports it.
  } = usePaginatedStudentsWithStats({ teacherId: teacherId ?? undefined });

  return (
    <View style={[commonSharedStyles.baseMargin]}>
      <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifyCenter]}>
        <Text
          style={[
            commonSharedStyles.baseTitleText,
            commonSharedStyles.baseMarginTopBottom,
            commonSharedStyles.bold,
          ]}
        >
          My Students ({studentsWithStats.length})
        </Text>
      </View>
      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />}
      {isError && (
        <Text style={commonSharedStyles.errorText}>Error loading students: {error?.message}</Text>
      )}
      {!isLoading &&
        !isError &&
        (studentsWithStats.length > 0 ? (
          <FlatList
            // The RPC sorts by last_name, so we don't need to sort here
            data={studentsWithStats}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              // Use the enhanced AdminStudentItem to display the stats
              <AdminStudentItem
                student={item}
                instruments={instruments}
                onViewManage={onViewProfile}
                onInitiateAssignTask={onAssignTask}
              />
            )}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        ) : (
          <Text style={commonSharedStyles.baseEmptyText}> No students linked to you. </Text>
        ))}
    </View>
  );
};
