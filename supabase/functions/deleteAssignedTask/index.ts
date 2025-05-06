// supabase/functions/deleteAssignedTask/index.ts

import { createClient, SupabaseClient } from 'supabase-js';

import { isActiveAdmin, isActiveTeacher } from '../_shared/authHelpers.ts'; // Use Active checks
import { corsHeaders } from '../_shared/cors.ts';
// Import shared helpers
import { deleteAttachment } from '../_shared/storageHelpers.ts';

interface DeleteTaskPayload {
  assignmentId: string; // The ID of the assigned_tasks record to delete
}

// Helper function to get task details needed for auth and cleanup
async function getTaskDetailsForDelete(
  supabaseClient: SupabaseClient,
  assignmentId: string
): Promise<{
  assigned_by_id: string;
  verification_status: string | null;
  task_attachment_path: string | null;
  student_id: string;
} | null> {
  const { data, error } = await supabaseClient
    .from('assigned_tasks')
    .select('assigned_by_id, verification_status, task_attachment_path, student_id')
    .eq('id', assignmentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.warn(`[getTaskDetailsForDelete] Task ${assignmentId} not found.`);
    } else {
      console.error(`[getTaskDetailsForDelete] Failed for ${assignmentId}:`, error.message);
    }
    return null;
  }
  return data;
}

// Main Function Handler
Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS & Method Check
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }); // Added Content-Type

  console.log(`Received ${req.method} request for deleteAssignedTask`);

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
    // 3. Verify Caller Authentication
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
      console.error('Auth token validation error:', userError?.message || 'User not found');
      return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerId = callerUser.id;
    console.log('Caller User ID:', callerId);

    // 4. Parse Request Body
    let payload: DeleteTaskPayload;
    try {
      payload = await req.json();
      console.log('Received payload:', payload);
    } catch (jsonError) {
      console.error('Failed to parse request body:', jsonError);
      return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Validate Payload - *** RESTORED ***
    if (!payload.assignmentId || typeof payload.assignmentId !== 'string') {
      console.warn('Payload validation failed: Missing or invalid assignmentId.');
      return new Response(JSON.stringify({ error: 'Missing or invalid assignmentId.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // *** END RESTORED VALIDATION ***
    const assignmentIdToDelete = payload.assignmentId;

    // 6. Fetch Task Details for Authorization and Cleanup
    const taskDetails = await getTaskDetailsForDelete(supabaseAdminClient, assignmentIdToDelete);
    if (!taskDetails) {
      console.warn(
        `Task ${assignmentIdToDelete} not found during delete attempt. Assuming already deleted.`
      );
      return new Response(
        JSON.stringify({ message: `Task ${assignmentIdToDelete} not found or already deleted.` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const attachmentPathToCheck = taskDetails.task_attachment_path;

    // 7. Authorize Caller - Using imported helpers
    const userIsActiveAdmin = await isActiveAdmin(supabaseAdminClient, callerId); // Use shared helper
    let canDelete = userIsActiveAdmin;

    if (!userIsActiveAdmin) {
      if (
        taskDetails.assigned_by_id === callerId &&
        (taskDetails.verification_status === null || taskDetails.verification_status === 'pending')
      ) {
        const callerIsActiveTeacher = await isActiveTeacher(supabaseAdminClient, callerId); // Use shared helper
        if (callerIsActiveTeacher) {
          console.log(
            `Authorizing delete for active Teacher ${callerId} on unverified task ${assignmentIdToDelete} they assigned.`
          );
          canDelete = true;
        } else {
          console.warn(
            `User ${callerId} assigned task ${assignmentIdToDelete} but is not an active teacher.`
          );
        }
      } else {
        console.warn(
          `Teacher ${callerId} cannot delete task ${assignmentIdToDelete}. Ownership/Status mismatch. Assigned by: ${taskDetails.assigned_by_id}, Status: ${taskDetails.verification_status}`
        );
      }
    }

    if (!canDelete) {
      console.warn(
        `Authorization failed for user ${callerId} attempting to delete task ${assignmentIdToDelete}.`
      );
      return new Response(
        JSON.stringify({ error: 'Permission denied: User cannot delete this assigned task.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(
      `Authorization success for user ${callerId} to delete task ${assignmentIdToDelete}.`
    );

    // 8. Perform Database Delete FIRST
    console.log(`Attempting to delete assigned task from DB: ${assignmentIdToDelete}`);
    const { error: deleteDbError, count } = await supabaseAdminClient
      .from('assigned_tasks')
      .delete()
      .eq('id', assignmentIdToDelete);

    if (deleteDbError) {
      console.error(`Error deleting assigned task ${assignmentIdToDelete} from DB:`, deleteDbError);
      return new Response(
        JSON.stringify({ error: `Failed to delete assigned task: ${deleteDbError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (count === 0) {
      console.warn(
        `DB delete affected 0 rows for task ${assignmentIdToDelete} (was likely already gone).`
      );
    } else {
      console.log(`Task ${assignmentIdToDelete} deleted successfully from DB.`);
    }

    // 9. Conditional Attachment Cleanup (AFTER successful DB delete) - Using imported helper
    if (attachmentPathToCheck) {
      console.log(`Checking references for attachment path: ${attachmentPathToCheck}`);
      const { count: libraryCount, error: libraryCountError } = await supabaseAdminClient
        .from('task_library')
        .select('*', { count: 'exact', head: true })
        .eq('attachment_path', attachmentPathToCheck);
      const { count: assignedCount, error: assignedCountError } = await supabaseAdminClient
        .from('assigned_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('task_attachment_path', attachmentPathToCheck);

      if (libraryCountError || assignedCountError) {
        console.error(
          `Error checking references for ${attachmentPathToCheck}: LibraryErr=${libraryCountError?.message}, AssignedErr=${assignedCountError?.message}`
        );
      } else {
        const totalReferences = (libraryCount ?? 0) + (assignedCount ?? 0);
        console.log(
          `Found ${libraryCount} library references and ${assignedCount} assigned task references for ${attachmentPathToCheck}. Total: ${totalReferences}`
        );
        if (totalReferences === 0) {
          console.log(
            `No remaining references found. Proceeding to delete attachment from storage: ${attachmentPathToCheck}`
          );
          await deleteAttachment(supabaseAdminClient, attachmentPathToCheck); // Use shared helper
        } else {
          console.log(
            `Attachment ${attachmentPathToCheck} still referenced (${totalReferences} times). Keeping file in Storage.`
          );
        }
      }
    } else {
      console.log(
        `No attachment path associated with deleted task ${assignmentIdToDelete}. Skipping storage check.`
      );
    }

    // 10. Return Success Response
    return new Response(
      JSON.stringify({ message: `Assigned task ${assignmentIdToDelete} processed successfully.` }),
      {
        status: 200, // OK
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unhandled Delete Assigned Task Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

console.log('deleteAssignedTask function initialized (v3 - uses shared helpers).');
