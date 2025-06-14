// src/components/common/AdminStudentItem.tsx

import React, { useState, useEffect } from 'react'; // MODIFIED: Import useState, useEffect

import { Button, Text, View, Image, ActivityIndicator } from 'react-native'; // MODIFIED: Import ActivityIndicator

import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { Instrument, User, UserRole } from '../../types/dataTypes';
import { getInstrumentNames, getUserAvatarSource, getUserDisplayName } from '../../utils/helpers';

export const AdminStudentItem = ({
  student,
  instruments,
  onViewManage,
  onInitiateAssignTask,
}: {
  student: User;
  instruments: Instrument[];
  onViewManage: (studentId: string, role: UserRole) => void;
  onInitiateAssignTask: (studentId: string) => void;
}) => {
  // MODIFIED: State for the avatar URL and its loading state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);

  // MODIFIED: useEffect to fetch the avatar URL when the student prop is available
  useEffect(() => {
    const fetchAvatar = async () => {
      if (student.avatarPath) {
        setIsLoadingAvatar(true);
        const source = await getUserAvatarSource(student);
        setAvatarUrl(source ? source.uri : null);
        setIsLoadingAvatar(false);
      } else {
        setAvatarUrl(null);
      }
    };

    fetchAvatar();
  }, [student]);

  const isActive = student.status === 'active';
  // REMOVED: The incorrect synchronous call
  // const avatarSource = getUserAvatarSource(student);

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
        {/* MODIFIED: Avatar display logic now handles loading and uses state */}
        {isLoadingAvatar ? (
          <ActivityIndicator style={commonSharedStyles.baseIcon} color={colors.primary} />
        ) : avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={commonSharedStyles.baseIcon} />
        ) : (
          <View style={[commonSharedStyles.baseIcon, commonSharedStyles.avatarPlaceholder]}>
            <Text style={commonSharedStyles.avatarPlaceholderText}>
              {student.firstName?.charAt(0)}
              {student.lastName?.charAt(0)}
            </Text>
          </View>
        )}

        <View>
          <Text style={commonSharedStyles.itemTitle}>{getUserDisplayName(student)}</Text>
          <Text style={commonSharedStyles.baseSecondaryText}>
            Instrument(s): {getInstrumentNames(student.instrumentIds, instruments)}
          </Text>
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

      <View style={[commonSharedStyles.baseRow, { gap: 5, alignSelf: 'center' }]}>
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
