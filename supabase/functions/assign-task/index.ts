// File: supabase/functions/assign-task/index.ts

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
  taskAttachmentPath?: string | null; // For re-using a library attachment
  file?: FileUploadData; // For uploading a new, unique attachment
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: corsHeaders,
    });

  const supabaseAdminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const {
      data: { user: callerUser },
    } = await supabaseAdminClient.auth.getUser(
      req.headers.get('Authorization')!.replace('Bearer ', '')
    );
    if (!callerUser) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), {
        status: 401,
        headers: corsHeaders,
      });
    }
    const assignerId = callerUser.id;

    const { data: assignerProfile, error: assignerProfileError } = await supabaseAdminClient
      .from('profiles')
      .select('company_id, role')
      .eq('id', assignerId)
      .single();

    if (assignerProfileError || !assignerProfile?.company_id) {
      throw new Error('Could not determine assigner company.');
    }
    const assignerCompanyId = assignerProfile.company_id;
    const assignerRole = assignerProfile.role;

    const payload: AssignTaskPayload = await req.json();

    if (!payload.studentId || !payload.taskTitle || payload.taskBasePoints == null) {
      throw new Error('Missing required fields: studentId, taskTitle, taskBasePoints.');
    }

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
      throw new Error('Permission denied: User cannot assign tasks to this student.');
    }

    // --- THIS IS THE FIX ---
    let finalAttachmentPath: string | null = payload.taskAttachmentPath || null;
    let uploadedFilePath: string | null = null;
    if (payload.file) {
      // Pass the assignerCompanyId to the helper
      uploadedFilePath = await uploadAttachment(
        supabaseAdminClient,
        payload.file,
        assignerCompanyId,
        assignerId
      );
      if (!uploadedFilePath) {
        throw new Error('File upload to storage failed');
      }
      finalAttachmentPath = uploadedFilePath;
    }

    const taskToInsert = {
      student_id: payload.studentId,
      assigned_by_id: assignerId,
      company_id: assignerCompanyId,
      task_title: payload.taskTitle.trim(),
      task_description: payload.taskDescription?.trim() || '',
      task_base_points: payload.taskBasePoints,
      task_link_url: payload.taskLinkUrl || null,
      task_attachment_path: finalAttachmentPath,
    };

    const { data: createdTask, error: insertError } = await supabaseAdminClient
      .from('assigned_tasks')
      .insert(taskToInsert)
      .select()
      .single();

    if (insertError) {
      if (uploadedFilePath) {
        await deleteAttachment(supabaseAdminClient, uploadedFilePath);
      }
      throw new Error(`Failed to assign task: ${insertError.message}`);
    }

    const responseTask = {
      id: createdTask.id,
      studentId: createdTask.student_id,
      assignedById: createdTask.assigned_by_id,
      assignedDate: createdTask.assigned_date,
      taskTitle: createdTask.task_title,
      taskDescription: createdTask.task_description,
      taskBasePoints: createdTask.task_base_points,
      isComplete: createdTask.is_complete,
      taskLinkUrl: createdTask.task_link_url ?? null,
      taskAttachmentPath: createdTask.task_attachment_path ?? null,
    };

    return new Response(JSON.stringify(responseTask), {
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
