// src/components/common/AdminStudentItem.tsx
import React from 'react';

import { Button, Text, View, Image } from 'react-native';

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
  student: User; // MODIFIED: Expects the full User object now
  instruments: Instrument[];
  onViewManage: (studentId: string, role: UserRole) => void;
  onInitiateAssignTask: (studentId: string) => void;
}) => {
  // NEW: Get the avatar source from our helper
  const avatarSource = getUserAvatarSource(student);
  const isActive = student.status === 'active';

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
        {/* NEW: Avatar display logic */}
        {avatarSource ? (
          <Image source={avatarSource} style={commonSharedStyles.baseIcon} />
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
