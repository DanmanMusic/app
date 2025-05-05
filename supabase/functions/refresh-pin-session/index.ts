// supabase/functions/refresh-pin-session/index.ts

import { createClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
// Import JWT library functions
import { create, getNumericDate, Header } from 'djwt';

// Define expected request body
interface RefreshTokenPayload {
  refresh_token: string;
}

// Define response structure for success
interface RefreshTokenSuccessResponse {
  access_token: string;
  // refresh_token?: string; // Optional: Include if implementing rolling refresh tokens
  expires_in: number;
  token_type: 'bearer';
  user_id: string;
  role: string; // Application role from profiles
  viewing_student_id?: string; // Include if parent role
}

async function hashTokenWithSalt(token: string): Promise<string> {
  const salt = Deno.env.get('REFRESH_TOKEN_SALT');
  if (!salt) {
    console.error('CRITICAL: REFRESH_TOKEN_SALT environment variable is not set!');
    throw new Error('Server configuration error [Salt Missing]'); // Fail loudly if salt is missing
  }

  const encoder = new TextEncoder();
  // Concatenate salt and token BEFORE encoding
  const data = encoder.encode(salt + token); // Consistent order: salt first
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
  // Allow only POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders },
    });
  }

  // Initialize Supabase Admin Client & Get Secrets
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  // *** Use the manually set secret ***
  const jwtSecret = Deno.env.get('CLIENT_JWT_SECRET');

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
    let payload: RefreshTokenPayload;
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
    if (!payload.refresh_token || typeof payload.refresh_token !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid refresh_token.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const receivedRefreshToken = payload.refresh_token;

    // 4. Hash the received token
    const receivedTokenHash = await hashTokenWithSalt(receivedRefreshToken);
    console.log(`Looking up refresh token hash ending with: ...${receivedTokenHash.slice(-6)}`);

    // 5. Find matching token hash in the database
    const { data: tokenData, error: tokenFetchError } = await supabaseAdminClient
      .from('active_refresh_tokens')
      .select('id, user_id, expires_at, last_used_at')
      .eq('token_hash', receivedTokenHash)
      .single();

    if (tokenFetchError || !tokenData) {
      console.warn(`Refresh token hash not found or DB error: ${tokenFetchError?.message}`);
      return new Response(JSON.stringify({ error: 'Invalid refresh token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Check Expiry
    const now = new Date();
    const expiry = new Date(tokenData.expires_at);
    if (now > expiry) {
      console.warn(
        `Refresh token ${tokenData.id} for user ${tokenData.user_id} expired at ${tokenData.expires_at}. Deleting.`
      );
      await supabaseAdminClient.from('active_refresh_tokens').delete().eq('id', tokenData.id); // Clean up expired
      return new Response(JSON.stringify({ error: 'Refresh token expired.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetUserId = tokenData.user_id;
    console.log(`Refresh token valid for user ${targetUserId}. Fetching user details...`);

    // 7. Fetch User Profile Role & Auth Email
    let userRole = '';
    let userEmail = `${targetUserId}@placeholder.app`;
    try {
      const { data: profileData, error: profileError } = await supabaseAdminClient
        .from('profiles')
        .select('role')
        .eq('id', targetUserId)
        .single();
      if (profileError || !profileData) throw profileError || new Error('Profile not found');
      userRole = profileData.role;

      const { data: authUser, error: getAuthUserError } =
        await supabaseAdminClient.auth.admin.getUserById(targetUserId);
      if (
        !getAuthUserError &&
        authUser?.user?.email &&
        !authUser.user.email.endsWith('@placeholder.app')
      ) {
        userEmail = authUser.user.email;
      }
    } catch (fetchErr: any) {
      console.error(
        `Failed to fetch profile/auth details for user ${targetUserId} during refresh: ${fetchErr?.message}`
      );
      await supabaseAdminClient.from('active_refresh_tokens').delete().eq('id', tokenData.id);
      return new Response(JSON.stringify({ error: 'Associated user not found or invalid.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`User role: ${userRole}, Email: ${userEmail}`);

    // 8. Generate NEW Signed Short-Lived Access Token JWT
    const accessTokenExpirySeconds = 3600; // 1 hour
    const accessTokenExpiresIn = getNumericDate(accessTokenExpirySeconds);
    const jwtHeader: Header = { alg: 'HS256', typ: 'JWT' };
    const jwtPayload = {
      aud: 'authenticated',
      exp: accessTokenExpiresIn,
      sub: targetUserId,
      email: userEmail,
      role: 'authenticated',
      app_metadata: {
        provider: 'custom_pin',
        role: userRole,
        ...(userRole === 'parent' && { viewing_student_id: targetUserId }),
      }, // Revisit parent viewing logic if needed
    };

    // *** IMPORT KEY CORRECTLY ***
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret), // Use the retrieved secret
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
    // *** END IMPORT KEY ***

    // *** SIGN USING THE IMPORTED KEY ***
    const newAccessToken = await create(jwtHeader, jwtPayload, key);
    console.log('Generated new signed Access Token JWT during refresh.');
    // *** END SIGNING ***

    // 9. Update last_used_at timestamp
    const { error: updateLastError } = await supabaseAdminClient
      .from('active_refresh_tokens')
      .update({ last_used_at: now.toISOString() })
      .eq('id', tokenData.id); // Use the specific record ID
    if (updateLastError) {
      console.warn(
        `Failed to update last_used_at for refresh token ${tokenData.id}: ${updateLastError.message}`
      );
    }
    // else { console.log(`Updated last_used_at for refresh token ${tokenData.id}.`); } // Reduced logging

    // 10. Prepare Success Response
    const responseBody: RefreshTokenSuccessResponse = {
      access_token: newAccessToken, // Use REAL token
      expires_in: accessTokenExpirySeconds,
      token_type: 'bearer',
      user_id: targetUserId,
      role: userRole,
      ...(userRole === 'parent' && { viewing_student_id: targetUserId }),
    };

    console.log(`Session refreshed successfully for user ${targetUserId}.`);
    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // OK
    });
  } catch (error) {
    console.error('Unhandled Refresh PIN Session Function Error:', error);
    const isAuthError =
      error.message?.includes('Invalid refresh token') || error.message?.includes('expired');
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred during refresh.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: isAuthError ? 401 : 500,
      }
    );
  }
});

// console.log('Refresh-pin-session function initialized.'); // Optional
