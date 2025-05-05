// supabase/functions/update-task-library-item/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
// Import shared helpers
import { isActiveAdmin, isActiveTeacher } from '../_shared/authHelpers.ts';
import { uploadAttachment, deleteAttachment, FileUploadData } from '../_shared/storageHelpers.ts';
// Import decode separately if not handled within storageHelpers input type
// import { decode } from 'https://deno.land/std@0.203.0/encoding/base64.ts';

interface UpdatePayload {
  title?: string;
  description?: string;
  baseTickets?: number;
  referenceUrl?: string | null;
  instrumentIds?: string[];
  file?: FileUploadData; // New file to upload (replaces old)
  deleteAttachment?: boolean; // Flag to explicitly delete attachment
}
interface UpdateRequestBody {
  taskId: string; // ID of the task to update
  updates: UpdatePayload;
}

// Helper: Sync Link Table (Keep local for now)
async function syncInstrumentLinks(
  supabase: SupabaseClient,
  taskId: string,
  newInstrumentIds: string[]
): Promise<{ errors: string[] }> {
  const errors: string[] = [];
  console.log(`[updateTaskLibItem] Syncing instruments for task ${taskId}`);
  try {
    const { data: currentLinksData, error: fetchError } = await supabase
      .from('task_library_instruments')
      .select('instrument_id')
      .eq('task_library_id', taskId);
    if (fetchError) throw new Error(`Failed fetching current instruments: ${fetchError.message}`);

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
  } catch (syncError) {
    errors.push(`Unexpected error syncing instruments: ${syncError.message}`);
  }
  console.log(`[updateTaskLibItem] Instrument sync completed. Errors: ${errors.length}`);
  return { errors };
}

// Main Function Handler
Deno.serve(async (req: Request) => {
  // CORS and Method Checks...
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!['POST', 'PUT', 'PATCH'].includes(req.method))
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders },
    });

  // Init Supabase Client...
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

    // 2. Parse Body
    let requestBody: UpdateRequestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
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
    // Validate file structure if present
    if (
      updates.file &&
      (!updates.file.base64 || !updates.file.fileName || !updates.file.mimeType)
    ) {
      return new Response(
        JSON.stringify({
          error: 'Incomplete file data provided (requires base64, fileName, mimeType)',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Fetch Task & Authorize - Using imported helpers
    const { data: currentTask, error: fetchError } = await supabaseAdmin
      .from('task_library')
      .select('id, created_by_id, attachment_path')
      .eq('id', taskId)
      .single();

    if (fetchError || !currentTask)
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { ...corsHeaders },
      });
    const oldAttachmentPath = currentTask.attachment_path;

    const isAdminCaller = await isActiveAdmin(supabaseAdmin, callerId); // Use shared helper
    const isOwnerTeacher =
      currentTask.created_by_id === callerId && (await isActiveTeacher(supabaseAdmin, callerId)); // Use shared helper

    if (!isAdminCaller && !isOwnerTeacher) {
      return new Response(JSON.stringify({ error: 'Permission denied to update this task' }), {
        status: 403,
        headers: { ...corsHeaders },
      });
    }
    console.log(
      `Update authorized for task ${taskId} by user ${callerId} (Admin: ${isAdminCaller}, Owner: ${isOwnerTeacher})`
    );

    // 4. Prepare DB Update Object
    const dbUpdates: Record<string, any> = {};
    let hasDbChanges = false;
    if (updates.title !== undefined) {
      dbUpdates.title = updates.title.trim();
      hasDbChanges = true;
    }
    if (updates.description !== undefined) {
      dbUpdates.description = updates.description.trim();
      hasDbChanges = true;
    }
    if (
      updates.baseTickets !== undefined &&
      updates.baseTickets >= 0 &&
      Number.isInteger(updates.baseTickets)
    ) {
      dbUpdates.base_tickets = updates.baseTickets;
      hasDbChanges = true;
    }
    if (updates.hasOwnProperty('referenceUrl')) {
      dbUpdates.reference_url = updates.referenceUrl === null ? null : updates.referenceUrl?.trim();
      hasDbChanges = true;
    }

    // 5. Handle Attachments - Using imported helpers
    let newAttachmentPath: string | null = null;
    let shouldDeleteOldFile = false;

    if (updates.file) {
      shouldDeleteOldFile = true;
      newAttachmentPath = await uploadAttachment(supabaseAdmin, updates.file, callerId); // Use shared helper
      if (!newAttachmentPath)
        return new Response(JSON.stringify({ error: 'New file upload failed' }), {
          status: 500,
          headers: { ...corsHeaders },
        });
      dbUpdates.attachment_path = newAttachmentPath;
      hasDbChanges = true;
    } else if (updates.deleteAttachment === true) {
      shouldDeleteOldFile = true;
      dbUpdates.attachment_path = null;
      hasDbChanges = true;
    }

    // 6. Perform DB Update (if changes exist)
    let dbUpdateErrorOccurred = false;
    if (hasDbChanges) {
      const { error: updateDbError } = await supabaseAdmin
        .from('task_library')
        .update(dbUpdates)
        .eq('id', taskId);
      if (updateDbError) {
        dbUpdateErrorOccurred = true;
        console.error(`DB Update Error for task ${taskId}:`, updateDbError);
        if (newAttachmentPath) await deleteAttachment(supabaseAdmin, newAttachmentPath); // Use shared helper for cleanup
        return new Response(
          JSON.stringify({ error: `DB update failed: ${updateDbError.message}` }),
          { status: 500, headers: { ...corsHeaders } }
        );
      }
      console.log(`Task library item ${taskId} updated in DB.`);
    } else {
      console.log(`No direct DB changes detected for task ${taskId}.`);
    }

    // 7. Conditional Old Attachment Deletion (AFTER DB update succeeds) - Using imported helper
    let oldAttachmentDeleted = false;
    if (shouldDeleteOldFile && oldAttachmentPath && !dbUpdateErrorOccurred) {
      console.log(`Checking references before deleting old attachment: ${oldAttachmentPath}`);
      const { count, error: countError } = await supabaseAdmin
        .from('assigned_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('task_attachment_path', oldAttachmentPath);
      if (countError) {
        console.error(`Error checking references for ${oldAttachmentPath}:`, countError.message);
      } else if (count === 0) {
        console.log(
          `No references found for ${oldAttachmentPath}. Proceeding with Storage deletion.`
        );
        oldAttachmentDeleted = await deleteAttachment(supabaseAdmin, oldAttachmentPath); // Use shared helper
      } else {
        console.log(
          `${count} references found for ${oldAttachmentPath}. Old attachment kept in Storage.`
        );
      }
    }

    // 8. Sync Instrument Links (if provided) - Using local helper
    const syncErrors: string[] = [];
    if (updates.instrumentIds !== undefined && Array.isArray(updates.instrumentIds)) {
      const { errors } = await syncInstrumentLinks(supabaseAdmin, taskId, updates.instrumentIds);
      syncErrors.push(...errors);
      if (errors.length > 0)
        console.warn(`Errors syncing instruments for task ${taskId}: ${errors.join('; ')}`);
      else console.log(`Instruments synced successfully for task ${taskId}.`);
    }

    // 9. Return Success
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

console.log('update-task-library-item function initialized (v2 - uses shared helpers).');
