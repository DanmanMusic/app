// supabase/functions/verifyTask/index.ts

import { createClient } from 'supabase-js';

import { isActiveAdmin, isTeacherLinked, isActiveTeacher } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';
// Import shared helpers

// Define ENUM type values expected from client
type VerificationStatusInput = 'verified' | 'partial' | 'incomplete';

// Define expected request body structure
interface VerifyTaskPayload {
  assignmentId: string;
  verificationStatus: VerificationStatusInput;
  actualPointsAwarded: number;
}

// Main Function Handler
Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS & Method Check
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }); // Added Content-Type

  console.log(`Received ${req.method} request for verifyTask`);

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

  try {
    // 3. Verify Caller Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Missing or invalid Authorization header.');
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
      console.error('Auth token validation error:', userError?.message || 'User not found');
      return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const verifierId = callerUser.id;
    console.log('Caller User ID (Verifier):', verifierId);

    // 4. Parse Request Body
    let payload: VerifyTaskPayload;
    try {
      payload = await req.json();
      console.log('Received payload:', payload);
    } catch (jsonError) {
      console.error('Failed to parse request body:', jsonError);
      return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Validate Payload
    if (
      !payload.assignmentId ||
      !payload.verificationStatus ||
      !['verified', 'partial', 'incomplete'].includes(payload.verificationStatus) ||
      payload.actualPointsAwarded == null ||
      typeof payload.actualPointsAwarded !== 'number' ||
      payload.actualPointsAwarded < 0 ||
      !Number.isInteger(payload.actualPointsAwarded)
    ) {
      console.warn('Payload validation failed:', payload);
      return new Response(
        JSON.stringify({
          error:
            'Missing or invalid fields: assignmentId, verificationStatus, actualPointsAwarded (non-negative integer).',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (payload.verificationStatus === 'incomplete' && payload.actualPointsAwarded !== 0) {
      console.warn('Payload validation failed: Incomplete status with non-zero points.');
      return new Response(JSON.stringify({ error: 'Points must be 0 for incomplete status.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const assignmentIdToVerify = payload.assignmentId;
    const newStatus = payload.verificationStatus;
    const pointsToAward = payload.actualPointsAwarded;

    // 6. Fetch Task and Authorize Caller - Using imported helpers
    const { data: taskData, error: fetchError } = await supabaseAdminClient
      .from('assigned_tasks')
      .select('id, student_id, is_complete, verification_status, task_title') // Fetch title for notes
      .eq('id', assignmentIdToVerify)
      .single();

    // *** RESTORED Task Not Found Handling ***
    if (fetchError || !taskData) {
      const status = fetchError?.code === 'PGRST116' ? 404 : 500;
      const message =
        fetchError?.code === 'PGRST116'
          ? 'Assigned task not found.'
          : `Failed to fetch task: ${fetchError?.message || 'Unknown error'}`;
      console.warn(
        `Task not found or fetch error for ${assignmentIdToVerify}:`,
        fetchError?.message
      );
      return new Response(JSON.stringify({ error: message }), {
        status: status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // *** END RESTORED HANDLING ***

    if (taskData.is_complete !== true || taskData.verification_status !== 'pending') {
      console.warn(
        `Task ${assignmentIdToVerify} not ready for verification. State: is_complete=${taskData.is_complete}, status=${taskData.verification_status}`
      );
      return new Response(
        JSON.stringify({ error: 'Task is not marked complete or is already verified/processed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const studentId = taskData.student_id;
    const userIsActiveAdmin = await isActiveAdmin(supabaseAdminClient, verifierId);
    let userIsLinkedActiveTeacher = false;
    if (!userIsActiveAdmin) {
      const callerIsActiveTeacher = await isActiveTeacher(supabaseAdminClient, verifierId);
      if (callerIsActiveTeacher) {
        userIsLinkedActiveTeacher = await isTeacherLinked(
          supabaseAdminClient,
          verifierId,
          studentId
        );
      }
    }

    if (!userIsActiveAdmin && !userIsLinkedActiveTeacher) {
      console.warn(
        `Authorization failed: User ${verifierId} is not Active Admin or linked Active Teacher for student ${studentId}.`
      );
      return new Response(
        JSON.stringify({ error: 'Permission denied: You cannot verify tasks for this student.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(
      `Authorization success: User ${verifierId} is ${userIsActiveAdmin ? 'Active Admin' : 'Linked Active Teacher'} for student ${studentId}.`
    );

    // 7. Perform Database Updates
    const verificationTime = new Date().toISOString();
    let updatedTaskData: any = null;
    let transactionError: Error | null = null;

    // 7a. Update assigned_tasks table
    console.log(
      `Updating assigned_tasks ${assignmentIdToVerify} with status: ${newStatus}, points: ${pointsToAward}`
    );
    const { data: updatedTask, error: updateTaskError } = await supabaseAdminClient
      .from('assigned_tasks')
      .update({
        verification_status: newStatus,
        actual_points_awarded: pointsToAward,
        verified_by_id: verifierId,
        verified_date: verificationTime,
      })
      .eq('id', assignmentIdToVerify)
      .select()
      .single();

    // *** RESTORED Update Task Error Handling ***
    if (updateTaskError) {
      console.error(`Error updating assigned_tasks ${assignmentIdToVerify}:`, updateTaskError);
      return new Response(
        JSON.stringify({ error: `Failed to update task status: ${updateTaskError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // *** END RESTORED HANDLING ***
    updatedTaskData = updatedTask;
    console.log(`Assigned task ${assignmentIdToVerify} updated successfully.`);

    // 7b. Insert into ticket_transactions if points awarded > 0
    if (pointsToAward > 0) {
      console.log(`Awarding ${pointsToAward} points. Inserting into ticket_transactions...`);
      const transactionData = {
        student_id: studentId,
        amount: pointsToAward,
        type: 'task_award' as const,
        source_id: assignmentIdToVerify,
        notes: `Verified task: ${updatedTaskData.task_title || 'Untitled Task'}`,
      };
      const { error: insertTransactionError } = await supabaseAdminClient
        .from('ticket_transactions')
        .insert(transactionData);

      // *** RESTORED Transaction Error Handling ***
      if (insertTransactionError) {
        console.error(
          `Error inserting ticket transaction for task ${assignmentIdToVerify}:`,
          insertTransactionError
        );
        transactionError = new Error(
          `Failed to log ticket transaction: ${insertTransactionError.message}`
        );
        // Return error, indicating partial success (task updated, points failed)
        return new Response(
          JSON.stringify({
            error: `Task status updated, but failed to award points: ${transactionError.message}`,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // *** END RESTORED HANDLING ***
      console.log(`Ticket transaction logged successfully for task ${assignmentIdToVerify}.`);
    } else {
      console.log(`No points awarded (${pointsToAward}), skipping ticket transaction.`);
    }

    // 8. Format and Return Success Response
    const responseTask = {
      id: updatedTaskData.id,
      studentId: updatedTaskData.student_id,
      assignedById: updatedTaskData.assigned_by_id,
      assignedDate: updatedTaskData.assigned_date,
      taskTitle: updatedTaskData.task_title,
      taskDescription: updatedTaskData.task_description,
      taskBasePoints: updatedTaskData.task_base_points,
      isComplete: updatedTaskData.is_complete,
      completedDate: updatedTaskData.completed_date ?? undefined,
      verificationStatus: updatedTaskData.verification_status ?? undefined,
      verifiedById: updatedTaskData.verified_by_id ?? undefined,
      verifiedDate: updatedTaskData.verified_date ?? undefined,
      actualPointsAwarded: updatedTaskData.actual_points_awarded ?? undefined,
      taskLinkUrl: updatedTaskData.task_link_url ?? null,
      taskAttachmentPath: updatedTaskData.task_attachment_path ?? null,
    };

    return new Response(JSON.stringify(responseTask), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // OK
    });
  } catch (error) {
    console.error('Unhandled Verify Task Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

console.log('verifyTask function initialized (v2 - uses shared helpers).');
