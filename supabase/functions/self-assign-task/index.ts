// supabase/functions/self-assign-task/index.ts

import { createClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

interface SelfAssignPayload {
  taskLibraryId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const {
      data: { user: caller },
      error: userError,
    } = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')!.replace('Bearer ', ''));

    if (userError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: corsHeaders,
      });
    }
    if (caller.app_metadata.role !== 'student') {
      return new Response(JSON.stringify({ error: 'Only students can self-assign tasks.' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const studentId = caller.id;
    const companyId = caller.app_metadata.company_id;

    const { taskLibraryId }: SelfAssignPayload = await req.json();
    if (!taskLibraryId) {
      return new Response(JSON.stringify({ error: 'taskLibraryId is required.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Fetch the task and its journey location properties
    const { data: taskToAssign, error: fetchError } = await supabaseAdmin
      .from('task_library')
      .select(
        `
        *,
        journey_locations ( can_reassign_tasks )
      `
      )
      .eq('id', taskLibraryId)
      .single();

    if (fetchError || !taskToAssign) {
      return new Response(JSON.stringify({ error: 'Task from library not found.' }), {
        status: 404,
        headers: corsHeaders,
      });
    }
    if (!taskToAssign.can_self_assign) {
      return new Response(JSON.stringify({ error: 'This task is not self-assignable.' }), {
        status: 403,
        headers: corsHeaders,
      });
    }
    if (!taskToAssign.journey_location_id) {
      return new Response(
        JSON.stringify({ error: 'Self-assignable tasks must belong to a Journey Location.' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // --- NEW VALIDATION LOGIC ---
    // 1. Check for ANY active (incomplete) task from this journey location.
    const { count: activeCount } = await supabaseAdmin
      .from('assigned_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('is_complete', false)
      .eq('task_library_id', taskLibraryId); // Simplified check

    if (activeCount && activeCount > 0) {
      return new Response(
        JSON.stringify({ error: 'You already have an active task from this Journey Location.' }),
        { status: 409, headers: corsHeaders }
      );
    }

    // 2. If the location is "one-and-done", check for ANY completed task.
    if (taskToAssign.journey_locations?.can_reassign_tasks === false) {
      const { count: completedCount } = await supabaseAdmin
        .from('assigned_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('task_library_id', taskLibraryId)
        .eq('verification_status', 'verified');

      if (completedCount && completedCount > 0) {
        return new Response(
          JSON.stringify({ error: 'You have already completed this one-time task.' }),
          { status: 409, headers: corsHeaders }
        );
      }
    }
    // --- END NEW VALIDATION LOGIC ---

    const newAssignedTask = {
      student_id: studentId,
      assigned_by_id: studentId,
      company_id: companyId,
      task_title: taskToAssign.title,
      task_description: taskToAssign.description,
      task_base_points: taskToAssign.base_tickets,
      task_link_url: taskToAssign.reference_url,
      task_attachment_path: taskToAssign.attachment_path,
      task_library_id: taskLibraryId, // Add the FK link
    };

    const { data: createdTask, error: insertError } = await supabaseAdmin
      .from('assigned_tasks')
      .insert(newAssignedTask)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to assign task: ${insertError.message}`);
    }

    return new Response(JSON.stringify(createdTask), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
