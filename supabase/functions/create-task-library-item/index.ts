// File: supabase/functions/create-task-library-item/index.ts

import { createClient, SupabaseClient } from 'supabase-js';

import { isActiveAdminOrTeacher } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { uploadAttachment, deleteAttachment, FileUploadData } from '../_shared/storageHelpers.ts';

interface CreateTaskPayload {
  title: string;
  description?: string;
  baseTickets: number;
  referenceUrl?: string;
  instrumentIds?: string[];
  file?: FileUploadData;
  canSelfAssign: boolean;
  journeyLocationId?: string | null;
}

// syncInstrumentLinks helper remains the same
async function syncInstrumentLinks(
  supabase: SupabaseClient,
  taskId: string,
  newInstrumentIds: string[]
): Promise<{ errors: string[] }> {
  const errors: string[] = [];
  if (!newInstrumentIds || newInstrumentIds.length === 0) {
    return { errors };
  }
  const rowsToInsert = newInstrumentIds.map(instId => ({
    task_library_id: taskId,
    instrument_id: instId,
  }));
  const { error: insertError } = await supabase
    .from('task_library_instruments')
    .insert(rowsToInsert);
  if (insertError) {
    errors.push(`Failed inserting new instrument links: ${insertError.message}`);
  }
  return { errors };
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

    // --- THIS IS THE FIX ---
    let attachmentPath: string | null = null;
    if (payload.file) {
      // Pass the creatorCompanyId to the helper function
      attachmentPath = await uploadAttachment(
        supabaseAdmin,
        payload.file,
        creatorCompanyId,
        callerId
      );
      if (!attachmentPath) {
        throw new Error('File upload to storage failed');
      }
    }

    const taskToInsert = {
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      base_tickets: payload.baseTickets,
      reference_url: payload.referenceUrl?.trim() || null,
      created_by_id: callerId,
      attachment_path: attachmentPath,
      company_id: creatorCompanyId,
      can_self_assign: payload.canSelfAssign ?? false,
      journey_location_id: payload.journeyLocationId || null,
    };

    const { data: createdTaskData, error: insertTaskError } = await supabaseAdmin
      .from('task_library')
      .insert(taskToInsert)
      .select()
      .single();

    if (insertTaskError) {
      if (attachmentPath) {
        await deleteAttachment(supabaseAdmin, attachmentPath);
      }
      throw new Error(`Database insert failed: ${insertTaskError.message}`);
    }

    const createdTaskId = createdTaskData.id;
    if (payload.instrumentIds && payload.instrumentIds.length > 0) {
      await syncInstrumentLinks(supabaseAdmin, createdTaskId, payload.instrumentIds);
    }

    return new Response(JSON.stringify(createdTaskData), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
