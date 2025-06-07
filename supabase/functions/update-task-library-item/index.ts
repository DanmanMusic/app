// supabase/functions/update-task-library-item/index.ts

import { createClient, SupabaseClient } from 'supabase-js';

import { isActiveAdmin, isActiveTeacher } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { uploadAttachment, deleteAttachment, FileUploadData } from '../_shared/storageHelpers.ts';

interface UpdatePayload {
  title?: string;
  description?: string;
  baseTickets?: number;
  referenceUrl?: string | null;
  instrumentIds?: string[];
  file?: FileUploadData;
  deleteAttachment?: boolean;
}
interface UpdateRequestBody {
  taskId: string;
  updates: UpdatePayload;
}

async function syncInstrumentLinks(
  supabase: SupabaseClient,
  taskId: string,
  newInstrumentIds: string[]
): Promise<{ errors: string[] }> {
  // This helper function remains unchanged
  const errors: string[] = [];
  if (newInstrumentIds === undefined) return { errors }; // No change if undefined

  const { data: currentLinksData, error: fetchError } = await supabase
    .from('task_library_instruments')
    .select('instrument_id')
    .eq('task_library_id', taskId);
  if (fetchError) {
    errors.push(`Failed fetching current instruments: ${fetchError.message}`);
    return { errors };
  }

  const currentLinkIds = currentLinksData?.map(link => link.instrument_id) || [];
  const idsToDelete = currentLinkIds.filter(id => !newInstrumentIds.includes(id));
  const idsToInsert = newInstrumentIds.filter(id => !currentLinkIds.includes(id));

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('task_library_instruments')
      .delete()
      .eq('task_library_id', taskId)
      .in('instrument_id', idsToDelete);
    if (deleteError) errors.push(`Failed deleting old instrument links: ${deleteError.message}`);
  }
  if (idsToInsert.length > 0) {
    const rowsToInsert = idsToInsert.map(instId => ({
      task_library_id: taskId,
      instrument_id: instId,
    }));
    const { error: insertError } = await supabase
      .from('task_library_instruments')
      .insert(rowsToInsert);
    if (insertError) errors.push(`Failed inserting new instrument links: ${insertError.message}`);
  }
  return { errors };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!['POST', 'PUT', 'PATCH'].includes(req.method))
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders },
    });

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

    // NEW: Get the Caller's Company ID for authorization
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

    let requestBody: UpdateRequestBody;
    try {
      requestBody = await req.json();
    } catch (_e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders },
      });
    }
    const { taskId, updates } = requestBody;
    if (!taskId || !updates || typeof updates !== 'object')
      return new Response(JSON.stringify({ error: 'Missing taskId or updates object' }), {
        status: 400,
        headers: { ...corsHeaders },
      });

    if (
      updates.file &&
      (!updates.file.base64 || !updates.file.fileName || !updates.file.mimeType)
    ) {
      return new Response(JSON.stringify({ error: 'Incomplete file data provided' }), {
        status: 400,
        headers: { ...corsHeaders },
      });
    }

    const { data: currentTask, error: fetchError } = await supabaseAdmin
      .from('task_library')
      .select('id, created_by_id, attachment_path, company_id') // MODIFIED: fetch company_id
      .eq('id', taskId)
      .single();

    if (fetchError || !currentTask)
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { ...corsHeaders },
      });

    // NEW: Security Check - Ensure the task belongs to the caller's company
    if (currentTask.company_id !== callerCompanyId) {
      console.error(
        `Company mismatch! Caller ${callerId} from ${callerCompanyId} attempted to update task ${taskId} from ${currentTask.company_id}.`
      );
      return new Response(
        JSON.stringify({ error: 'Permission denied: Cannot update a task from another company.' }),
        { status: 403, headers: { ...corsHeaders } }
      );
    }

    const oldAttachmentPath = currentTask.attachment_path;
    const isAdminCaller = await isActiveAdmin(supabaseAdmin, callerId);
    const isOwnerTeacher =
      currentTask.created_by_id === callerId && (await isActiveTeacher(supabaseAdmin, callerId));

    if (!isAdminCaller && !isOwnerTeacher) {
      return new Response(JSON.stringify({ error: 'Permission denied to update this task' }), {
        status: 403,
        headers: { ...corsHeaders },
      });
    }

    const dbUpdates: Record<string, any> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title.trim();
    if (updates.description !== undefined) dbUpdates.description = updates.description.trim();
    if (
      updates.baseTickets !== undefined &&
      updates.baseTickets >= 0 &&
      Number.isInteger(updates.baseTickets)
    )
      dbUpdates.base_tickets = updates.baseTickets;
    if (updates.hasOwnProperty('referenceUrl'))
      dbUpdates.reference_url = updates.referenceUrl === null ? null : updates.referenceUrl?.trim();

    let newAttachmentPath: string | null = null;
    let shouldDeleteOldFile = false;
    if (updates.file) {
      shouldDeleteOldFile = true;
      newAttachmentPath = await uploadAttachment(supabaseAdmin, updates.file, callerId);
      if (!newAttachmentPath)
        return new Response(JSON.stringify({ error: 'New file upload failed' }), {
          status: 500,
          headers: { ...corsHeaders },
        });
      dbUpdates.attachment_path = newAttachmentPath;
    } else if (updates.deleteAttachment === true) {
      shouldDeleteOldFile = true;
      dbUpdates.attachment_path = null;
    }

    if (Object.keys(dbUpdates).length > 0) {
      const { error: updateDbError } = await supabaseAdmin
        .from('task_library')
        .update(dbUpdates)
        .eq('id', taskId);
      if (updateDbError) {
        if (newAttachmentPath) await deleteAttachment(supabaseAdmin, newAttachmentPath);
        return new Response(
          JSON.stringify({ error: `DB update failed: ${updateDbError.message}` }),
          { status: 500, headers: { ...corsHeaders } }
        );
      }
    }

    let oldAttachmentDeleted = false;
    if (shouldDeleteOldFile && oldAttachmentPath) {
      const { count } = await supabaseAdmin
        .from('assigned_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('task_attachment_path', oldAttachmentPath);
      if (count === 0) {
        oldAttachmentDeleted = await deleteAttachment(supabaseAdmin, oldAttachmentPath);
      }
    }

    const syncErrors: string[] = [];
    if (updates.instrumentIds !== undefined && Array.isArray(updates.instrumentIds)) {
      const { errors } = await syncInstrumentLinks(supabaseAdmin, taskId, updates.instrumentIds);
      syncErrors.push(...errors);
    }

    const message = `Task ${taskId} update processed.${syncErrors.length > 0 ? ' Warnings: ' + syncErrors.join('; ') : ''}${shouldDeleteOldFile && oldAttachmentPath && !oldAttachmentDeleted && syncErrors.length === 0 ? ' Note: Old attachment kept due to usage.' : ''}`;
    return new Response(JSON.stringify({ message: message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled Error in update-task-library-item:', error.message);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders },
    });
  }
});

console.log('update-task-library-item function initialized (v3 - multi-tenant aware).');
