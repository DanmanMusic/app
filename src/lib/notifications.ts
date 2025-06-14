// src/lib/notifications.ts

import { Platform } from 'react-native';

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { User } from '../types/dataTypes';

import { getSupabase } from './supabaseClient';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | undefined;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Push notification permission not granted.');
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.error('[Notifications] EAS project ID not found in app config. Cannot get token.');
      return null;
    }

    try {
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('[Notifications] Expo Push Token:', token);
    } catch (e) {
      console.error('Failed to get Expo push token', e);
      return null;
    }
  } else {
    console.warn('[Notifications] Must use physical device for Push Notifications');
  }
  return token ?? null;
}

export async function savePushToken(token: string, appUser: User | null): Promise<void> {
  const client = getSupabase();

  if (!appUser?.id || !appUser?.companyId) {
    console.warn('[Notifications] Cannot save push token, user or companyId not available.');
    return;
  }

  const { error } = await client.from('push_tokens').upsert(
    {
      user_id: appUser.id,
      token: token,
      company_id: appUser.companyId,
    },
    { onConflict: 'token' }
  );

  if (error) {
    console.error('[Notifications] Error upserting push token:', error);
  } else {
    console.log('[Notifications] Push token upserted successfully for user:', appUser.id);
  }
}
