// File: supabase/functions/verify-task/index.ts

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

  const supabaseAdminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authentication required.');

    const { data: { user: callerUser }, error: userError } = await supabaseAdminClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !callerUser) throw new Error('Invalid or expired token.');
    const verifierId = callerUser.id;

    const { data: verifierProfile } = await supabaseAdminClient
      .from('profiles')
      .select('company_id')
      .eq('id', verifierId)
      .single();
    if (!verifierProfile?.company_id) throw new Error('Could not determine verifier company.');
    const verifierCompanyId = verifierProfile.company_id;

    const payload: VerifyTaskPayload = await req.json();
    if (
      !payload.assignmentId ||
      !payload.verificationStatus ||
      !['verified', 'partial', 'incomplete'].includes(payload.verificationStatus) ||
      payload.actualPointsAwarded == null ||
      payload.actualPointsAwarded < 0 ||
      !Number.isInteger(payload.actualPointsAwarded)
    ) {
      throw new Error('Missing or invalid fields in payload.');
    }
    if (payload.verificationStatus === 'incomplete' && payload.actualPointsAwarded !== 0) {
      throw new Error('Points must be 0 for incomplete status.');
    }
    const { assignmentId: assignmentIdToVerify, verificationStatus: newStatus, actualPointsAwarded: pointsToAward } = payload;

    const { data: taskData, error: fetchError } = await supabaseAdminClient
      .from('assigned_tasks')
      .select('id, student_id, is_complete, verification_status, task_title, company_id')
      .eq('id', assignmentIdToVerify)
      .single();

    if (fetchError) throw new Error('Assigned task not found.');
    if (taskData.company_id !== verifierCompanyId) throw new Error('Permission denied: Cannot verify a task from another company.');
    if (taskData.is_complete !== true || taskData.verification_status !== 'pending') {
      throw new Error('Task is not marked complete or is already verified/processed.');
    }

    const studentId = taskData.student_id;
    const userIsActiveAdmin = await isActiveAdmin(supabaseAdminClient, verifierId);
    let userIsLinkedActiveTeacher = false;
    if (!userIsActiveAdmin) {
      if (await isActiveTeacher(supabaseAdminClient, verifierId)) {
        userIsLinkedActiveTeacher = await isTeacherLinked(supabaseAdminClient, verifierId, studentId);
      }
    }

    if (!userIsActiveAdmin && !userIsLinkedActiveTeacher) {
      throw new Error('Permission denied: You cannot verify tasks for this student.');
    }

    const { data: updatedTask, error: updateTaskError } = await supabaseAdminClient
      .from('assigned_tasks')
      .update({
        verification_status: newStatus,
        actual_points_awarded: pointsToAward,
        verified_by_id: verifierId,
        verified_date: new Date().toISOString(),
      })
      .eq('id', assignmentIdToVerify)
      .select('id, task_title') // Only select what we absolutely need
      .single();

    if (updateTaskError) {
      throw new Error(`Failed to update task status: ${updateTaskError.message}`);
    }
    if (!updatedTask) {
      throw new Error('Failed to retrieve updated task after verification.');
    }

    if (pointsToAward > 0) {
      const transactionData = {
        student_id: studentId,
        amount: pointsToAward,
        type: 'task_award' as const, // Correct type for task verification
        source_id: assignmentIdToVerify,
        notes: `Verified task: ${updatedTask.task_title || 'Untitled Task'}`,
        company_id: verifierCompanyId,
      };
      const { error: insertTransactionError } = await supabaseAdminClient
        .from('ticket_transactions')
        .insert(transactionData);

      if (insertTransactionError) {
        throw new Error(`Task status updated, but failed to award points: ${insertTransactionError.message}`);
      }
    }

    return new Response(JSON.stringify(updatedTask), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled Verify Task Function Error:', error);
    // Be more specific with status codes based on common error types
    const status = error.message.includes('Permission denied') ? 403 
                 : error.message.includes('not found') ? 404
                 : 400;
    return new Response(JSON.stringify({ error: error.message }), {
      status: status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});