// supabase/functions/generate-onetime-pin/index.ts

import { createClient } from 'supabase-js';

import { isActiveAdminOrTeacher } from '../_shared/authHelpers.ts'; // Use shared helper
import { corsHeaders } from '../_shared/cors.ts';
// Import shared helper

// Define the expected request body structure
interface GeneratePinPayload {
  userId: string; // The ID of the user (student/teacher/admin) needing the PIN
  targetRole: 'student' | 'parent' | 'admin' | 'teacher'; // The role the user will assume when claiming
}

// Function to generate a random 6-digit PIN (Keep local)
function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

  console.log(`Received ${req.method} request for generate-onetime-pin`);

  try {
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
      data: { user },
      error: userError,
    } = await supabaseAdminClient.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth token validation error:', userError?.message || 'User not found');
      return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Caller User ID:', user.id);

    // 4. Authorize Caller (Admin or Teacher) - Using imported helper
    const { authorized } = await isActiveAdminOrTeacher(supabaseAdminClient, user.id); // Use shared helper
    if (!authorized) {
      console.warn(
        `User ${user.id} attempted PIN generation without required role (Admin/Teacher).`
      );
      return new Response(
        JSON.stringify({ error: 'Permission denied: Admin or Teacher role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`PIN generation authorized for user ${user.id}.`);

    // 5. Parse Request Body
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

    // 6. Validate Payload - *** RESTORED ***
    if (
      !payload.userId ||
      typeof payload.userId !== 'string' ||
      !payload.targetRole ||
      typeof payload.targetRole !== 'string'
    ) {
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
    // *** END RESTORED VALIDATION ***

    // 7. Generate PIN and Expiry
    const pin = generatePin();
    const expiryMinutes = 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
    console.log(
      `Generated PIN ${pin} for user ${payload.userId}, target role ${payload.targetRole}. Expires at: ${expiresAt}`
    );

    // 8. Store PIN temporarily in the database
    console.log(`Attempting to insert PIN ${pin} into onetime_pins...`);
    const { error: insertError } = await supabaseAdminClient.from('onetime_pins').insert({
      pin: pin,
      user_id: payload.userId,
      target_role: payload.targetRole,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('Error inserting PIN into database:', insertError);
      if (insertError.code === '23505') {
        // Handle unlikely PIN collision
        console.warn(`PIN collision occurred for PIN ${pin}.`);
        return new Response(
          JSON.stringify({
            error: `Failed to store temporary PIN due to unlikely collision. Please try again.`,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: `Failed to store temporary PIN: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`PIN ${pin} successfully stored.`);

    // 9. Return the generated PIN to the caller
    return new Response(JSON.stringify({ pin: pin }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // OK
    });
  } catch (error) {
    console.error('Unhandled Generate PIN Function Error:', error);
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

console.log('Generate-onetime-pin function initialized (v3 - uses shared helpers).');
