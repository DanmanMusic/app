// supabase/functions/deleteAssignedTask/index.ts

import { createClient, SupabaseClient } from 'supabase-js';

import { isActiveAdmin, isActiveTeacher } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { deleteAttachment } from '../_shared/storageHelpers.ts';

interface DeleteTaskPayload {
  assignmentId: string;
}

async function getTaskDetailsForDelete(
  supabaseClient: SupabaseClient,
  assignmentId: string
): Promise<{
  assigned_by_id: string;
  verification_status: string | null;
  task_attachment_path: string | null;
  student_id: string;
  company_id: string; // MODIFIED: Include company_id
} | null> {
  const { data, error } = await supabaseClient
    .from('assigned_tasks')
    .select('assigned_by_id, verification_status, task_attachment_path, student_id, company_id') // MODIFIED: Select company_id
    .eq('id', assignmentId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error(`[getTaskDetailsForDelete] Failed for ${assignmentId}:`, error.message);
    }
    return null;
  }
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  console.log(`Received ${req.method} request for deleteAssignedTask`);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
      return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerId = callerUser.id;

    // NEW: Get the Caller's Company ID for authorization
    const { data: callerProfile, error: callerProfileError } = await supabaseAdminClient
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
      payload = await req.json();
    } catch (jsonError) {
      return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!payload.assignmentId || typeof payload.assignmentId !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid assignmentId.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const assignmentIdToDelete = payload.assignmentId;

    const taskDetails = await getTaskDetailsForDelete(supabaseAdminClient, assignmentIdToDelete);
    if (!taskDetails) {
      return new Response(
        JSON.stringify({ message: `Task ${assignmentIdToDelete} not found or already deleted.` }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // NEW: The Core Multi-Tenancy Security Check
    if (taskDetails.company_id !== callerCompanyId) {
      console.error(
        `Company mismatch! Caller ${callerId} from ${callerCompanyId} attempted to delete task ${assignmentIdToDelete} from ${taskDetails.company_id}.`
      );
      return new Response(
        JSON.stringify({ error: 'Permission denied: Cannot delete a task from another company.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const attachmentPathToCheck = taskDetails.task_attachment_path;
    const userIsActiveAdmin = await isActiveAdmin(supabaseAdminClient, callerId);
    let canDelete = userIsActiveAdmin;

    if (!userIsActiveAdmin) {
      if (
        taskDetails.assigned_by_id === callerId &&
        (taskDetails.verification_status === null || taskDetails.verification_status === 'pending')
      ) {
        if (await isActiveTeacher(supabaseAdminClient, callerId)) {
          canDelete = true;
        }
      }
    }

    if (!canDelete) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: User cannot delete this assigned task.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error: deleteDbError, count } = await supabaseAdminClient
      .from('assigned_tasks')
      .delete()
      .eq('id', assignmentIdToDelete);
    if (deleteDbError) {
      return new Response(
        JSON.stringify({ error: `Failed to delete assigned task: ${deleteDbError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (attachmentPathToCheck) {
      const { count: refCount } = await supabaseAdminClient
        .from('task_library')
        .select('*', { count: 'exact', head: true })
        .eq('attachment_path', attachmentPathToCheck);
      const { count: assignedCount } = await supabaseAdminClient
        .from('assigned_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('task_attachment_path', attachmentPathToCheck);
      if ((refCount ?? 0) + (assignedCount ?? 0) === 0) {
        await deleteAttachment(supabaseAdminClient, attachmentPathToCheck);
      }
    }

    return new Response(
      JSON.stringify({ message: `Assigned task ${assignmentIdToDelete} processed successfully.` }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unhandled Delete Assigned Task Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

console.log('deleteAssignedTask function initialized (v4 - multi-tenant aware).');
