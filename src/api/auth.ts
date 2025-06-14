// src/api/auth.ts

import { getSupabase } from '../lib/supabaseClient';

import { UserRole } from '../types/dataTypes';

// MODIFIED: Removed the optional `viewing_student_id` property.
// This interface now accurately reflects the server's response.
interface ClaimPinApiResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'bearer';
  user_id: string;
  role: UserRole;
}

/**
 * Calls the Edge Function to claim a one-time PIN and retrieve session tokens.
 * @param pin The plain-text PIN entered by the user.
 * @returns An object containing session tokens and user info if successful.
 */
export const claimPin = async (pin: string): Promise<ClaimPinApiResponse> => {
  const client = getSupabase();
  console.log(
    `[API] Calling claim-onetime-pin Edge Function for PIN ending in ...${pin.slice(-2)}`
  );

  const payload = { pin: pin };

  const { data, error } = await client.functions.invoke('claim-onetime-pin', {
    body: payload,
  });

  if (error) {
    console.error('[API] Error invoking claim-onetime-pin function:', error);

    let detailedError = error.message || 'Unknown function error';
    if (
      error.context &&
      typeof error.context === 'object' &&
      error.context !== null &&
      'error' in error.context
    ) {
      detailedError = String((error.context as any).error) || detailedError;
    } else {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed && parsed.error) detailedError = String(parsed.error);
      } catch (_e) {}
    }
    if (error.context?.message) {
      detailedError += ` (Context: ${error.context.message})`;
    }

    if (
      detailedError.toLowerCase().includes('invalid or expired pin') ||
      detailedError.toLowerCase().includes('pin has already been used')
    ) {
      throw new Error('Invalid or expired PIN. Please get a new one from an administrator.');
    }

    throw new Error(`PIN Claim Failed: ${detailedError}`);
  }

  // MODIFIED: Updated the data validation check to match the new, simpler interface.
  if (
    !data ||
    typeof data !== 'object' ||
    typeof data.access_token !== 'string' ||
    !data.access_token ||
    typeof data.refresh_token !== 'string' ||
    !data.refresh_token ||
    typeof data.user_id !== 'string' ||
    !data.user_id ||
    typeof data.role !== 'string' ||
    !data.role
  ) {
    console.error('[API] claim-onetime-pin function returned unexpected data structure:', data);
    throw new Error('PIN claim function returned invalid data format.');
  }

  return data as ClaimPinApiResponse;
};

/**
 * Calls the Edge Function to refresh a session using a refresh token obtained via PIN login.
 * @param refreshToken The opaque refresh token string.
 * @returns An object containing the new access token and user info if successful.
 */
export const refreshPinSession = async (
  refreshToken: string
): Promise<Omit<ClaimPinApiResponse, 'refresh_token'>> => {
  const client = getSupabase();
  console.log(`[API] Calling refresh-pin-session Edge Function.`);

  const payload = { refresh_token: refreshToken };

  const { data, error } = await client.functions.invoke('refresh-pin-session', {
    body: payload,
    headers: {},
  });

  if (error) {
    console.error('[API] Error invoking refresh-pin-session function:', error);
    let detailedError = error.message || 'Unknown function error';

    if (
      error.context &&
      typeof error.context === 'object' &&
      error.context !== null &&
      'error' in error.context
    ) {
      detailedError = String((error.context as any).error) || detailedError;
    } else {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed && parsed.error) detailedError = String(parsed.error);
      } catch (_e) {}
    }
    if (error.context?.message) {
      detailedError += ` (Context: ${error.context.message})`;
    }

    if (
      detailedError.toLowerCase().includes('invalid refresh token') ||
      detailedError.toLowerCase().includes('expired')
    ) {
      throw new Error('Session expired or invalid. Please log in again.');
    }

    throw new Error(`Session refresh failed: ${detailedError}`);
  }

  console.log('[API] refresh-pin-session Edge Function returned:', data);

  // This check is already correct as it omits refresh_token.
  if (
    !data ||
    typeof data !== 'object' ||
    typeof data.access_token !== 'string' ||
    !data.access_token ||
    typeof data.user_id !== 'string' ||
    !data.user_id ||
    typeof data.role !== 'string' ||
    !data.role
  ) {
    console.error('[API] refresh-pin-session function returned unexpected data structure:', data);
    throw new Error('Session refresh function returned invalid data format.');
  }

  return data as Omit<ClaimPinApiResponse, 'refresh_token'>;
};

export const hasActivePinSessions = async (userId: string): Promise<boolean> => {
  const client = getSupabase();
  const { count, error } = await client
    .from('active_refresh_tokens')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    console.error(`Error checking for active PIN sessions for user ${userId}:`, error);
    // Don't throw, just return false so the UI doesn't break
    return false;
  }

  return (count ?? 0) > 0;
};

// NEW: Function to call our new Edge Function
export const forceUserLogout = async (targetUserId: string): Promise<{ message: string }> => {
  const client = getSupabase();
  const { data, error } = await client.functions.invoke('force-logout', {
    body: { targetUserId },
  });

  if (error) {
    console.error(`Error invoking force-logout for user ${targetUserId}:`, error);
    throw new Error(error.message || 'Failed to force logout.');
  }

  return data;
};

export const generatePinForUser = async (
  targetUserId: string,
  targetRole: UserRole
): Promise<string> => {
  const client = getSupabase();
  const { data, error } = await client.functions.invoke('generate-onetime-pin', {
    body: { userId: targetUserId, targetRole: targetRole },
  });
  if (error) {
    const detailedError = (error as any).context?.error || error.message;
    throw new Error(`PIN generation failed: ${detailedError}`);
  }
  return data.pin;
};
