// supabase/functions/create-task-library-item/index.ts
import { createClient, SupabaseClient } from 'supabase-js';

import { isActiveAdminOrTeacher } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { uploadAttachment, deleteAttachment, FileUploadData } from '../_shared/storageHelpers.ts';

interface UrlData {
  url: string;
  label: string;
}

interface CreateTaskPayload {
  title: string;
  description?: string;
  baseTickets: number;
  instrumentIds?: string[];
  canSelfAssign: boolean;
  journeyLocationId?: string | null;
  urls: UrlData[];
  files: FileUploadData[];
}

async function handleFileUploads(
  supabase: SupabaseClient,
  files: FileUploadData[],
  companyId: string,
  userId: string
): Promise<{ path: string; name: string }[]> {
  if (!files || files.length === 0) return [];

  const uploadPromises = files.map(async file => {
    const filePath = await uploadAttachment(supabase, file, companyId, userId);
    if (!filePath) {
      // In a real scenario, you might want more robust error handling,
      // like cleaning up already-uploaded files from this batch.
      throw new Error(`Upload failed for file: ${file.fileName}`);
    }
    return { path: filePath, name: file.fileName };
  });

  return await Promise.all(uploadPromises);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: corsHeaders,
      });
    }
    const callerId = callerUser.id;

    const { data: creatorProfile, error: creatorProfileError } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', callerId)
      .single();

    if (creatorProfileError || !creatorProfile?.company_id) {
      throw new Error('Could not determine creator company.');
    }
    const creatorCompanyId = creatorProfile.company_id;

    const { authorized } = await isActiveAdminOrTeacher(supabaseAdmin, callerId);
    if (!authorized) {
      return new Response(JSON.stringify({ error: 'Permission denied' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const payload: CreateTaskPayload = await req.json();

    const uploadedFiles = await handleFileUploads(
      supabaseAdmin,
      payload.files,
      creatorCompanyId,
      callerId
    );
    uploadedFilePaths = uploadedFiles.map(f => f.path);

    // Use a transaction to ensure all or nothing is created
    const { data: createdTaskData, error: transactionError } = await supabaseAdmin.rpc(
      'create_task_with_details', // We will create this RPC function next
      {
        p_title: payload.title.trim(),
        p_description: payload.description?.trim() || null,
        p_base_tickets: payload.baseTickets,
        p_created_by_id: callerId,
        p_company_id: creatorCompanyId,
        p_can_self_assign: payload.canSelfAssign ?? false,
        p_journey_location_id: payload.journeyLocationId || null,
        p_instrument_ids: payload.instrumentIds || [],
        p_urls: payload.urls.map(u => ({ url: u.url.trim(), label: u.label.trim() })) || [],
        p_attachments: uploadedFiles,
      }
    );

    if (transactionError) {
      throw new Error(`Database transaction failed: ${transactionError.message}`);
    }

    return new Response(JSON.stringify({ id: createdTaskData }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (uploadedFilePaths.length > 0) {
      console.warn('Error occurred, cleaning up uploaded files...', uploadedFilePaths);
      await supabaseAdmin.storage.from('task-library-attachments').remove(uploadedFilePaths);
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
