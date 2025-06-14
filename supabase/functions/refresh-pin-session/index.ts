// supabase/functions/refresh-pin-session/index.ts

import { create, getNumericDate, Header } from 'djwt';
import { createClient } from 'supabase-js';

import { hashTokenWithSalt } from '../_shared/authHelpers.ts'; // IMPORTING from shared file
import { corsHeaders } from '../_shared/cors.ts';

interface RefreshTokenPayload {
  refresh_token: string;
}

interface RefreshTokenSuccessResponse {
  access_token: string;
  expires_in: number;
  token_type: 'bearer';
  user_id: string;
  role: string;
}

// The local hashTokenWithSalt function has been REMOVED from this file.

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const jwtSecret = Deno.env.get('CLIENT_JWT_SECRET');

  if (!supabaseUrl || !serviceRoleKey || !jwtSecret) {
    console.error(`Check Failed: Environment variable issue.`);
    return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const payload: RefreshTokenPayload = await req.json();
    if (!payload.refresh_token || typeof payload.refresh_token !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid refresh_token.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const receivedRefreshToken = payload.refresh_token;
    const receivedTokenHash = await hashTokenWithSalt(receivedRefreshToken); // Using imported helper

    const { data: tokenData, error: tokenFetchError } = await supabaseAdminClient
      .from('active_refresh_tokens')
      .select('id, user_id, expires_at')
      .eq('token_hash', receivedTokenHash)
      .single();

    if (tokenFetchError || !tokenData) {
      return new Response(JSON.stringify({ error: 'Invalid refresh token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    if (now > new Date(tokenData.expires_at)) {
      await supabaseAdminClient.from('active_refresh_tokens').delete().eq('id', tokenData.id);
      return new Response(JSON.stringify({ error: 'Refresh token expired.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetUserId = tokenData.user_id;

    let userRole = '';
    let companyId = '';
    let userEmail = `${targetUserId}@placeholder.app`;

    try {
      const { data: profileData, error: profileError } = await supabaseAdminClient
        .from('profiles')
        .select('role, company_id')
        .eq('id', targetUserId)
        .single();
      if (profileError || !profileData) {
        throw profileError || new Error('Profile not found for user during refresh.');
      }

      userRole = profileData.role;
      companyId = profileData.company_id;

      if (!companyId) throw new Error('Company ID is missing from user profile.');

      const { data: authUser } = await supabaseAdminClient.auth.admin.getUserById(targetUserId);
      if (authUser?.user?.email && !authUser.user.email.endsWith('@placeholder.app')) {
        userEmail = authUser.user.email;
      }
    } catch (fetchErr: any) {
      await supabaseAdminClient.from('active_refresh_tokens').delete().eq('id', tokenData.id);
      return new Response(JSON.stringify({ error: 'Associated user not found or invalid.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessTokenExpirySeconds = 3600;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const jwtPayload = {
      aud: 'authenticated',
      exp: getNumericDate(accessTokenExpirySeconds),
      sub: targetUserId,
      email: userEmail,
      role: 'authenticated',
      app_metadata: {
        provider: 'custom_pin',
        role: userRole,
        company_id: companyId,
      },
    };

    const newAccessToken = await create({ alg: 'HS256', typ: 'JWT' }, jwtPayload, key);

    await supabaseAdminClient
      .from('active_refresh_tokens')
      .update({ last_used_at: now.toISOString() })
      .eq('id', tokenData.id);

    const responseBody: RefreshTokenSuccessResponse = {
      access_token: newAccessToken,
      expires_in: accessTokenExpirySeconds,
      token_type: 'bearer',
      user_id: targetUserId,
      role: userRole,
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled Refresh PIN Session Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred during refresh.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
