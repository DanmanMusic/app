// supabase/functions/update-task-library-item/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import { decode } from 'https://deno.land/std@0.203.0/encoding/base64.ts';

const TASK_ATTACHMENT_BUCKET = 'task-library-attachments';

// Define payload structures
interface FilePayload {
  base64: string;
  mimeType: string;
  fileName: string;
}
interface UpdatePayload {
  title?: string;
  description?: string;
  baseTickets?: number;
  referenceUrl?: string | null; // Allow null to clear
  instrumentIds?: string[]; // Full list for syncing
  file?: FilePayload; // New file to upload (replaces old)
  deleteAttachment?: boolean; // Flag to explicitly delete attachment without uploading new
}
interface UpdateRequestBody {
  taskId: string; // ID of the task to update
  updates: UpdatePayload;
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

// --- Re-use file upload/delete helpers from create function ---
// Helper: Upload file to storage
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
// Helper: Delete file from storage
async function deleteAttachment(supabase: SupabaseClient, path: string | null): Promise<boolean> {
  if (!path) return true; // No path to delete
  try {
    const { error } = await supabase.storage.from(TASK_ATTACHMENT_BUCKET).remove([path]);
    if (error) throw error;
    console.log(`Successfully deleted attachment from Storage: ${path}`);
    return true;
  } catch (error) {
    console.error(`Failed to delete attachment ${path} from Storage:`, error.message);
    return false;
  }
}
// Helper: Sync Link Table (reuse from updateUserWithLinks concept)
async function syncInstrumentLinks(
  supabase: SupabaseClient,
  taskId: string,
  newInstrumentIds: string[]
): Promise<{ errors: string[] }> {
  const errors: string[] = [];
  console.log(`Syncing instruments for task ${taskId}`);
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  // Allow POST, PUT, PATCH
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
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
    if (!taskId || !updates || typeof updates !== 'object') {
      return new Response(JSON.stringify({ error: 'Missing taskId or updates object' }), {
        status: 400,
        headers: { ...corsHeaders },
      });
    }

    // 3. Fetch Task & Authorize
    const { data: currentTask, error: fetchError } = await supabaseAdmin
      .from('task_library')
      .select('id, created_by_id, attachment_path')
      .eq('id', taskId)
      .single();

    if (fetchError || !currentTask) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { ...corsHeaders },
      });
    }

    const isAdmin = await isActiveAdmin(supabaseAdmin, callerId);
    const isOwner =
      currentTask.created_by_id === callerId && (await isActiveTeacher(supabaseAdmin, callerId));

    if (!isAdmin && !isOwner) {
      return new Response(JSON.stringify({ error: 'Permission denied to update this task' }), {
        status: 403,
        headers: { ...corsHeaders },
      });
    }

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
    const oldAttachmentPath = currentTask.attachment_path;
    let newAttachmentPath: string | null = null;
    let shouldDeleteOldAttachment = false;

    if (updates.file) {
      // New file replaces old
      shouldDeleteOldAttachment = true;
      newAttachmentPath = await uploadAttachment(supabaseAdmin, updates.file, callerId);
      if (!newAttachmentPath) {
        return new Response(JSON.stringify({ error: 'New file upload failed' }), {
          status: 500,
          headers: { ...corsHeaders },
        });
      }
      dbUpdates.attachment_path = newAttachmentPath;
      hasDbChanges = true;
    } else if (updates.deleteAttachment === true) {
      // Explicit delete flag
      shouldDeleteOldAttachment = true;
      dbUpdates.attachment_path = null; // Set path to null in DB
      hasDbChanges = true;
    }

    // 6. Perform DB Update (if changes exist)
    if (hasDbChanges) {
      const { error: updateDbError } = await supabaseAdmin
        .from('task_library')
        .update(dbUpdates)
        .eq('id', taskId);

      if (updateDbError) {
        console.error(`DB Update Error for task ${taskId}:`, updateDbError);
        // If DB failed but we uploaded a *new* file, try to clean it up
        if (newAttachmentPath) await deleteAttachment(supabaseAdmin, newAttachmentPath);
        return new Response(
          JSON.stringify({ error: `DB update failed: ${updateDbError.message}` }),
          { status: 500, headers: { ...corsHeaders } }
        );
      }
      console.log(`Task library item ${taskId} updated in DB.`);
    }

    // 7. Clean up old attachment if necessary (after successful DB update)
    if (shouldDeleteOldAttachment && oldAttachmentPath) {
      console.log(`Attempting to delete old attachment: ${oldAttachmentPath}`);
      await deleteAttachment(supabaseAdmin, oldAttachmentPath); // Log errors but don't fail request
    }

    // 8. Sync Instrument Links (if provided)
    const syncErrors: string[] = [];
    if (updates.instrumentIds !== undefined && Array.isArray(updates.instrumentIds)) {
      const { errors } = await syncInstrumentLinks(supabaseAdmin, taskId, updates.instrumentIds);
      syncErrors.push(...errors);
      if (errors.length > 0) {
        console.warn(
          `Errors occurred while syncing instruments for task ${taskId}: ${errors.join('; ')}`
        );
      } else {
        console.log(`Instruments synced successfully for task ${taskId}.`);
      }
    }

    // 9. Return Success (potentially with warnings about link/file errors)
    const message = `Task ${taskId} updated.${syncErrors.length > 0 ? ' Warnings: ' + syncErrors.join('; ') : ''}`;
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
