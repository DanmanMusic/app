// supabase/functions/claim-onetime-pin/index.ts

import { createClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
// *** Import JWT library functions ***
import { create, getNumericDate, Header } from 'djwt'; // Added this import

// Define expected request body
interface ClaimPinPayload {
  pin: string;
}

// Define response structure for success
interface ClaimPinSuccessResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'bearer';
  user_id: string;
  role: string; // This will be 'student', 'parent', 'admin', or 'teacher'
  viewing_student_id?: string; // Only relevant for 'parent' role
}

// Helper to hash the refresh token (MUST match refresh-pin-session)
// IMPORTANT: Add salting for production security.
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token); // Add salt here!
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Main Function Handler
Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Initialize Supabase Admin Client & Get Secrets
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const jwtSecret = Deno.env.get('CLIENT_JWT_SECRET'); // Custom JWT secret

  // Check necessary environment variables
  if (!supabaseUrl || !serviceRoleKey || !jwtSecret) {
    console.error(
      `Check Failed: Environment variable issue. Vars - URL: ${!!supabaseUrl}, SRK: ${!!serviceRoleKey}, CLIENT_JWT: ${!!jwtSecret}`
    );
    return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: fetch },
  });

  try {
    // 2. Parse Request Body
    let payload: ClaimPinPayload;
    try {
      payload = await req.json();
    } catch (jsonError) {
      console.error('Failed to parse request body:', jsonError);
      return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Validate Payload
    if (!payload.pin || typeof payload.pin !== 'string' || payload.pin.length < 4) {
      // Basic PIN length check
      return new Response(JSON.stringify({ error: 'Invalid or missing PIN.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const submittedPin = payload.pin;

    // 4. Find and Validate One-Time PIN in Database
    const now = new Date();
    const { data: pinData, error: pinFetchError } = await supabaseAdminClient
      .from('onetime_pins')
      .select('user_id, target_role, expires_at, claimed_at') // Select target_role
      .eq('pin', submittedPin)
      .single();

    if (pinFetchError || !pinData) {
      console.warn(
        `PIN Lookup Failed: ${pinFetchError?.message || 'PIN not found.'} for submitted PIN ending ...${submittedPin.slice(-2)}`
      );
      return new Response(JSON.stringify({ error: 'Invalid or expired PIN.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (pinData.claimed_at) {
      console.warn(`Attempt to use already claimed PIN: ${submittedPin}`);
      return new Response(JSON.stringify({ error: 'PIN has already been used.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (now > new Date(pinData.expires_at)) {
      console.warn(
        `Attempt to use expired PIN: ${submittedPin}. Expired at: ${pinData.expires_at}`
      );
      // Clean up expired PIN asynchronously
      supabaseAdminClient.from('onetime_pins').delete().eq('pin', submittedPin).then();
      return new Response(JSON.stringify({ error: 'PIN has expired.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetUserId = pinData.user_id;
    const targetRole = pinData.target_role; // Get the role stored with the PIN

    // Validate the role retrieved from the database
    if (!['student', 'parent', 'admin', 'teacher'].includes(targetRole)) {
      console.error(
        `Invalid target_role ('${targetRole}') found in onetime_pins for PIN ${submittedPin}.`
      );
      // Mark as claimed anyway to prevent reuse, but return error
      await supabaseAdminClient
        .from('onetime_pins')
        .update({ claimed_at: now.toISOString() })
        .eq('pin', submittedPin);
      return new Response(JSON.stringify({ error: 'Invalid user role configuration.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(
      `PIN valid for user ${targetUserId}, target role ${targetRole}. Attempting claim...`
    );

    // 5. Mark PIN as Claimed (atomically using filter)
    const { error: claimError } = await supabaseAdminClient
      .from('onetime_pins')
      .update({ claimed_at: now.toISOString() })
      .eq('pin', submittedPin)
      .is('claimed_at', null); // Only update if not already claimed

    if (claimError) {
      // This could indicate a race condition if claimError occurs despite prior checks
      console.error(
        `Failed to mark PIN ${submittedPin} as claimed (maybe race condition?):`,
        claimError.message
      );
      return new Response(JSON.stringify({ error: 'Failed to claim PIN.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Fetch Auth User Email (for JWT claim, best effort)
    let userEmail = `${targetUserId}@placeholder.app`; // Default placeholder
    try {
      const { data: authUser, error: getAuthUserError } =
        await supabaseAdminClient.auth.admin.getUserById(targetUserId);
      // Use real email only if it exists and isn't the placeholder pattern
      if (
        !getAuthUserError &&
        authUser?.user?.email &&
        !authUser.user.email.endsWith('@placeholder.app')
      ) {
        userEmail = authUser.user.email;
      }
    } catch (e) {
      console.warn(`Exception fetching auth user email for ${targetUserId}: ${e.message}`);
    }
    console.log(`Using email ${userEmail} for JWT claims.`);

    // --- Generate Session Tokens ---
    // a. Generate Opaque Refresh Token & Expiry
    const refreshToken = crypto.randomUUID() + crypto.randomUUID();
    const refreshTokenExpiryDays = 60;
    const refreshTokenExpiresAt = new Date(
      Date.now() + refreshTokenExpiryDays * 24 * 60 * 60 * 1000
    );

    // b. Hash the Refresh Token
    const refreshTokenHash = await hashToken(refreshToken);

    // c. Store Hashed Refresh Token in DB
    const { error: refreshTokenStoreError } = await supabaseAdminClient
      .from('active_refresh_tokens')
      .insert({
        user_id: targetUserId,
        token_hash: refreshTokenHash,
        expires_at: refreshTokenExpiresAt.toISOString(),
      });
    if (refreshTokenStoreError) {
      console.error('Failed to store refresh token hash:', refreshTokenStoreError);
      return new Response(JSON.stringify({ error: 'Session generation failed (RT).' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // d. Generate Signed Short-Lived Access Token JWT
    const accessTokenExpirySeconds = 3600; // 1 hour
    const accessTokenExpiresIn = getNumericDate(accessTokenExpirySeconds);
    const jwtHeader: Header = { alg: 'HS256', typ: 'JWT' };
    // Use the targetRole retrieved from the PIN table for app_metadata
    const jwtPayload = {
      aud: 'authenticated', // Standard claim for Supabase
      exp: accessTokenExpiresIn, // Expiration time
      sub: targetUserId, // Subject (user ID)
      email: userEmail, // User email (can be placeholder)
      role: 'authenticated', // Standard Supabase role
      app_metadata: {
        provider: 'custom_pin', // Indicate how the auth happened
        role: targetRole, // **** CRITICAL: Use the role from the PIN record ****
        // Conditionally add viewing_student_id only if the target role is 'parent'
        ...(targetRole === 'parent' && { viewing_student_id: targetUserId }),
      },
    };

    // Import the JWT secret key
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    // Sign the JWT
    const signedAccessToken = await create(jwtHeader, jwtPayload, key);
    // --- End Token Generation ---

    // 7. Prepare Success Response
    const responseBody: ClaimPinSuccessResponse = {
      access_token: signedAccessToken,
      refresh_token: refreshToken,
      expires_in: accessTokenExpirySeconds,
      token_type: 'bearer',
      user_id: targetUserId,
      role: targetRole, // Return the correct role
      // Conditionally add viewing_student_id for parents
      ...(targetRole === 'parent' && { viewing_student_id: targetUserId }),
    };

    // 8. Clean up the used one-time PIN (fire and forget)
    supabaseAdminClient
      .from('onetime_pins')
      .delete()
      .eq('pin', submittedPin)
      .then(({ error: deleteError }) => {
        if (deleteError)
          console.error(
            `Non-critical: Failed to clean up claimed PIN ${submittedPin}:`,
            deleteError.message
          );
        else console.log(`Successfully cleaned up claimed PIN ending ...${submittedPin.slice(-2)}`);
      });

    console.log(
      `PIN ...${submittedPin.slice(-2)} claimed successfully for user ${targetUserId} as role ${targetRole}. Session generated.`
    );
    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // OK
    });
  } catch (error) {
    console.error('Unhandled Claim PIN Function Error:', error);
    const isAuthError = error.message?.includes('Invalid') || error.message?.includes('expired');
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: isAuthError ? 401 : 500,
      }
    );
  }
});

// console.log('Claim-onetime-pin function initialized (v3 - verified role handling).');
