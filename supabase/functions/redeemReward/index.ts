// supabase/functions/redeemReward/index.ts

import { createClient, SupabaseClient } from 'supabase-js';

import { isActiveAdmin } from '../_shared/authHelpers.ts'; // Use isActiveAdmin
import { corsHeaders } from '../_shared/cors.ts';
// Import shared helper

interface RedeemRewardPayload {
  studentId: string;
  rewardId: string;
  // redeemerId is determined from the caller's token
}

// Main Function Handler
Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS & Method Check (POST)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Ensure Content-Type
    });
  }

  console.log(`Received ${req.method} request for redeemReward`);

  // 2. Initialize Supabase Admin Client
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase environment variables.');
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
    // 3. Verify Caller Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Missing or invalid Authorization header.');
      return new Response(JSON.stringify({ error: 'Authentication required.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user: callerUser },
      error: userError,
    } = await supabaseAdminClient.auth.getUser(token);
    if (userError || !callerUser) {
      console.error('Auth token validation error:', userError?.message || 'User not found');
      return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const redeemerId = callerUser.id;
    console.log('Caller User ID (Redeemer):', redeemerId);

    // 4. Parse Request Body
    let payload: RedeemRewardPayload;
    try {
      payload = await req.json();
      console.log('Received payload:', payload);
    } catch (jsonError) {
      console.error('Failed to parse request body:', jsonError);
      return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Validate Payload
    if (!payload.studentId || !payload.rewardId) {
      console.warn('Payload validation failed: Missing studentId or rewardId.');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: studentId, rewardId.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Authorize Caller (Only Active Admins can redeem) - Using imported helper
    const userIsActiveAdmin = await isActiveAdmin(supabaseAdminClient, redeemerId); // Use shared helper
    if (!userIsActiveAdmin) {
      console.warn(`Authorization failed: User ${redeemerId} is not an Active Admin.`);
      return new Response(
        JSON.stringify({
          error: 'Permission denied: Only Active Admins can perform redemption.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`Authorization success: Active Admin ${redeemerId} performing redemption.`);

    // 7. Call the Database RPC Function
    console.log(
      `Calling RPC redeem_reward_for_student for Student: ${payload.studentId}, Reward: ${payload.rewardId}, Redeemer: ${redeemerId}`
    );
    const { data: rpcResult, error: rpcError } = await supabaseAdminClient
      .rpc('redeem_reward_for_student', {
        p_redeemer_id: redeemerId,
        p_student_id: payload.studentId,
        p_reward_id: payload.rewardId,
      })
      .maybeSingle(); // Use maybeSingle as RPC returns a single row result

    if (rpcError) {
      console.error('Error calling redeem_reward_for_student RPC:', rpcError);
      return new Response(
        JSON.stringify({ error: `Database error during redemption: ${rpcError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // The RPC function returns an object { success: boolean, message: text, new_balance: integer }
    if (!rpcResult) {
      // This case might happen if maybeSingle() finds no row, which shouldn't occur for this RPC.
      console.error('Redemption RPC returned unexpected null result.');
      return new Response(JSON.stringify({ error: 'Redemption process failed unexpectedly.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('RPC Result:', rpcResult);

    // 8. Check RPC result and respond to client
    if (rpcResult.success) {
      // Success Case
      console.log(`Redemption successful: ${rpcResult.message}`);
      return new Response(
        JSON.stringify({ message: rpcResult.message, newBalance: rpcResult.new_balance }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // OK
        }
      );
    } else {
      // Failure Case (e.g., insufficient funds, handled by RPC)
      console.warn(`Redemption failed: ${rpcResult.message}`);
      return new Response(JSON.stringify({ error: rpcResult.message || 'Redemption failed.' }), {
        status: 400, // Bad Request (client could have checked balance)
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Unhandled Redeem Reward Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

console.log('redeemReward function initialized (v2 - uses shared helpers).');
