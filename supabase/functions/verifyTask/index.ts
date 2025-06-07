// supabase/functions/verifyTask/index.ts

import { createClient } from 'supabase-js';

import { isActiveAdmin, isTeacherLinked, isActiveTeacher } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';

type VerificationStatusInput = 'verified' | 'partial' | 'incomplete';

interface VerifyTaskPayload {
  assignmentId: string;
  verificationStatus: VerificationStatusInput;
  actualPointsAwarded: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  console.log(`Received ${req.method} request for verifyTask`);

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
    const verifierId = callerUser.id;
    console.log('Caller User ID (Verifier):', verifierId);

    // NEW: Get the Verifier's Company ID
    const { data: verifierProfile, error: verifierProfileError } = await supabaseAdminClient
      .from('profiles')
      .select('company_id')
      .eq('id', verifierId)
      .single();

    if (verifierProfileError || !verifierProfile?.company_id) {
      console.error(
        `Could not retrieve company_id for verifier ${verifierId}:`,
        verifierProfileError
      );
      return new Response(JSON.stringify({ error: 'Could not determine verifier company.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const verifierCompanyId = verifierProfile.company_id;
    console.log(`Verifier ${verifierId} belongs to company ${verifierCompanyId}`);

    let payload: VerifyTaskPayload;
    try {
      payload = await req.json();
    } catch (jsonError) {
      return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (
      !payload.assignmentId ||
      !payload.verificationStatus ||
      !['verified', 'partial', 'incomplete'].includes(payload.verificationStatus) ||
      payload.actualPointsAwarded == null ||
      typeof payload.actualPointsAwarded !== 'number' ||
      payload.actualPointsAwarded < 0 ||
      !Number.isInteger(payload.actualPointsAwarded)
    ) {
      return new Response(
        JSON.stringify({
          error:
            'Missing or invalid fields: assignmentId, verificationStatus, actualPointsAwarded (non-negative integer).',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (payload.verificationStatus === 'incomplete' && payload.actualPointsAwarded !== 0) {
      return new Response(JSON.stringify({ error: 'Points must be 0 for incomplete status.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const assignmentIdToVerify = payload.assignmentId;
    const newStatus = payload.verificationStatus;
    const pointsToAward = payload.actualPointsAwarded;

    const { data: taskData, error: fetchError } = await supabaseAdminClient
      .from('assigned_tasks')
      .select('id, student_id, is_complete, verification_status, task_title, company_id')
      .eq('id', assignmentIdToVerify)
      .single();

    if (fetchError || !taskData) {
      const status = fetchError?.code === 'PGRST116' ? 404 : 500;
      return new Response(JSON.stringify({ error: 'Assigned task not found.' }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // NEW: Company consistency check
    if (taskData.company_id !== verifierCompanyId) {
      console.error(
        `Company mismatch! Verifier ${verifierId} from ${verifierCompanyId} attempted to verify task ${taskData.id} from ${taskData.company_id}.`
      );
      return new Response(
        JSON.stringify({ error: 'Permission denied: Cannot verify a task from another company.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    console.log(`Company check passed for task and verifier: ${verifierCompanyId}`);

    if (taskData.is_complete !== true || taskData.verification_status !== 'pending') {
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
      return new Response(
        JSON.stringify({ error: 'Permission denied: You cannot verify tasks for this student.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verificationTime = new Date().toISOString();

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

    if (updateTaskError) {
      return new Response(
        JSON.stringify({ error: `Failed to update task status: ${updateTaskError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (pointsToAward > 0) {
      // MODIFIED: Inject company_id into the new ticket transaction
      const transactionData = {
        student_id: studentId,
        amount: pointsToAward,
        type: 'task_award' as const,
        source_id: assignmentIdToVerify,
        notes: `Verified task: ${updatedTask.task_title || 'Untitled Task'}`,
        company_id: verifierCompanyId, // <-- The critical addition
      };
      const { error: insertTransactionError } = await supabaseAdminClient
        .from('ticket_transactions')
        .insert(transactionData);

      if (insertTransactionError) {
        return new Response(
          JSON.stringify({
            error: `Task status updated, but failed to award points: ${insertTransactionError.message}`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response(JSON.stringify(updatedTask), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Unhandled Verify Task Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

console.log('verifyTask function initialized (v3 - multi-tenant aware).');
