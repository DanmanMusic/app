import React, { useMemo } from 'react';
import { View, Text, Button, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { fetchUserProfile, fetchAuthUser } from '../../api/users';

import { User } from '../../types/dataTypes';

import { AdminAdminDetailViewProps } from '../../types/componentProps';

import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { colors } from '../../styles/colors';
import { getUserDisplayName } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';

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
      <View style={[styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Admin Details...</Text>
      </View>
    );
  }

  if (profileError || !adminProfile) {
    return (
      <View style={appSharedStyles.container}>
        <Text style={commonSharedStyles.errorText}>
          Error loading admin profile: {profileErrorMsg?.message || 'Admin not found.'}
        </Text>
      </View>
    );
  }

  if (adminProfile.role !== 'admin') {
    return (
      <View style={appSharedStyles.container}>
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
    <ScrollView style={appSharedStyles.container}>
      <Text style={appSharedStyles.sectionTitle}>Admin Details</Text>
      <Text style={appSharedStyles.itemDetailText}>Name: {adminDisplayName}</Text>
      <Text style={appSharedStyles.itemDetailText}>ID: {adminProfile.id}</Text>
      <Text style={appSharedStyles.itemDetailText}>
        Status:{' '}
        <Text style={isAdminActive ? styles.activeStatus : styles.inactiveStatus}>
          {adminProfile.status}
        </Text>
      </Text>
      <Text style={appSharedStyles.itemDetailText}>
        Email:{' '}
        {adminAuthDetails?.email ??
          (authDetailsError ? '(Error Fetching)' : '(Not Found/No Email)')}
      </Text>
      {!needsPinLogin && !authDetailsError && adminAuthDetails?.email && (
        <Text style={styles.infoText}>(Email/Password login appears to be set up)</Text>
      )}
      <View
        style={[appSharedStyles.adminStudentActions, appSharedStyles.actionButtonsContainer]}
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
          adminAuthDetails?.email && <Text style={styles.infoText}>(PIN login not needed)</Text>}
      </View>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  activeStatus: {
    fontWeight: 'bold',
    color: colors.success,
  },
  inactiveStatus: {
    fontWeight: 'bold',
    color: colors.secondary,
  },
  infoText: {
    fontSize: 12,
    color: colors.textLight,
    fontStyle: 'italic',
    marginTop: 2,
    marginLeft: 5,
  },
  loadingText: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 16,
  },
});
