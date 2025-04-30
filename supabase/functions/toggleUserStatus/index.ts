// supabase/functions/toggleUserStatus/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// Define expected request body structure
interface ToggleUserStatusPayload {
  userIdToToggle: string; // The ID of the user whose status is being toggled
}

// Helper function to check if the caller is an Admin
async function isAdmin(supabaseClient: SupabaseClient, callerUserId: string): Promise<boolean> {
  console.log('[toggleUserStatus] isAdmin Check: Checking profile for caller ID:', callerUserId);
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', callerUserId)
      .single();
    if (error) {
      console.error(`[toggleUserStatus] isAdmin check failed for ${callerUserId}:`, error.message);
      return false; // Default to false if profile check fails
    }
    const role = data?.role;
    console.log(`[toggleUserStatus] isAdmin Check: Found role: ${role} for caller ${callerUserId}`);
    return role === 'admin';
  } catch (err) {
    console.error('[toggleUserStatus] isAdmin Check Exception:', err.message);
    return false;
  }
}

// --- Get Protected IDs (Optional but recommended) ---
// Ensure PROTECTED_ADMIN_IDS environment variable is set in your Supabase project
const PROTECTED_IDS_STRING = Deno.env.get('PROTECTED_ADMIN_IDS') || '';
const PROTECTED_ADMIN_IDS = PROTECTED_IDS_STRING.split(',')
                                             .map(id => id.trim())
                                             .filter(id => id.length > 0);
console.log('[toggleUserStatus] Initialized. Protected Admin IDs:', PROTECTED_ADMIN_IDS);


// Main Function Handler
Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }
  // Allow only POST (common for actions modifying state)
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), { status: 405, headers: corsHeaders });
  }

  console.log(`Received ${req.method} request for toggleUserStatus`);

  // 2. Initialize Supabase Admin Client
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase environment variables.');
    return new Response(JSON.stringify({ error: 'Server configuration error.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false }, global: { fetch: fetch } });
  console.log('Supabase Admin Client initialized.');

  try {
    // 3. Verify Caller Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: userError } = await supabaseAdminClient.auth.getUser(token);
    if (userError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const callerId = callerUser.id;
    console.log('Caller User ID:', callerId);

    // 4. Authorize Caller (Must be Admin)
    const callerIsAdmin = await isAdmin(supabaseAdminClient, callerId);
    if (!callerIsAdmin) {
      console.warn(`User ${callerId} attempted status toggle without admin role.`);
      return new Response(JSON.stringify({ error: 'Permission denied: Admin role required.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log(`Admin action authorized for user ${callerId}.`);

    // 5. Parse Request Body
    let payload: ToggleUserStatusPayload;
    try {
      payload = await req.json();
      console.log('Received payload:', payload);
    } catch (jsonError) {
      return new Response(JSON.stringify({ error: 'Invalid request body: Must be JSON.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 6. Validate Payload
    if (!payload.userIdToToggle || typeof payload.userIdToToggle !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid userIdToToggle.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userIdToToggle = payload.userIdToToggle;

    // 7. Additional Checks (Prevent self-toggle, protected admins)
    if (callerId === userIdToToggle) {
        console.warn(`Admin ${callerId} attempted to toggle own status.`);
      return new Response(JSON.stringify({ error: 'Cannot toggle your own status via this function.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (PROTECTED_ADMIN_IDS.includes(userIdToToggle)) {
        console.warn(`Admin ${callerId} attempted to toggle status for PROTECTED admin ${userIdToToggle}.`);
        return new Response(JSON.stringify({ error: 'This administrator account status cannot be changed.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    // 8. Fetch the current status of the target user
    console.log(`Fetching current status for user ${userIdToToggle}...`);
    const { data: currentProfile, error: fetchError } = await supabaseAdminClient
      .from('profiles')
      .select('status')
      .eq('id', userIdToToggle)
      .single();

    if (fetchError || !currentProfile) {
      console.error(`Could not fetch profile for ${userIdToToggle}:`, fetchError?.message);
      return new Response(JSON.stringify({ error: 'Target user not found.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log(`Current status for ${userIdToToggle} is ${currentProfile.status}.`);

    // 9. Determine the new status
    const newStatus = currentProfile.status === 'active' ? 'inactive' : 'active';
    console.log(`Setting status for ${userIdToToggle} to ${newStatus}.`);

    // 10. Perform the update on the profiles table
    const { data: updatedProfileData, error: updateError } = await supabaseAdminClient
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', userIdToToggle)
      .select('id, status') // Select the fields needed for the response
      .single();

    if (updateError) {
      console.error(`Error updating status for ${userIdToToggle}:`, updateError);
      return new Response(JSON.stringify({ error: `Failed to toggle status: ${updateError.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Status for user ${userIdToToggle} updated successfully to ${newStatus}.`);

    // 11. Return Success Response (containing the updated status)
    return new Response(JSON.stringify(updatedProfileData), {
      status: 200, // OK
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // Catch errors from initial setup/auth/validation etc.
    console.error('Unhandled Toggle User Status Function Error:', error);
    const statusCode = error.message.includes('required') ? 403 : error.message.includes('Authentication') || error.message.includes('token') ? 401 : 500;
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode,
    });
  }
});

console.log('toggleUserStatus function initialized.');