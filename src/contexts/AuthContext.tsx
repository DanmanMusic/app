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

import { getSupabase } from '../lib/supabaseClient';
import { fetchUserProfile } from '../api/users';
import { refreshPinSession } from '../api/auth';
import { getItem, removeItem, CUSTOM_REFRESH_TOKEN_KEY } from '../lib/storageHelper'; // Using storage helper
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
        // No state change needed here directly as the listener will handle it.
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

  // Effect for Supabase standard auth state changes
  useEffect(() => {
    console.log('[AuthContext] Setting up onAuthStateChange listener...');
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        `[AuthContext] onAuthStateChange event: ${event}`,
        session ? `User: ${session.user.id}` : 'No session'
      );

      const shouldStartLoading =
        session &&
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED');

      // --- Refined isLoading logic ---
      if (
        shouldStartLoading &&
        !authState.isLoading &&
        !(authState.appUser?.id === session?.user.id)
      ) {
        console.log(`[AuthContext] Event ${event}: Setting isLoading=true for profile fetch.`);
        setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      } else if (event === 'SIGNED_OUT') {
        console.log(
          `[AuthContext] Event ${event}: SIGNED_OUT received by listener. Clearing state.`
        );
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
        return;
      } else if (event === 'INITIAL_SESSION' && !session && !authState.session) {
        console.log(
          `[AuthContext] Event ${event}: No session found initially. Setting isLoading=false.`
        );
        setAuthState(prev => ({ ...prev, isLoading: false, error: null }));
        return;
      }
      // --- End Refined isLoading logic ---

      if (session) {
        // Optimization: Skip refetch if session token and user ID haven't changed
        if (
          authState.session?.access_token === session.access_token &&
          authState.appUser?.id === session.user.id
        ) {
          console.log(
            `[AuthContext] Event ${event}: Session data unchanged, skipping profile fetch.`
          );
          // Ensure loading is false if session is unchanged
          if (authState.isLoading) {
            console.log('[AuthContext] Setting isLoading=false because session data is unchanged.');
            setAuthState(prev => ({ ...prev, isLoading: false }));
          }
          return; // Stop processing if session is identical
        }

        console.log(
          `[AuthContext] Event ${event}: Session found/changed. Fetching profile for ${session.user.id}...`
        );
        // Ensure loading is true ONLY IF we passed the optimization check above and aren't already loading
        if (!authState.isLoading) {
          setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
        }

        let userProfile: User | null = null;
        let profileError: Error | null = null;
        let viewingId: string | null = null;

        try {
          userProfile = await fetchUserProfile(session.user.id);
          console.log(`[AuthContext] fetchUserProfile completed. Profile found: ${!!userProfile}`);

          if (userProfile) {
            const metaRole = session.user?.app_metadata?.role;
            const metaViewingId = session.user?.app_metadata?.viewing_student_id;
            if (metaRole === 'parent' && metaViewingId) {
              viewingId = metaViewingId;
            } else {
              viewingId = null;
            }
            const newState: AuthState = {
              isLoading: false,
              session,
              supabaseUser: session.user,
              appUser: userProfile,
              error: null,
              viewingStudentIdContext: viewingId,
            };
            console.log(
              `[AuthContext] Setting state: User=${newState.appUser?.id}, Role=${newState.appUser?.role}, Viewing=${newState.viewingStudentIdContext}`
            );
            setAuthState(newState);
          } else {
            profileError = new Error(`Profile not found for user ID: ${session.user.id}`);
            console.warn(`[AuthContext] ${profileError.message}`);
          }
        } catch (fetchError: any) {
          profileError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
          console.error(`[AuthContext] Error during profile fetch:`, profileError?.message);
        }

        if (!userProfile || profileError) {
          console.error(`[AuthContext] Profile fetch failed or profile not found. Signing out.`);
          await signOut(); // Use local scope signOut
          // Update state after signOut to reflect the error that caused it
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            error: profileError ?? new Error('User profile could not be loaded.'),
          }));
        }
        // @ts-expect-error - TS cannot track prior conditions here
      } else if (event !== 'SIGNED_OUT' && event !== 'INITIAL_SESSION') {
        // Handle unexpected events without a session
        console.log(
          `[AuthContext] Event ${event} occurred without session. Ensuring logged out state.`
        );
        if (authState.session) {
          await signOut(); // Use local scope signOut
        } else if (authState.isLoading) {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      }
    });

    return () => {
      console.log('[AuthContext] Cleaning up onAuthStateChange listener.');
      subscription?.unsubscribe();
    };
  }, [supabase.auth, authState.session, authState.appUser, authState.isLoading, signOut]); // Include signOut in dependencies

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
