// supabase/functions/generate-onetime-pin/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts'; // Using shared CORS

// Define the expected request body structure
interface GeneratePinPayload {
  userId: string; // The ID of the user (student/teacher/admin) needing the PIN
  targetRole: 'student' | 'parent' | 'admin' | 'teacher'; // The role the user will assume when claiming
}

// Helper function to check if the caller is an Admin OR Teacher
// Assumes is_active_admin() function exists in your DB
async function isAuthorizedGenerator(
  supabaseClient: SupabaseClient,
  callerUserId: string
): Promise<boolean> {
  console.log('isAuthorizedGenerator Check: Checking profile for caller ID:', callerUserId);
  try {
    const { data, error, status } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', callerUserId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.warn(`isAuthorizedGenerator Check: Profile not found for caller ${callerUserId}`);
      } else {
        console.error('isAuthorizedGenerator Check Error:', error.message, `(Status: ${status})`);
      }
      return false;
    }
    const role = data?.role;
    console.log(
      `isAuthorizedGenerator Check: Found profile role: ${role} for caller ${callerUserId}`
    );
    // Allow Admins OR Teachers to generate PINs
    return role === 'admin' || role === 'teacher';
  } catch (err) {
    console.error('isAuthorizedGenerator Check Exception:', err);
    return false;
  }
}

// Function to generate a random 6-digit PIN
function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Main Function Handler
Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders },
    });
  }

  console.log(`Received ${req.method} request for generate-onetime-pin`);

  try {
    // 2. Initialize Supabase Admin Client (needed for DB inserts)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase environment variables.');
      throw new Error('Server configuration error.');
    }

    const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: fetch },
    });
    console.log('Supabase Admin Client initialized.');

    // 3. Verify Caller is Authenticated and Authorized (Admin or Teacher)
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
      data: { user },
      error: userError,
    } = await supabaseAdminClient.auth.getUser(token); // Use admin client to verify token
    if (userError || !user) {
      console.error(
        'Auth token validation error:',
        userError?.message || 'User not found for token'
      );
      return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Caller User ID:', user.id);

    const callerIsAuthorized = await isAuthorizedGenerator(supabaseAdminClient, user.id);
    if (!callerIsAuthorized) {
      console.warn(
        `User ${user.id} attempted PIN generation without required role (Admin/Teacher).`
      );
      return new Response(
        JSON.stringify({ error: 'Permission denied: Admin or Teacher role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`PIN generation authorized for user ${user.id}.`);

    // 4. Parse Request Body
    let payload: GeneratePinPayload;
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

    // 5. Validate Payload
    if (!payload.userId || !payload.targetRole) {
      console.warn('Payload validation failed: Missing userId or targetRole.');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, targetRole.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Validate the targetRole value
    if (!['student', 'parent', 'admin', 'teacher'].includes(payload.targetRole)) {
      console.warn(`Payload validation failed: Invalid targetRole '${payload.targetRole}'.`);
      return new Response(
        JSON.stringify({
          error: 'Invalid targetRole. Must be "student", "parent", "admin", or "teacher".',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // TODO: Add check: Ensure targetRole 'parent' is only allowed if payload.userId corresponds to a student?

    // 6. Generate PIN and Expiry
    const pin = generatePin();
    const expiryMinutes = 5; // PIN is valid for 5 minutes
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
    console.log(
      `Generated PIN ${pin} for user ${payload.userId}, target role ${payload.targetRole}. Expires at: ${expiresAt}`
    );

    // 7. Store PIN temporarily in the database
    console.log(`Attempting to insert PIN ${pin} into onetime_pins...`);
    const { error: insertError } = await supabaseAdminClient.from('onetime_pins').insert({
      pin: pin,
      user_id: payload.userId,
      target_role: payload.targetRole, // Store the correct intended role
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('Error inserting PIN into database:', insertError);
      // Check if it's a unique constraint violation (PIN collision)
      if (insertError.code === '23505') {
        console.warn(`PIN collision occurred for PIN ${pin}. This is highly unlikely.`);
        return new Response(
          JSON.stringify({
            error: `Failed to store temporary PIN due to unlikely collision. Please try again.`,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Otherwise, return a generic server error
      return new Response(
        JSON.stringify({ error: `Failed to store temporary PIN: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`PIN ${pin} successfully stored.`);

    // 8. Return the generated PIN to the caller (Admin/Teacher)
    return new Response(JSON.stringify({ pin: pin }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // OK
    });
  } catch (error) {
    // Catch errors from initial setup/auth/validation etc.
    console.error('Unhandled Generate PIN Function Error:', error);
    const statusCode = error.message.includes('required')
      ? 403
      : error.message.includes('Authentication') || error.message.includes('token')
        ? 401
        : 500;
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );
  }
});

console.log('Generate-onetime-pin function initialized (v2 - admin/teacher support).');
