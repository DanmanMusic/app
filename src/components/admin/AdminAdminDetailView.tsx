import React, { useMemo } from 'react';

import { View, Text, Button, ActivityIndicator, ScrollView } from 'react-native';

import { useQuery } from '@tanstack/react-query';

import { fetchUserProfile, fetchAuthUser } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { AdminAdminDetailViewProps } from '../../types/componentProps';
import { User } from '../../types/dataTypes';
import { getUserDisplayName } from '../../utils/helpers';

export const AdminAdminDetailView: React.FC<AdminAdminDetailViewProps> = ({
  viewingUserId,
  onInitiateStatusUser,
  onInitiatePinGeneration,
}) => {
  const { currentUserId } = useAuth();

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

  const {
    data: adminAuthDetails,
    isLoading: authDetailsLoading,
    isError: authDetailsError,
    error: authDetailsErrorMsg,
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
    if (
      authDetailsLoading ||
      authDetailsError ||
      !adminAuthDetails ||
      adminAuthDetails.email === null
    ) {
      console.log(
        `[AdminAdminDetailView] needsPinLogin=false (loading: ${authDetailsLoading}, error: ${!!authDetailsError}, details: ${!!adminAuthDetails}, email: ${adminAuthDetails?.email})`
      );
      return false;
    }

    const isPlaceholder = adminAuthDetails.email.endsWith('@placeholder.app');
    console.log(
      `[AdminAdminDetailView] needsPinLogin=${isPlaceholder} (email: ${adminAuthDetails.email})`
    );
    return isPlaceholder;
  }, [adminAuthDetails, authDetailsLoading, authDetailsError]);

  const handleStatus = () => {
    if (adminProfile && onInitiateStatusUser) {
      onInitiateStatusUser(adminProfile);
    } else {
      console.warn('Cannot manage status: adminProfile or handler missing.');
    }
  };
  const handlePinGenerationClick = () => {
    if (adminProfile && onInitiatePinGeneration) {
      onInitiatePinGeneration(adminProfile);
    } else {
      console.warn('Cannot generate PIN: adminProfile or handler missing.');
    }
  };

  const isLoading = profileLoading || authDetailsLoading;

  if (isLoading) {
    return (
      <View style={[commonSharedStyles.baseCentered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={commonSharedStyles.baseSecondaryText}>Loading Admin Details...</Text>
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

  if (authDetailsError) {
    console.warn(
      `Could not fetch auth user details for ${viewingUserId}. Error: ${authDetailsErrorMsg?.message}`
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
        <Button
          title="Manage Status"
          onPress={handleStatus}
          color={colors.secondary}
          disabled={adminProfile.id === currentUserId}
        />
        {onInitiatePinGeneration && needsPinLogin && (
          <Button
            title="Generate Login PIN"
            onPress={handlePinGenerationClick}
            color={colors.info}
            disabled={!isAdminActive}
          />
        )}
        {onInitiatePinGeneration && authDetailsError && (
          <Text style={commonSharedStyles.errorText}>
            PIN availability unknown (Auth fetch error)
          </Text>
        )}
        {onInitiatePinGeneration &&
          !needsPinLogin &&
          !authDetailsError &&
          adminAuthDetails?.email && (
            <Text style={commonSharedStyles.baseLightText}>(PIN login not needed)</Text>
          )}
      </View>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
};
