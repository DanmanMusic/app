// supabase/functions/claim-onetime-pin/index.ts

import { createClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
// Import JWT library functions
import { create, getNumericDate, Header } from "djwt";

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
  role: string;
  viewing_student_id?: string;
}

// Helper to hash the refresh token
// IMPORTANT: Add salting for production security.
async function hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token); // Add salt here!
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex; // Minimal logging
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
  // *** Use the manually set secret ***
  const jwtSecret = Deno.env.get('CLIENT_JWT_SECRET');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY'); // Still needed? Maybe not here. Keep check for now.


  // Check necessary environment variables
  if (!supabaseUrl || !serviceRoleKey || !jwtSecret || !anonKey) {
     console.error(`Check Failed: Environment variable issue. Vars - URL: ${!!supabaseUrl}, ANON: ${!!anonKey}, SRK: ${!!serviceRoleKey}, CLIENT_JWT: ${!!jwtSecret}`);
     return new Response(JSON.stringify({ error: "Server configuration error." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
  // console.log("Required environment variables retrieved successfully."); // Reduced logging

  const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: fetch }
  });

  try {
    // 2. Parse Request Body
    let payload: ClaimPinPayload;
    try { payload = await req.json(); }
    catch (jsonError) {
         console.error("Failed to parse request body:", jsonError);
         return new Response(JSON.stringify({ error: "Invalid request body." }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // 3. Validate Payload
    if (!payload.pin || typeof payload.pin !== 'string' || payload.pin.length < 4) {
      return new Response(JSON.stringify({ error: 'Invalid or missing PIN.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
    const submittedPin = payload.pin;

    // 4. Find and Validate One-Time PIN in Database
    const { data: pinData, error: pinFetchError } = await supabaseAdminClient
      .from('onetime_pins').select('user_id, target_role, expires_at, claimed_at')
      .eq('pin', submittedPin).single();

    if (pinFetchError || !pinData) {
      console.warn(`PIN Lookup Failed: ${pinFetchError?.message || 'PIN not found.'}`);
      return new Response(JSON.stringify({ error: 'Invalid or expired PIN.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
    if (pinData.claimed_at) {
      return new Response(JSON.stringify({ error: 'PIN has already been used.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
    const now = new Date();
    if (now > new Date(pinData.expires_at)) {
        await supabaseAdminClient.from('onetime_pins').delete().eq('pin', submittedPin);
        return new Response(JSON.stringify({ error: 'PIN has expired.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
    const targetUserId = pinData.user_id;
    const targetRole = pinData.target_role;
    console.log(`PIN valid for user ${targetUserId}, role ${targetRole}. Attempting claim...`);

    // 5. Mark PIN as Claimed
    const { error: claimError } = await supabaseAdminClient
        .from('onetime_pins').update({ claimed_at: now.toISOString() })
        .eq('pin', submittedPin).is('claimed_at', null);
    if (claimError) {
        console.error(`Failed to mark PIN ${submittedPin} as claimed:`, claimError.message);
        return new Response(JSON.stringify({ error: 'Failed to claim PIN.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // 6. Fetch Auth User Email
    let userEmail = `${targetUserId}@placeholder.app`;
    try {
        const { data: authUser, error: getAuthUserError } = await supabaseAdminClient.auth.admin.getUserById(targetUserId);
        if (!getAuthUserError && authUser?.user?.email && !authUser.user.email.endsWith('@placeholder.app')) { userEmail = authUser.user.email; }
    } catch (e) { console.warn(`Exception fetching auth user email for ${targetUserId}`); }
    console.log(`Using email ${userEmail} for JWT claims.`);

    // --- Generate Session Tokens ---
    // a. Generate Opaque Refresh Token & Expiry
    const refreshToken = crypto.randomUUID() + crypto.randomUUID();
    const refreshTokenExpiryDays = 60;
    const refreshTokenExpiresAt = new Date(Date.now() + refreshTokenExpiryDays * 24 * 60 * 60 * 1000);
    // b. Hash the Refresh Token
    const refreshTokenHash = await hashToken(refreshToken);
    // c. Store Hashed Refresh Token in DB
    const { error: refreshTokenStoreError } = await supabaseAdminClient
        .from('active_refresh_tokens')
        .insert({ user_id: targetUserId, token_hash: refreshTokenHash, expires_at: refreshTokenExpiresAt.toISOString() });
    if (refreshTokenStoreError) {
         console.error('Failed to store refresh token hash:', refreshTokenStoreError);
         return new Response(JSON.stringify({ error: 'Session generation failed (RT).' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // d. Generate Signed Short-Lived Access Token JWT
    const accessTokenExpirySeconds = 3600; // 1 hour
    const accessTokenExpiresIn = getNumericDate(accessTokenExpirySeconds);
    const jwtHeader: Header = { alg: "HS256", typ: "JWT" };
    const jwtPayload = {
      aud: "authenticated", exp: accessTokenExpiresIn, sub: targetUserId, email: userEmail, role: "authenticated",
      app_metadata: { role: targetRole, ...(targetRole === 'parent' && { viewing_student_id: targetUserId }) },
    };

    // *** IMPORT KEY CORRECTLY ***
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(jwtSecret), // Use the retrieved secret
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
    );
    // *** END IMPORT KEY ***

    // *** SIGN USING THE IMPORTED KEY ***
    const signedAccessToken = await create(jwtHeader, jwtPayload, key);
    // *** END SIGNING ***

    // --- End Token Generation ---

    // 7. Prepare Success Response
    const responseBody: ClaimPinSuccessResponse = {
        access_token: signedAccessToken, // Use the real signed token
        refresh_token: refreshToken,
        expires_in: accessTokenExpirySeconds,
        token_type: 'bearer',
        user_id: targetUserId,
        role: targetRole,
        ...(targetRole === 'parent' && { viewing_student_id: targetUserId }),
    };

    // 8. Clean up the used one-time PIN (async)
    supabaseAdminClient.from('onetime_pins').delete().eq('pin', submittedPin)
        .then(({ error: deleteError }) => {
            if (deleteError) console.error(`Failed to clean up PIN ${submittedPin}:`, deleteError.message);
        });

    console.log(`PIN ...${submittedPin.slice(-2)} claimed successfully for user ${targetUserId}. Session generated.`);
    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // OK
    });

  } catch (error) {
    console.error('Unhandled Claim PIN Function Error:', error);
    const isAuthError = error.message?.includes('Invalid') || error.message?.includes('expired');
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: isAuthError ? 401 : 500,
    });
  }
});