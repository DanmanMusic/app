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
}

interface AuthContextType extends Omit<AuthState, 'viewingStudentIdContext'> {
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  currentUserRole: UserRole | 'public';
  currentUserId?: string;
  currentViewingStudentId?: string;
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
  });

  const signOutRef = useRef<() => Promise<void>>(async () => {});

  const signOut = useCallback(async () => {
    console.log('[AuthContext] signOut: Initiating sign out...');
    try {
      await removeItem(CUSTOM_REFRESH_TOKEN_KEY);
      console.log('[AuthContext] signOut: Custom refresh token removed from storage.');
    } catch (e) {
      console.error('[AuthContext] signOut: Failed to delete custom token:', e);
    }
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        console.error('[AuthContext] signOut: supabase.auth.signOut error:', error);
        setAuthState({
          isLoading: false,
          session: null,
          supabaseUser: null,
          appUser: null,
          error: error,
          viewingStudentIdContext: null,
        });
      } else {
        console.log('[AuthContext] signOut: supabase.auth.signOut completed locally.');
      }
    } catch (e) {
      console.error('[AuthContext] signOut: EXCEPTION during sign out:', e);
      setAuthState({
        isLoading: false,
        session: null,
        supabaseUser: null,
        appUser: null,
        error: e instanceof Error ? e : new Error('Sign out failed'),
        viewingStudentIdContext: null,
      });
    }
  }, [supabase.auth]);

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
          `[AuthContext] tryInitialPinRefresh: getItem result - Token ${storedRefreshToken ? 'FOUND' : 'NOT FOUND'}`
        );
      } catch (e) {
        console.error('[AuthContext] tryInitialPinRefresh: Error reading refresh token:', e);
        if (isMounted) {
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            error: new Error('Failed to read session.'),
          }));
        }
        return;
      }

      if (storedRefreshToken) {
        console.log('[AuthContext] tryInitialPinRefresh: Attempting refresh API call...');
        try {
          const refreshedSessionData = await refreshPinSession(storedRefreshToken);
          if (!isMounted) return;
          console.log(
            '[AuthContext] tryInitialPinRefresh: refreshPinSession API call SUCCEEDED. Data:',
            refreshedSessionData
          );

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
            throw new Error('Failed to apply refreshed session.');
          } else {
            console.log('[AuthContext] tryInitialPinRefresh: supabase.auth.setSession SUCCEEDED.');
          }
        } catch (refreshError: any) {
          if (!isMounted) return;
          console.error(
            '[AuthContext] tryInitialPinRefresh: refreshPinSession API call or setSession FAILED:',
            refreshError?.message
          );
          try {
            await removeItem(CUSTOM_REFRESH_TOKEN_KEY);
          } catch (e) {}
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            session: null,
            supabaseUser: null,
            appUser: null,
            error: new Error('Session expired or invalid.'),
            viewingStudentIdContext: null,
          }));
        }
      } else {
        console.log('[AuthContext] tryInitialPinRefresh: No token found.');
        setAuthState(prev => {
          if (!isMounted) return prev;
          if (!prev.session && prev.isLoading) {
            return { ...prev, isLoading: false };
          }
          return prev;
        });
      }
      console.log('[AuthContext] tryInitialPinRefresh: END');
    };

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        if (!session) {
          console.log(
            '[AuthContext] No initial Supabase session found, proceeding with custom PIN refresh check.'
          );
          tryInitialPinRefresh();
        } else {
          console.log(
            '[AuthContext] Initial Supabase session found, skipping custom PIN refresh check.'
          );
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      })
      .catch(err => {
        console.error('[AuthContext] Error checking initial Supabase session:', err);
        if (isMounted) {
          tryInitialPinRefresh();
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isListenerMounted = true;
    console.log('[AuthContext] Setting up onAuthStateChange listener...');
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isListenerMounted) return;

      console.log(
        `[AuthContext] Listener Received: Event=${event}, Session=${!!session}, Current isLoading=${authState.isLoading}, Current Session=${!!authState.session}`
      );
      if (session?.expires_at) {
        const expiryDate = new Date(session.expires_at * 1000);
        const now = new Date();
        const diffSeconds = (expiryDate.getTime() - now.getTime()) / 1000;
        console.log(
          `[AuthContext] Listener Session Info: Access Token Expires At: ${expiryDate.toISOString()} (${diffSeconds.toFixed(0)}s from now)`
        );
      }

      switch (event) {
        case 'INITIAL_SESSION':
          console.log(
            `[AuthContext] Handling INITIAL_SESSION. Session ${session ? 'found' : 'not found'}.`
          );
          if (session) {
            setAuthState(prev => ({
              ...prev,
              session,
              supabaseUser: session.user,
              isLoading: !prev.appUser || prev.appUser.id !== session.user.id,
              error: null,
            }));
          } else {
            setAuthState(prev => {
              const stillPotentiallyLoading = prev.isLoading && !prev.session;
              return {
                ...prev,
                isLoading: stillPotentiallyLoading,
                session: null,
                supabaseUser: null,
                appUser: null,
                error: null,
                viewingStudentIdContext: null,
              };
            });
          }
          break;
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          console.log(
            `[AuthContext] Handling ${event}. Session ${session ? 'found' : 'not found'}.`
          );
          if (session) {
            setAuthState(prev => ({
              ...prev,
              session,
              supabaseUser: session.user,
              isLoading: !prev.appUser || prev.appUser.id !== session.user.id,
              error: null,
            }));
          } else {
            console.warn(
              `[AuthContext] Event ${event} received without session. Might be intermediate state or error.`
            );
            // Avoid immediate sign out here
          }
          break;

        case 'SIGNED_OUT':
          console.log(
            `[AuthContext] Handling SIGNED_OUT. Previous state: session=${!!authState.session}, error=${authState.error?.message}`
          );
          try {
            console.log('[AuthContext] SIGNED_OUT: Checking for existing custom refresh token...');
            const storedRefreshToken = await getItem(CUSTOM_REFRESH_TOKEN_KEY);

            if (storedRefreshToken) {
              console.warn(
                '[AuthContext] SIGNED_OUT: Custom token FOUND. Assuming faulty internal refresh. NOT clearing state/token. Manual page refresh likely required.'
              );
              // EXIT EARLY - DO NOT CLEAR STATE OR TOKEN
              break; // Break out of the switch case
            } else {
              // No custom token found - genuine sign out.
              console.log(
                '[AuthContext] SIGNED_OUT: No custom token found. Proceeding with full state clear.'
              );
              if (isListenerMounted) {
                setAuthState({
                  isLoading: false,
                  session: null,
                  supabaseUser: null,
                  appUser: null,
                  error: null,
                  viewingStudentIdContext: null,
                });
                console.log('[AuthContext] SIGNED_OUT: State cleared.');
              }
            }
          } catch (e) {
            console.error('[AuthContext] SIGNED_OUT: Error during custom token check:', e);
            if (isListenerMounted) {
              setAuthState({
                isLoading: false,
                session: null,
                supabaseUser: null,
                appUser: null,
                error: null,
                viewingStudentIdContext: null,
              });
              console.log(
                '[AuthContext] SIGNED_OUT: State cleared due to error during token check.'
              );
            }
          }
          break; // End of SIGNED_OUT case

        default:
          console.log(`[AuthContext] Unhandled event: ${event}`);
      }
      console.log(`[AuthContext] Listener finished processing event: ${event}`);
    });

    return () => {
      isListenerMounted = false;
      console.log('[AuthContext] Cleaning up onAuthStateChange listener.');
      subscription?.unsubscribe();
    };
  }, [supabase.auth]);

  useEffect(() => {
    let isProfileFetchMounted = true;
    const userToLoad = authState.supabaseUser;
    const shouldFetch =
      userToLoad && (!authState.appUser || authState.appUser.id !== userToLoad.id);
    const needsLoadingIndicator = userToLoad && !authState.appUser;

    if (shouldFetch || needsLoadingIndicator) {
      console.log(
        `[AuthContext] Profile Fetch Effect: Triggered for user ${userToLoad?.id}. Current appUser ID: ${authState.appUser?.id}. ShouldFetch: ${shouldFetch}, NeedsLoading: ${needsLoadingIndicator}`
      );
      if (!authState.isLoading || needsLoadingIndicator) {
        setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      }

      if (userToLoad) {
        fetchUserProfile(userToLoad.id)
          .then(profile => {
            if (!isProfileFetchMounted) return;
            console.log(
              `[AuthContext] Profile Fetch Effect: fetchUserProfile result for ${userToLoad.id}. Profile found: ${!!profile}`
            );
            if (profile) {
              setAuthState(prev => {
                if (prev.supabaseUser?.id !== userToLoad.id) {
                  console.warn(
                    '[AuthContext] Profile Fetch Effect: User context changed during fetch. Ignoring stale result.'
                  );
                  return prev;
                }
                const metaRole = prev.session?.user?.app_metadata?.role;
                const metaViewingId = prev.session?.user?.app_metadata?.viewing_student_id;
                const viewingIdContext =
                  metaRole === 'parent' && metaViewingId ? metaViewingId : null;

                return {
                  ...prev,
                  isLoading: false,
                  appUser: profile,
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
      } else {
        if (isProfileFetchMounted) {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      }
    } else if (!userToLoad && !authState.isLoading) {
      if (authState.appUser !== null) {
        console.log(
          '[AuthContext] Profile Fetch Effect: supabaseUser is null, ensuring appUser is null.'
        );
        setAuthState(prev => ({ ...prev, appUser: null, viewingStudentIdContext: null }));
      }
    }

    return () => {
      isProfileFetchMounted = false;
    };
  }, [authState.supabaseUser?.id, authState.session?.access_token]);

  const isAuthenticated =
    !!authState.session && !!authState.appUser && authState.appUser.status === 'active';
  const currentUserRole: UserRole | 'public' = useMemo(() => {
    if (!isAuthenticated || !authState.appUser) return 'public';
    const metaRole = authState.session?.user?.app_metadata?.role;
    if (metaRole && ['admin', 'teacher', 'student', 'parent'].includes(metaRole)) {
      if (metaRole === 'parent') return 'parent';
      return authState.appUser.role === metaRole ? metaRole : authState.appUser.role;
    }
    return authState.appUser.role;
  }, [isAuthenticated, authState.appUser, authState.session]);

  const currentUserId = authState.appUser?.id;
  const currentViewingStudentId = useMemo(() => {
    if (currentUserRole === 'parent') {
      return authState.session?.user?.app_metadata?.viewing_student_id ?? undefined;
    }
    return undefined;
  }, [currentUserRole, authState.session]);

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
