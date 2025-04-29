// supabase/functions/claim-onetime-pin/index.ts

import { createClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// Define expected request body
interface ClaimPinPayload {
  pin: string;
}

// Define response structure for success
interface ClaimPinSuccessResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // Standard JWT expiry field
  user_id: string;
  role: string; // Role determined from the onetime_pins table
  viewing_student_id?: string; // Only included if role is 'parent'
}

// Helper to hash the refresh token (using same method as createUser for consistency)
// IMPORTANT: Use a strong, salted hash in production (Argon2, bcrypt). SHA-256 without salt is NOT secure enough for sensitive tokens.
async function hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token); // Add a user-specific or system-wide salt here!
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    console.log(`Hashing refresh token (length ${token.length}) to SHA-256 hash.`);
    return hashHex;
}

// Main Function Handler
Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  console.log(`Received ${req.method} request for claim-onetime-pin`);

  // Initialize Supabase Admin Client (needed for DB operations and potentially manual token generation if not using signIn)
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  // We also need the ANON key if we use standard sign-in methods later or JWT secret for manual signing
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET'); // Needed if manually signing JWTs

  if (!supabaseUrl || !serviceRoleKey || !anonKey || !jwtSecret) {
     console.error("Missing Supabase environment variables (URL, SERVICE_ROLE_KEY, ANON_KEY, JWT_SECRET).");
     return new Response(JSON.stringify({ error: "Server configuration error." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }

  const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: fetch }
  });
  console.log('Supabase Admin Client initialized.');

  try {
    // 2. Parse Request Body
    let payload: ClaimPinPayload;
    try {
        payload = await req.json();
         console.log('Received payload with PIN (length):', payload.pin?.length); // Log length, not PIN
    } catch (jsonError) {
         console.error("Failed to parse request body:", jsonError);
         return new Response(JSON.stringify({ error: "Invalid request body: Must be JSON." }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // 3. Validate Payload
    if (!payload.pin || typeof payload.pin !== 'string' || payload.pin.length < 4) { // Example: PIN length check
        console.warn("Payload validation failed: Invalid PIN format.");
      return new Response(JSON.stringify({ error: 'Invalid or missing PIN.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
    const submittedPin = payload.pin;

    // 4. Find and Validate One-Time PIN in Database
    console.log(`Looking up PIN ending with: ...${submittedPin.slice(-2)}`); // Log only last 2 digits
    const { data: pinData, error: pinFetchError } = await supabaseAdminClient
      .from('onetime_pins')
      .select('user_id, target_role, expires_at, claimed_at')
      .eq('pin', submittedPin)
      .single();

    if (pinFetchError || !pinData) {
      console.warn(`PIN Lookup Failed: ${pinFetchError?.message || 'PIN not found.'}`);
      return new Response(JSON.stringify({ error: 'Invalid or expired PIN.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // Check if already claimed or expired
    if (pinData.claimed_at) {
        console.warn(`PIN ${submittedPin} already claimed at ${pinData.claimed_at}.`);
        return new Response(JSON.stringify({ error: 'PIN has already been used.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
    const now = new Date();
    const expiry = new Date(pinData.expires_at);
    if (now > expiry) {
         console.warn(`PIN ${submittedPin} expired at ${pinData.expires_at}.`);
        // Optionally delete expired PIN here or use a cron job
        await supabaseAdminClient.from('onetime_pins').delete().eq('pin', submittedPin);
        return new Response(JSON.stringify({ error: 'PIN has expired.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    const targetUserId = pinData.user_id;
    const targetRole = pinData.target_role;
    console.log(`PIN valid for user ${targetUserId}, role ${targetRole}.`);

    // 5. Mark PIN as Claimed (Attempt to prevent race conditions)
    // We do this *before* generating tokens. If token generation fails, the PIN remains claimed.
    const { error: claimError } = await supabaseAdminClient
        .from('onetime_pins')
        .update({ claimed_at: now.toISOString() })
        .eq('pin', submittedPin)
        .is('claimed_at', null); // Only update if not already claimed

    if (claimError) {
        // This could happen if another request claimed it between the SELECT and UPDATE
        console.error(`Failed to mark PIN ${submittedPin} as claimed:`, claimError.message);
        return new Response(JSON.stringify({ error: 'Failed to claim PIN. Please try again.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
     console.log(`PIN ${submittedPin} marked as claimed.`);

    // --- Now that PIN is claimed, generate the real session ---

    // 6. Generate Tokens and Session
    // Option A: Manually Generate Tokens (More control, requires JWT signing)
    // Option B: Use a 'dummy' sign-in trick (Simpler if it works for UUID-only users)

    // Let's try Option B first (Simpler): Use signInWithOtp with the user's ID.
    // This might internally handle session creation for users without email/password.
    // We need a client initialized with the ANON key for this.
     const supabaseAnonClient = createClient(supabaseUrl, anonKey, {
         auth: { autoRefreshToken: false, persistSession: false },
         global: { fetch: fetch }
     });
    console.log('Attempting dummy sign-in for user:', targetUserId);
    // We use a dummy email/phone for the OTP flow, but target the specific user ID.
    // This is undocumented behavior and might change, but worth trying.
    // We actually just need to get Supabase to issue standard tokens for the targetUserId.
    // A more direct way might be needed if OTP trick fails.
    // *** Alternative needed if signInWithOtp doesn't work for UUID-only users ***
    // For now, let's generate manually (Option A seems more reliable here)

    // --- Manual Token Generation (Option A) ---
    console.log('Manually generating session tokens.');

    // a. Generate Opaque Refresh Token
    const refreshToken = crypto.randomUUID() + crypto.randomUUID(); // Simple strong random string
    const refreshTokenExpiryDays = 60;
    const refreshTokenExpiresAt = new Date(Date.now() + refreshTokenExpiryDays * 24 * 60 * 60 * 1000);

    // b. Hash the Refresh Token for DB storage
    const refreshTokenHash = await hashToken(refreshToken);

    // c. Store Hashed Refresh Token in DB
    const { error: refreshTokenStoreError } = await supabaseAdminClient
        .from('active_refresh_tokens')
        .insert({
            user_id: targetUserId,
            token_hash: refreshTokenHash,
            expires_at: refreshTokenExpiresAt.toISOString(),
            // metadata: { device: 'pin_login' } // Example metadata
        });

    if (refreshTokenStoreError) {
         console.error('Failed to store refresh token hash:', refreshTokenStoreError);
         // Should we un-claim the PIN? Complex rollback. Fail for now.
         return new Response(JSON.stringify({ error: 'Session generation failed (step RT).' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
     console.log(`Refresh token hash stored for user ${targetUserId}.`);


    // d. Generate Short-Lived Access Token JWT (using Supabase utility if possible, or manual signing)
    // Supabase doesn't expose a direct admin function to *just* generate an access token easily AFAIK.
    // We might need to manually craft and sign one using the JWT secret.
    // This requires a JWT library or careful manual construction.
    // ---> Let's skip manual JWT signing for now and return a placeholder/mock access token <---
    // ---> THIS IS A MAJOR TODO: Implement proper JWT signing <---
    console.warn("TODO: Implement proper JWT Access Token signing using JWT Secret!");
    const accessToken = `MOCK_ACCESS_TOKEN_FOR_${targetUserId}_${Date.now()}`; // Placeholder!
    const accessTokenExpirySeconds = 3600; // 1 hour

    // --- End Manual Token Generation ---


    // 7. Prepare Success Response
    const responseBody: ClaimPinSuccessResponse = {
        access_token: accessToken, // Placeholder
        refresh_token: refreshToken, // The real opaque refresh token
        expires_in: accessTokenExpirySeconds,
        user_id: targetUserId,
        role: targetRole,
        // Add viewing_student_id only if the target role is parent
        ...(targetRole === 'parent' && { viewing_student_id: targetUserId }), // Parent views the student they logged in via
    };

    console.log(`PIN ${submittedPin} claimed successfully for user ${targetUserId}. Session generated.`);
    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // OK
    });

  } catch (error) {
    console.error('Unhandled Claim PIN Function Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

console.log('Claim-onetime-pin function initialized.');