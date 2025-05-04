// supabase/functions/assignTask/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

interface AssignTaskPayload {
  studentId: string;
  taskTitle: string;
  taskDescription: string;
  taskBasePoints: number;
  taskLinkUrl?: string | null;
  taskAttachmentPath?: string | null;
}

// Helper to check if caller is Admin
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

// Helper to check if caller is a Teacher linked to the student
async function isTeacherLinked(
  supabaseClient: SupabaseClient,
  teacherId: string,
  studentId: string
): Promise<boolean> {
  const { data, error, count } = await supabaseClient
    .from('student_teachers')
    .select('*', { count: 'exact', head: true }) // Just need the count
    .eq('teacher_id', teacherId)
    .eq('student_id', studentId);

  if (error) {
    console.error(`isTeacherLinked check failed for T:${teacherId} S:${studentId}:`, error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  // Allow only POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  console.log(`Received ${req.method} request for assignTask`);

  // 2. Initialize Supabase Admin Client
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
  console.log('Supabase Admin Client initialized.');

  try {
    // 3. Verify Caller Authentication
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
    const assignerId = callerUser.id; // This is the assigned_by_id
    console.log('Caller User ID (Assigner):', assignerId);

    // 4. Parse Request Body
    let payload: AssignTaskPayload;
    try {
      payload = await req.json();
      console.log('Received payload:', payload);
    } catch (jsonError) {
      return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Validate Payload
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

    // 6. Authorize Caller (Admin or Linked Teacher)
    const userIsAdmin = await isAdmin(supabaseAdminClient, assignerId);
    let userIsLinkedTeacher = false;
    if (!userIsAdmin) {
      // Fetch caller's role to confirm they are a teacher before checking link
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

    // 7. Perform Database Insert
    const taskToInsert = {
      student_id: payload.studentId,
      assigned_by_id: assignerId, // From auth
      task_title: payload.taskTitle.trim(),
      task_description: payload.taskDescription.trim(),
      task_base_points: payload.taskBasePoints,
      task_link_url: payload.taskLinkUrl || null, // <-- Add to insert object
      task_attachment_path: payload.taskAttachmentPath || null, // <-- Add to insert object
    };

    console.log('Attempting to insert assigned task:', taskToInsert);

    const { data: createdTask, error: insertError } = await supabaseAdminClient
      .from('assigned_tasks')
      .insert(taskToInsert)
      .select() // Select all columns of the newly created row
      .single(); // Expect only one row to be created

    if (insertError) {
      console.error('Error inserting assigned task:', insertError);
      // TODO: Check for specific errors like FK violation if studentId doesn't exist
      return new Response(
        JSON.stringify({ error: `Failed to assign task: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Task assigned successfully in DB:', createdTask);

    // 8. Format and Return Success Response
    // Map DB columns back to camelCase if needed by client types
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
      taskLinkUrl: createdTask.task_link_url ?? undefined,
      taskAttachmentPath: createdTask.task_attachment_path ?? undefined,
    };

    return new Response(JSON.stringify(responseTask), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // Created
    });
  } catch (error) {
    console.error('Unhandled Assign Task Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

console.log('assignTask function initialized.');
