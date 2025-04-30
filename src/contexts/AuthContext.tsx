// src/contexts/AuthContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  useMemo,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';
import { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import Toast from 'react-native-toast-message';
import { Platform } from 'react-native'; // Keep Platform import

import { getSupabase } from '../lib/supabaseClient';
import { fetchUserProfile } from '../api/users';
import { refreshPinSession } from '../api/auth';
import { storeItem, getItem, removeItem, CUSTOM_REFRESH_TOKEN_KEY } from '../lib/storageHelper'; // Using storage helper
import { User, UserRole } from '../types/dataTypes';

// Interface for the internal state
interface AuthState {
  isLoading: boolean;
  session: Session | null;
  supabaseUser: SupabaseAuthUser | null;
  appUser: User | null; // Holds the detailed user profile from our 'profiles' table
  error: Error | null;
  viewingStudentIdContext: string | null; // Specific ID being viewed (for Parent role)
}

// Interface for the context value exposed to consumers
interface AuthContextType extends Omit<AuthState, 'viewingStudentIdContext'> {
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  currentUserRole: UserRole | 'public'; // The effective role for UI purposes
  currentUserId?: string; // The ID of the logged-in user (parent, student, etc.)
  currentViewingStudentId?: string; // The ID of the student being viewed (if parent)
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

  // Sign out function using local scope workaround
  const signOut = useCallback(async () => {
    console.log("[AuthContext] Signing out using { scope: 'local' }...");
    try {
      await removeItem(CUSTOM_REFRESH_TOKEN_KEY); // Clear custom token
    } catch (e) {
      console.error('[AuthContext] Failed to delete custom token on sign out:', e);
    }
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' }); // Use local scope
      if (error) {
        console.error("[AuthContext] supabase.auth.signOut({ scope: 'local' }) error:", error);
        // Still clear state manually if Supabase call errors
        setAuthState({
          isLoading: false,
          session: null,
          supabaseUser: null,
          appUser: null,
          error: error,
          viewingStudentIdContext: null,
        });
      } else {
        console.log("[AuthContext] supabase.auth.signOut({ scope: 'local' }) completed.");
        // Let the onAuthStateChange listener handle the final state clearing via SIGNED_OUT event.
      }
    } catch (e) {
      console.error("[AuthContext] EXCEPTION during supabase.auth.signOut({ scope: 'local' }):", e);
      // Clear state manually on exception
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

  // Effect for initial custom PIN refresh token check
  useEffect(() => {
    const tryInitialPinRefresh = async () => {
      console.log('[AuthContext] Initial Check: Looking for custom PIN refresh token...');
      let storedRefreshToken: string | null = null;
      try {
        storedRefreshToken = await getItem(CUSTOM_REFRESH_TOKEN_KEY);
      } catch (e) {
        console.error('[AuthContext] Error reading refresh token from storage:', e);
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: new Error('Failed to read session.'),
        }));
        return;
      }

      if (storedRefreshToken) {
        console.log('[AuthContext] Found custom refresh token. Attempting refresh...');
        try {
          const refreshedSessionData = await refreshPinSession(storedRefreshToken);
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: refreshedSessionData.access_token,
            refresh_token: storedRefreshToken,
          });
          if (setSessionError) throw new Error('Failed to apply refreshed session.');
          console.log('[AuthContext] Custom PIN refresh successful. Session updated.');
          // onAuthStateChange will now fire with the updated session
        } catch (refreshError: any) {
          console.error('[AuthContext] Custom PIN refresh failed:', refreshError?.message);
          await signOut(); // Use local scope signOut
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            error: new Error('Session expired.'),
          }));
        }
      } else {
        console.log('[AuthContext] No custom refresh token found.');
        // If no custom token and listener hasn't already set a session, stop loading
        setAuthState(prev => {
          if (!prev.session && prev.isLoading) return { ...prev, isLoading: false };
          return prev;
        });
      }
    };
    tryInitialPinRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Effect for Supabase standard auth state changes (updates session/supabaseUser ONLY)
  useEffect(() => {
    console.log('[AuthContext] Setting up onAuthStateChange listener...');
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        `[AuthContext] Listener Event: ${event}`,
        session ? `User: ${session.user.id}` : 'No session'
      );

      switch (event) {
        case 'INITIAL_SESSION':
          if (session) {
            console.log(
              '[AuthContext] INITIAL_SESSION: Session found. Setting session state, profile fetch will follow.'
            );
            // Set session, keep loading true if appUser isn't loaded for this user yet
            setAuthState(prev => ({
              ...prev,
              session,
              supabaseUser: session.user,
              isLoading: prev.appUser?.id === session.user.id ? false : true,
              error: null,
            }));
          } else {
            console.log('[AuthContext] INITIAL_SESSION: No session found.');
            setAuthState(prev => ({
              ...prev,
              isLoading: false,
              session: null,
              supabaseUser: null,
              appUser: null,
              error: null,
              viewingStudentIdContext: null,
            }));
          }
          break;

        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          if (session) {
            console.log(
              `[AuthContext] Event ${event}: Session updated. Setting session state, profile fetch will follow.`
            );
            setAuthState(prev => ({
              ...prev,
              session,
              supabaseUser: session.user,
              isLoading: prev.appUser?.id === session.user.id ? false : true, // Keep loading only if user changes or appUser is null
              error: null,
            }));
          } else {
            console.warn(`[AuthContext] Event ${event} received without session. Signing out.`);
            await signOut();
          }
          break;

        case 'SIGNED_OUT':
          console.log(`[AuthContext] Event ${event}: Clearing state.`);
          try {
            await removeItem(CUSTOM_REFRESH_TOKEN_KEY);
          } catch (e) {
            console.error('[AuthContext] Listener failed to clear custom token:', e);
          }
          setAuthState({
            isLoading: false,
            session: null,
            supabaseUser: null,
            appUser: null,
            error: null,
            viewingStudentIdContext: null,
          });
          break;

        default:
          console.log(`[AuthContext] Unhandled event: ${event}`);
      }
    });

    return () => {
      console.log('[AuthContext] Cleaning up onAuthStateChange listener.');
      subscription?.unsubscribe();
    };
  }, [supabase.auth, signOut]); // Depend on signOut for defensive clearing

  // NEW useEffect to Fetch Profile based on supabaseUser change
  useEffect(() => {
    const userToLoad = authState.supabaseUser;
    const shouldFetch =
      userToLoad &&
      (!authState.appUser || authState.appUser.id !== userToLoad.id || authState.isLoading);

    if (shouldFetch) {
      console.log(
        `[AuthContext] Profile Fetch Effect: Triggered for user ${userToLoad.id}. Current appUser ID: ${authState.appUser?.id}`
      );
      if (!authState.isLoading) {
        setAuthState(prev => ({ ...prev, isLoading: true }));
      }

      let viewingId: string | null = null;
      const metaRole = authState.session?.user?.app_metadata?.role;
      const metaViewingId = authState.session?.user?.app_metadata?.viewing_student_id;
      if (metaRole === 'parent' && metaViewingId) {
        viewingId = metaViewingId;
      }

      fetchUserProfile(userToLoad.id)
        .then(profile => {
          console.log(
            `[AuthContext] Profile Fetch Effect: fetchUserProfile result for ${userToLoad.id}. Profile found: ${!!profile}`
          );
          if (profile) {
            setAuthState(prev => {
              // Double check if the user context changed *during* the async fetch
              if (prev.supabaseUser?.id !== userToLoad.id) {
                console.warn(
                  '[AuthContext] Profile Fetch Effect: User context changed during fetch. Ignoring stale result.'
                );
                return prev; // Ignore stale result
              }
              return {
                ...prev,
                isLoading: false,
                appUser: profile,
                // Re-determine viewingId based on potentially updated session/profile
                viewingStudentIdContext:
                  authState.session?.user?.app_metadata?.role === 'parent' &&
                  authState.session?.user?.app_metadata?.viewing_student_id
                    ? authState.session.user.app_metadata.viewing_student_id
                    : null,
                error: null,
              };
            });
          } else {
            console.error(
              `[AuthContext] Profile Fetch Effect: Profile not found for user ${userToLoad.id}. Signing out.`
            );
            throw new Error(`Profile not found for user.`);
          }
        })
        .catch(async error => {
          console.error(
            `[AuthContext] Profile Fetch Effect: Error fetching profile for ${userToLoad.id}:`,
            error?.message
          );
          // Check if the error happened because the user context changed
          if (authState.supabaseUser?.id === userToLoad.id) {
            await signOut();
            setAuthState(prev => ({
              ...prev,
              isLoading: false,
              error: error ?? new Error('Failed to load profile.'),
            }));
          } else {
            console.warn(
              '[AuthContext] Profile Fetch Effect: Error caught for a stale user fetch. Ignoring.'
            );
          }
        });
    } else if (!userToLoad && !authState.isLoading) {
      // Ensure appUser is cleared if supabaseUser is cleared and we're not loading
      if (authState.appUser !== null) {
        console.log(
          '[AuthContext] Profile Fetch Effect: supabaseUser is null, ensuring appUser is null.'
        );
        setAuthState(prev => ({ ...prev, appUser: null, viewingStudentIdContext: null }));
      }
    }
    // Depend on the ID of the supabaseUser and session changes
  }, [authState.supabaseUser?.id, authState.session, signOut]); // Using ID prevents loop if only session object reference changes

  // Derived state values
  const isAuthenticated = !!authState.session && !!authState.appUser;
  const currentUserRole: UserRole | 'public' = useMemo(() => {
    if (!isAuthenticated || !authState.appUser) return 'public';
    const metaRole = authState.session?.user?.app_metadata?.role;
    return metaRole === 'parent' ? 'parent' : authState.appUser.role;
  }, [isAuthenticated, authState.appUser, authState.session]);
  const currentUserId = authState.appUser?.id;
  const currentViewingStudentId = authState.viewingStudentIdContext ?? undefined;

  // Memoized context value
  const value: AuthContextType = useMemo(
    () => ({
      isLoading: authState.isLoading,
      session: authState.session,
      supabaseUser: authState.supabaseUser,
      appUser: authState.appUser,
      error: authState.error,
      signOut,
      isAuthenticated,
      currentUserRole,
      currentUserId,
      currentViewingStudentId,
    }),
    [authState, signOut, isAuthenticated, currentUserRole, currentUserId, currentViewingStudentId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to consume context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
