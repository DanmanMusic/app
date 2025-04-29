import React, { createContext, useState, useContext, useMemo, ReactNode, useEffect } from 'react';
import { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import Toast from 'react-native-toast-message';

import { getSupabase } from '../lib/supabaseClient';
import { fetchUserProfile } from '../api/users';

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

  /*
  const attemptCustomRefresh = async (): Promise<boolean> => {
      console.log('[AuthContext] Custom refresh attempt DISABLED.');

      return false;
  };
  */

  const attemptCustomRefresh = async (): Promise<boolean> => {
    console.warn('[AuthContext] attemptCustomRefresh called but is disabled.');
    return false;
  };

  const signOut = async () => {
    console.log('[AuthContext] Signing out...');
    await supabase.auth.signOut();
    setAuthState({
      isLoading: false,
      session: null,
      supabaseUser: null,
      appUser: null,
      error: null,
      viewingStudentIdContext: null,
    });
    console.log('[AuthContext] Sign out complete.');
  };

  useEffect(() => {
    console.log('[AuthContext] Setting up onAuthStateChange listener (Custom Refresh Disabled)...');

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        `[AuthContext] onAuthStateChange event: ${event}`,
        session ? `User: ${session.user.id}` : 'No session'
      );

      let shouldStartLoading = false;
      if (
        session &&
        (event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED')
      ) {
        shouldStartLoading = true;
      }

      if (shouldStartLoading) {
        console.log(`[AuthContext] Event ${event}: Setting isLoading to true.`);
        setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      } else if (event === 'SIGNED_OUT') {
        console.log(`[AuthContext] Event ${event}: Setting isLoading to false and clearing state.`);
        setAuthState({
          isLoading: false,
          session: null,
          supabaseUser: null,
          appUser: null,
          error: null,
          viewingStudentIdContext: null,
        });
        return;
      } else if (event === 'INITIAL_SESSION' && !session) {
        console.log(`[AuthContext] Event ${event} with no session. Setting isLoading to false.`);
        setAuthState(prev => ({ ...prev, isLoading: false, error: null }));
        return;
      }

      if (session) {
        console.log(
          `[AuthContext] Event ${event}: Session found. Attempting profile fetch for user ${session.user.id}...`
        );
        let userProfile: User | null = null;
        let profileError: Error | null = null;

        try {
          userProfile = await fetchUserProfile(session.user.id);
          console.log(
            `[AuthContext] fetchUserProfile returned for user ${session.user.id}. Profile found:`,
            !!userProfile
          );

          if (userProfile) {
            console.log('[AuthContext] Profile fetched successfully. Updating state:', {
              userId: userProfile.id,
              role: userProfile.role,
            });

            const viewingId = null;

            const newState: AuthState = {
              isLoading: false,
              session,
              supabaseUser: session.user,
              appUser: userProfile,
              error: null,
              viewingStudentIdContext: viewingId,
            };
            console.log('[AuthContext] Calling setAuthState with successful profile:', newState);
            setAuthState(newState);
            setTimeout(
              () =>
                console.log(
                  '[AuthContext] State after profile success update (delayed):',
                  authState
                ),
              50
            );

            console.log(`[AuthContext] Event ${event} processed successfully.`);
          } else {
            profileError = new Error(`Profile not found for user ID: ${session.user.id}`);
            console.warn(
              `[AuthContext] Event ${event}: Session valid but profile fetch returned null for ${session.user.id}.`
            );
          }
        } catch (fetchError: any) {
          profileError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
          console.error(
            `[AuthContext] Event ${event}: Error during fetchUserProfile call:`,
            profileError
          );
        }

        if (!userProfile || profileError) {
          console.error(
            `[AuthContext] Event ${event}: Profile fetch failed or returned null. Setting error state and stopping loading.`
          );
          const errorState: AuthState = {
            isLoading: false,
            session: null,
            supabaseUser: null,
            appUser: null,
            error: profileError,
            viewingStudentIdContext: null,
          };
          console.log('[AuthContext] Calling setAuthState after profile error with:', errorState);
          setAuthState(errorState);
          setTimeout(
            () =>
              console.log('[AuthContext] State after profile error update (delayed):', authState),
            50
          );
        }
      } else if (event !== 'SIGNED_OUT' && event !== 'INITIAL_SESSION') {
        console.log(`[AuthContext] Event ${event} without session. Setting isLoading: false.`);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    });

    return () => {
      console.log('[AuthContext] Cleaning up onAuthStateChange listener.');
      subscription?.unsubscribe();
    };
  }, []);

  const isAuthenticated = !!authState.session && !!authState.appUser;
  const currentUserRole: UserRole | 'public' = authState.appUser?.role ?? 'public';
  const currentUserId = authState.supabaseUser?.id;
  const currentViewingStudentId = authState.viewingStudentIdContext ?? undefined;

  const value: AuthContextType = useMemo(
    () => ({
      isLoading: authState.isLoading,
      session: authState.session,
      supabaseUser: authState.supabaseUser,
      appUser: authState.appUser,
      error: authState.error,
      attemptCustomRefresh,
      signOut,
      isAuthenticated,
      currentUserRole,
      currentUserId,
      currentViewingStudentId,
    }),
    [authState]
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
