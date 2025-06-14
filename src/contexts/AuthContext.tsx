// File: src/contexts/AuthContext.tsx

import React, {
  createContext,
  useState,
  useContext,
  useMemo,
  ReactNode,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import { Platform, Keyboard } from 'react-native';

import { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import * as Notifications from 'expo-notifications';
import Toast from 'react-native-toast-message';

// --- RESTORE THESE IMPORTS ---
import { registerForPushNotificationsAsync, savePushToken } from '../lib/notifications';
import { getItem, removeItem, storeItem, CUSTOM_REFRESH_TOKEN_KEY } from '../lib/storageHelper';
import { getSupabase } from '../lib/supabaseClient';

import { User, UserRole } from '../types/dataTypes';

import { claimPin, refreshPinSession } from '../api/auth';
import { fetchUserProfile } from '../api/users';

interface AuthContextType {
  isLoadingSession: boolean;
  isLoadingProfile: boolean;
  session: Session | null;
  supabaseUser: SupabaseAuthUser | null;
  appUser: User | null;
  error: Error | null;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  currentUserRole: UserRole | 'public';
  currentUserId?: string;
  isPinSession: boolean;
  signInWithPin: (pin: string) => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = getSupabase();
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [isPinSession, setIsPinSession] = useState(false);
  const [authError, setAuthError] = useState<Error | null>(null);

  // --- RESTORE THESE REFS ---
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  const supabaseUser = session?.user ?? null;
  const currentAuthUserId = supabaseUser?.id;

  const {
    data: appUser,
    isLoading: isLoadingProfile,
    isError: isErrorProfile,
    error: profileError,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', currentAuthUserId],
    queryFn: () =>
      currentAuthUserId ? fetchUserProfile(currentAuthUserId) : Promise.resolve(null),
    enabled: !isLoading && !!currentAuthUserId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const signOut = useCallback(async () => {
    await removeItem(CUSTOM_REFRESH_TOKEN_KEY);
    await supabase.auth.signOut();
  }, [supabase.auth]);

  const signInWithPin = useCallback(
    async (pin: string) => {
      Keyboard.dismiss();
      setIsLoading(true);
      setAuthError(null);
      try {
        const sessionData = await claimPin(pin);
        await storeItem(CUSTOM_REFRESH_TOKEN_KEY, sessionData.refresh_token);
        const { error } = await supabase.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        });
        if (error) throw error;
        Toast.show({ type: 'success', text1: 'Login Successful!' });
      } catch (e: any) {
        await removeItem(CUSTOM_REFRESH_TOKEN_KEY);
        setAuthError(e);
        setIsLoading(false);
        throw e;
      }
    },
    [supabase.auth]
  );

  const signInWithEmailPassword = useCallback(
    async (email: string, password: string) => {
      Keyboard.dismiss();
      setIsLoading(true);
      setAuthError(null);
      try {
        await removeItem(CUSTOM_REFRESH_TOKEN_KEY);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        Toast.show({ type: 'success', text1: 'Login Initiated!' });
      } catch (e: any) {
        setAuthError(e);
        setIsLoading(false);
        throw e;
      }
    },
    [supabase.auth]
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (_event === 'INITIAL_SESSION' || _event === 'TOKEN_REFRESHED') {
        const storedPinRefreshToken = await getItem(CUSTOM_REFRESH_TOKEN_KEY);
        if (storedPinRefreshToken) {
          if (!session || (session.expires_at && session.expires_at * 1000 < Date.now() + 10000)) {
            try {
              console.log('storedPinRefreshToken:', storedPinRefreshToken);
              const refreshed = await refreshPinSession(storedPinRefreshToken);
              await supabase.auth.setSession({
                access_token: refreshed.access_token,
                refresh_token: storedPinRefreshToken,
              });
              return;
            } catch (e) {
              await signOut();
              return;
            }
          }
        }
      }
      const isCustomPinSession = !!(session?.user?.app_metadata?.provider === 'custom_pin');
      setIsPinSession(isCustomPinSession);
      setSession(session);
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [supabase.auth, signOut]);

  const isAuthenticated = useMemo(
    () => !!session && !!appUser && appUser.status === 'active',
    [session, appUser]
  );

  // --- RESTORED and CORRECTED useEffect for notifications ---
  useEffect(() => {
    if (isAuthenticated && appUser) {
      // On native platforms, we can and should register automatically on login.
      if (Platform.OS !== 'web') {
        registerForPushNotificationsAsync()
          .then(token => {
            if (token) {
              savePushToken(token, appUser);
            }
          })
          .catch(error => {
            console.error('Error during NATIVE push notification registration:', error);
          });
      }
      // On web, the NotificationManager component handles this interaction.

      // These listeners are safe to add on all platforms. They just listen for incoming messages.
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received while app is open:', notification);
        Toast.show({
          type: 'info',
          text1: notification.request.content.title ?? undefined,
          text2: notification.request.content.body ?? undefined,
          visibilityTime: 6000,
        });
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('User tapped on notification:', response);
      });

      return () => {
        if (notificationListener.current) {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      };
    }
  }, [isAuthenticated, appUser]);

  useEffect(() => {
    if (isErrorProfile && profileError) {
      signOut();
    }
  }, [isErrorProfile, profileError, signOut]);

  const currentUserRole: UserRole | 'public' = useMemo(() => {
    if (!isAuthenticated || !appUser) return 'public';
    return appUser.role;
  }, [isAuthenticated, appUser]);

  const value: AuthContextType = useMemo(
    () => ({
      isLoadingSession: isLoading,
      isLoadingProfile,
      session,
      supabaseUser,
      appUser: appUser ?? null,
      error: authError || profileError,
      signOut,
      isAuthenticated,
      currentUserRole,
      currentUserId: appUser?.id,
      isPinSession,
      signInWithPin,
      signInWithEmailPassword,
    }),
    [
      isLoading,
      isLoadingProfile,
      session,
      supabaseUser,
      appUser,
      authError,
      profileError,
      signOut,
      isAuthenticated,
      currentUserRole,
      isPinSession,
      signInWithPin,
      signInWithEmailPassword,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
