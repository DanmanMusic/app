// supabase/functions/assign-task/index.ts

import { createClient } from 'supabase-js';

import { isTeacherLinked } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { uploadAttachment, deleteAttachment, FileUploadData } from '../_shared/storageHelpers.ts';

// NEW: Interfaces for the new data structures
interface UrlData {
  url: string;
  label: string;
}

interface AttachmentData {
  path: string;
  name: string;
}

interface AssignTaskPayload {
  studentId: string;
  // For ad-hoc tasks
  taskTitle?: string;
  taskDescription?: string;
  taskBasePoints?: number;
  urls?: UrlData[];
  files?: FileUploadData[];
  // For library tasks
  taskLibraryId?: string;
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

  let uploadedFilePaths: string[] = [];

  try {
    const {
      data: { user: callerUser },
    } = await supabaseAdminClient.auth.getUser(
      req.headers.get('Authorization')!.replace('Bearer ', '')
    );
    if (!callerUser) {
      throw new Error('Invalid or expired token.');
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

    if (!payload.studentId) {
      throw new Error('Missing required studentId.');
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

    const taskToInsert: any = {
      student_id: payload.studentId,
      assigned_by_id: assignerId,
      company_id: assignerCompanyId,
    };

    if (payload.taskLibraryId) {
      // --- Assigning from Library ---
      const { data: libraryTask, error: libError } = await supabaseAdminClient
        .rpc('get_single_task_library_item', { p_task_id: payload.taskLibraryId })
        .single();

      if (libError || !libraryTask) throw new Error('Task library item not found.');

      taskToInsert.task_library_id = payload.taskLibraryId;
      taskToInsert.task_title = libraryTask.title;
      taskToInsert.task_description = libraryTask.description;
      taskToInsert.task_base_points = libraryTask.base_tickets;
      taskToInsert.task_links = libraryTask.urls;
      taskToInsert.task_attachments = libraryTask.attachments;
    } else if (payload.taskTitle) {
      // --- Assigning an Ad-Hoc Task ---
      if (payload.taskBasePoints == null || payload.taskBasePoints < 0) {
        throw new Error('Ad-hoc tasks require a valid title and non-negative base points.');
      }

      // Upload new files for the ad-hoc task
      const newAttachments: AttachmentData[] = [];
      if (payload.files && payload.files.length > 0) {
        const uploadPromises = payload.files.map(file =>
          uploadAttachment(supabaseAdminClient, file, assignerCompanyId, assignerId)
        );
        const results = await Promise.all(uploadPromises);

        if (results.some(r => r === null)) throw new Error('One or more file uploads failed.');

        uploadedFilePaths = results as string[];

        payload.files.forEach((file, index) => {
          newAttachments.push({ path: uploadedFilePaths[index], name: file.fileName });
        });
      }

      taskToInsert.task_title = payload.taskTitle.trim();
      taskToInsert.task_description = payload.taskDescription?.trim() ?? '';
      taskToInsert.task_base_points = payload.taskBasePoints;
      taskToInsert.task_links = payload.urls || [];
      taskToInsert.task_attachments = newAttachments;
    } else {
      throw new Error('Payload must include either a taskLibraryId or ad-hoc task details.');
    }

    const { data: createdTask, error: insertError } = await supabaseAdminClient
      .from('assigned_tasks')
      .insert(taskToInsert)
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
    if (uploadedFilePaths.length > 0) {
      await deleteAttachment(supabaseAdminClient, uploadedFilePaths);
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
