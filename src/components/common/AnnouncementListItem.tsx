// src/components/common/AnnouncementListItem.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Image, ActivityIndicator } from 'react-native';

import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { Announcement } from '../../types/dataTypes';
import { getUserAvatarSource, timestampDisplay } from '../../utils/helpers';

export const AnnouncementListItem = ({ item }: { item: Announcement }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);

  // Check for the special types that can show PII
  const isSpecialType = item.type === 'streak_milestone' || item.type === 'redemption_celebration';

  useEffect(() => {
    const fetchAvatar = async () => {
      if (isSpecialType && item.relatedStudentAvatarPath) {
        setIsLoadingAvatar(true);
        // The getUserAvatarSource helper only needs a partial User object
        const source = await getUserAvatarSource({
          avatarPath: item.relatedStudentAvatarPath,
        });
        setAvatarUrl(source ? source.uri : null);
        setIsLoadingAvatar(false);
      } else {
        setAvatarUrl(null);
        setIsLoadingAvatar(false);
      }
    };

    fetchAvatar();
  }, [item.relatedStudentAvatarPath, isSpecialType]);

  // Render the enhanced view for special types
  if (isSpecialType) {
    return (
      <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseAlignCenter]}>
        {isLoadingAvatar ? (
          <ActivityIndicator style={commonSharedStyles.baseIcon} color={colors.primary} />
        ) : avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={commonSharedStyles.iconAvatar} />
        ) : (
          <View style={[commonSharedStyles.baseIcon, commonSharedStyles.avatarPlaceholder]}>
            <Text style={commonSharedStyles.avatarPlaceholderText}>
              {item.relatedStudentName?.charAt(0)}
            </Text>
          </View>
        )}
        <View style={commonSharedStyles.flex1}>
          <Text style={commonSharedStyles.itemTitle}>{item.title}</Text>
          <Text style={commonSharedStyles.baseSecondaryText}>{item.message}</Text>
          <Text style={commonSharedStyles.baseVeryLightText}>{timestampDisplay(item.date)}</Text>
        </View>
      </View>
    );
  }

  // Render the original, simple view for standard 'announcement' types
  return (
    <View>
      <Text style={commonSharedStyles.itemTitle}>{item.title}</Text>
      <Text style={commonSharedStyles.baseSecondaryText}>{item.message}</Text>
      <Text style={commonSharedStyles.baseVeryLightText}>{timestampDisplay(item.date)}</Text>
    </View>
  );
};
