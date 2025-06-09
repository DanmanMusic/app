// src/components/common/AdminUserItem.tsx
import React from 'react';

import { Button, Text, View, Image } from 'react-native';

import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { User, UserRole } from '../../types/dataTypes';
import { getUserDisplayName, getUserAvatarSource } from '../../utils/helpers'; // MODIFIED: Import getUserAvatarSource

export const AdminUserItem = ({
  user,
  onViewManage,
}: {
  user: User;
  onViewManage: (userId: string, role: UserRole) => void;
}) => {
  const avatarSource = getUserAvatarSource(user); // NEW: Get the avatar source

  return (
    <View
      style={[
        commonSharedStyles.baseRow,
        commonSharedStyles.justifySpaceBetween,
        commonSharedStyles.baseItem,
        user.status === 'inactive' ? commonSharedStyles.inactiveItem : {},
      ]}
    >
      {/* MODIFIED: Wrap text content and avatar in a View for better layout */}
      <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseAlignCenter]}>
        {/* NEW: Avatar display logic */}
        {avatarSource ? (
          <Image source={avatarSource} style={commonSharedStyles.baseIcon} />
        ) : (
          <View style={[commonSharedStyles.baseIcon, commonSharedStyles.avatarPlaceholder]}>
            <Text style={commonSharedStyles.avatarPlaceholderText}>
              {user.firstName?.charAt(0)}
              {user.lastName?.charAt(0)}
            </Text>
          </View>
        )}

        <View>
          <Text style={[commonSharedStyles.baseSubTitleText, commonSharedStyles.bold]}>
            {getUserDisplayName(user)}
          </Text>
          <Text
            style={[
              commonSharedStyles.baseSecondaryText,
              {
                fontWeight: 'bold',
                color: user.status === 'active' ? colors.success : colors.secondary,
              },
            ]}
          >
            Status: {user.status}
          </Text>
          {user.role === 'parent' && user.linkedStudentIds && (
            <Text style={commonSharedStyles.baseSecondaryText}>
              Linked Students: {user.linkedStudentIds.length}
            </Text>
          )}
        </View>
      </View>

      <View style={{ alignSelf: 'center' }}>
        <Button
          title="View Details"
          onPress={() => onViewManage(user.id, user.role)}
          color={colors.primary}
        />
      </View>
    </View>
  );
};
