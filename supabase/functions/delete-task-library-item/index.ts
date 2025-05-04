// supabase/functions/delete-task-library-item/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// No need for storage bucket constant here

interface DeleteTaskPayload {
  taskId: string;
}

// Helper: Check if user is active Admin
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
    console.error('isActiveAdmin check error:', err.message);
    return false;
  }
}

// Helper: Check if user is active Teacher
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
    console.error('isActiveTeacher check error:', err.message);
    return false;
  }
}

// *** REMOVED deleteAttachment helper ***

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders },
    });
  }

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
      return new Response(JSON.stringify({ error: 'Auth required' }), {
        status: 401,
        headers: { ...corsHeaders },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders },
      });
    }
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
    if (!taskId) {
      return new Response(JSON.stringify({ error: 'Missing taskId' }), {
        status: 400,
        headers: { ...corsHeaders },
      });
    }

    // 3. Fetch Task (Only need created_by_id for authorization now)
    const { data: currentTask, error: fetchError } = await supabaseAdmin
      .from('task_library')
      .select('id, created_by_id') // Don't need attachment_path anymore
      .eq('id', taskId)
      .single();

    if (fetchError || !currentTask) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { ...corsHeaders },
      });
    }

    // 4. Authorize Caller
    const isAdmin = await isActiveAdmin(supabaseAdmin, callerId);
    const isOwner =
      currentTask.created_by_id === callerId && (await isActiveTeacher(supabaseAdmin, callerId));

    if (!isAdmin && !isOwner) {
      return new Response(JSON.stringify({ error: 'Permission denied to delete this task' }), {
        status: 403,
        headers: { ...corsHeaders },
      });
    }

    // 5. Delete Task from DB
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

    // *** REMOVED Attachment Deletion Step ***

    // 6. Return Success
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
