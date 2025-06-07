// supabase/functions/create-task-library-item/index.ts

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
}

async function syncInstrumentLinks(
  supabase: SupabaseClient,
  taskId: string,
  newInstrumentIds: string[]
): Promise<{ errors: string[] }> {
  // This helper function remains unchanged
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

  console.log(`Received ${req.method} request for create-task-library-item`);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Server config error: Missing Supabase URL or Service Role Key.');
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: fetch },
  });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Authentication failed: Missing or invalid Authorization header.');
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      console.warn('Authentication failed: Invalid token.', userError?.message);
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerId = user.id;
    console.log(`Request received from authenticated user: ${callerId}`);

    const { authorized, role: callerRole } = await isActiveAdminOrTeacher(supabaseAdmin, callerId);
    if (!authorized) {
      console.warn(
        `Authorization failed: User ${callerId} (Role: ${callerRole}) is not an active Admin or Teacher.`
      );
      return new Response(JSON.stringify({ error: 'Permission denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`Authorization successful: User ${callerId} (Role: ${callerRole}).`);

    // NEW: Step 2.5 - Get the creator's Company ID
    const { data: creatorProfile, error: creatorProfileError } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', callerId)
      .single();

    if (creatorProfileError || !creatorProfile?.company_id) {
      console.error(`Could not retrieve company_id for creator ${callerId}:`, creatorProfileError);
      return new Response(JSON.stringify({ error: 'Could not determine creator company.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const creatorCompanyId = creatorProfile.company_id;
    console.log(`Creator ${callerId} belongs to company ${creatorCompanyId}`);

    let payload: CreateTaskPayload;
    try {
      payload = await req.json();
    } catch (e) {
      console.error('Payload parsing error:', e);
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!payload.title || typeof payload.title !== 'string' || payload.title.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Missing or invalid required field: title' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (
      payload.baseTickets == null ||
      typeof payload.baseTickets !== 'number' ||
      !Number.isInteger(payload.baseTickets) ||
      payload.baseTickets < 0
    ) {
      return new Response(
        JSON.stringify({
          error: 'Missing or invalid required field: baseTickets (must be non-negative integer)',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (
      payload.file &&
      (!payload.file.base64 || !payload.file.fileName || !payload.file.mimeType)
    ) {
      return new Response(
        JSON.stringify({
          error: 'Incomplete file data in payload (requires base64, fileName, mimeType)',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let attachmentPath: string | null = null;
    if (payload.file) {
      attachmentPath = await uploadAttachment(supabaseAdmin, payload.file, callerId);
      if (!attachmentPath) {
        return new Response(JSON.stringify({ error: 'File upload to storage failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // MODIFIED: Inject company_id into the new task_library record
    const taskToInsert = {
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      base_tickets: payload.baseTickets,
      reference_url: payload.referenceUrl?.trim() || null,
      created_by_id: callerId,
      attachment_path: attachmentPath,
      company_id: creatorCompanyId, // <-- The critical addition
    };

    console.log('Attempting DB insert for task_library:', taskToInsert);
    const { data: createdTaskData, error: insertTaskError } = await supabaseAdmin
      .from('task_library')
      .insert(taskToInsert)
      .select()
      .single();

    if (insertTaskError) {
      console.error('DB Insert Error (task_library):', insertTaskError);
      if (attachmentPath) {
        await deleteAttachment(supabaseAdmin, attachmentPath);
      }
      return new Response(
        JSON.stringify({ error: `Database insert failed: ${insertTaskError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const createdTaskId = createdTaskData.id;
    console.log(`Task created successfully in DB (ID: ${createdTaskId}).`);

    const instrumentIds = payload.instrumentIds;
    const { errors } = await syncInstrumentLinks(supabaseAdmin, createdTaskId, instrumentIds || []);
    if (errors.length > 0) {
      console.error(
        `Errors inserting instrument links for task ${createdTaskId}: ${errors.join('; ')}`
      );
    }

    console.log('Create task process completed successfully.');
    return new Response(JSON.stringify(createdTaskData), {
      status: 201, // Created
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled Error in create-task-library-item function:', error.message);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

console.log('create-task-library-item function initialized (v3 - multi-tenant aware).');
