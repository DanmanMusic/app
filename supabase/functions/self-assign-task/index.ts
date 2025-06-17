// supabase/functions/self-assign-task/index.ts

import { createClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import { isParentOfStudent } from '../_shared/authHelpers.ts';

interface SelfAssignPayload {
  taskLibraryId: string;
  // NEW: studentId is now an explicit part of the payload
  studentId: string; 
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

    const { taskLibraryId, studentId }: SelfAssignPayload = await req.json();
    if (!taskLibraryId || !studentId) {
      return new Response(JSON.stringify({ error: 'taskLibraryId and studentId are required.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const callerId = caller.id;
    const callerRole = caller.app_metadata.role;
    const companyId = caller.app_metadata.company_id;

    // --- NEW AUTHORIZATION LOGIC ---
    let isAuthorized = false;
    if (callerRole === 'student' && callerId === studentId) {
      isAuthorized = true;
    } else if (callerRole === 'parent') {
      isAuthorized = await isParentOfStudent(supabaseAdmin, callerId, studentId);
    }
    // Optional: could add admin override here if needed
    // else if (callerRole === 'admin') { isAuthorized = true; }

    if (!isAuthorized) {
        return new Response(JSON.stringify({ error: 'You are not authorized to assign this task for the selected student.' }), {
            status: 403,
            headers: corsHeaders,
        });
    }
    // --- END NEW AUTHORIZATION LOGIC ---
    
    // The rest of the validation and execution logic uses the validated `studentId`
    // (This part is unchanged from our last version)
    const { data: taskToAssign, error: fetchError } = await supabaseAdmin
      .from('task_library')
      .select('*, journey_locations ( can_reassign_tasks )')
      .eq('id', taskLibraryId)
      .single();

    if (fetchError || !taskToAssign) {
      return new Response(JSON.stringify({ error: 'Task from library not found.' }), { status: 404, headers: corsHeaders });
    }
    if (!taskToAssign.can_self_assign) {
      return new Response(JSON.stringify({ error: 'This task is not self-assignable.' }), { status: 403, headers: corsHeaders });
    }
    if (!taskToAssign.journey_location_id) {
      return new Response(JSON.stringify({ error: 'Self-assignable tasks must belong to a Journey Location.' }), { status: 400, headers: corsHeaders });
    }

    const { count: activeCount } = await supabaseAdmin
      .from('assigned_tasks')
      .select('id, task_library!inner(journey_location_id)', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('is_complete', false)
      .eq('task_library.journey_location_id', taskToAssign.journey_location_id);

    if (activeCount && activeCount > 0) {
      return new Response(JSON.stringify({ error: 'You already have an active task from this Journey Location.' }), { status: 409, headers: corsHeaders });
    }

    if (taskToAssign.journey_locations?.can_reassign_tasks === false) {
      const { count: completedCount } = await supabaseAdmin
        .from('assigned_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('task_library_id', taskLibraryId)
        .eq('verification_status', 'verified');
      if (completedCount && completedCount > 0) {
        return new Response(JSON.stringify({ error: 'You have already completed this one-time task.' }), { status: 409, headers: corsHeaders });
      }
    }

    const { data: fullLibraryTask, error: rpcError } = await supabaseAdmin
      .rpc('get_single_task_library_item', { p_task_id: taskLibraryId })
      .single();
    
    if (rpcError || !fullLibraryTask) {
      throw new Error('Could not retrieve full task details for assignment.');
    }

    const newAssignedTask = {
      student_id: studentId,
      assigned_by_id: callerId, // The caller (parent or student) is the assigner
      company_id: companyId,
      task_library_id: taskLibraryId,
      task_title: fullLibraryTask.title,
      task_description: fullLibraryTask.description ?? '', 
      task_base_points: fullLibraryTask.base_tickets,
      task_links: fullLibraryTask.urls,
      task_attachments: fullLibraryTask.attachments,
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