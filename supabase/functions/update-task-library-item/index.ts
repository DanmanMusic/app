// supabase/functions/update-task-library-item/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import { decode } from 'https://deno.land/std@0.203.0/encoding/base64.ts';

const TASK_ATTACHMENT_BUCKET = 'task-library-attachments';

// Define payload structures (interfaces remain the same)
interface FilePayload {
  base64: string;
  mimeType: string;
  fileName: string;
}
interface UpdatePayload {
  title?: string;
  description?: string;
  baseTickets?: number;
  referenceUrl?: string | null;
  instrumentIds?: string[];
  file?: FilePayload;
  deleteAttachment?: boolean;
}
interface UpdateRequestBody {
  taskId: string;
  updates: UpdatePayload;
}

// Helper functions (isActiveAdmin, isActiveTeacher, uploadAttachment, deleteAttachment, syncInstrumentLinks) remain the same
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
async function uploadAttachment(
  supabase: SupabaseClient,
  file: FilePayload,
  userId: string
): Promise<string | null> {
  try {
    const fileExt = file.fileName.split('.').pop() || 'bin';
    const filePath = `public/${userId}/${Date.now()}_${Math.random().toString(16).substring(2)}.${fileExt}`;
    const { data, error: uploadError } = await supabase.storage
      .from(TASK_ATTACHMENT_BUCKET)
      .upload(filePath, decode(file.base64), { contentType: file.mimeType, upsert: false });
    if (uploadError) throw new Error(`Storage upload error: ${uploadError.message}`);
    return data?.path ?? null;
  } catch (error) {
    console.error('uploadAttachment error:', error.message);
    return null;
  }
}
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
async function syncInstrumentLinks(
  supabase: SupabaseClient,
  taskId: string,
  newInstrumentIds: string[]
): Promise<{ errors: string[] }> {
  const errors: string[] = [];
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
  return { errors };
}

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

    // 3. Fetch Task & Authorize
    const { data: currentTask, error: fetchError } = await supabaseAdmin
      .from('task_library')
      .select('id, created_by_id, attachment_path') // Ensure path is fetched
      .eq('id', taskId)
      .single();
    if (fetchError || !currentTask)
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { ...corsHeaders },
      });
    const oldAttachmentPath = currentTask.attachment_path; // Store old path

    const isAdminCaller = await isActiveAdmin(supabaseAdmin, callerId);
    const isOwnerTeacher =
      currentTask.created_by_id === callerId && (await isActiveTeacher(supabaseAdmin, callerId));
    if (!isAdminCaller && !isOwnerTeacher)
      return new Response(JSON.stringify({ error: 'Permission denied' }), {
        status: 403,
        headers: { ...corsHeaders },
      });

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

    // 5. Handle Attachments
    let newAttachmentPath: string | null = null;
    let shouldDeleteOldFile = false; // Flag to trigger ref check and potential delete

    if (updates.file) {
      if (!updates.file.base64 || !updates.file.mimeType || !updates.file.fileName) {
        return new Response(JSON.stringify({ error: 'Incomplete file data in payload' }), {
          status: 400,
          headers: { ...corsHeaders },
        });
      }
      console.log('New file provided. Uploading...');
      shouldDeleteOldFile = true; // Mark old file for potential deletion
      newAttachmentPath = await uploadAttachment(supabaseAdmin, updates.file, callerId);
      if (!newAttachmentPath) {
        return new Response(JSON.stringify({ error: 'New file upload failed' }), {
          status: 500,
          headers: { ...corsHeaders },
        });
      }
      dbUpdates.attachment_path = newAttachmentPath; // Update DB path to new file
      hasDbChanges = true;
    } else if (updates.deleteAttachment === true) {
      console.log('Explicit request to remove attachment.');
      shouldDeleteOldFile = true; // Mark old file for potential deletion
      dbUpdates.attachment_path = null; // Set path to null in DB
      hasDbChanges = true;
    }

    // 6. Perform DB Update (if changes exist)
    let dbUpdateErrorOccurred = false;
    if (hasDbChanges) {
      console.log(`Attempting DB update for task ${taskId}:`, dbUpdates);
      const { error: updateDbError } = await supabaseAdmin
        .from('task_library')
        .update(dbUpdates)
        .eq('id', taskId);

      if (updateDbError) {
        dbUpdateErrorOccurred = true; // Mark that DB update failed
        console.error(`DB Update Error for task ${taskId}:`, updateDbError);
        // If DB failed but we uploaded a *new* file, try to clean it up
        if (newAttachmentPath) {
          console.warn(
            `DB update failed, attempting cleanup of newly uploaded file: ${newAttachmentPath}`
          );
          await deleteAttachment(supabaseAdmin, newAttachmentPath);
        }
        return new Response(
          JSON.stringify({ error: `DB update failed: ${updateDbError.message}` }),
          { status: 500, headers: { ...corsHeaders } }
        );
      }
      console.log(`Task library item ${taskId} updated successfully in DB.`);
    } else {
      console.log(`No direct DB changes detected for task ${taskId}.`);
    }

    // 7. Conditional Old Attachment Deletion (AFTER DB update succeeds)
    let oldAttachmentDeleted = false;
    if (shouldDeleteOldFile && oldAttachmentPath && !dbUpdateErrorOccurred) {
      console.log(`Checking references before deleting old attachment: ${oldAttachmentPath}`);
      const { count, error: countError } = await supabaseAdmin
        .from('assigned_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('task_attachment_path', oldAttachmentPath);

      if (countError) {
        console.error(`Error checking references for ${oldAttachmentPath}:`, countError.message);
        // Don't delete if we can't be sure it's safe
      } else if (count === 0) {
        console.log(
          `No references found for ${oldAttachmentPath}. Proceeding with Storage deletion.`
        );
        oldAttachmentDeleted = await deleteAttachment(supabaseAdmin, oldAttachmentPath);
      } else {
        console.log(
          `${count} references found for ${oldAttachmentPath}. Old attachment kept in Storage.`
        );
      }
    }

    // 8. Sync Instrument Links (if provided and authorized)
    const syncErrors: string[] = [];
    if (updates.instrumentIds !== undefined && Array.isArray(updates.instrumentIds)) {
      // Authorization check is already done implicitly (only admin/owner can reach here)
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
