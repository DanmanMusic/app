// supabase/functions/delete-task-library-item/index.ts

import { createClient } from 'supabase-js';

import { isActiveAdmin, isActiveTeacher } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';
// The storageHelpers import is no longer needed as we don't handle files here.

interface DeleteTaskPayload {
  taskId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!['POST', 'DELETE'].includes(req.method)) {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey)
    return new Response(JSON.stringify({ error: 'Server config error' }), {
      status: 500,
      headers: { ...corsHeaders },
    });

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader)
      return new Response(JSON.stringify({ error: 'Auth required' }), {
        status: 401,
        headers: { ...corsHeaders },
      });
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user: callerUser },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);
    if (userError || !callerUser)
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders },
      });
    const callerId = callerUser.id;

    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', callerId)
      .single();
    if (callerProfileError || !callerProfile) {
      return new Response(JSON.stringify({ error: 'Could not verify caller profile.' }), {
        status: 500,
        headers: { ...corsHeaders },
      });
    }
    const callerCompanyId = callerProfile.company_id;

    let payload: DeleteTaskPayload;
    try {
      if (req.method === 'DELETE') {
        const url = new URL(req.url);
        const taskIdFromQuery = url.searchParams.get('taskId');
        if (!taskIdFromQuery)
          throw new Error('Missing taskId in query parameter for DELETE request');
        payload = { taskId: taskIdFromQuery };
      } else {
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

    const { data: currentTask, error: fetchError } = await supabaseAdmin
      .from('task_library')
      .select('id, created_by_id, company_id') // MODIFIED: Select only necessary columns
      .eq('id', taskId)
      .single();

    if (fetchError || !currentTask) {
      if (fetchError?.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ message: `Task ${taskId} not found or already deleted.` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ error: 'Task not found or fetch error' }), {
        status: 404,
        headers: { ...corsHeaders },
      });
    }

    if (currentTask.company_id !== callerCompanyId) {
      console.error(
        `Company mismatch! Caller ${callerId} from ${callerCompanyId} attempted to delete library item ${taskId} from ${currentTask.company_id}.`
      );
      return new Response(
        JSON.stringify({
          error: 'Permission denied: Cannot delete a library item from another company.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const isAdminCaller = await isActiveAdmin(supabaseAdmin, callerId);
    const isOwnerTeacher =
      currentTask.created_by_id === callerId && (await isActiveTeacher(supabaseAdmin, callerId));

    if (!isAdminCaller && !isOwnerTeacher) {
      return new Response(JSON.stringify({ error: 'Permission denied to delete this task' }), {
        status: 403,
        headers: { ...corsHeaders },
      });
    }

    // REMOVED: The entire block of logic for checking and deleting storage files has been removed.

    const { error: deleteDbError } = await supabaseAdmin
      .from('task_library')
      .delete()
      .eq('id', taskId);

    if (deleteDbError) {
      return new Response(JSON.stringify({ error: `DB delete failed: ${deleteDbError.message}` }), {
        status: 500,
        headers: { ...corsHeaders },
      });
    }

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
