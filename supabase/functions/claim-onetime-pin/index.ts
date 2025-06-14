// supabase/functions/claim-onetime-pin/index.ts

import { create, getNumericDate, Header } from 'djwt';
import { createClient } from 'supabase-js';

import { hashTokenWithSalt } from '../_shared/authHelpers.ts'; // IMPORTING from shared file
import { corsHeaders } from '../_shared/cors.ts';

interface ClaimPinPayload {
  pin: string;
}

interface ClaimPinSuccessResponse {
  access_token: string;
  refresh_token: string;
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const jwtSecret = Deno.env.get('CLIENT_JWT_SECRET');

  if (!supabaseUrl || !serviceRoleKey || !jwtSecret) {
    console.error('Server configuration error: Missing environment variables.');
    return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const payload: ClaimPinPayload = await req.json();
    if (!payload.pin || typeof payload.pin !== 'string' || payload.pin.length < 4) {
      return new Response(JSON.stringify({ error: 'Invalid or missing PIN.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const submittedPin = payload.pin;
    const now = new Date();

    const { data: pinData, error: pinFetchError } = await supabaseAdminClient
      .from('onetime_pins')
      .select('user_id, target_role, expires_at, claimed_at')
      .eq('pin', submittedPin)
      .single();

    if (pinFetchError || !pinData) {
      return new Response(JSON.stringify({ error: 'Invalid or expired PIN.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (pinData.claimed_at) {
      return new Response(JSON.stringify({ error: 'PIN has already been used.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (now > new Date(pinData.expires_at)) {
      supabaseAdminClient.from('onetime_pins').delete().eq('pin', submittedPin).then();
      return new Response(JSON.stringify({ error: 'PIN has expired.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetUserId = pinData.user_id;
    const targetRole = pinData.target_role;

    const { data: userProfile, error: profileError } = await supabaseAdminClient
      .from('profiles')
      .select('company_id')
      .eq('id', targetUserId)
      .single();

    if (profileError || !userProfile?.company_id) {
      console.error(
        `CRITICAL: Could not fetch company_id for user ${targetUserId}. Error: ${profileError?.message}`
      );
      return new Response(
        JSON.stringify({ error: 'User profile or company configuration is invalid.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    const companyId = userProfile.company_id;

    const { error: claimError } = await supabaseAdminClient
      .from('onetime_pins')
      .update({ claimed_at: now.toISOString() })
      .eq('pin', submittedPin)
      .is('claimed_at', null);

    if (claimError) {
      return new Response(JSON.stringify({ error: 'Failed to claim PIN.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let userEmail = `${targetUserId}@placeholder.app`;
    try {
      const { data: authUser } = await supabaseAdminClient.auth.admin.getUserById(targetUserId);
      if (authUser?.user?.email && !authUser.user.email.endsWith('@placeholder.app')) {
        userEmail = authUser.user.email;
      }
    } catch (e) {
      console.warn(`Could not fetch auth user email for ${targetUserId}: ${e.message}`);
    }

    const refreshToken = crypto.randomUUID() + crypto.randomUUID();
    const refreshTokenExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const refreshTokenHash = await hashTokenWithSalt(refreshToken); // Using imported helper

    await supabaseAdminClient.from('active_refresh_tokens').insert({
      user_id: targetUserId,
      token_hash: refreshTokenHash,
      expires_at: refreshTokenExpiresAt.toISOString(),
      company_id: companyId,
    });

    const accessTokenExpirySeconds = 86400;
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
        role: targetRole,
        company_id: companyId,
      },
    };

    const signedAccessToken = await create({ alg: 'HS256', typ: 'JWT' }, jwtPayload, key);

    const responseBody: ClaimPinSuccessResponse = {
      access_token: signedAccessToken,
      refresh_token: refreshToken,
      expires_in: accessTokenExpirySeconds,
      token_type: 'bearer',
      user_id: targetUserId,
      role: targetRole,
    };

    supabaseAdminClient.from('onetime_pins').delete().eq('pin', submittedPin).then();

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled Claim PIN Function Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
