// supabase/functions/deleteUser/index.ts

import { createClient } from 'supabase-js';

import { isActiveAdmin } from '../_shared/authHelpers.ts'; // Use isActiveAdmin
import { corsHeaders } from '../_shared/cors.ts';
// Import shared helper

// Define expected request body structure
interface DeleteUserPayload {
  userIdToDelete: string; // The ID of the user to be deleted
}

// --- Get Protected IDs from Environment Variable ---
const PROTECTED_IDS_STRING = Deno.env.get('PROTECTED_ADMIN_IDS') || '';
const PROTECTED_ADMIN_IDS = PROTECTED_IDS_STRING.split(',')
  .map(id => id.trim())
  .filter(id => id.length > 0);
console.log('[deleteUser] Initialized. Protected Admin IDs:', PROTECTED_ADMIN_IDS);

// Main Function Handler
Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS request & Method Check
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  console.log(`Received ${req.method} request for deleteUser`);

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
      console.error(
        'Auth token validation error:',
        userError?.message || 'User not found for token'
      );
      return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerId = callerUser.id;
    console.log('Caller User ID:', callerId);

    // 4. Authorize Caller (Must be Active Admin) - Using imported helper
    const callerIsActiveAdmin = await isActiveAdmin(supabaseAdminClient, callerId); // Use shared helper
    if (!callerIsActiveAdmin) {
      console.warn(`User ${callerId} attempted delete action without active admin role.`);
      return new Response(
        JSON.stringify({ error: 'Permission denied: Active Admin role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`Admin delete action authorized for active admin ${callerId}.`);

    // 5. Parse Request Body
    let payload: DeleteUserPayload;
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

    // 6. Validate Payload
    if (!payload.userIdToDelete || typeof payload.userIdToDelete !== 'string') {
      console.warn('Payload validation failed: Missing or invalid userIdToDelete.');
      return new Response(JSON.stringify({ error: 'Missing or invalid userIdToDelete.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userIdToDelete = payload.userIdToDelete;

    // 7. Additional Authorization Checks
    // Prevent self-deletion
    if (callerId === userIdToDelete) {
      console.warn(`Admin user ${callerId} attempted to delete themselves.`);
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account via this function.' }),
        {
          status: 400, // Bad Request
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    // Prevent deletion of protected Admins
    if (PROTECTED_ADMIN_IDS.includes(userIdToDelete)) {
      console.warn(`Admin user ${callerId} attempted to delete PROTECTED admin ${userIdToDelete}.`);
      return new Response(
        JSON.stringify({ error: 'This administrator account cannot be deleted.' }),
        {
          status: 403, // Forbidden
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 8. Call Supabase Admin API to Delete User by ID
    console.log(`Attempting to permanently delete user: ${userIdToDelete}`);
    const { data: _deleteResult, error: deleteError } =
      await supabaseAdminClient.auth.admin.deleteUser(userIdToDelete);

    if (deleteError) {
      console.error(`Supabase Auth Delete Error for user ${userIdToDelete}:`, deleteError);
      const userNotFound = deleteError.message.toLowerCase().includes('not found');
      const errorMessage = userNotFound
        ? 'User to delete was not found.'
        : `Failed to delete user: ${deleteError.message}`;
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: userNotFound ? 404 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(
      `User ${userIdToDelete} deleted successfully from auth.users (cascade should handle profile etc.).`
    );

    // 9. Return Success Response
    return new Response(
      JSON.stringify({ message: `User ${userIdToDelete} deleted successfully.` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // OK
      }
    );
  } catch (error) {
    console.error('Unhandled Delete User Function Error:', error);
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

console.log('DeleteUser function initialized (v3 - uses shared helpers).');
