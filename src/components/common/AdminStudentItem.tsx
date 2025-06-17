// src/components/common/AdminStudentItem.tsx
import React, { useState, useEffect } from 'react';

import { Button, Text, View, Image, ActivityIndicator } from 'react-native';

import { StudentWithStats } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext'; // Import useAuth
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { Instrument, UserRole } from '../../types/dataTypes';
import { getInstrumentNames, getUserAvatarSource, getUserDisplayName } from '../../utils/helpers';

export const AdminStudentItem = ({
  student,
  instruments,
  onViewManage,
  onInitiateAssignTask,
}: {
  student: StudentWithStats;
  instruments: Instrument[];
  onViewManage: (studentId: string, role: UserRole) => void;
  onInitiateAssignTask: (studentId: string) => void;
}) => {
  const { currentUserRole } = useAuth(); // Get the role of the viewing user
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);

  useEffect(() => {
    const fetchAvatar = async () => {
      if (student.avatar_path) {
        setIsLoadingAvatar(true);
        const source = await getUserAvatarSource({
          id: student.id,
          companyId: student.companyId,
          avatarPath: student.avatar_path,
        });
        setAvatarUrl(source ? source.uri : null);
        setIsLoadingAvatar(false);
      } else {
        setAvatarUrl(null);
      }
    };

    fetchAvatar();
  }, [student.avatar_path, student.id, student.companyId]);

  const isActive = student.status === 'active';
  const displayName = getUserDisplayName(student);
  const teacherNames = student.teacher_names.join(', ');

  return (
    <View
      style={[
        commonSharedStyles.baseItem,
        commonSharedStyles.baseRow,
        commonSharedStyles.justifySpaceBetween,
        !isActive ? commonSharedStyles.inactiveItem : {},
      ]}
    >
      <View style={[commonSharedStyles.baseRow, { alignItems: 'center' }]}>
        {isLoadingAvatar ? (
          <ActivityIndicator style={commonSharedStyles.baseIcon} color={colors.primary} />
        ) : avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={commonSharedStyles.iconAvatar} />
        ) : (
          <View style={[commonSharedStyles.baseIcon, commonSharedStyles.avatarPlaceholder]}>
            <Text style={commonSharedStyles.avatarPlaceholderText}>
              {student.first_name?.charAt(0)}
              {student.last_name?.charAt(0)}
            </Text>
          </View>
        )}

        <View>
          <Text style={commonSharedStyles.itemTitle}>{displayName}</Text>
          <Text style={[commonSharedStyles.baseSecondaryText, commonSharedStyles.textGold]}>
            Balance: {student.balance}
          </Text>
          <Text style={commonSharedStyles.baseSecondaryText}>
            Streak: {student.current_streak} days
          </Text>
          {student.goal_reward_name && (
            <Text style={commonSharedStyles.baseSecondaryText}>
              Goal: {student.goal_reward_name}
            </Text>
          )}
          {currentUserRole === 'admin' && teacherNames && (
            <Text style={commonSharedStyles.baseSecondaryText}>Teachers: {teacherNames}</Text>
          )}
          <Text
            style={[
              commonSharedStyles.baseSecondaryText,
              { fontWeight: 'bold', color: isActive ? colors.success : colors.secondary },
            ]}
          >
            Status: {isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={[commonSharedStyles.baseRow, { gap: 5, alignSelf: 'flex-start' }]}>
        <Button
          title="View Details"
          onPress={() => onViewManage(student.id, 'student')}
          color={colors.primary}
        />
        {isActive && (
          <Button
            title="Assign Task"
            onPress={() => onInitiateAssignTask(student.id)}
            color={colors.primary}
          />
        )}
      </View>
    </View>
  );
};
