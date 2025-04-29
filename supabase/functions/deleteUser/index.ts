// supabase/functions/deleteUser/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// Define expected request body structure
interface DeleteUserPayload {
  userIdToDelete: string; // The ID of the user to be deleted
}

// Helper function to check if the caller is an Admin
async function isAdmin(supabaseClient: SupabaseClient, callerUserId: string): Promise<boolean> {
  console.log('[deleteUser] isAdmin Check: Checking profile for caller ID:', callerUserId);
  try {
    const { data, error, status } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', callerUserId)
      .single();

    if (error) {
       if (error.code === 'PGRST116') { console.warn(`[deleteUser] isAdmin Check: Profile not found for caller ${callerUserId}`); }
       else { console.error('[deleteUser] isAdmin Check Error:', error.message, `(Status: ${status})`); }
       return false;
    }
    const role = data?.role;
    console.log(`[deleteUser] isAdmin Check: Found profile role: ${role} for caller ${callerUserId}`);
    return role === 'admin';
  } catch (err) {
      console.error('[deleteUser] isAdmin Check Exception:', err);
      return false;
  }
}

// Main Function Handler
Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }
   // Only allow POST requests for deletion for clarity, though DELETE method is also common
   if (req.method !== 'POST') {
        console.warn(`Received non-POST request: ${req.method}`);
       return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), { status: 405, headers: { ...corsHeaders }});
   }


  console.log(`Received ${req.method} request for deleteUser`);

  // Initialize Supabase Admin Client (needed for admin delete user call)
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
     console.error("Missing Supabase environment variables.");
     return new Response(JSON.stringify({ error: "Server configuration error." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
  const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: fetch }
  });
  console.log('Supabase Admin Client initialized.');

  try {
    // 2. Verify Caller is Authenticated and Admin
     const authHeader = req.headers.get('Authorization');
     if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('Missing or invalid Authorization header.');
       return new Response(JSON.stringify({ error: "Authentication required." }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
     }
     const token = authHeader.replace('Bearer ', '');
     const { data: { user: callerUser }, error: userError } = await supabaseAdminClient.auth.getUser(token);
     if (userError || !callerUser) {
        console.error("Auth token validation error:", userError?.message || "User not found for token");
       return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
     }
     console.log('Caller User ID:', callerUser.id);

     const callerIsAdmin = await isAdmin(supabaseAdminClient, callerUser.id);
     if (!callerIsAdmin) {
         console.warn(`User ${callerUser.id} attempted delete action without admin role.`);
         return new Response(JSON.stringify({ error: 'Permission denied: Admin role required.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
     }
     console.log(`Admin delete action authorized for user ${callerUser.id}.`);


    // 3. Parse Request Body
    let payload: DeleteUserPayload;
    try {
        payload = await req.json();
        console.log('Received payload:', payload);
    } catch (jsonError) {
         console.error("Failed to parse request body:", jsonError);
         return new Response(JSON.stringify({ error: "Invalid request body: Must be JSON." }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // 4. Validate Payload
    if (!payload.userIdToDelete || typeof payload.userIdToDelete !== 'string') {
        console.warn("Payload validation failed: Missing or invalid userIdToDelete.");
      return new Response(JSON.stringify({ error: 'Missing or invalid userIdToDelete.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
    const userIdToDelete = payload.userIdToDelete;

    // ** Sanity Check: Prevent Admin from deleting themselves via this function? **
    if (callerUser.id === userIdToDelete) {
         console.warn(`Admin user ${callerUser.id} attempted to delete themselves.`);
         return new Response(JSON.stringify({ error: 'Cannot delete your own account via this function.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // 5. Call Supabase Admin API to Delete User by ID
    console.log(`Attempting to permanently delete user: ${userIdToDelete}`);
    const { data: deleteResult, error: deleteError } = await supabaseAdminClient.auth.admin.deleteUser(
      userIdToDelete
      // Set shouldSoftDelete to false (default) for permanent deletion
      // { shouldSoftDelete: false }
    );

    if (deleteError) {
        console.error(`Supabase Auth Delete Error for user ${userIdToDelete}:`, deleteError);
        // Handle potential errors like user not found
        const errorMessage = deleteError.message.toLowerCase().includes('not found')
            ? 'User to delete was not found.'
            : `Failed to delete user: ${deleteError.message}`;
       return new Response(JSON.stringify({ error: errorMessage }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); // Use 404 if not found
    }

    // Deletion from auth.users successful. Cascade should handle profiles etc.
    console.log(`User ${userIdToDelete} deleted successfully from auth.users.`);


    // 6. Return Success Response
    return new Response(JSON.stringify({ message: `User ${userIdToDelete} deleted successfully.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // OK (or 204 No Content if preferred for deletes)
    });

  } catch (error) {
    // Catch errors from initial setup/auth/validation etc.
    console.error('Unhandled Delete User Function Error:', error);
    const statusCode = error.message.includes('required') ? 403 : error.message.includes('Authentication') || error.message.includes('token') ? 401 : 500;
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode,
    });
  }
});

console.log('DeleteUser function initialized.');