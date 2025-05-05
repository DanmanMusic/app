// supabase/functions/deleteAssignedTask/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

const TASK_ATTACHMENT_BUCKET = 'task-library-attachments';

interface DeleteTaskPayload {
  assignmentId: string; // The ID of the assigned_tasks record to delete
}

// --- Helper functions (isAdmin, deleteAttachment) ---
async function isAdmin(supabaseClient: SupabaseClient, callerUserId: string): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', callerUserId)
    .single();
  if (error) {
    console.error(`isAdmin check failed for ${callerUserId}:`, error.message);
    return false;
  }
  return data?.role === 'admin';
}

async function deleteAttachment(supabase: SupabaseClient, path: string | null): Promise<boolean> {
  if (!path) return true;
  console.log(`[deleteAssignedTask EF] Attempting to delete attachment from Storage: ${path}`);
  try {
    const { error } = await supabase.storage.from(TASK_ATTACHMENT_BUCKET).remove([path]);
    if (error) throw error;
    console.log(`[deleteAssignedTask EF] Successfully deleted attachment ${path}`);
    return true;
  } catch (error) {
    console.error(`[deleteAssignedTask EF] Failed to delete attachment ${path}:`, error.message);
    return false;
  }
}

// Helper function to get task details needed for auth and cleanup
async function getTaskDetailsForDelete(
  supabaseClient: SupabaseClient,
  assignmentId: string
): Promise<{
  assigned_by_id: string;
  verification_status: string | null;
  task_attachment_path: string | null;
} | null> {
  const { data, error } = await supabaseClient
    .from('assigned_tasks')
    .select('assigned_by_id, verification_status, task_attachment_path') // Fetch path too
    .eq('id', assignmentId)
    .single();

  if (error) {
    console.error(`Failed to fetch task details for delete ${assignmentId}:`, error.message);
    return null;
  }
  return data;
}

Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS & Method Check
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: corsHeaders,
    });

  console.log(`Received ${req.method} request for deleteAssignedTask`);

  // 2. Initialize Supabase Admin Client
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    /* ... server config error ... */
  }
  const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: fetch },
  });

  try {
    // 3. Verify Caller Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      /* ... auth error ... */
    }
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user: callerUser },
      error: userError,
    } = await supabaseAdminClient.auth.getUser(token);
    if (userError || !callerUser) {
      /* ... auth error ... */
    }
    const callerId = callerUser.id;
    console.log('Caller User ID:', callerId);

    // 4. Parse Request Body
    let payload: DeleteTaskPayload;
    try {
      payload = await req.json();
    } catch (jsonError) {
      /* ... body error ... */
    }
    console.log('Received payload:', payload);

    // 5. Validate Payload
    if (!payload.assignmentId || typeof payload.assignmentId !== 'string') {
      /* ... validation error ... */
    }
    const assignmentIdToDelete = payload.assignmentId;

    // 6. Fetch Task Details for Authorization and Cleanup
    const taskDetails = await getTaskDetailsForDelete(supabaseAdminClient, assignmentIdToDelete);
    if (!taskDetails) {
      // Task might already be deleted, which is okay for a delete operation.
      console.warn(`Task ${assignmentIdToDelete} not found. Assuming already deleted.`);
      return new Response(
        JSON.stringify({ message: `Task ${assignmentIdToDelete} not found or already deleted.` }),
        {
          status: 200, // OK, desired state achieved
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    const attachmentPathToCheck = taskDetails.task_attachment_path; // Store path before delete

    // 7. Authorize Caller
    const userIsAdmin = await isAdmin(supabaseAdminClient, callerId);
    let canDelete = userIsAdmin;
    if (!userIsAdmin) {
      if (taskDetails.assigned_by_id === callerId) {
        if (
          taskDetails.verification_status === null ||
          taskDetails.verification_status === 'pending'
        ) {
          const { data: callerProfile } = await supabaseAdminClient
            .from('profiles')
            .select('role')
            .eq('id', callerId)
            .single();
          if (callerProfile?.role === 'teacher') {
            canDelete = true;
          }
        }
      }
    }
    if (!canDelete) {
      /* ... authz error ... */
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
      // Continue to potential cleanup check
    } else {
      console.log(`Task ${assignmentIdToDelete} deleted successfully from DB.`);
    }

    // 9. Conditional Attachment Cleanup (AFTER successful DB delete)
    if (attachmentPathToCheck) {
      console.log(`Checking references for attachment path: ${attachmentPathToCheck}`);

      // Check Task Library references
      const { count: libraryCount, error: libraryCountError } = await supabaseAdminClient
        .from('task_library')
        .select('*', { count: 'exact', head: true })
        .eq('attachment_path', attachmentPathToCheck);

      // Check *other* Assigned Task references
      const { count: assignedCount, error: assignedCountError } = await supabaseAdminClient
        .from('assigned_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('task_attachment_path', attachmentPathToCheck);
      // No need to exclude the deleted ID here, as it's already gone from the table

      if (libraryCountError || assignedCountError) {
        console.error(
          `Error checking references for ${attachmentPathToCheck}: LibraryErr=${libraryCountError?.message}, AssignedErr=${assignedCountError?.message}`
        );
        // Don't delete if checks fail
      } else {
        const totalReferences = (libraryCount ?? 0) + (assignedCount ?? 0);
        console.log(
          `Found ${libraryCount} library references and ${assignedCount} assigned task references for ${attachmentPathToCheck}. Total: ${totalReferences}`
        );

        if (totalReferences === 0) {
          console.log(
            `No remaining references found. Proceeding to delete attachment from storage: ${attachmentPathToCheck}`
          );
          await deleteAttachment(supabaseAdminClient, attachmentPathToCheck); // Log errors inside helper
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

console.log('deleteAssignedTask function initialized (v2 - with attachment cleanup).');
