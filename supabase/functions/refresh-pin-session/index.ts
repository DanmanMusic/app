// supabase/functions/refresh-pin-session/index.ts

import { createClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// Define expected request body
interface RefreshTokenPayload {
  refresh_token: string;
}

// Define response structure for success
interface RefreshTokenSuccessResponse {
  access_token: string;
  // refresh_token?: string; // Optional: Implement rolling refresh tokens later
  expires_in: number;
  user_id: string;
  role: string; // Need to fetch role again
}

// Helper to hash the refresh token (MUST match the hashing in claim-onetime-pin)
// IMPORTANT: Use a strong, salted hash in production.
async function hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token); // Add salt here!
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    console.log(`Hashing refresh token (length ${token.length}) for comparison.`);
    return hashHex;
}

// Main Function Handler
Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  console.log(`Received ${req.method} request for refresh-pin-session`);

  // Initialize Supabase Admin Client (needed for DB access)
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET'); // Needed if manually signing JWTs

  if (!supabaseUrl || !serviceRoleKey || !jwtSecret) {
     console.error("Missing Supabase environment variables (URL, SERVICE_ROLE_KEY, JWT_SECRET).");
     return new Response(JSON.stringify({ error: "Server configuration error." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }

  const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: fetch }
  });
  console.log('Supabase Admin Client initialized.');

  try {
    // 2. Parse Request Body
    let payload: RefreshTokenPayload;
    try {
        payload = await req.json();
        console.log('Received payload with refresh_token (length):', payload.refresh_token?.length);
    } catch (jsonError) {
         console.error("Failed to parse request body:", jsonError);
         return new Response(JSON.stringify({ error: "Invalid request body: Must be JSON." }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // 3. Validate Payload
    if (!payload.refresh_token || typeof payload.refresh_token !== 'string') {
        console.warn("Payload validation failed: Missing or invalid refresh_token.");
      return new Response(JSON.stringify({ error: 'Missing or invalid refresh_token.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
    const receivedRefreshToken = payload.refresh_token;

    // 4. Hash the received token to compare with DB
    const receivedTokenHash = await hashToken(receivedRefreshToken);
    console.log(`Looking up refresh token hash ending with: ...${receivedTokenHash.slice(-6)}`);

    // 5. Find matching token hash in the database
    const { data: tokenData, error: tokenFetchError } = await supabaseAdminClient
        .from('active_refresh_tokens')
        .select('id, user_id, expires_at, last_used_at') // Select necessary fields
        .eq('token_hash', receivedTokenHash)
        .single(); // Expect exactly one match

    if (tokenFetchError || !tokenData) {
        console.warn(`Refresh token hash not found or DB error: ${tokenFetchError?.message}`);
        // Even if not found, return 401 to prevent leaking info
        return new Response(JSON.stringify({ error: 'Invalid refresh token.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // 6. Check Expiry
    const now = new Date();
    const expiry = new Date(tokenData.expires_at);
    if (now > expiry) {
        console.warn(`Refresh token ${tokenData.id} for user ${tokenData.user_id} expired at ${tokenData.expires_at}. Deleting.`);
        // Clean up expired token
        await supabaseAdminClient.from('active_refresh_tokens').delete().eq('id', tokenData.id);
        return new Response(JSON.stringify({ error: 'Refresh token expired.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    const targetUserId = tokenData.user_id;
    console.log(`Refresh token valid for user ${targetUserId}.`);

    // 7. Fetch User Role from profiles (needed for new access token claims)
     const { data: profileData, error: profileError } = await supabaseAdminClient
      .from('profiles')
      .select('role')
      .eq('id', targetUserId)
      .single();

     if (profileError || !profileData) {
       console.error(`Failed to fetch profile for user ${targetUserId} during refresh: ${profileError?.message}`);
       // If profile doesn't exist, the token is essentially invalid
       await supabaseAdminClient.from('active_refresh_tokens').delete().eq('id', tokenData.id); // Clean up
       return new Response(JSON.stringify({ error: 'Associated user profile not found.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
     }
     const userRole = profileData.role;
     console.log(`User role determined as: ${userRole}`);


    // 8. Generate NEW Short-Lived Access Token JWT
    // ---> MAJOR TODO: Implement proper JWT signing using JWT Secret! <---
    console.warn("TODO: Implement proper JWT Access Token signing using JWT Secret!");
    const newAccessToken = `MOCK_ACCESS_TOKEN_FOR_${targetUserId}_${Date.now()}`; // Placeholder!
    const accessTokenExpirySeconds = 3600; // 1 hour

    // 9. OPTIONAL: Implement Rolling Refresh Tokens
    // If desired, generate a NEW refresh token, hash it, update the DB record,
    // and return the new refresh token along with the new access token.
    // For simplicity, we'll reuse the existing refresh token for now.
    console.log(`Reusing existing refresh token for user ${targetUserId}. Updating last_used_at.`);
     await supabaseAdminClient
       .from('active_refresh_tokens')
       .update({ last_used_at: now.toISOString() })
       .eq('id', tokenData.id);


    // 10. Prepare Success Response
    const responseBody: RefreshTokenSuccessResponse = {
        access_token: newAccessToken, // Placeholder
        // refresh_token: newRefreshToken, // Include if rolling tokens
        expires_in: accessTokenExpirySeconds,
        user_id: targetUserId,
        role: userRole,
    };

    console.log(`Session refreshed successfully for user ${targetUserId}.`);
    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // OK
    });

  } catch (error) {
    console.error('Unhandled Refresh PIN Session Function Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred during refresh.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

console.log('Refresh-pin-session function initialized.');