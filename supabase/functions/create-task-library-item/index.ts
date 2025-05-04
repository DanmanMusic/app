// supabase/functions/create-task-library-item/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
// Import decode function from Deno standard library's base64 module
import { decode } from 'https://deno.land/std@0.203.0/encoding/base64.ts';

// Name of your storage bucket for task attachments
const TASK_ATTACHMENT_BUCKET = 'task-library-attachments';

// Define expected structure for file data in the payload
interface FilePayload {
  base64: string; // Base64 encoded file content from client
  mimeType: string; // e.g., 'application/pdf', 'image/jpeg'
  fileName: string; // Original file name (for extension)
}

// Define expected structure for the main payload
interface CreateTaskPayload {
  title: string;
  description?: string;
  baseTickets: number;
  referenceUrl?: string;
  instrumentIds?: string[]; // Optional array of instrument UUIDs
  file?: FilePayload; // Optional file upload details
}

// Helper: Check if user is an active Admin or Teacher
async function isActiveAdminOrTeacher(
  supabase: SupabaseClient,
  userId: string
): Promise<{ authorized: boolean; role: string | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', userId)
      .single();

    if (error) throw error;

    const isActive = data?.status === 'active';
    const isAllowedRole = data?.role === 'admin' || data?.role === 'teacher';

    return { authorized: isActive && isAllowedRole, role: data?.role };
  } catch (err) {
    console.error('Error in isActiveAdminOrTeacher check:', err.message);
    return { authorized: false, role: null };
  }
}

// Helper: Upload file to storage
async function uploadAttachment(
  supabase: SupabaseClient,
  file: FilePayload,
  userId: string
): Promise<string | null> {
  try {
    const fileExt = file.fileName.split('.').pop()?.toLowerCase() || 'bin';
    // Sanitize filename slightly, though Storage handles most issues
    const safeBaseName = file.fileName.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(`.${fileExt}`, '');
    const filePath = `public/${userId}/${Date.now()}_${safeBaseName}.${fileExt}`; // Use user ID for organization

    console.log(`Attempting upload to Storage: ${filePath} (MIME: ${file.mimeType})`);

    // Decode base64 string received from client into binary data
    const fileData = decode(file.base64);

    const { data, error: uploadError } = await supabase.storage
      .from(TASK_ATTACHMENT_BUCKET)
      .upload(filePath, fileData, {
        // Pass decoded binary data
        contentType: file.mimeType,
        upsert: false, // Prevent accidental overwrites
      });

    if (uploadError) {
      throw new Error(`Storage upload error: ${uploadError.message}`);
    }
    console.log(`File uploaded successfully to Storage: ${data?.path}`);
    return data?.path ?? null; // Return the storage path
  } catch (error) {
    console.error('uploadAttachment error:', error.message);
    return null; // Indicate failure
  }
}

// Helper: Delete file from storage (for cleanup on error)
async function deleteAttachment(supabase: SupabaseClient, path: string | null): Promise<boolean> {
  if (!path) return true; // Nothing to delete
  console.warn(`Attempting cleanup: Deleting attachment from Storage: ${path}`);
  try {
    const { error } = await supabase.storage.from(TASK_ATTACHMENT_BUCKET).remove([path]); // path should be relative path within bucket
    if (error) throw error;
    console.log(`Cleanup successful: Deleted attachment ${path}`);
    return true;
  } catch (error) {
    console.error(`Cleanup failed: Could not delete attachment ${path}:`, error.message);
    return false; // Indicate cleanup failure
  }
}

// Main Edge Function Handler
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  // Ensure POST method
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

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
    global: { fetch: fetch }, // Important for Deno environment
  });
  console.log('Supabase admin client initialized.');

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

    // 2. Authorize: Check if the user is an active Admin or Teacher
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

    // 3. Parse and Validate the Request Payload
    let payload: CreateTaskPayload;
    try {
      payload = await req.json();
      console.log('Parsed payload:', payload);
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
    // Add more specific validation if needed (e.g., URL format, instrument ID format)

    // 4. Handle File Upload (if included)
    let attachmentPath: string | null = null;
    if (payload.file) {
      console.log('File data found in payload, attempting upload...');
      if (!payload.file.base64 || !payload.file.mimeType || !payload.file.fileName) {
        console.error('File payload missing base64, mimeType, or fileName.');
        return new Response(JSON.stringify({ error: 'Incomplete file data in payload' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      attachmentPath = await uploadAttachment(supabaseAdmin, payload.file, callerId);
      if (!attachmentPath) {
        // Upload helper already logged error
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
      description: payload.description?.trim() || null, // Store null if empty/missing
      base_tickets: payload.baseTickets,
      reference_url: payload.referenceUrl?.trim() || null, // Store null if empty/missing
      created_by_id: callerId, // Set creator to the authenticated user
      attachment_path: attachmentPath, // Store path from upload, or null
      // 'is_public' column is removed based on previous discussion
    };

    console.log('Attempting DB insert for task_library:', taskToInsert);
    const { data: createdTaskData, error: insertTaskError } = await supabaseAdmin
      .from('task_library')
      .insert(taskToInsert)
      .select() // Select the created row
      .single(); // Expect one row

    if (insertTaskError) {
      console.error('DB Insert Error (task_library):', insertTaskError);
      // Attempt to clean up uploaded file if DB insert failed
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

    // 6. Insert Instrument Links (if provided)
    const instrumentIds = payload.instrumentIds;
    if (instrumentIds && Array.isArray(instrumentIds) && instrumentIds.length > 0) {
      const linksToInsert = instrumentIds.map(instId => ({
        task_library_id: createdTaskId,
        instrument_id: instId,
      }));
      console.log(
        `Attempting to insert ${linksToInsert.length} instrument links for task ${createdTaskId}...`
      );
      const { error: insertLinkError } = await supabaseAdmin
        .from('task_library_instruments')
        .insert(linksToInsert);

      if (insertLinkError) {
        // Log error but don't necessarily fail the whole request. The main task was created.
        console.error(
          `Failed to insert instrument links for task ${createdTaskId}:`,
          insertLinkError.message
        );
        // TODO: Consider if this should be a hard failure - requires transactionality (RPC)
      } else {
        console.log(`Inserted instrument links successfully for task ${createdTaskId}.`);
      }
    }

    // 7. Return Success Response (basic task data)
    // Client will likely need to refetch lists to see the fully joined data (instruments)
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

console.log('create-task-library-item function initialized.');
