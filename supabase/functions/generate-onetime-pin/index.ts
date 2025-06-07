// supabase/functions/generate-onetime-pin/index.ts

import { createClient } from 'supabase-js';

import { isActiveAdminOrTeacher } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface GeneratePinPayload {
  userId: string;
  targetRole: 'student' | 'parent' | 'admin' | 'teacher';
}

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  console.log(`Received ${req.method} request for generate-onetime-pin`);

  try {
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
    console.log('Caller User ID:', callerUser.id);

    const { authorized } = await isActiveAdminOrTeacher(supabaseAdminClient, callerUser.id);
    if (!authorized) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: Admin or Teacher role required.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    console.log(`PIN generation authorized for user ${callerUser.id}.`);

    // NEW: Get the Caller's Company ID
    const { data: callerProfile, error: callerProfileError } = await supabaseAdminClient
      .from('profiles')
      .select('company_id')
      .eq('id', callerUser.id)
      .single();

    if (callerProfileError || !callerProfile?.company_id) {
      console.error(
        `Could not retrieve company_id for caller ${callerUser.id}:`,
        callerProfileError
      );
      return new Response(JSON.stringify({ error: 'Could not determine caller company.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerCompanyId = callerProfile.company_id;
    console.log(`Caller ${callerUser.id} belongs to company ${callerCompanyId}`);

    let payload: GeneratePinPayload;
    try {
      payload = await req.json();
    } catch (jsonError) {
      return new Response(JSON.stringify({ error: 'Invalid request body: Must be JSON.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (
      !payload.userId ||
      typeof payload.userId !== 'string' ||
      !payload.targetRole ||
      typeof payload.targetRole !== 'string'
    ) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, targetRole.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    if (!['student', 'parent', 'admin', 'teacher'].includes(payload.targetRole)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid targetRole. Must be "student", "parent", "admin", or "teacher".',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // NEW: Verify target user is in the same company
    const { data: targetProfile, error: targetProfileError } = await supabaseAdminClient
      .from('profiles')
      .select('company_id')
      .eq('id', payload.userId)
      .single();

    if (targetProfileError || !targetProfile) {
      console.warn(`Could not find target user profile for PIN generation: ${payload.userId}`);
      return new Response(JSON.stringify({ error: 'Target user for PIN not found.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (targetProfile.company_id !== callerCompanyId) {
      console.error(
        `Company mismatch! Caller ${callerUser.id} from ${callerCompanyId} attempted to generate PIN for user ${payload.userId} from ${targetProfile.company_id}.`
      );
      return new Response(
        JSON.stringify({
          error: 'Permission denied: Cannot generate PIN for a user in another company.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    console.log(`Company check passed. Caller and target user are in company ${callerCompanyId}.`);

    const pin = generatePin();
    const expiryMinutes = 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    // MODIFIED: Inject company_id into the new PIN record
    const pinRecord = {
      pin: pin,
      user_id: payload.userId,
      target_role: payload.targetRole,
      expires_at: expiresAt,
      company_id: callerCompanyId, // <-- The critical addition
    };

    console.log(`Attempting to insert PIN ${pin} into onetime_pins...`);
    const { error: insertError } = await supabaseAdminClient.from('onetime_pins').insert(pinRecord);

    if (insertError) {
      console.error('Error inserting PIN into database:', insertError);
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({
            error: 'Failed to store temporary PIN due to unlikely collision. Please try again.',
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      return new Response(
        JSON.stringify({ error: `Failed to store temporary PIN: ${insertError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`PIN ${pin} successfully stored.`);

    return new Response(JSON.stringify({ pin: pin }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Unhandled Generate PIN Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

console.log('Generate-onetime-pin function initialized (v4 - multi-tenant aware).');
