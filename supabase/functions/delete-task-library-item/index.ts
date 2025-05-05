// supabase/functions/delete-task-library-item/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

const TASK_ATTACHMENT_BUCKET = 'task-library-attachments';

interface DeleteTaskPayload {
  taskId: string;
}

// --- Helper functions (isAdmin, isActiveTeacher) remain the same ---
async function isActiveAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data?.role === 'admin' && data?.status === 'active';
  } catch (err) {
    return false;
  }
}
async function isActiveTeacher(supabase: SupabaseClient, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data?.role === 'teacher' && data?.status === 'active';
  } catch (err) {
    return false;
  }
}
// --- Helper: Delete file from storage ---
async function deleteAttachment(supabase: SupabaseClient, path: string | null): Promise<boolean> {
  if (!path) return true;
  console.log(`Attempting to delete attachment from Storage: ${path}`);
  try {
    const { error } = await supabase.storage.from(TASK_ATTACHMENT_BUCKET).remove([path]);
    if (error) throw error;
    console.log(`Successfully deleted attachment ${path}`);
    return true;
  } catch (error) {
    console.error(`Failed to delete attachment ${path}:`, error.message);
    return false;
  }
}

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
    if (!authHeader) {
      /* ... auth error ... */
    }
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      /* ... auth error ... */
    }
    const callerId = user.id;

    // 2. Parse Body/Query Param
    let payload: DeleteTaskPayload;
    try {
      if (req.method === 'DELETE') {
        /* ... get taskId from query ... */
      } else {
        payload = await req.json();
      }
    } catch (e) {
      /* ... payload error ... */
    }
    const { taskId } = payload;
    if (!taskId) {
      /* ... payload error ... */
    }

    // 3. Fetch Task INCLUDING attachment_path
    const { data: currentTask, error: fetchError } = await supabaseAdmin
      .from('task_library')
      .select('id, created_by_id, attachment_path') // Fetch path
      .eq('id', taskId)
      .single();

    if (fetchError || !currentTask) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { ...corsHeaders },
      });
    }
    const attachmentPathToDelete = currentTask.attachment_path; // Store the path

    // 4. Authorize Caller (Admin or Teacher owner)
    const isAdminCaller = await isActiveAdmin(supabaseAdmin, callerId);
    const isOwnerTeacher =
      currentTask.created_by_id === callerId && (await isActiveTeacher(supabaseAdmin, callerId));
    if (!isAdminCaller && !isOwnerTeacher) {
      return new Response(JSON.stringify({ error: 'Permission denied' }), {
        status: 403,
        headers: { ...corsHeaders },
      });
    }

    // 5. *** Reference Check (BEFORE deleting DB row) ***
    let isSafeToDeleteAttachment = false; // Default to not safe
    if (attachmentPathToDelete) {
      console.log(`Checking references for attachment: ${attachmentPathToDelete}`);
      const { count, error: countError } = await supabaseAdmin
        .from('assigned_tasks')
        .select('*', { count: 'exact', head: true }) // Just need the count
        .eq('task_attachment_path', attachmentPathToDelete);

      if (countError) {
        console.error(
          `Error checking assigned_tasks references for path ${attachmentPathToDelete}:`,
          countError.message
        );
        // Decide: Fail deletion entirely? Or just skip storage deletion?
        // Safter to fail entirely if unsure.
        return new Response(JSON.stringify({ error: 'Failed to check attachment references.' }), {
          status: 500,
          headers: { ...corsHeaders },
        });
      }

      console.log(`Found ${count} assigned_tasks referencing path ${attachmentPathToDelete}`);
      if (count === 0) {
        isSafeToDeleteAttachment = true; // Safe to delete storage file
      } else {
        console.log(
          `Attachment ${attachmentPathToDelete} is still referenced by assigned tasks. Skipping Storage delete.`
        );
      }
    } else {
      console.log(`Task ${taskId} has no attachment path. Skipping reference check.`);
      // No attachment existed, so technically "safe" in the sense there's nothing to delete later.
      isSafeToDeleteAttachment = true; // Or could just skip the final delete step
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

    // 7. Conditional Storage Deletion (AFTER successful DB deletion)
    if (attachmentPathToDelete && isSafeToDeleteAttachment) {
      console.log(`Proceeding to delete attachment from storage: ${attachmentPathToDelete}`);
      await deleteAttachment(supabaseAdmin, attachmentPathToDelete); // Log errors inside helper, don't fail overall request now
    }

    // 8. Return Success
    return new Response(JSON.stringify({ message: `Task ${taskId} deleted successfully.` }), {
      status: 200,
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
