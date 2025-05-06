// src/contexts/AuthContext.tsx
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

import { Platform } from 'react-native';

import { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getItem, removeItem, CUSTOM_REFRESH_TOKEN_KEY } from '../lib/storageHelper';
import { getSupabase } from '../lib/supabaseClient';

import { User, UserRole } from '../types/dataTypes';

import { refreshPinSession } from '../api/auth';
import { fetchUserProfile } from '../api/users';

interface AuthContextType {
  isLoadingSession: boolean;
  isLoadingProfile: boolean;
  session: Session | null;
  supabaseUser: SupabaseAuthUser | null;
  appUser: User | null;
  error: Error | null;
  profileError: Error | null;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  currentUserRole: UserRole | 'public';
  currentUserId?: string;
  currentViewingStudentId?: string;
  isPinSession: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = getSupabase();
  const queryClient = useQueryClient();

  const [internalState, setInternalState] = useState<{
    isLoadingSession: boolean;
    session: Session | null;
    supabaseUser: SupabaseAuthUser | null;
    error: Error | null;
    viewingStudentIdContext: string | null;
    isPinSessionContext: boolean;
  }>({
    isLoadingSession: true,
    session: null,
    supabaseUser: null,
    error: null,
    viewingStudentIdContext: null,
    isPinSessionContext: false,
  });

  const currentAuthUserId = internalState.supabaseUser?.id;
  const {
    data: appUser,
    isLoading: isLoadingProfile,
    isError: isErrorProfile,
    error: profileError,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', currentAuthUserId],
    queryFn: () => {
      if (!currentAuthUserId) return Promise.resolve(null);
      console.log(`[AuthContext useQuery] Fetching profile for user: ${currentAuthUserId}`);
      return fetchUserProfile(currentAuthUserId);
    },
    enabled: !!currentAuthUserId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  const signOutRef = useRef<() => Promise<void>>(async () => {});

  const setInternalStateWithLog = useCallback(
    (updater: React.SetStateAction<typeof internalState>) => {
      setInternalState(prevState => {
        const nextState = typeof updater === 'function' ? updater(prevState) : updater;
        if (prevState.isPinSessionContext !== nextState.isPinSessionContext) {
          let callerInfo = 'unknown caller';
          try {
            const stackLines = new Error().stack?.split('\n');
            if (stackLines && stackLines.length > 2) {
              callerInfo = stackLines[2]?.trim() ?? stackLines[1]?.trim() ?? 'unknown stack frame';
            }
          } catch (_e) {}
          console.log(
            `[AuthContext setInternalState] isPinSessionContext CHANGED from ${prevState.isPinSessionContext} to ${nextState.isPinSessionContext}. Caller: ${callerInfo}`
          );
        }
        if (prevState.session?.access_token !== nextState.session?.access_token)
          console.log('[AuthContext setInternalState] Session access token changed.');
        if (prevState.supabaseUser?.id !== nextState.supabaseUser?.id)
          console.log(
            `[AuthContext setInternalState] Supabase user changed to: ${nextState.supabaseUser?.id}`
          );
        return nextState;
      });
    },
    []
  );

  const signOut = useCallback(async () => {
    console.log('[AuthContext] signOut: Initiating sign out...');
    setInternalStateWithLog(prev => ({ ...prev, isLoadingSession: true, error: null }));
    const userIdToRemove = internalState.supabaseUser?.id;
    try {
      await removeItem(CUSTOM_REFRESH_TOKEN_KEY);
      console.log('[AuthContext] signOut: Custom refresh token removed.');
    } catch (e) {
      console.error('[AuthContext] signOut: Failed to delete custom token:', e);
    }
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (userIdToRemove) {
        queryClient.removeQueries({ queryKey: ['userProfile', userIdToRemove] });
        queryClient.removeQueries({ queryKey: ['balance', userIdToRemove] });
        queryClient.removeQueries({ queryKey: ['assigned-tasks', { studentId: userIdToRemove }] });
        queryClient.removeQueries({ queryKey: ['ticket-history', { studentId: userIdToRemove }] });
        console.log(`[AuthContext] signOut: Removed caches for ${userIdToRemove}`);
      }
      setInternalStateWithLog({
        isLoadingSession: false,
        session: null,
        supabaseUser: null,
        error: error ?? null,
        viewingStudentIdContext: null,
        isPinSessionContext: false,
      });
      if (error) {
        console.error('[AuthContext] signOut: supabase.auth.signOut error:', error);
      } else {
        console.log('[AuthContext] signOut: supabase.auth.signOut completed locally.');
        if (Platform.OS === 'web') {
          console.log('[AuthContext] Web detected, forcing reload after sign out.');
          window.location.reload();
        }
      }
    } catch (e) {
      console.error('[AuthContext] signOut: EXCEPTION during sign out:', e);
      setInternalStateWithLog({
        isLoadingSession: false,
        session: null,
        supabaseUser: null,
        error: e instanceof Error ? e : new Error('Sign out failed'),
        viewingStudentIdContext: null,
        isPinSessionContext: false,
      });
    }
  }, [supabase.auth, setInternalStateWithLog, internalState.supabaseUser?.id, queryClient]);

  useEffect(() => {
    signOutRef.current = signOut;
  }, [signOut]);

  useEffect(() => {
    let isMounted = true;
    const tryInitialPinRefresh = async () => {
      console.log('[AuthContext] tryInitialPinRefresh: START');
      let storedRefreshToken: string | null = null;
      try {
        storedRefreshToken = await getItem(CUSTOM_REFRESH_TOKEN_KEY);
        if (!isMounted) return;
        console.log(
          `[AuthContext] tryInitialPinRefresh: Custom token ${storedRefreshToken ? 'FOUND' : 'NOT FOUND'}`
        );
      } catch (e) {
        console.error('[AuthContext] tryInitialPinRefresh: Error reading refresh token:', e);
        if (isMounted) {
          setInternalStateWithLog(prev => ({
            ...prev,
            isLoadingSession: false,
            error: new Error('Failed to read session.'),
            isPinSessionContext: false,
          }));
        }
        return;
      }

      if (storedRefreshToken) {
        if (isMounted) {
          console.log(
            '[AuthContext] tryInitialPinRefresh: Found PIN token, setting state before refresh...'
          );
          setInternalStateWithLog(prev => ({
            ...prev,
            isLoadingSession: true,
            isPinSessionContext: true,
            error: null,
          }));
        }
        try {
          console.log('[AuthContext] tryInitialPinRefresh: Refreshing PIN session...');
          const refreshedSessionData = await refreshPinSession(storedRefreshToken);
          if (!isMounted) return;
          console.log('[AuthContext] tryInitialPinRefresh: refreshPinSession SUCCEEDED.');
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: refreshedSessionData.access_token,
            refresh_token: storedRefreshToken,
          });
          if (!isMounted) return;
          if (setSessionError) {
            console.error(
              '[AuthContext] tryInitialPinRefresh: supabase.auth.setSession FAILED.',
              setSessionError
            );
            await removeItem(CUSTOM_REFRESH_TOKEN_KEY);
            if (isMounted) {
              setInternalStateWithLog(prev => ({
                ...prev,
                isLoadingSession: false,
                error: new Error('Failed to apply refreshed session.'),
                session: null,
                supabaseUser: null,
                viewingStudentIdContext: null,
                isPinSessionContext: false,
              }));
            }
          } else {
            console.log(
              '[AuthContext] tryInitialPinRefresh: supabase.auth.setSession SUCCEEDED. Listener will update state.'
            );
          }
        } catch (refreshError: any) {
          if (!isMounted) return;
          console.error(
            '[AuthContext] tryInitialPinRefresh: refresh API or setSession FAILED:',
            refreshError?.message
          );
          await removeItem(CUSTOM_REFRESH_TOKEN_KEY);
          setInternalStateWithLog(prev => ({
            ...prev,
            isLoadingSession: false,
            session: null,
            supabaseUser: null,
            appUser: null,
            error: new Error('Session expired or invalid.'),
            viewingStudentIdContext: null,
            isPinSessionContext: false,
          }));
        }
      } else {
        console.log(
          '[AuthContext] tryInitialPinRefresh: No custom token. Checking Supabase session...'
        );
        supabase.auth
          .getSession()
          .then(({ data: { session } }) => {
            if (!isMounted) return;
            if (!session) {
              console.log('[AuthContext] No Supabase session found either.');
              setInternalStateWithLog(prev => ({
                ...prev,
                isLoadingSession: false,
                session: null,
                supabaseUser: null,
                isPinSessionContext: false,
              }));
            } else {
              console.log('[AuthContext] Initial Supabase session found. Assuming non-PIN.');
              setInternalStateWithLog(prev => ({
                ...prev,
                isLoadingSession: false,
                session: session,
                supabaseUser: session.user,
                isPinSessionContext: false,
              }));
            }
          })
          .catch(err => {
            console.error('[AuthContext] Error checking initial Supabase session:', err);
            if (isMounted) {
              setInternalStateWithLog(prev => ({
                ...prev,
                isLoadingSession: false,
                error: err,
                isPinSessionContext: false,
              }));
            }
          });
      }
      console.log('[AuthContext] tryInitialPinRefresh: END');
    };

    tryInitialPinRefresh();
    return () => {
      isMounted = false;
    };
  }, [supabase.auth, setInternalStateWithLog]);

  useEffect(() => {
    let isListenerMounted = true;
    console.log('[AuthContext] Setting up onAuthStateChange listener...');
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isListenerMounted) return;
      console.log(`[AuthContext] Listener Received: Event=${event}, Session=${!!session}`);

      const isLikelyPinSession = session?.access_token
        ? (() => {
            try {
              const payloadB64 = session.access_token.split('.')[1];
              if (!payloadB64) return false;
              const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
              const payload = JSON.parse(payloadJson);
              return payload?.app_metadata?.provider === 'custom_pin';
            } catch (e) {
              console.warn('[AuthContext] Failed to parse access token for PIN check:', e);
              return false;
            }
          })()
        : false;

      console.log(`[AuthContext] Listener: isLikelyPinSession determined: ${isLikelyPinSession}`);

      switch (event) {
        case 'INITIAL_SESSION':
          if (!session) {
            console.log(
              '[AuthContext] INITIAL_SESSION event without session object. Treating as SIGNED_OUT.'
            );
            setInternalStateWithLog(prev => ({
              ...prev,
              isLoadingSession: false,
              session: null,
              supabaseUser: null,
              error: null,
              viewingStudentIdContext: null,
              isPinSessionContext: false,
            }));
          } else {
            setInternalStateWithLog(prev => ({
              ...prev,
              isLoadingSession: false,
              session,
              supabaseUser: session.user,
              error: null,
              isPinSessionContext: isLikelyPinSession,
              viewingStudentIdContext:
                prev.supabaseUser?.id === session.user?.id ? prev.viewingStudentIdContext : null,
            }));
          }
          break;
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          console.log(`[AuthContext] Handling ${event}.`);
          if (session) {
            setInternalStateWithLog(prev => {
              const userChanged = prev.supabaseUser?.id !== session.user?.id;
              return {
                ...prev,
                isLoadingSession: false,
                session,
                supabaseUser: session.user,
                error: null,
                isPinSessionContext: isLikelyPinSession,
                viewingStudentIdContext: userChanged ? null : prev.viewingStudentIdContext,
              };
            });
          } else {
            console.warn(`[AuthContext] Event ${event} received without session.`);
            setInternalStateWithLog({
              isLoadingSession: false,
              session: null,
              supabaseUser: null,
              error: new Error(`Auth event ${event} without session`),
              viewingStudentIdContext: null,
              isPinSessionContext: false,
            });
          }
          break;
        case 'SIGNED_OUT':
          console.log(`[AuthContext] Handling SIGNED_OUT.`);
          setInternalStateWithLog({
            isLoadingSession: false,
            session: null,
            supabaseUser: null,
            error: null,
            viewingStudentIdContext: null,
            isPinSessionContext: false,
          });
          console.log('[AuthContext] SIGNED_OUT: State cleared.');
          break;
        default:
          console.log(`[AuthContext] Unhandled event: ${event}`);
      }
      console.log(`[AuthContext] Listener finished processing event: ${event}.`);
    });
    return () => {
      isListenerMounted = false;
      console.log('[AuthContext] Cleaning up onAuthStateChange listener.');
      subscription?.unsubscribe();
    };
  }, [supabase.auth, setInternalStateWithLog]);

  useEffect(() => {
    const metaRole = internalState.session?.user?.app_metadata?.role;
    const metaViewingId = internalState.session?.user?.app_metadata?.viewing_student_id;
    const viewingIdContext = metaRole === 'parent' && metaViewingId ? metaViewingId : null;

    setInternalStateWithLog(prev => {
      if (prev.viewingStudentIdContext !== viewingIdContext) {
        console.log(
          `[AuthContext] Updating viewingStudentIdContext from ${prev.viewingStudentIdContext} to: ${viewingIdContext}`
        );
        return { ...prev, viewingStudentIdContext: viewingIdContext };
      }
      return prev;
    });
  }, [internalState.session, setInternalStateWithLog]);

  useEffect(() => {
    if (isErrorProfile && profileError && currentAuthUserId) {
      console.error(
        `[AuthContext] Profile query failed for user ${currentAuthUserId}:`,
        profileError.message
      );
      if (profileError.message.includes('not found')) {
        console.warn(`[AuthContext] Profile not found for ${currentAuthUserId}, signing out.`);
        signOutRef.current();
      } else {
        setInternalStateWithLog(prev => ({ ...prev, error: profileError }));
      }
    } else if (!isErrorProfile && internalState.error === profileError) {
      setInternalStateWithLog(prev => ({ ...prev, error: null }));
    }
  }, [
    isErrorProfile,
    profileError,
    currentAuthUserId,
    internalState.error,
    setInternalStateWithLog,
  ]);

  const isAuthenticated = useMemo(
    () => !!internalState.session && !!appUser && appUser.status === 'active',
    [internalState.session, appUser]
  );

  const currentUserRole: UserRole | 'public' = useMemo(() => {
    if (!isAuthenticated || !appUser) return 'public';
    if (internalState.viewingStudentIdContext) {
      return appUser.role === 'parent' ? 'parent' : appUser.role;
    }
    return appUser.role;
  }, [isAuthenticated, appUser, internalState.viewingStudentIdContext]);

  const currentUserId = appUser?.id;
  const currentViewingStudentId = internalState.viewingStudentIdContext ?? undefined;

  const isLoading = internalState.isLoadingSession || isLoadingProfile;

  const value: AuthContextType = useMemo(
    () => ({
      isLoadingSession: internalState.isLoadingSession,
      isLoadingProfile: isLoadingProfile,
      session: internalState.session,
      supabaseUser: internalState.supabaseUser,
      appUser: appUser ?? null,
      error: internalState.error,
      profileError: profileError,
      signOut: signOutRef.current,
      isAuthenticated,
      currentUserRole,
      currentUserId,
      currentViewingStudentId,
      isPinSession: internalState.isPinSessionContext,
    }),
    [
      internalState.isLoadingSession,
      isLoadingProfile,
      internalState.session,
      internalState.supabaseUser,
      appUser,
      internalState.error,
      profileError,
      isAuthenticated,
      currentUserRole,
      currentUserId,
      currentViewingStudentId,
      internalState.isPinSessionContext,
    ]
  );

  useEffect(() => {
    console.log(`[AuthContext] Final isLoading state reported: ${isLoading}`);
  }, [isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
