// src/components/admin/AdminAdminDetailView.tsx

import React, { useMemo, useState, useEffect } from 'react';

import { View, Text, ActivityIndicator, ScrollView, Image } from 'react-native';

import { useQuery } from '@tanstack/react-query';

import { fetchUserProfile, fetchAuthUser } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { AdminAdminDetailViewProps } from '../../types/componentProps';
import { User } from '../../types/dataTypes';
import { getUserDisplayName, getUserAvatarSource } from '../../utils/helpers';
import { CustomButton } from '../common/CustomButton';
import { QrCodeIcon, WrenchScrewdriverIcon } from 'react-native-heroicons/solid';

export const AdminAdminDetailView: React.FC<AdminAdminDetailViewProps> = ({
  viewingUserId,
  onInitiateStatusUser,
  onInitiatePinGeneration,
}) => {
  const { currentUserId } = useAuth();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);

  const {
    data: adminProfile,
    isLoading: profileLoading,
    isError: profileError,
    error: profileErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', viewingUserId],
    queryFn: () => fetchUserProfile(viewingUserId),
    enabled: !!viewingUserId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const fetchAvatar = async () => {
      if (adminProfile?.avatarPath) {
        setIsLoadingAvatar(true);
        const source = await getUserAvatarSource(adminProfile);
        setAvatarUrl(source ? source.uri : null);
        setIsLoadingAvatar(false);
      } else {
        setAvatarUrl(null);
      }
    };

    fetchAvatar();
  }, [adminProfile]);

  const {
    data: adminAuthDetails,
    isLoading: authDetailsLoading,
    isError: authDetailsError,
  } = useQuery<{ email: string | null } | null, Error>({
    queryKey: ['authUser', viewingUserId],
    queryFn: () => fetchAuthUser(viewingUserId),
    enabled: !!adminProfile,
    staleTime: 5 * 60 * 1000,
  });

  const adminDisplayName = useMemo(
    () => (adminProfile ? getUserDisplayName(adminProfile) : 'Loading...'),
    [adminProfile]
  );
  const isAdminActive = useMemo(() => adminProfile?.status === 'active', [adminProfile]);

  const needsPinLogin = useMemo(() => {
    if (authDetailsLoading || authDetailsError || !adminAuthDetails?.email) return false;
    return adminAuthDetails.email.endsWith('@placeholder.app');
  }, [adminAuthDetails, authDetailsLoading, authDetailsError]);

  const handleStatus = () => {
    if (adminProfile && onInitiateStatusUser) onInitiateStatusUser(adminProfile);
  };
  const handlePinGenerationClick = () => {
    if (adminProfile && onInitiatePinGeneration) onInitiatePinGeneration(adminProfile);
  };

  const isLoading = profileLoading || authDetailsLoading;
  if (isLoading) {
    return (
      <View style={[commonSharedStyles.baseCentered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text>Loading Admin Details...</Text>
      </View>
    );
  }
  if (profileError || !adminProfile) {
    return (
      <View style={commonSharedStyles.flex1}>
        <Text style={commonSharedStyles.errorText}>
          Error loading admin profile: {profileErrorMsg?.message || 'Admin not found.'}
        </Text>
      </View>
    );
  }
  if (adminProfile.role !== 'admin') {
    return (
      <View style={commonSharedStyles.flex1}>
        <Text style={commonSharedStyles.errorText}>Error: User found but is not an admin.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={commonSharedStyles.flex1}>
      <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifyCenter]}>
        <Text
          style={[
            commonSharedStyles.baseTitleText,
            commonSharedStyles.baseMarginTopBottom,
            commonSharedStyles.bold,
          ]}
        >
          Admin Details
        </Text>
      </View>

      <View style={{ alignItems: 'center', marginBottom: 15 }}>
        {isLoadingAvatar ? (
          <ActivityIndicator style={commonSharedStyles.detailAvatar} color={colors.primary} />
        ) : avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={commonSharedStyles.detailAvatar}
            resizeMode="cover"
          />
        ) : (
          <View style={[commonSharedStyles.detailAvatar, commonSharedStyles.avatarPlaceholder]}>
            <Text style={commonSharedStyles.avatarPlaceholderTextLarge}>
              {adminProfile.firstName?.charAt(0)}
              {adminProfile.lastName?.charAt(0)}
            </Text>
          </View>
        )}
      </View>

      <Text style={commonSharedStyles.baseSecondaryText}>
        Name: <Text style={commonSharedStyles.bold}>{adminDisplayName}</Text>
      </Text>
      <Text style={commonSharedStyles.baseSecondaryText}>
        ID: <Text style={commonSharedStyles.bold}>{adminProfile.id}</Text>
      </Text>
      <Text style={commonSharedStyles.baseSecondaryText}>
        Status:{' '}
        <Text
          style={
            isAdminActive ? commonSharedStyles.activeStatus : commonSharedStyles.inactiveStatus
          }
        >
          {adminProfile.status}
        </Text>
      </Text>
      <Text style={commonSharedStyles.baseSecondaryText}>
        Email:{' '}
        <Text style={commonSharedStyles.bold}>
          {adminAuthDetails?.email ??
            (authDetailsError ? '(Error Fetching)' : '(Not Found/No Email)')}
        </Text>
      </Text>

      {!needsPinLogin && !authDetailsError && adminAuthDetails?.email && (
        <Text style={commonSharedStyles.baseLightText}>
          (Email/Password login appears to be set up)
        </Text>
      )}

      <View
        style={[
          commonSharedStyles.baseRow,
          commonSharedStyles.baseGap,
          commonSharedStyles.baseMarginTopBottom,
        ]}
      >
        <CustomButton
          title="Manage Status"
          onPress={handleStatus}
          color={colors.secondary}
          disabled={adminProfile.id === currentUserId}
          leftIcon={
            <WrenchScrewdriverIcon
              color={adminProfile.id === currentUserId ? colors.disabledText : colors.textWhite}
              size={18}
            />
          }
        />
        {onInitiatePinGeneration && needsPinLogin && (
          <CustomButton
            title="Login (PIN)"
            onPress={handlePinGenerationClick}
            color={colors.info}
            disabled={!isAdminActive}
            leftIcon={
              <QrCodeIcon
                color={!isAdminActive ? colors.disabledText : colors.textWhite}
                size={18}
              />
            }
          />
        )}
      </View>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
};
