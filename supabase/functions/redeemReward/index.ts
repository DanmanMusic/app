// supabase/functions/redeemReward/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

interface RedeemRewardPayload {
  studentId: string;
  rewardId: string;
  // redeemerId is determined from the caller's token
}

// Helper function to check if the caller is an Admin
async function isAdmin(supabaseClient: SupabaseClient, callerUserId: string): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', callerUserId)
    .single();
  if (error) {
    console.error(`isAdmin check failed for ${callerUserId}:`, error.message);
    return false;
  }
  return data?.role === 'admin';
}

Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS & Method Check (POST)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  console.log(`Received ${req.method} request for redeemReward`);

  // 2. Initialize Supabase Admin Client
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    /* ... server config error ... */
  }
  const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: fetch },
  });

  try {
    // 3. Verify Caller Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      /* ... auth error ... */
    }
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user: callerUser },
      error: userError,
    } = await supabaseAdminClient.auth.getUser(token);
    if (userError || !callerUser) {
      /* ... auth error ... */
    }
    const redeemerId = callerUser.id; // The user performing the redemption
    console.log('Caller User ID (Redeemer):', redeemerId);

    // 4. Parse Request Body
    let payload: RedeemRewardPayload;
    try {
      payload = await req.json();
    } catch (jsonError) {
      /* ... body error ... */
    }
    console.log('Received payload:', payload);

    // 5. Validate Payload
    if (!payload.studentId || !payload.rewardId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: studentId, rewardId.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Authorize Caller (Only Admins can redeem for now)
    const userIsAdmin = await isAdmin(supabaseAdminClient, redeemerId);
    if (!userIsAdmin) {
      console.warn(`Authorization failed: User ${redeemerId} is not Admin.`);
      return new Response(
        JSON.stringify({
          error: 'Permission denied: Only Admins can perform redemption currently.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`Authorization success: Admin ${redeemerId} performing redemption.`);

    // 7. Call the Database RPC Function
    console.log(
      `Calling RPC redeem_reward_for_student for Student: ${payload.studentId}, Reward: ${payload.rewardId}, Redeemer: ${redeemerId}`
    );

    const { data: rpcResult, error: rpcError } = await supabaseAdminClient
      .rpc(
        'redeem_reward_for_student',
        {
          p_redeemer_id: redeemerId,
          p_student_id: payload.studentId,
          p_reward_id: payload.rewardId,
        }
        // Ensure the result is treated as a single object if the function returns one row
      )
      .maybeSingle(); // Use maybeSingle() if your RPC returns a single row result or potentially null/error

    if (rpcError) {
      console.error('Error calling redeem_reward_for_student RPC:', rpcError);
      return new Response(
        JSON.stringify({ error: `Database error during redemption: ${rpcError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // The RPC function returns an object { success: boolean, message: text, new_balance: integer }
    if (!rpcResult) {
      // This case might happen if maybeSingle() finds no row, which shouldn't occur for this RPC returning a table.
      console.error('Redemption RPC returned unexpected null result.');
      return new Response(JSON.stringify({ error: 'Redemption process failed unexpectedly.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('RPC Result:', rpcResult);

    // 8. Check RPC result and respond to client
    if (rpcResult.success) {
      return new Response(
        JSON.stringify({ message: rpcResult.message, newBalance: rpcResult.new_balance }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // OK
        }
      );
    } else {
      // Redemption failed (e.g., insufficient funds, reward not found)
      // Use a 400 Bad Request or 422 Unprocessable Entity status code
      return new Response(JSON.stringify({ error: rpcResult.message || 'Redemption failed.' }), {
        status: 400, // Bad Request (e.g., insufficient funds is a client-side preventable error)
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

console.log('redeemReward function initialized.');
