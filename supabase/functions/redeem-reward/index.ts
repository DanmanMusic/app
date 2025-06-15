// supabase/functions/redeem-reward/index.ts

import { createClient } from 'supabase-js';

import { isActiveAdmin } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface RedeemRewardPayload {
  studentId: string;
  rewardId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  console.log(`Received ${req.method} request for redeem-reward`);

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
      return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const redeemerId = callerUser.id;
    console.log('Caller User ID (Redeemer):', redeemerId);

    const userIsActiveAdmin = await isActiveAdmin(supabaseAdminClient, redeemerId);
    if (!userIsActiveAdmin) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: Only Active Admins can perform redemption.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    console.log(`Authorization success: Active Admin ${redeemerId} performing redemption.`);

    // NEW: Get the Admin's Company ID
    const { data: adminProfile, error: adminProfileError } = await supabaseAdminClient
      .from('profiles')
      .select('company_id')
      .eq('id', redeemerId)
      .single();

    if (adminProfileError || !adminProfile?.company_id) {
      console.error(`Could not retrieve company_id for admin ${redeemerId}:`, adminProfileError);
      return new Response(JSON.stringify({ error: 'Could not determine admin company.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const adminCompanyId = adminProfile.company_id;
    console.log(`Admin ${redeemerId} belongs to company ${adminCompanyId}`);

    let payload: RedeemRewardPayload;
    try {
      payload = await req.json();
    } catch (jsonError) {
      return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!payload.studentId || !payload.rewardId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: studentId, rewardId.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // NEW: Three-way company consistency check
    const { data: studentProfile, error: studentError } = await supabaseAdminClient
      .from('profiles')
      .select('company_id')
      .eq('id', payload.studentId)
      .single();
    const { data: rewardData, error: rewardError } = await supabaseAdminClient
      .from('rewards')
      .select('company_id')
      .eq('id', payload.rewardId)
      .single();

    if (studentError || !studentProfile) {
      return new Response(JSON.stringify({ error: 'Target student not found.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (rewardError || !rewardData) {
      return new Response(JSON.stringify({ error: 'Target reward not found.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (studentProfile.company_id !== adminCompanyId || rewardData.company_id !== adminCompanyId) {
      console.error(
        `Company mismatch! Admin:${adminCompanyId}, Student:${studentProfile.company_id}, Reward:${rewardData.company_id}`
      );
      return new Response(
        JSON.stringify({
          error: 'Permission denied: Student and reward must be in the same company as the admin.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    console.log(`Company check passed for admin, student, and reward: ${adminCompanyId}.`);

    // MODIFIED: Call the updated RPC function with the company_id
    console.log(
      `Calling RPC redeem_reward_for_student for Student: ${payload.studentId}, Reward: ${payload.rewardId}`
    );
    const { data: rpcResult, error: rpcError } = await supabaseAdminClient
      .rpc('redeem_reward_for_student', {
        p_redeemer_id: redeemerId,
        p_student_id: payload.studentId,
        p_reward_id: payload.rewardId,
        p_company_id: adminCompanyId, // <-- The critical addition
      })
      .maybeSingle();

    if (rpcError) {
      console.error('Error calling redeem_reward_for_student RPC:', rpcError);
      return new Response(
        JSON.stringify({ error: `Database error during redemption: ${rpcError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!rpcResult) {
      console.error('Redemption RPC returned unexpected null result.');
      return new Response(JSON.stringify({ error: 'Redemption process failed unexpectedly.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (rpcResult.success) {
      console.log(`Redemption successful: ${rpcResult.message}`);
      return new Response(
        JSON.stringify({ message: rpcResult.message, newBalance: rpcResult.new_balance }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      console.warn(`Redemption failed: ${rpcResult.message}`);
      return new Response(JSON.stringify({ error: rpcResult.message || 'Redemption failed.' }), {
        status: 400,
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
