// supabase/functions/create-task-library-item/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
// Import shared helpers
import { isActiveAdminOrTeacher } from '../_shared/authHelpers.ts';
import { uploadAttachment, deleteAttachment, FileUploadData } from '../_shared/storageHelpers.ts';

// Define expected structure for the main payload
interface CreateTaskPayload {
  title: string;
  description?: string;
  baseTickets: number;
  referenceUrl?: string;
  instrumentIds?: string[];
  file?: FileUploadData;
}

// Helper: Sync Link Table (Keep local for creation)
async function syncInstrumentLinks(
  supabase: SupabaseClient,
  taskId: string,
  newInstrumentIds: string[]
): Promise<{ errors: string[] }> {
  const errors: string[] = [];
  if (!newInstrumentIds || newInstrumentIds.length === 0) {
    console.log(
      `[createTaskLibItem] No instrument IDs provided for task ${taskId}. Skipping sync.`
    );
    return { errors };
  }
  console.log(`[createTaskLibItem] Syncing instruments for new task ${taskId}`);
  try {
    const rowsToInsert = newInstrumentIds.map(instId => ({
      task_library_id: taskId,
      instrument_id: instId,
    }));
    console.log(`[createTaskLibItem] Inserting ${rowsToInsert.length} instrument links...`);
    const { error: insertError } = await supabase
      .from('task_library_instruments')
      .insert(rowsToInsert);
    if (insertError) {
      errors.push(`Failed inserting new instrument links: ${insertError.message}`);
      console.error(`[createTaskLibItem] Error inserting links: ${insertError.message}`);
    } else {
      console.log(`[createTaskLibItem] Inserted instrument links successfully.`);
    }
  } catch (syncError) {
    errors.push(`Unexpected error syncing instruments: ${syncError.message}`);
    console.error(`[createTaskLibItem] Unexpected sync error: ${syncError.message}`);
  }
  return { errors };
}

// Main Edge Function Handler
Deno.serve(async (req: Request) => {
  // Handle CORS preflight & Method Check (POST)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  console.log(`Received ${req.method} request for create-task-library-item`);

  // Initialize Supabase client with Service Role Key
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
    // 1. Authenticate the user making the request
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

    // 2. Authorize: Check if the user is an active Admin or Teacher - Using imported helper
    const { authorized, role: callerRole } = await isActiveAdminOrTeacher(supabaseAdmin, callerId); // Use shared helper
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

    // 3. Parse and Validate the Request Payload
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

    // *** RESTORED VALIDATION ***
    if (!payload.title || typeof payload.title !== 'string' || payload.title.trim().length === 0) {
      console.warn('Payload validation failed: Missing title.');
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
      console.warn('Payload validation failed: Invalid baseTickets.');
      return new Response(
        JSON.stringify({
          error: 'Missing or invalid required field: baseTickets (must be non-negative integer)',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Validate file structure if present
    if (
      payload.file &&
      (!payload.file.base64 || !payload.file.fileName || !payload.file.mimeType)
    ) {
      console.warn('Payload validation failed: Incomplete file data.');
      return new Response(
        JSON.stringify({
          error: 'Incomplete file data in payload (requires base64, fileName, mimeType)',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // *** END RESTORED VALIDATION ***

    // 4. Handle File Upload (if included) - Using imported helper
    let attachmentPath: string | null = null;
    if (payload.file) {
      console.log('File data found in payload, attempting upload via shared helper...');
      attachmentPath = await uploadAttachment(supabaseAdmin, payload.file, callerId); // Use shared helper
      if (!attachmentPath) {
        return new Response(JSON.stringify({ error: 'File upload to storage failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log('File upload successful, path:', attachmentPath);
    }

    // 5. Insert Task into Database
    const taskToInsert = {
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      base_tickets: payload.baseTickets,
      reference_url: payload.referenceUrl?.trim() || null,
      created_by_id: callerId,
      attachment_path: attachmentPath,
    };

    console.log('Attempting DB insert for task_library:', taskToInsert);
    const { data: createdTaskData, error: insertTaskError } = await supabaseAdmin
      .from('task_library')
      .insert(taskToInsert)
      .select()
      .single();

    // *** RESTORED DB INSERT ERROR HANDLING + CLEANUP ***
    if (insertTaskError) {
      console.error('DB Insert Error (task_library):', insertTaskError);
      // Attempt cleanup if upload happened
      if (attachmentPath) {
        console.warn(`DB insert failed, attempting cleanup of uploaded file: ${attachmentPath}`);
        await deleteAttachment(supabaseAdmin, attachmentPath); // Use shared helper
      }
      return new Response(
        JSON.stringify({ error: `Database insert failed: ${insertTaskError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // *** END RESTORED HANDLING ***
    const createdTaskId = createdTaskData.id;
    console.log(`Task created successfully in DB (ID: ${createdTaskId}).`);

    // 6. Insert Instrument Links (if provided) - Using local helper
    const instrumentIds = payload.instrumentIds;
    const syncResult = await syncInstrumentLinks(supabaseAdmin, createdTaskId, instrumentIds || []);
    if (syncResult.errors.length > 0) {
      console.error(
        `Errors inserting instrument links for task ${createdTaskId}: ${syncResult.errors.join('; ')}`
      );
      // Log error but don't fail the request
    }

    // 7. Return Success Response
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

console.log('create-task-library-item function initialized (v2 - uses shared helpers).');
