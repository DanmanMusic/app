// File: supabase/functions/update-task-library-item/index.ts

import { createClient, SupabaseClient } from 'supabase-js';

import { isActiveAdmin, isActiveTeacher } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { uploadAttachment, deleteAttachment, FileUploadData } from '../_shared/storageHelpers.ts';

interface UpdatePayload {
  title?: string;
  description?: string | null;
  baseTickets?: number;
  referenceUrl?: string | null;
  instrumentIds?: string[];
  canSelfAssign?: boolean;
  journeyLocationId?: string | null;
  file?: FileUploadData;
  deleteAttachment?: boolean;
}
interface UpdateRequestBody {
  taskId: string;
  updates: UpdatePayload;
}

// syncInstrumentLinks helper remains the same
async function syncInstrumentLinks(
  supabase: SupabaseClient,
  taskId: string,
  newInstrumentIds: string[]
): Promise<{ errors: string[] }> {
  const errors: string[] = [];
  if (newInstrumentIds === undefined) return { errors };

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
    const { error } = await supabase
      .from('task_library_instruments')
      .delete()
      .eq('task_library_id', taskId)
      .in('instrument_id', idsToDelete);
    if (error) errors.push(`Failed deleting old instrument links: ${error.message}`);
  }
  if (idsToInsert.length > 0) {
    const rowsToInsert = idsToInsert.map(instId => ({
      task_library_id: taskId,
      instrument_id: instId,
    }));
    const { error } = await supabase.from('task_library_instruments').insert(rowsToInsert);
    if (error) errors.push(`Failed inserting new instrument links: ${error.message}`);
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

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const {
      data: { user: callerUser },
    } = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')!.replace('Bearer ', ''));
    if (!callerUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: corsHeaders,
      });
    }
    const callerId = callerUser.id;

    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', callerId)
      .single();
    if (callerProfileError || !callerProfile) {
      throw new Error('Could not verify caller profile.');
    }
    const callerCompanyId = callerProfile.company_id;

    const { taskId, updates }: UpdateRequestBody = await req.json();
    if (!taskId || !updates) {
      throw new Error('Missing taskId or updates object');
    }

    const { data: currentTask, error: fetchError } = await supabaseAdmin
      .from('task_library')
      .select('id, created_by_id, attachment_path, company_id')
      .eq('id', taskId)
      .single();

    if (fetchError || !currentTask) {
      throw new Error('Task not found');
    }
    if (currentTask.company_id !== callerCompanyId) {
      throw new Error('Permission denied: Cannot update a task from another company.');
    }

    const isAdminCaller = await isActiveAdmin(supabaseAdmin, callerId);
    const isOwnerTeacher =
      currentTask.created_by_id === callerId && (await isActiveTeacher(supabaseAdmin, callerId));
    if (!isAdminCaller && !isOwnerTeacher) {
      throw new Error('Permission denied to update this task');
    }

    const oldAttachmentPath = currentTask.attachment_path;
    const dbUpdates: Record<string, any> = {};

    // Build the DB update payload
    if (updates.title !== undefined) dbUpdates.title = updates.title.trim();
    if (updates.hasOwnProperty('description'))
      dbUpdates.description = updates.description === null ? null : updates.description?.trim();
    if (updates.baseTickets !== undefined) dbUpdates.base_tickets = updates.baseTickets;
    if (updates.hasOwnProperty('referenceUrl'))
      dbUpdates.reference_url = updates.referenceUrl === null ? null : updates.referenceUrl?.trim();
    if (updates.canSelfAssign !== undefined) dbUpdates.can_self_assign = updates.canSelfAssign;
    if (updates.hasOwnProperty('journeyLocationId'))
      dbUpdates.journey_location_id = updates.journeyLocationId;

    // Handle file changes
    let newAttachmentPath: string | null = null;
    if (updates.file) {
      // --- THIS IS THE FIX ---
      newAttachmentPath = await uploadAttachment(
        supabaseAdmin,
        updates.file,
        callerCompanyId,
        callerId
      );
      if (!newAttachmentPath) throw new Error('New file upload failed');
      dbUpdates.attachment_path = newAttachmentPath;
    } else if (updates.deleteAttachment === true) {
      dbUpdates.attachment_path = null;
    }

    // Update the database if there are changes
    if (Object.keys(dbUpdates).length > 0) {
      const { error: updateDbError } = await supabaseAdmin
        .from('task_library')
        .update(dbUpdates)
        .eq('id', taskId);
      if (updateDbError) {
        if (newAttachmentPath) await deleteAttachment(supabaseAdmin, newAttachmentPath); // Clean up failed upload
        throw new Error(`DB update failed: ${updateDbError.message}`);
      }
    }

    // Clean up old attachment if it was replaced or removed
    if ((newAttachmentPath || updates.deleteAttachment) && oldAttachmentPath) {
      await deleteAttachment(supabaseAdmin, oldAttachmentPath);
    }

    // Sync instrument links if provided
    if (updates.instrumentIds !== undefined) {
      await syncInstrumentLinks(supabaseAdmin, taskId, updates.instrumentIds);
    }

    return new Response(JSON.stringify({ message: `Task ${taskId} updated successfully.` }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
