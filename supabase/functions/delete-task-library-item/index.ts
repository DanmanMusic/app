// supabase/functions/delete-task-library-item/index.ts

import { createClient } from 'supabase-js';

import { isActiveAdmin, isActiveTeacher } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';
// Import shared helpers
import { deleteAttachment } from '../_shared/storageHelpers.ts';

interface DeleteTaskPayload {
  taskId: string;
}

// Main Function Handler
Deno.serve(async (req: Request) => {
  // CORS and Method Checks...
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders },
    });
  }

  // Init Supabase Client...
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server config error' }), {
      status: 500,
      headers: { ...corsHeaders },
    });
  }
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1. Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader)
      return new Response(JSON.stringify({ error: 'Auth required' }), {
        status: 401,
        headers: { ...corsHeaders },
      });
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user)
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders },
      });
    const callerId = user.id;

    // 2. Parse Body/Query Param
    let payload: DeleteTaskPayload;
    try {
      if (req.method === 'DELETE') {
        const url = new URL(req.url);
        const taskIdFromQuery = url.searchParams.get('taskId');
        if (!taskIdFromQuery)
          throw new Error('Missing taskId in query parameter for DELETE request');
        payload = { taskId: taskIdFromQuery };
      } else {
        // POST
        payload = await req.json();
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: `Invalid payload: ${e.message}` }), {
        status: 400,
        headers: { ...corsHeaders },
      });
    }
    const { taskId } = payload;
    if (!taskId)
      return new Response(JSON.stringify({ error: 'Missing taskId' }), {
        status: 400,
        headers: { ...corsHeaders },
      });

    // 3. Fetch Task (including attachment_path and created_by_id)
    const { data: currentTask, error: fetchError } = await supabaseAdmin
      .from('task_library')
      .select('id, created_by_id, attachment_path') // Fetch path and owner
      .eq('id', taskId)
      .single();

    if (fetchError || !currentTask) {
      // If task not found, treat as success for delete operation
      if (fetchError?.code === 'PGRST116') {
        // PostgREST code for "Not Found"
        console.warn(`Task library item ${taskId} not found. Assuming already deleted.`);
        return new Response(
          JSON.stringify({ message: `Task ${taskId} not found or already deleted.` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error(`Error fetching task ${taskId}:`, fetchError?.message);
      return new Response(JSON.stringify({ error: 'Task not found or fetch error' }), {
        status: 404,
        headers: { ...corsHeaders },
      });
    }
    const attachmentPathToDelete = currentTask.attachment_path; // Store the path

    // 4. Authorize Caller (Admin or Teacher owner) - Using imported helpers
    const isAdminCaller = await isActiveAdmin(supabaseAdmin, callerId); // Use shared helper
    const isOwnerTeacher =
      currentTask.created_by_id === callerId && (await isActiveTeacher(supabaseAdmin, callerId)); // Use shared helper

    if (!isAdminCaller && !isOwnerTeacher) {
      return new Response(JSON.stringify({ error: 'Permission denied to delete this task' }), {
        status: 403,
        headers: { ...corsHeaders },
      });
    }
    console.log(
      `Delete authorized for task ${taskId} by user ${callerId} (Admin: ${isAdminCaller}, Owner: ${isOwnerTeacher})`
    );

    // 5. Reference Check (BEFORE deleting DB row)
    let isSafeToDeleteAttachment = false;
    if (attachmentPathToDelete) {
      console.log(`Checking references for attachment: ${attachmentPathToDelete}`);
      const { count, error: countError } = await supabaseAdmin
        .from('assigned_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('task_attachment_path', attachmentPathToDelete);

      if (countError) {
        console.error(
          `Error checking assigned_tasks references for path ${attachmentPathToDelete}:`,
          countError.message
        );
        return new Response(JSON.stringify({ error: 'Failed to check attachment references.' }), {
          status: 500,
          headers: { ...corsHeaders },
        });
      }
      console.log(`Found ${count} assigned_tasks referencing path ${attachmentPathToDelete}`);
      if (count === 0) {
        isSafeToDeleteAttachment = true;
      } else {
        console.log(
          `Attachment ${attachmentPathToDelete} is still referenced. Skipping Storage delete.`
        );
      }
    } else {
      console.log(`Task ${taskId} has no attachment path. Skipping reference check.`);
      isSafeToDeleteAttachment = true; // No attachment existed
    }

    // 6. Delete Task from DB
    const { error: deleteDbError } = await supabaseAdmin
      .from('task_library')
      .delete()
      .eq('id', taskId);

    if (deleteDbError) {
      console.error(`DB Delete Error for task ${taskId}:`, deleteDbError);
      return new Response(JSON.stringify({ error: `DB delete failed: ${deleteDbError.message}` }), {
        status: 500,
        headers: { ...corsHeaders },
      });
    }
    console.log(`Task library item ${taskId} deleted from DB.`);

    // 7. Conditional Storage Deletion (AFTER successful DB deletion) - Using imported helper
    if (attachmentPathToDelete && isSafeToDeleteAttachment) {
      console.log(`Proceeding to delete attachment from storage: ${attachmentPathToDelete}`);
      await deleteAttachment(supabaseAdmin, attachmentPathToDelete); // Log errors inside helper
    }

    // 8. Return Success
    return new Response(JSON.stringify({ message: `Task ${taskId} deleted successfully.` }), {
      status: 200, // OK
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled Error in delete-task-library-item:', error.message);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders },
    });
  }
});

console.log('delete-task-library-item function initialized (v2 - uses shared helpers).');
