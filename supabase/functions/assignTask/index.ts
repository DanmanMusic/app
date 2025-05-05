// supabase/functions/assignTask/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import { decode } from 'https://deno.land/std@0.203.0/encoding/base64.ts';

const TASK_ATTACHMENT_BUCKET = 'task-library-attachments';

// Define expected structure for file data in the payload
// Matches the NativeFileObject structure from the frontend API call
interface FilePayloadInput {
  uri: string; // We expect the client to send the URI for native, or handle blob/File for web
  base64?: string; // Client might pre-convert, especially web
  mimeType?: string;
  name?: string;
  size?: number;
}

// Define expected structure for the main payload
interface AssignTaskPayload {
  studentId: string;
  taskTitle: string;
  taskDescription: string;
  taskBasePoints: number;
  taskLinkUrl?: string | null;
  taskAttachmentPath?: string | null; // Path copied from library (if applicable)
  file?: FilePayloadInput; // Optional NEW file upload details for ad-hoc
}

// --- Helper functions (isAdmin, isTeacherLinked) remain the same ---
async function isAdmin(supabaseClient: SupabaseClient, callerUserId: string): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', callerUserId)
    .single();
  if (error) {
    console.error(`isAdmin check failed for ${callerUserId}:`, error.message);
    return false;
  }
  return data?.role === 'admin';
}
async function isTeacherLinked(
  supabaseClient: SupabaseClient,
  teacherId: string,
  studentId: string
): Promise<boolean> {
  const { data, error, count } = await supabaseClient
    .from('student_teachers')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_id', teacherId)
    .eq('student_id', studentId);
  if (error) {
    console.error(`isTeacherLinked check failed for T:${teacherId} S:${studentId}:`, error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

// --- Include File Upload/Delete Helpers ---
// Helper: Upload file to storage
async function uploadAttachment(
  supabase: SupabaseClient,
  file: FilePayloadInput, // Use the input type
  userId: string // ID of the assigner
): Promise<string | null> {
  try {
    // We need the actual file data (base64 decoded)
    // The client should ideally send base64, or we need more complex handling here
    // For now, assume client sends base64 in the 'base64' field if needed,
    // OR we might need a different approach if only URI is sent from native.
    // Let's assume base64 is provided for simplicity in this example.
    // A more robust solution might involve fetching the URI content if only URI is provided.

    // **Revised Assumption:** Let's assume the *client* API function (`createAssignedTask`)
    // already converted the file to base64 and put it in `payload.file.base64`.
    // If not, this EF needs more logic.

    if (!file.base64) {
      // If base64 isn't directly provided, we might need to fetch URI content here (complex for EF)
      // Or adjust the client API to always provide base64.
      // For now, let's throw an error if base64 is missing but file object exists.
      console.error("File object provided to assignTask EF, but missing 'base64' data.");
      throw new Error('Internal error: Missing file data for upload.');
    }

    const fileExt = file.name?.split('.').pop()?.toLowerCase() || 'bin';
    const safeBaseName =
      file.name?.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(`.${fileExt}`, '') || 'attachment';
    const filePath = `public/${userId}/${Date.now()}_${safeBaseName}.${fileExt}`;
    const mimeType = file.mimeType || 'application/octet-stream';

    console.log(`Attempting upload to Storage: ${filePath} (MIME: ${mimeType})`);

    const fileData = decode(file.base64); // Decode base64

    const { data, error: uploadError } = await supabase.storage
      .from(TASK_ATTACHMENT_BUCKET)
      .upload(filePath, fileData, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload error: ${uploadError.message}`);
    }
    console.log(`File uploaded successfully to Storage: ${data?.path}`);
    return data?.path ?? null;
  } catch (error) {
    console.error('uploadAttachment error:', error.message);
    return null; // Indicate failure
  }
}

// Helper: Delete file from storage (for cleanup on error)
async function deleteAttachment(supabase: SupabaseClient, path: string | null): Promise<boolean> {
  if (!path) return true;
  console.warn(`Attempting cleanup: Deleting attachment from Storage: ${path}`);
  try {
    const { error } = await supabase.storage.from(TASK_ATTACHMENT_BUCKET).remove([path]);
    if (error) throw error;
    console.log(`Cleanup successful: Deleted attachment ${path}`);
    return true;
  } catch (error) {
    console.error(`Cleanup failed: Could not delete attachment ${path}:`, error.message);
    return false;
  }
}

// Main Edge Function Handler
Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS & Method Check
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: corsHeaders,
    });

  console.log(`Received ${req.method} request for assignTask`);

  // 2. Initialize Supabase Admin Client
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    /* ... server config error ... */
  }
  const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: fetch },
  });

  try {
    // 3. Verify Caller Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      /* ... auth error ... */
    }
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user: callerUser },
      error: userError,
    } = await supabaseAdminClient.auth.getUser(token);
    if (userError || !callerUser) {
      /* ... auth error ... */
    }
    const assignerId = callerUser.id;
    console.log('Caller User ID (Assigner):', assignerId);

    // 4. Parse Request Body
    let payload: AssignTaskPayload;
    try {
      payload = await req.json();
      console.log('Received payload:', payload);
    } catch (jsonError) {
      /* ... body error ... */
    }

    // 5. Validate Payload (Basic)
    if (
      !payload.studentId ||
      !payload.taskTitle ||
      payload.taskBasePoints == null ||
      payload.taskBasePoints < 0
    ) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: studentId, taskTitle, taskBasePoints (>= 0).',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Add validation for file object if present
    if (payload.file && (!payload.file.uri || !payload.file.name || !payload.file.mimeType)) {
      console.warn(
        'Received file object is missing required properties (uri, name, mimeType).',
        payload.file
      );
      // Depending on strictness, you might reject here or let uploadAttachment handle it
      // Let's assume uploadAttachment needs base64, which client API should prepare.
      // If base64 isn't prepared by client, uploadAttachment will fail later.
    }

    // 6. Authorize Caller (Admin or Linked Teacher)
    const userIsAdmin = await isAdmin(supabaseAdminClient, assignerId);
    let userIsLinkedTeacher = false;
    if (!userIsAdmin) {
      const { data: callerProfile } = await supabaseAdminClient
        .from('profiles')
        .select('role')
        .eq('id', assignerId)
        .single();
      if (callerProfile?.role === 'teacher') {
        userIsLinkedTeacher = await isTeacherLinked(
          supabaseAdminClient,
          assignerId,
          payload.studentId
        );
      }
    }
    if (!userIsAdmin && !userIsLinkedTeacher) {
      /* ... authz error ... */
    }
    console.log(
      `Authorization success: User ${assignerId} is ${userIsAdmin ? 'Admin' : 'Linked Teacher'}.`
    );

    // 7. Handle Attachment Upload (if new file provided)
    let finalAttachmentPath: string | null = payload.taskAttachmentPath || null; // Start with path from library, if any
    let uploadedFilePath: string | null = null; // Track newly uploaded path for potential cleanup

    if (payload.file) {
      console.log('Ad-hoc file provided in payload, attempting upload...');
      // **Crucially, ensure payload.file contains base64 data here**
      // This might require modification in the client-side `createAssignedTask` function
      // to read the file URI and convert it to base64 before sending.
      uploadedFilePath = await uploadAttachment(supabaseAdminClient, payload.file, assignerId);
      if (!uploadedFilePath) {
        // Upload helper already logged error
        return new Response(JSON.stringify({ error: 'File upload to storage failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      finalAttachmentPath = uploadedFilePath; // Prioritize the newly uploaded file path
      console.log('Ad-hoc file upload successful, path:', finalAttachmentPath);
    } else {
      console.log(
        'No new file provided. Using path from payload if available:',
        finalAttachmentPath
      );
    }

    // 8. Perform Database Insert
    const taskToInsert = {
      student_id: payload.studentId,
      assigned_by_id: assignerId,
      task_title: payload.taskTitle.trim(),
      task_description: payload.taskDescription?.trim() || '', // Ensure description is not null
      task_base_points: payload.taskBasePoints,
      task_link_url: payload.taskLinkUrl || null,
      task_attachment_path: finalAttachmentPath, // Use the determined path
    };

    console.log('Attempting to insert assigned task:', taskToInsert);

    const { data: createdTask, error: insertError } = await supabaseAdminClient
      .from('assigned_tasks')
      .insert(taskToInsert)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting assigned task:', insertError);
      // *** Attempt to clean up newly uploaded file if DB insert failed ***
      if (uploadedFilePath) {
        console.warn(`DB insert failed, attempting cleanup of uploaded file: ${uploadedFilePath}`);
        await deleteAttachment(supabaseAdminClient, uploadedFilePath);
      }
      return new Response(
        JSON.stringify({ error: `Failed to assign task: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Task assigned successfully in DB:', createdTask);

    // 9. Format and Return Success Response
    const responseTask = {
      id: createdTask.id,
      studentId: createdTask.student_id,
      assignedById: createdTask.assigned_by_id,
      assignedDate: createdTask.assigned_date,
      taskTitle: createdTask.task_title,
      taskDescription: createdTask.task_description,
      taskBasePoints: createdTask.task_base_points,
      isComplete: createdTask.is_complete,
      completedDate: createdTask.completed_date ?? undefined,
      verificationStatus: createdTask.verification_status ?? undefined,
      verifiedById: createdTask.verified_by_id ?? undefined,
      verifiedDate: createdTask.verified_date ?? undefined,
      actualPointsAwarded: createdTask.actual_points_awarded ?? undefined,
      taskLinkUrl: createdTask.task_link_url ?? null, // Use null if missing
      taskAttachmentPath: createdTask.task_attachment_path ?? null, // Use null if missing
    };

    return new Response(JSON.stringify(responseTask), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // Created
    });
  } catch (error) {
    console.error('Unhandled Assign Task Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

console.log('assignTask function initialized (v2 - with ad-hoc attachment upload).');
