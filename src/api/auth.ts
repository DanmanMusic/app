// src/api/auth.ts
import { getSupabase } from '../lib/supabaseClient';
import { UserRole } from '../types/dataTypes'; // Import UserRole if needed for typing response

// Define the structure expected back from the 'claim-onetime-pin' function
// This should match the ClaimPinSuccessResponse interface in the Edge Function
interface ClaimPinApiResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'bearer';
  user_id: string;
  role: UserRole; // Use the UserRole type
  viewing_student_id?: string;
}

/**
 * Calls the Edge Function to claim a one-time PIN and retrieve session tokens.
 * @param pin The plain-text PIN entered by the user.
 * @returns An object containing session tokens and user info if successful.
 */
export const claimPin = async (pin: string): Promise<ClaimPinApiResponse> => {
    const client = getSupabase();
    console.log(`[API] Calling claim-onetime-pin Edge Function for PIN ending in ...${pin.slice(-2)}`);

    // Prepare payload
    const payload = { pin: pin };

    // Invoke the Edge Function
    // Function name must match deployment ('claim-onetime-pin')
    const { data, error } = await client.functions.invoke('claim-onetime-pin', {
        body: payload,
        // No Authorization header needed, as this is typically an unauthenticated request
    });

    if (error) {
        console.error('[API] Error invoking claim-onetime-pin function:', error);
        // Attempt to extract a more specific error message
        let detailedError = error.message || 'Unknown function error';
         if (error.context && typeof error.context === 'object' && error.context !== null && 'error' in error.context) {
             detailedError = String((error.context as any).error) || detailedError;
         } else {
             try {
                 const parsed = JSON.parse(error.message);
                 if (parsed && parsed.error) detailedError = String(parsed.error);
             } catch (e) { /* Ignore */ }
         }
         if (error.context?.message) {
             detailedError += ` (Context: ${error.context.message})`;
         }
         // Specific check for common PIN errors
         if (detailedError.toLowerCase().includes('invalid or expired pin') || detailedError.toLowerCase().includes('pin has already been used')) {
             throw new Error('Invalid or expired PIN. Please get a new one from an administrator.');
         }

        throw new Error(`PIN Claim Failed: ${detailedError}`);
    }

    // Validate the structure of the successful response data
    console.log('[API] claim-onetime-pin Edge Function returned:', data);
    if (
        !data || typeof data !== 'object' ||
        typeof data.access_token !== 'string' || !data.access_token ||
        typeof data.refresh_token !== 'string' || !data.refresh_token ||
        typeof data.user_id !== 'string' || !data.user_id ||
        typeof data.role !== 'string' || !data.role
        // viewing_student_id is optional
    ) {
        console.error('[API] claim-onetime-pin function returned unexpected data structure:', data);
        throw new Error('PIN claim function returned invalid data format.');
    }

    // Cast and return the validated data
    return data as ClaimPinApiResponse;
};


/**
 * Calls the Edge Function to refresh a session using a refresh token obtained via PIN login.
 * @param refreshToken The opaque refresh token string.
 * @returns An object containing the new access token and user info if successful.
 */
export const refreshPinSession = async (refreshToken: string): Promise<Omit<ClaimPinApiResponse, 'refresh_token'>> => {
     const client = getSupabase();
     console.log(`[API] Calling refresh-pin-session Edge Function.`);

     const payload = { refresh_token: refreshToken };

     const { data, error } = await client.functions.invoke('refresh-pin-session', {
         body: payload,
     });

     if (error) {
        console.error('[API] Error invoking refresh-pin-session function:', error);
        let detailedError = error.message || 'Unknown function error';
        // Add similar detailed error parsing as above if needed
         if (error.context && typeof error.context === 'object' && error.context !== null && 'error' in error.context) { detailedError = String((error.context as any).error) || detailedError; }
         else { try { const parsed = JSON.parse(error.message); if (parsed && parsed.error) detailedError = String(parsed.error); } catch (e) { /* Ignore */ } }
         if (error.context?.message) { detailedError += ` (Context: ${error.context.message})`; }

         // Specific check for refresh errors
          if (detailedError.toLowerCase().includes('invalid refresh token') || detailedError.toLowerCase().includes('expired')) {
             throw new Error('Session expired or invalid. Please log in again.');
         }

        throw new Error(`Session refresh failed: ${detailedError}`);
    }

     console.log('[API] refresh-pin-session Edge Function returned:', data);
     // Validate response structure (similar to claimPin, but might not include refresh_token if not rolling)
     if ( !data || typeof data !== 'object' || typeof data.access_token !== 'string' || !data.access_token || typeof data.user_id !== 'string' || !data.user_id || typeof data.role !== 'string' || !data.role ) {
        console.error('[API] refresh-pin-session function returned unexpected data structure:', data);
        throw new Error('Session refresh function returned invalid data format.');
     }

     // Return data, excluding refresh_token if not rolling (match return type)
     return data as Omit<ClaimPinApiResponse, 'refresh_token'>;
};
