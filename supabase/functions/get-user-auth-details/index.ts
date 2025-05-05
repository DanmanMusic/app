// supabase/functions/get-user-auth-details/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
// Import shared helper
import { isActiveAdmin, isTeacherLinked } from '../_shared/authHelpers.ts'; // Use isActiveAdmin

// Define expected request body structure
interface GetAuthDetailsPayload {
  targetUserId: string; // The ID of the user whose details are requested
}

// Define expected success response structure
interface AuthDetailsResponse {
  email: string | null; // Return only the email (or null if not found/error)
}

// Main Function Handler
Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS request & Method Check
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  console.log(`Received ${req.method} request for get-user-auth-details`);

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
    // 3. Verify Caller is Authenticated
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
      console.error('Caller Auth token validation error:', userError?.message || 'User not found');
      return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Caller User ID:', callerUser.id);

    // 4. Parse Request Body
    let payload: GetAuthDetailsPayload;
    try {
      payload = await req.json();
      console.log('Received payload:', payload);
    } catch (jsonError) {
      console.error('Failed to parse request body:', jsonError);
      return new Response(JSON.stringify({ error: 'Invalid request body: Must be JSON.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Authorize Caller (Must be Active Admin) - Using imported helper
    const callerIsActiveAdmin = await isActiveAdmin(supabaseAdminClient, callerUser.id); // Use shared helper
    let callerIsLinkedTeacher = false;
    if (!callerIsActiveAdmin) {
      const { data: callerProfile } = await supabaseAdminClient
        .from('profiles')
        .select('role')
        .eq('id', callerUser.id)
        .single();
      if (callerProfile?.role === 'teacher') {
        callerIsLinkedTeacher = await isTeacherLinked(
          supabaseAdminClient,
          callerUser.id,
          payload.targetUserId
        );
      }
    }

    if (!callerIsActiveAdmin && !callerIsLinkedTeacher) {
      console.warn(
        `Authorization failed: User ${callerUser.id} attempted getAuthDetails not Admin or linked Teacher for student ${payload.targetUserId}.`
      );
      return new Response(
        JSON.stringify({
          error: 'Permission denied: Active Admin or linked Teacher role required.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Validate Payload - *** RESTORED ***
    if (!payload.targetUserId || typeof payload.targetUserId !== 'string') {
      console.warn('Payload validation failed: Missing or invalid targetUserId.');
      return new Response(JSON.stringify({ error: 'Missing or invalid targetUserId.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const targetUserId = payload.targetUserId;
    // *** END RESTORED VALIDATION ***

    // 7. Call Supabase Admin API to Get Target User Auth Details
    console.log(`Attempting to fetch auth details for target user: ${targetUserId}`);
    const { data: targetAuthData, error: getAuthError } =
      await supabaseAdminClient.auth.admin.getUserById(targetUserId);

    let responseEmail: string | null = null;

    if (getAuthError) {
      console.error(`Supabase Auth GetUserById Error for user ${targetUserId}:`, getAuthError);
      if (getAuthError.message.toLowerCase().includes('not found')) {
        console.warn(`Target auth user not found: ${targetUserId}`);
        // Keep responseEmail as null
      } else {
        console.error(`Failed to fetch auth details for ${targetUserId}: ${getAuthError.message}`);
        // Keep responseEmail as null, but error logged
      }
    } else if (!targetAuthData || !targetAuthData.user) {
      console.warn(`No auth user data returned for ${targetUserId}, but no error?`);
      // Keep responseEmail as null
    } else {
      responseEmail = targetAuthData.user.email ?? null;
      console.log(`Successfully fetched auth details for ${targetUserId}. Email: ${responseEmail}`);
    }

    // 8. Prepare and Return Success Response (even if email is null)
    const responseBody: AuthDetailsResponse = {
      email: responseEmail,
    };

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // OK
    });
  } catch (error) {
    console.error('Unhandled Get User Auth Details Function Error:', error);
    const statusCode = error.message.includes('required')
      ? 403
      : error.message.includes('Authentication') || error.message.includes('token')
        ? 401
        : 500;
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

console.log('Get-user-auth-details function initialized (v2 - uses shared helpers).');
