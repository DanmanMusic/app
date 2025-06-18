// src/components/common/AdminUserItem.tsx

import React, { useState, useEffect } from 'react';

import { Button, Text, View, Image, ActivityIndicator } from 'react-native';

import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { User, UserRole } from '../../types/dataTypes';
import { getUserDisplayName, getUserAvatarSource } from '../../utils/helpers';

export const AdminUserItem = ({
  user,
  onViewManage,
  studentCount,
}: {
  user: User;
  onViewManage: (userId: string, role: UserRole) => void;
  studentCount?: number;
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);

  useEffect(() => {
    const fetchAvatar = async () => {
      if (user.role === 'parent') {
        setAvatarUrl(null);
        return;
      }

      if (user.avatarPath) {
        setIsLoadingAvatar(true);
        const source = await getUserAvatarSource(user);
        setAvatarUrl(source ? source.uri : null);
        setIsLoadingAvatar(false);
      } else {
        setAvatarUrl(null);
      }
    };

    fetchAvatar();
  }, [user]);

  return (
    <View
      style={[
        commonSharedStyles.baseRow,
        commonSharedStyles.justifySpaceBetween,
        commonSharedStyles.baseItem,
        user.status === 'inactive' ? commonSharedStyles.inactiveItem : {},
      ]}
    >
      <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseAlignCenter]}>
        {isLoadingAvatar ? (
          <ActivityIndicator style={commonSharedStyles.baseIcon} color={colors.primary} />
        ) : avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={commonSharedStyles.iconAvatar} />
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
          {user.role === 'teacher' && studentCount !== undefined && (
            <Text style={commonSharedStyles.baseSecondaryText}>
              Linked Students: {studentCount}
            </Text>
          )}          
          {user.role === 'parent' && user.linkedStudentIds && (
            <Text style={commonSharedStyles.baseSecondaryText}>
              Linked Students: {user.linkedStudentIds.length}
            </Text>
          )}
        </View>
      </View>

      <View style={{ alignSelf: 'flex-start' }}>
        <Button
          title="View Details"
          onPress={() => onViewManage(user.id, user.role)}
          color={colors.primary}
        />
      </View>
    </View>
  );
};
