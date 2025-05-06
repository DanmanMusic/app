import { getSupabase } from '../lib/supabaseClient';

import { UserRole } from '../types/dataTypes';

interface ClaimPinApiResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'bearer';
  user_id: string;
  role: UserRole;
  viewing_student_id?: string;
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

  console.log('[API] claim-onetime-pin Edge Function returned:', data);
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
