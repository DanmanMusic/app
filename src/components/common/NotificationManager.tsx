// File: src/components/common/NotificationManager.tsx

import React, { useState, useEffect } from 'react';

import { Platform } from 'react-native';

import * as Notifications from 'expo-notifications';
import Toast from 'react-native-toast-message';

import { useAuth } from '../../contexts/AuthContext';
import { registerForPushNotificationsAsync, savePushToken } from '../../lib/notifications';
import { colors } from '../../styles/colors';
import { CustomButton } from './CustomButton';
import { PlusIcon } from 'react-native-heroicons/solid';

const NotificationManager = () => {
  const { appUser } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  if (Platform.OS !== 'web') {
    return null;
  }

  useEffect(() => {
    const checkPermissions = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      console.log('[NotificationManager] Permission status is:', status);
      setPermissionStatus(status);
      setIsLoading(false);
    };

    checkPermissions();
  }, []);

  const handleEnableNotifications = async () => {
    if (!appUser) return;
    setIsLoading(true);

    const token = await registerForPushNotificationsAsync();
    if (token) {
      await savePushToken(token, appUser);
      Toast.show({ type: 'success', text1: 'Notifications Enabled!' });
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Permission Denied',
        text2: 'Notifications were not enabled.',
      });
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
    }
    setIsLoading(false);
  };

  if (isLoading || permissionStatus === 'granted' || permissionStatus === 'denied') {
    return null;
  }

  if (permissionStatus === 'undetermined') {
    return (
      <CustomButton
        title={isLoading ? 'Loading...' : 'Notifications'}
        onPress={handleEnableNotifications}
        color={colors.info}
        disabled={isLoading}
        leftIcon={<PlusIcon color={colors.textWhite} size={18} />}
      />
    );
  }

  return null;
};

export default NotificationManager;
