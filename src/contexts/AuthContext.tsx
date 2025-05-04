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
import { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { getSupabase } from '../lib/supabaseClient';
import { fetchUserProfile } from '../api/users';
import { refreshPinSession } from '../api/auth';
import { getItem, removeItem, CUSTOM_REFRESH_TOKEN_KEY } from '../lib/storageHelper';
import { User, UserRole } from '../types/dataTypes';

interface AuthState {
  isLoading: boolean;
  session: Session | null;
  supabaseUser: SupabaseAuthUser | null;
  appUser: User | null;
  error: Error | null;
  viewingStudentIdContext: string | null;
  isPinSessionContext: boolean; // Flag to track if the session originated from PIN
}

interface AuthContextType
  extends Omit<AuthState, 'viewingStudentIdContext' | 'isPinSessionContext'> {
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  currentUserRole: UserRole | 'public';
  currentUserId?: string;
  currentViewingStudentId?: string;
  isPinSession: boolean; // Expose the flag
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = getSupabase();
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: true,
    session: null,
    supabaseUser: null,
    appUser: null,
    error: null,
    viewingStudentIdContext: null,
    isPinSessionContext: false,
  });

  // Custom state update logger for debugging pin session flag changes
  const setAuthStateWithLog = useCallback((updater: React.SetStateAction<AuthState>) => {
    setAuthState(prevState => {
      const nextState = typeof updater === 'function' ? updater(prevState) : updater;
      if (prevState.isPinSessionContext !== nextState.isPinSessionContext) {
        // Find caller information (less reliable in bundled JS, but useful for dev)
        let callerInfo = 'unknown caller';
        try {
          // Attempt to get stack trace, might not work well in production builds
          const stackLines = new Error().stack?.split('\n');
          if (stackLines && stackLines.length > 2) {
            // Adjust index based on where setAuthStateWithLog is called from
            // Often the 3rd line (index 2) is the direct caller
            callerInfo = stackLines[2]?.trim() ?? stackLines[1]?.trim() ?? 'unknown stack frame';
          }
        } catch (e) {}
        console.log(
          `[AuthContext setAuthStateWithLog] isPinSessionContext CHANGED from ${prevState.isPinSessionContext} to ${nextState.isPinSessionContext}. Caller: ${callerInfo}`
        );
      }
      return nextState;
    });
  }, []);

  const signOutRef = useRef<() => Promise<void>>(async () => {});

  const signOut = useCallback(async () => {
    console.log('[AuthContext] signOut: Initiating sign out...');
    setAuthStateWithLog(prev => ({ ...prev, isLoading: true }));
    try {
      await removeItem(CUSTOM_REFRESH_TOKEN_KEY);
      console.log('[AuthContext] signOut: Custom refresh token removed.');
    } catch (e) {
      console.error('[AuthContext] signOut: Failed to delete custom token:', e);
    }
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      setAuthStateWithLog({
        isLoading: false,
        session: null,
        supabaseUser: null,
        appUser: null,
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
      setAuthStateWithLog({
        isLoading: false,
        session: null,
        supabaseUser: null,
        appUser: null,
        error: e instanceof Error ? e : new Error('Sign out failed'),
        viewingStudentIdContext: null,
        isPinSessionContext: false,
      });
    }
  }, [supabase.auth, setAuthStateWithLog]);

  useEffect(() => {
    signOutRef.current = signOut;
  }, [signOut]);

  // Effect 1: Check for initial PIN token on mount
  useEffect(() => {
    let isMounted = true;
    console.log('[AuthContext] Mount Effect: Checking for initial session...');
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
          setAuthStateWithLog(prev => ({
            ...prev,
            isLoading: false,
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
          setAuthStateWithLog(prev => ({
            ...prev,
            isLoading: true,
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
              setAuthStateWithLog(prev => ({
                ...prev,
                isLoading: false,
                error: new Error('Failed to apply refreshed session.'),
                session: null,
                supabaseUser: null,
                appUser: null,
                isPinSessionContext: false,
              }));
            }
          } else {
            console.log(
              '[AuthContext] tryInitialPinRefresh: supabase.auth.setSession SUCCEEDED. Listener will handle profile fetch.'
            );
          }
        } catch (refreshError: any) {
          if (!isMounted) return;
          console.error(
            '[AuthContext] tryInitialPinRefresh: refresh API or setSession FAILED:',
            refreshError?.message
          );
          await removeItem(CUSTOM_REFRESH_TOKEN_KEY);
          setAuthStateWithLog(prev => ({
            ...prev,
            isLoading: false,
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
              setAuthStateWithLog(prev => ({
                ...prev,
                isLoading: false,
                session: null,
                supabaseUser: null,
                appUser: null,
                isPinSessionContext: false,
              }));
            } else {
              console.log('[AuthContext] Initial Supabase session found. Assuming non-PIN.');
              setAuthStateWithLog(prev => ({
                ...prev,
                isLoading: true,
                session: session,
                supabaseUser: session.user,
                isPinSessionContext: false,
              }));
            }
          })
          .catch(err => {
            if (isMounted) {
              setAuthStateWithLog(prev => ({
                ...prev,
                isLoading: false,
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
  }, [supabase.auth, setAuthStateWithLog]);

  // Effect 2: Listen for Auth State Changes
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
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          console.log(`[AuthContext] Handling ${event}.`);
          if (session) {
            setAuthStateWithLog(prev => ({
              ...prev,
              session,
              supabaseUser: session.user,
              isLoading: !prev.appUser || prev.appUser.id !== session.user.id,
              error: null,
              isPinSessionContext: isLikelyPinSession,
            }));
          } else {
            console.warn(`[AuthContext] Event ${event} received without session.`);
          }
          break;
        case 'SIGNED_OUT':
          console.log(`[AuthContext] Handling SIGNED_OUT.`);
          setAuthStateWithLog({
            isLoading: false,
            session: null,
            supabaseUser: null,
            appUser: null,
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
  }, [supabase.auth, setAuthStateWithLog]);

  // Effect 3: Fetch App User Profile when Supabase User changes
  useEffect(() => {
    let isProfileFetchMounted = true;
    const userToLoad = authState.supabaseUser;
    const shouldFetch =
      userToLoad && (!authState.appUser || authState.appUser.id !== userToLoad.id);

    if (shouldFetch) {
      console.log(
        `[AuthContext] Profile Fetch Effect: Triggered for user ${userToLoad.id}. Fetching profile...`
      );
      if (!authState.isLoading) {
        setAuthStateWithLog(prev => ({ ...prev, isLoading: true, error: null }));
      }

      fetchUserProfile(userToLoad.id)
        .then(profile => {
          if (!isProfileFetchMounted) return;
          console.log(
            `[AuthContext] Profile Fetch Effect: fetchUserProfile result for ${userToLoad.id}. Profile found: ${!!profile}`
          );
          if (profile) {
            const metaRole = authState.session?.user?.app_metadata?.role;
            const metaViewingId = authState.session?.user?.app_metadata?.viewing_student_id;
            let effectiveRole = profile.role;
            let viewingIdContext = null;

            if (metaRole && ['admin', 'teacher', 'student', 'parent'].includes(metaRole)) {
              if (metaRole === 'parent') {
                effectiveRole = 'parent';
                viewingIdContext = metaViewingId ?? null;
              } else {
                effectiveRole = profile.role === metaRole ? metaRole : profile.role;
              }
            }

            setAuthStateWithLog(prev => {
              if (prev.supabaseUser?.id !== userToLoad.id) {
                console.warn(
                  '[AuthContext] Profile Fetch Effect: User context changed during fetch. Ignoring stale result.'
                );
                return prev;
              }
              const finalAppUser = { ...profile, role: effectiveRole };
              return {
                ...prev,
                isLoading: false,
                appUser: finalAppUser,
                viewingStudentIdContext: viewingIdContext,
                error: null,
              };
            });
          } else {
            console.error(
              `[AuthContext] Profile Fetch Effect: Profile not found for user ${userToLoad.id}. Signing out.`
            );
            signOutRef.current();
          }
        })
        .catch(async error => {
          if (!isProfileFetchMounted) return;
          console.error(
            `[AuthContext] Profile Fetch Effect: Error fetching profile for ${userToLoad.id}:`,
            error?.message
          );
          if (authState.supabaseUser?.id === userToLoad.id) {
            await signOutRef.current();
          } else {
            console.warn(
              '[AuthContext] Profile Fetch Effect: Error caught for a stale user fetch. Ignoring.'
            );
          }
        });
    } else if (!userToLoad && authState.appUser) {
      console.log(
        '[AuthContext] Profile Fetch Effect: supabaseUser is null, ensuring appUser is null.'
      );
      setAuthStateWithLog(prev => ({
        ...prev,
        appUser: null,
        viewingStudentIdContext: null,
        isLoading: false,
      }));
    } else if (!userToLoad && authState.isLoading) {
      console.log(
        '[AuthContext] Profile Fetch Effect: No user to load, setting isLoading to false.'
      );
      setAuthStateWithLog(prev => ({ ...prev, isLoading: false }));
    }

    return () => {
      isProfileFetchMounted = false;
    };
  }, [authState.supabaseUser?.id, authState.session?.access_token, setAuthStateWithLog]);

  // --- Calculate Derived State ---
  const isAuthenticated = useMemo(
    () => !!authState.session && !!authState.appUser && authState.appUser.status === 'active',
    [authState.session, authState.appUser]
  );

  const currentUserRole: UserRole | 'public' = useMemo(() => {
    if (!isAuthenticated || !authState.appUser) return 'public';
    if (authState.viewingStudentIdContext) {
      // If viewing context ID exists, assume parent role
      return 'parent';
    }
    return authState.appUser.role;
  }, [isAuthenticated, authState.appUser, authState.viewingStudentIdContext]);

  const currentUserId = authState.appUser?.id;
  const currentViewingStudentId = authState.viewingStudentIdContext ?? undefined;

  // Construct the context value
  const value: AuthContextType = useMemo(
    () => ({
      isLoading: authState.isLoading,
      session: authState.session,
      supabaseUser: authState.supabaseUser,
      appUser: authState.appUser,
      error: authState.error,
      signOut: signOutRef.current,
      isAuthenticated,
      currentUserRole,
      currentUserId,
      currentViewingStudentId,
      isPinSession: authState.isPinSessionContext,
    }),
    [
      authState.isLoading,
      authState.session,
      authState.supabaseUser,
      authState.appUser,
      authState.error,
      isAuthenticated,
      currentUserRole,
      currentUserId,
      currentViewingStudentId,
      authState.isPinSessionContext,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// useAuth hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
