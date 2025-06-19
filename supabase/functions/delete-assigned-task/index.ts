// supabase/functions/delete-assigned-task/index.ts

import { createClient } from 'supabase-js';

import { isTeacherLinked } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface DeleteAssignedTaskPayload {
  assignmentId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const supabaseAdminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const {
      data: { user: callerUser },
    } = await supabaseAdminClient.auth.getUser(
      req.headers.get('Authorization')!.replace('Bearer ', '')
    );
    if (!callerUser) throw new Error('Invalid Token');

    const payload: DeleteAssignedTaskPayload = await req.json();
    const { assignmentId } = payload;

    if (!assignmentId) {
      throw new Error('Missing assignmentId in request body.');
    }

    const { data: task, error: fetchError } = await supabaseAdminClient
      .from('assigned_tasks')
      .select('id, student_id, assigned_by_id, verification_status, company_id')
      .eq('id', assignmentId)
      .single();

    if (fetchError) throw new Error('Assigned task not found.');

    const { data: callerProfile } = await supabaseAdminClient
      .from('profiles')
      .select('company_id, role')
      .eq('id', callerUser.id)
      .single();

    if (!callerProfile) throw new Error('Could not verify caller profile');

    if (task.company_id !== callerProfile.company_id) {
      throw new Error('Permission denied: Cannot delete task from another company.');
    }

    const isVerified = ['verified', 'partial', 'incomplete'].includes(task.verification_status);
    if (isVerified) {
      throw new Error('Cannot delete a task that has already been verified.');
    }

    const isAdmin = callerProfile.role === 'admin';
    let isAuthorizedTeacher = false;

    if (callerProfile.role === 'teacher') {
      const isTeacherOwner = task.assigned_by_id === callerUser.id;
      const isSelfAssigned = task.assigned_by_id === task.student_id;
      // For self-assigned tasks, we MUST check if the teacher is linked to the student.
      if (
        isTeacherOwner ||
        (isSelfAssigned &&
          (await isTeacherLinked(supabaseAdminClient, callerUser.id, task.student_id)))
      ) {
        isAuthorizedTeacher = true;
      }
    }

    if (!isAdmin && !isAuthorizedTeacher) {
      throw new Error('Permission denied: You are not authorized to delete this task.');
    }

    const { error: deleteError } = await supabaseAdminClient
      .from('assigned_tasks')
      .delete()
      .eq('id', assignmentId);

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ message: 'Assigned task deleted successfully.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
