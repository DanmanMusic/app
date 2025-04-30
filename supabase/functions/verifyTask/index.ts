// supabase/functions/verifyTask/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// Define ENUM type values expected from client
type VerificationStatusInput = 'verified' | 'partial' | 'incomplete';

// Define expected request body structure
interface VerifyTaskPayload {
  assignmentId: string;
  verificationStatus: VerificationStatusInput;
  actualPointsAwarded: number;
}

// Helper function to check if the caller is an Admin
async function isAdmin(supabaseClient: SupabaseClient, callerUserId: string): Promise<boolean> {
  // Reusing the same helper logic
  const { data, error } = await supabaseClient
    .from('profiles').select('role').eq('id', callerUserId).single();
  if (error) { console.error(`isAdmin check failed for ${callerUserId}:`, error.message); return false; }
  return data?.role === 'admin';
}

// Helper function to check if caller is a Teacher linked to the student
async function isTeacherLinked(supabaseClient: SupabaseClient, teacherId: string, studentId: string): Promise<boolean> {
    const { data, error, count } = await supabaseClient
        .from('student_teachers').select('*', { count: 'exact', head: true })
        .eq('teacher_id', teacherId).eq('student_id', studentId);
    if (error) { console.error(`isTeacherLinked check failed for T:${teacherId} S:${studentId}:`, error.message); return false; }
    return (count ?? 0) > 0;
}

Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }
  if (req.method !== 'POST') { return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), { status: 405, headers: corsHeaders }); }

  console.log(`Received ${req.method} request for verifyTask`);

  // 2. Initialize Supabase Admin Client
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) { /* ... server config error ... */ }
  const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false }, global: { fetch: fetch } });

  try {
    // 3. Verify Caller Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) { /* ... auth error ... */ }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: userError } = await supabaseAdminClient.auth.getUser(token);
    if (userError || !callerUser) { /* ... auth error ... */ }
    const verifierId = callerUser.id;
    console.log('Caller User ID (Verifier):', verifierId);

    // 4. Parse Request Body
    let payload: VerifyTaskPayload;
    try { payload = await req.json(); } catch (jsonError) { /* ... body error ... */ }
    console.log('Received payload:', payload);

    // 5. Validate Payload
    if (!payload.assignmentId || !payload.verificationStatus || !['verified', 'partial', 'incomplete'].includes(payload.verificationStatus) || payload.actualPointsAwarded == null || typeof payload.actualPointsAwarded !== 'number' || payload.actualPointsAwarded < 0 || !Number.isInteger(payload.actualPointsAwarded)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid fields: assignmentId, verificationStatus, actualPointsAwarded (non-negative integer).' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    // Validate points match status (optional but good)
    if (payload.verificationStatus === 'incomplete' && payload.actualPointsAwarded !== 0) {
        return new Response(JSON.stringify({ error: 'Points must be 0 for incomplete status.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const assignmentIdToVerify = payload.assignmentId;
    const newStatus = payload.verificationStatus;
    const pointsToAward = payload.actualPointsAwarded;

    // 6. Fetch Task and Authorize Caller
    const { data: taskData, error: fetchError } = await supabaseAdminClient
        .from('assigned_tasks')
        .select('id, student_id, is_complete, verification_status')
        .eq('id', assignmentIdToVerify)
        .single();

    if (fetchError || !taskData) {
        console.warn(`Task not found or fetch error for ${assignmentIdToVerify}:`, fetchError?.message);
        return new Response(JSON.stringify({ error: 'Assigned task not found.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check if task is in correct state for verification
    if (taskData.is_complete !== true || taskData.verification_status !== 'pending') {
        console.warn(`Task ${assignmentIdToVerify} not ready for verification. State: is_complete=${taskData.is_complete}, status=${taskData.verification_status}`);
        return new Response(JSON.stringify({ error: 'Task is not marked complete or is already verified.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const studentId = taskData.student_id;
    const userIsAdmin = await isAdmin(supabaseAdminClient, verifierId);
    let userIsLinkedTeacher = false;
    if (!userIsAdmin) {
        const { data: callerProfile } = await supabaseAdminClient.from('profiles').select('role').eq('id', verifierId).single();
        if (callerProfile?.role === 'teacher') {
            userIsLinkedTeacher = await isTeacherLinked(supabaseAdminClient, verifierId, studentId);
        }
    }

    if (!userIsAdmin && !userIsLinkedTeacher) {
         console.warn(`Authorization failed: User ${verifierId} is not Admin or linked Teacher for student ${studentId}.`);
         return new Response(JSON.stringify({ error: 'Permission denied: You cannot verify tasks for this student.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log(`Authorization success: User ${verifierId} is ${userIsAdmin ? 'Admin' : 'Linked Teacher'} for student ${studentId}.`);


    // 7. Perform Database Updates (SEQUENTIAL - Consider RPC for Atomicity)

    const verificationTime = new Date().toISOString();
    let updatedTaskData: any = null;
    let transactionError: Error | null = null;

    // 7a. Update assigned_tasks table
    console.log(`Updating assigned_tasks ${assignmentIdToVerify} with status: ${newStatus}, points: ${pointsToAward}`);
    const { data: updatedTask, error: updateTaskError } = await supabaseAdminClient
      .from('assigned_tasks')
      .update({
          verification_status: newStatus,
          actual_points_awarded: pointsToAward,
          verified_by_id: verifierId,
          verified_date: verificationTime,
      })
      .eq('id', assignmentIdToVerify)
      .select() // Select updated row
      .single();

    if (updateTaskError) {
        console.error(`Error updating assigned_tasks ${assignmentIdToVerify}:`, updateTaskError);
        // If this fails, we don't proceed to transactions
        return new Response(JSON.stringify({ error: `Failed to update task status: ${updateTaskError.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    updatedTaskData = updatedTask; // Store for response
    console.log(`Assigned task ${assignmentIdToVerify} updated successfully.`);


    // 7b. Insert into ticket_transactions if points awarded > 0
    if (pointsToAward > 0) {
        console.log(`Awarding ${pointsToAward} points. Inserting into ticket_transactions...`);
        const transactionData = {
            student_id: studentId,
            amount: pointsToAward,
            type: 'task_award' as const, // Ensure type is correct
            source_id: assignmentIdToVerify,
            notes: `Verified task: ${updatedTaskData.task_title}` // Use updated task title
        };

        const { error: insertTransactionError } = await supabaseAdminClient
            .from('ticket_transactions')
            .insert(transactionData);

        if (insertTransactionError) {
            console.error(`Error inserting ticket transaction for task ${assignmentIdToVerify}:`, insertTransactionError);
            // CRITICAL: Task status updated, but points not logged! Need manual correction or RPC.
            transactionError = new Error(`Failed to log ticket transaction: ${insertTransactionError.message}`);
            // Decide how to respond: Return error but mention partial success?
             return new Response(JSON.stringify({ error: `Task status updated, but failed to award points: ${transactionError.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
         console.log(`Ticket transaction logged successfully for task ${assignmentIdToVerify}.`);
    } else {
         console.log(`No points awarded (${pointsToAward}), skipping ticket transaction.`);
    }


    // 8. Format and Return Success Response
    const responseTask = { // Map back to camelCase
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
    };

    return new Response(JSON.stringify(responseTask), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // OK
    });

  } catch (error) {
    console.error('Unhandled Verify Task Function Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

console.log('verifyTask function initialized.');