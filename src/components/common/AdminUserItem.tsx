// src/components/common/AdminUserItem.tsx

import React, { useState, useEffect } from 'react'; // MODIFIED: Import useState and useEffect

import { Button, Text, View, Image, ActivityIndicator } from 'react-native'; // MODIFIED: Import ActivityIndicator

import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { User, UserRole } from '../../types/dataTypes';
import { getUserDisplayName, getUserAvatarSource } from '../../utils/helpers';

export const AdminUserItem = ({
  user,
  onViewManage,
}: {
  user: User;
  onViewManage: (userId: string, role: UserRole) => void;
}) => {
  // MODIFIED: State for the avatar URL and its loading state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);

  // MODIFIED: useEffect to fetch the avatar URL when the user prop is available
  useEffect(() => {
    const fetchAvatar = async () => {
      // Don't show avatars for parents, as per the new requirement
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
        setAvatarUrl(null); // Ensure avatar is cleared if user has no path
      }
    };

    fetchAvatar();
  }, [user]); // Re-run this effect if the user object itself changes

  // REMOVED: The incorrect synchronous call
  // const avatarSource = getUserAvatarSource(user);

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
        {/* MODIFIED: Avatar display logic now handles loading and uses state */}
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
