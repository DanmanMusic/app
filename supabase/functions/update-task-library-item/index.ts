// supabase/functions/update-task-library-item/index.ts

import { createClient } from 'supabase-js';

import { isActiveAdmin, isActiveTeacher } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { uploadAttachment, deleteAttachment, FileUploadData } from '../_shared/storageHelpers.ts';

interface UrlData {
  id?: string;
  url: string;
  label: string | null;
}

interface AttachmentData {
  id?: string;
  file_path: string; // This is what comes from the client for existing files
  file_name: string;
}

interface UpdatePayload {
  title: string;
  description: string | null;
  baseTickets: number;
  instrumentIds: string[];
  canSelfAssign: boolean;
  journeyLocationId: string | null;
  urls: UrlData[];
  attachments: AttachmentData[]; // The desired state of existing attachments
  newFiles: FileUploadData[];
  attachmentPathsToDelete: string[];
}

interface UpdateRequestBody {
  taskId: string;
  updates: UpdatePayload;
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

  let uploadedFilePaths: string[] = [];

  try {
    const {
      data: { user: callerUser },
    } = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')!.replace('Bearer ', ''));
    if (!callerUser) {
      throw new Error('Invalid token');
    }
    const callerId = callerUser.id;
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', callerId)
      .single();
    if (!callerProfile) {
      throw new Error('Could not verify caller profile.');
    }
    const callerCompanyId = callerProfile.company_id;

    const { taskId, updates }: UpdateRequestBody = await req.json();
    if (!taskId || !updates) {
      throw new Error('Missing taskId or updates object');
    }

    const { data: currentTask } = await supabaseAdmin
      .from('task_library')
      .select('id, created_by_id, company_id')
      .eq('id', taskId)
      .single();

    if (!currentTask) throw new Error('Task not found');
    if (currentTask.company_id !== callerCompanyId)
      throw new Error('Permission denied: Cannot update a task from another company.');

    const isAdminCaller = await isActiveAdmin(supabaseAdmin, callerId);
    const isOwnerTeacher =
      currentTask.created_by_id === callerId && (await isActiveTeacher(supabaseAdmin, callerId));
    if (!isAdminCaller && !isOwnerTeacher) throw new Error('Permission denied to update this task');

    if (updates.attachmentPathsToDelete && updates.attachmentPathsToDelete.length > 0) {
      await deleteAttachment(supabaseAdmin, updates.attachmentPathsToDelete);
    }

    const uploadPromises = (updates.newFiles || []).map(file =>
      uploadAttachment(supabaseAdmin, file, callerCompanyId, callerId)
    );
    const newUploadedPaths = await Promise.all(uploadPromises);
    uploadedFilePaths = newUploadedPaths.filter((p): p is string => p !== null);

    if (newUploadedPaths.some(p => p === null)) {
      throw new Error('One or more file uploads failed.');
    }

    // --- THIS IS THE FIX ---
    // Normalize the attachment data before sending it to the RPC.
    // The RPC expects objects with keys `path` and `name`.

    // Map existing attachments to the correct format.
    const existingAttachmentsForDb = updates.attachments.map(att => ({
      path: att.file_path,
      name: att.file_name,
    }));

    // Map newly uploaded attachments to the correct format.
    const newAttachmentsForDb = uploadedFilePaths.map((path, i) => ({
      path: path,
      name: updates.newFiles[i].fileName,
    }));

    // Combine them into the final array for the database.
    const finalAttachmentsForDb = [...existingAttachmentsForDb, ...newAttachmentsForDb];

    const { error: rpcError } = await supabaseAdmin.rpc('update_task_with_details', {
      p_task_id: taskId,
      p_title: updates.title,
      p_description: updates.description,
      p_base_tickets: updates.baseTickets,
      p_can_self_assign: updates.canSelfAssign,
      p_journey_location_id: updates.journeyLocationId,
      p_instrument_ids: updates.instrumentIds,
      p_urls: updates.urls.map(u => ({ url: u.url, label: u.label })), // Also clean up URLs
      p_attachments: finalAttachmentsForDb,
    });

    if (rpcError) {
      throw new Error(`DB update transaction failed: ${rpcError.message}`);
    }

    return new Response(JSON.stringify({ message: `Task ${taskId} updated successfully.` }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (uploadedFilePaths.length > 0) {
      await deleteAttachment(supabaseAdmin, uploadedFilePaths);
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
