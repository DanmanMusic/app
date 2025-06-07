// supabase/functions/assignTask/index.ts

import { createClient } from 'supabase-js';

import { isActiveAdmin, isTeacherLinked } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { uploadAttachment, deleteAttachment, FileUploadData } from '../_shared/storageHelpers.ts';

interface AssignTaskPayload {
  studentId: string;
  taskTitle: string;
  taskDescription: string;
  taskBasePoints: number;
  taskLinkUrl?: string | null;
  taskAttachmentPath?: string | null;
  file?: FileUploadData;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: corsHeaders,
    });

  console.log(`Received ${req.method} request for assignTask`);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase environment variables.');
    return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: fetch },
  });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user: callerUser },
      error: userError,
    } = await supabaseAdminClient.auth.getUser(token);
    if (userError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const assignerId = callerUser.id;
    console.log('Caller User ID (Assigner):', assignerId);

    // NEW: Step 3.5 - Get the Assigner's Company ID
    const { data: assignerProfile, error: assignerProfileError } = await supabaseAdminClient
      .from('profiles')
      .select('company_id, role') // Fetch role at the same time for auth checks
      .eq('id', assignerId)
      .single();

    if (assignerProfileError || !assignerProfile?.company_id) {
      console.error(
        `Could not retrieve company_id for assigner ${assignerId}:`,
        assignerProfileError
      );
      return new Response(JSON.stringify({ error: 'Could not determine assigner company.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const assignerCompanyId = assignerProfile.company_id;
    const assignerRole = assignerProfile.role;
    console.log(`Assigner ${assignerId} belongs to company ${assignerCompanyId}`);

    let payload: AssignTaskPayload;
    try {
      payload = await req.json();
    } catch (_jsonError) {
      return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
    if (
      payload.file &&
      (!payload.file.base64 || !payload.file.fileName || !payload.file.mimeType)
    ) {
      return new Response(JSON.stringify({ error: 'Incomplete file data provided.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // MODIFIED: Authorization logic simplified since we already fetched the role
    const userIsAdmin = assignerRole === 'admin';
    let userIsLinkedTeacher = false;
    if (!userIsAdmin && assignerRole === 'teacher') {
      userIsLinkedTeacher = await isTeacherLinked(
        supabaseAdminClient,
        assignerId,
        payload.studentId
      );
    }

    if (!userIsAdmin && !userIsLinkedTeacher) {
      console.warn(
        `Authorization failed: User ${assignerId} is not Admin or linked Teacher for student ${payload.studentId}.`
      );
      return new Response(
        JSON.stringify({ error: 'Permission denied: User cannot assign tasks to this student.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(
      `Authorization success: User ${assignerId} is ${userIsAdmin ? 'Admin' : 'Linked Teacher'}.`
    );

    let finalAttachmentPath: string | null = payload.taskAttachmentPath || null;
    let uploadedFilePath: string | null = null;
    if (payload.file) {
      uploadedFilePath = await uploadAttachment(supabaseAdminClient, payload.file, assignerId);
      if (!uploadedFilePath) {
        return new Response(JSON.stringify({ error: 'File upload to storage failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      finalAttachmentPath = uploadedFilePath;
    }

    // MODIFIED: Inject company_id into the new assigned_task record
    const taskToInsert = {
      student_id: payload.studentId,
      assigned_by_id: assignerId,
      company_id: assignerCompanyId, // <-- The critical addition
      task_title: payload.taskTitle.trim(),
      task_description: payload.taskDescription?.trim() || '',
      task_base_points: payload.taskBasePoints,
      task_link_url: payload.taskLinkUrl || null,
      task_attachment_path: finalAttachmentPath,
    };

    console.log('Attempting to insert assigned task:', taskToInsert);

    const { data: createdTask, error: insertError } = await supabaseAdminClient
      .from('assigned_tasks')
      .insert(taskToInsert)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting assigned task:', insertError);
      if (uploadedFilePath) {
        await deleteAttachment(supabaseAdminClient, uploadedFilePath);
      }
      return new Response(
        JSON.stringify({ error: `Failed to assign task: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Task assigned successfully in DB:', createdTask);

    // No change needed for response, but it's good practice.
    const responseTask = {
      id: createdTask.id,
      studentId: createdTask.student_id,
      assignedById: createdTask.assigned_by_id,
      assignedDate: createdTask.assigned_date,
      taskTitle: createdTask.task_title,
      taskDescription: createdTask.task_description,
      taskBasePoints: createdTask.task_base_points,
      isComplete: createdTask.is_complete,
      // ... other fields
      taskLinkUrl: createdTask.task_link_url ?? null,
      taskAttachmentPath: createdTask.task_attachment_path ?? null,
    };

    return new Response(JSON.stringify(responseTask), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });
  } catch (error) {
    console.error('Unhandled Assign Task Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

console.log('assignTask function initialized (v4 - multi-tenant aware).');
