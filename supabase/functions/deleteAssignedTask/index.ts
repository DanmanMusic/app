// supabase/functions/deleteAssignedTask/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

interface DeleteTaskPayload {
  assignmentId: string; // The ID of the assigned_tasks record to delete
}

// Helper function to check if the caller is an Admin
async function isAdmin(supabaseClient: SupabaseClient, callerUserId: string): Promise<boolean> {
  // Reusing the same helper logic
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', callerUserId)
    .single();
  if (error) { console.error(`isAdmin check failed for ${callerUserId}:`, error.message); return false; }
  return data?.role === 'admin';
}

// Helper function to get task details (assigner and status)
async function getTaskDetails(supabaseClient: SupabaseClient, assignmentId: string): Promise<{ assigned_by_id: string; verification_status: string | null } | null> {
    const { data, error } = await supabaseClient
        .from('assigned_tasks')
        .select('assigned_by_id, verification_status')
        .eq('id', assignmentId)
        .single();

    if (error) {
        console.error(`Failed to fetch task details for ${assignmentId}:`, error.message);
        return null;
    }
    return data;
}


Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  // Allow only POST (or DELETE method if preferred, but POST is simpler for body)
  if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), { status: 405, headers: corsHeaders });
  }

  console.log(`Received ${req.method} request for deleteAssignedTask`);

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

    // 4. Parse Request Body
    let payload: DeleteTaskPayload;
    try {
      payload = await req.json();
      console.log('Received payload:', payload);
    } catch (jsonError) {
      return new Response(JSON.stringify({ error: 'Invalid request body.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 5. Validate Payload
    if (!payload.assignmentId || typeof payload.assignmentId !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid assignmentId.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const assignmentIdToDelete = payload.assignmentId;

    // 6. Authorize Caller
    const userIsAdmin = await isAdmin(supabaseAdminClient, callerId);
    let canDelete = userIsAdmin; // Admins can always delete

    if (!userIsAdmin) {
        // If not admin, check if they are the teacher who assigned it AND task is not verified
        const taskDetails = await getTaskDetails(supabaseAdminClient, assignmentIdToDelete);
        if (taskDetails && taskDetails.assigned_by_id === callerId) {
            // Check if the task is unverified (null or pending)
            if (taskDetails.verification_status === null || taskDetails.verification_status === 'pending') {
                // Fetch caller's role to ensure they are actually a teacher
                 const { data: callerProfile } = await supabaseAdminClient.from('profiles').select('role').eq('id', callerId).single();
                 if (callerProfile?.role === 'teacher') {
                      console.log(`Authorizing delete for Teacher ${callerId} on unverified task ${assignmentIdToDelete} they assigned.`);
                      canDelete = true;
                 } else {
                      console.warn(`User ${callerId} assigned task ${assignmentIdToDelete} but is not a teacher.`);
                 }
            } else {
                console.warn(`Teacher ${callerId} cannot delete task ${assignmentIdToDelete} because it has status: ${taskDetails.verification_status}`);
            }
        }
        // If taskDetails couldn't be fetched, canDelete remains false
         else if(taskDetails && taskDetails.assigned_by_id !== callerId) {
             console.warn(`User ${callerId} did not assign task ${assignmentIdToDelete}. Assigned by: ${taskDetails.assigned_by_id}`);
         }
         else if (!taskDetails) {
              console.warn(`Task details not found for ${assignmentIdToDelete}, cannot authorize non-admin delete.`);
         }
    }

    if (!canDelete) {
         console.warn(`Authorization failed for user ${callerId} attempting to delete task ${assignmentIdToDelete}.`);
         return new Response(JSON.stringify({ error: 'Permission denied: User cannot delete this assigned task.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log(`Authorization success for user ${callerId} to delete task ${assignmentIdToDelete}.`);


    // 7. Perform Database Delete
    console.log(`Attempting to delete assigned task: ${assignmentIdToDelete}`);

    const { error: deleteError, count } = await supabaseAdminClient
      .from('assigned_tasks')
      .delete()
      .eq('id', assignmentIdToDelete);

    if (deleteError) {
      console.error(`Error deleting assigned task ${assignmentIdToDelete}:`, deleteError);
      return new Response(JSON.stringify({ error: `Failed to delete assigned task: ${deleteError.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (count === 0) {
        console.warn(`No task found with ID ${assignmentIdToDelete} to delete (might have been deleted already).`);
         // Still return success as the desired state (task gone) is achieved
    } else {
        console.log(`Task ${assignmentIdToDelete} deleted successfully from DB.`);
    }


    // 8. Return Success Response
    return new Response(JSON.stringify({ message: `Assigned task ${assignmentIdToDelete} deleted successfully.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // OK (or 204 No Content)
    });

  } catch (error) {
    console.error('Unhandled Delete Assigned Task Function Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

console.log('deleteAssignedTask function initialized.');