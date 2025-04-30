// supabase/functions/updateUserWithLinks/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// Define expected User fields for update (Partial)
interface UserUpdatePayload {
  firstName?: string;
  lastName?: string;
  nickname?: string | null; // Allow null to clear nickname
  instrumentIds?: string[]; // Optional: Array of UUIDs or empty array to clear
  linkedTeacherIds?: string[]; // Optional: Array of UUIDs or empty array to clear
}

// Define expected Request Body structure
interface UpdateUserRequestBody {
  userIdToUpdate: string;
  updates: UserUpdatePayload;
}

// Helper function to check if the caller is an Admin
async function isAdmin(supabaseClient: SupabaseClient, callerUserId: string): Promise<boolean> {
  console.log('[updateUser] isAdmin Check: Checking profile for caller ID:', callerUserId);
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', callerUserId)
      .single();
    if (error) throw error;
    const role = data?.role;
    console.log(`[updateUser] isAdmin Check: Found role: ${role} for caller ${callerUserId}`);
    return role === 'admin';
  } catch (err) {
    console.error('[updateUser] isAdmin Check Exception:', err.message);
    return false;
  }
}

// Helper function to check if caller is a Teacher linked to the student
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

// Helper function to sync link table entries
async function syncLinkTable(
  supabaseClient: SupabaseClient,
  tableName: 'student_instruments' | 'student_teachers',
  studentId: string,
  newLinkIds: string[],
  linkColumnName: 'instrument_id' | 'teacher_id'
): Promise<{ errors: string[] }> {
  const errors: string[] = [];
  console.log(`[syncLinkTable] Syncing ${tableName} for student ${studentId}`);
  try {
    const { data: currentLinksData, error: fetchError } = await supabaseClient
      .from(tableName)
      .select(linkColumnName)
      .eq('student_id', studentId);
    if (fetchError) {
      console.error(`[syncLinkTable] Error fetching current ${tableName}:`, fetchError.message);
      errors.push(`Failed to fetch current ${linkColumnName} links.`);
      return { errors };
    }
    const currentLinkIds = currentLinksData?.map(link => link[linkColumnName]) || [];
    console.log(`[syncLinkTable] Current ${linkColumnName} IDs:`, currentLinkIds);
    console.log(`[syncLinkTable] New ${linkColumnName} IDs:`, newLinkIds);
    const idsToDelete = currentLinkIds.filter(id => !newLinkIds.includes(id));
    const idsToInsert = newLinkIds.filter(id => !currentLinkIds.includes(id));
    console.log(`[syncLinkTable] ${linkColumnName} IDs to delete:`, idsToDelete);
    console.log(`[syncLinkTable] ${linkColumnName} IDs to insert:`, idsToInsert);
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabaseClient
        .from(tableName)
        .delete()
        .eq('student_id', studentId)
        .in(linkColumnName, idsToDelete);
      if (deleteError) {
        console.error(`[syncLinkTable] Error deleting from ${tableName}:`, deleteError.message);
        errors.push(`Failed to delete old ${linkColumnName} links.`);
      } else {
        console.log(
          `[syncLinkTable] Successfully deleted ${idsToDelete.length} old links from ${tableName}.`
        );
      }
    }
    if (idsToInsert.length > 0) {
      const rowsToInsert = idsToInsert.map(linkId => ({
        student_id: studentId,
        [linkColumnName]: linkId,
      }));
      const { error: insertError } = await supabaseClient.from(tableName).insert(rowsToInsert);
      if (insertError) {
        console.error(`[syncLinkTable] Error inserting into ${tableName}:`, insertError.message);
        errors.push(`Failed to insert new ${linkColumnName} links (check if IDs exist).`);
      } else {
        console.log(
          `[syncLinkTable] Successfully inserted ${idsToInsert.length} new links into ${tableName}.`
        );
      }
    }
  } catch (syncError) {
    console.error(`[syncLinkTable] Unexpected error during sync for ${tableName}:`, syncError);
    errors.push(`Unexpected error syncing ${linkColumnName} links.`);
  }
  return { errors };
}

// Main Function Handler
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST' && req.method !== 'PATCH' && req.method !== 'PUT') {
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: corsHeaders,
    });
  }
  console.log(`Received ${req.method} request for updateUserWithLinks`);

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
    const callerId = callerUser.id;
    console.log('Caller User ID:', callerId);

    let requestBody: UpdateUserRequestBody;
    try {
      requestBody = await req.json();
    } catch (jsonError) {
      return new Response(JSON.stringify({ error: 'Invalid request body: Must be JSON.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Received payload:', requestBody);

    if (
      !requestBody.userIdToUpdate ||
      !requestBody.updates ||
      typeof requestBody.updates !== 'object'
    ) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userIdToUpdate, updates.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const userIdToUpdate = requestBody.userIdToUpdate;
    const updates = requestBody.updates;

    let isAuthorized = false;
    let callerRole: string | null = null;

    const { data: callerProfile, error: callerProfileError } = await supabaseAdminClient
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .single();
    if (callerProfileError || !callerProfile) {
      return new Response(JSON.stringify({ error: 'Could not verify caller identity.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    callerRole = callerProfile.role;
    console.log(`Caller role: ${callerRole}`);

    const { data: targetProfile, error: targetProfileError } = await supabaseAdminClient
      .from('profiles')
      .select('role')
      .eq('id', userIdToUpdate)
      .single();
    if (targetProfileError || !targetProfile) {
      return new Response(
        JSON.stringify({ error: 'Target user not found or profile inaccessible.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const targetRole = targetProfile.role;
    console.log(`Target user role: ${targetRole}`);

    if (callerRole === 'admin') {
      isAuthorized = true;
      console.log(`Authorization granted: Caller ${callerId} is Admin.`);
    } else if (callerRole === 'teacher' && targetRole === 'student') {
      const teacherIsLinked = await isTeacherLinked(supabaseAdminClient, callerId, userIdToUpdate);
      if (teacherIsLinked) {
        isAuthorized = true;
        console.log(
          `Authorization granted: Teacher ${callerId} is linked to Student ${userIdToUpdate}.`
        );
      } else {
        console.warn(
          `Authorization failed: Teacher ${callerId} is not linked to Student ${userIdToUpdate}.`
        );
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: You are not authorized to update this user.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isTargetStudent = targetRole === 'student';
    const profileUpdates: Record<string, any> = {};
    let hasProfileUpdates = false;

    if (updates.firstName !== undefined && typeof updates.firstName === 'string') {
      profileUpdates.first_name = updates.firstName.trim();
      hasProfileUpdates = true;
    }
    if (updates.lastName !== undefined && typeof updates.lastName === 'string') {
      profileUpdates.last_name = updates.lastName.trim();
      hasProfileUpdates = true;
    }
    if (updates.hasOwnProperty('nickname')) {
      profileUpdates.nickname = updates.nickname === null ? null : updates.nickname?.trim();
      hasProfileUpdates = true;
    }

    const allErrors: string[] = [];

    if (hasProfileUpdates) {
      console.log(`Updating profile for ${userIdToUpdate}:`, profileUpdates);
      const { error: profileUpdateError } = await supabaseAdminClient
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userIdToUpdate);
      if (profileUpdateError) {
        allErrors.push('Failed to update profile details.');
        console.error(`Error updating profile for ${userIdToUpdate}:`, profileUpdateError.message);
      } else {
        console.log(`Profile updated successfully for ${userIdToUpdate}.`);
      }
    } else {
      console.log(`No basic profile updates for ${userIdToUpdate}.`);
    }

    if (
      isTargetStudent &&
      updates.instrumentIds !== undefined &&
      (callerRole === 'admin' || callerRole === 'teacher')
    ) {
      console.log(`Syncing instruments for student ${userIdToUpdate} (caller: ${callerRole})`);
      const { errors: instrumentErrors } = await syncLinkTable(
        supabaseAdminClient,
        'student_instruments',
        userIdToUpdate,
        updates.instrumentIds || [],
        'instrument_id'
      );
      allErrors.push(...instrumentErrors);
    } else if (updates.instrumentIds !== undefined) {
      console.warn(
        `Skipping instrument sync: Target is not student OR caller (${callerRole}) not authorized.`
      );
    }

    if (isTargetStudent && updates.linkedTeacherIds !== undefined) {
      if (callerRole === 'admin') {
        console.log(`Syncing teachers for student ${userIdToUpdate} (caller: Admin)`);
        const { errors: teacherErrors } = await syncLinkTable(
          supabaseAdminClient,
          'student_teachers',
          userIdToUpdate,
          updates.linkedTeacherIds || [],
          'teacher_id'
        );
        allErrors.push(...teacherErrors);
      } else {
        console.warn(
          `Teacher link update skipped: Caller (${callerId}, role: ${callerRole}) is not an Admin.`
        );
      }
    }

    if (allErrors.length > 0) {
      return new Response(
        JSON.stringify({ error: `User update completed with errors: ${allErrors.join('; ')}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const successResponse = { message: `User ${userIdToUpdate} updated successfully.` };
    console.log(`User ${userIdToUpdate} update process completed successfully.`);
    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Unhandled Update User Function Error:', error);
    const statusCode = error.message.includes('required')
      ? 403
      : error.message.includes('Authentication') || error.message.includes('token')
        ? 401
        : 500;
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: statusCode }
    );
  }
});

console.log('updateUserWithLinks function initialized (v3 - Teacher cannot update Teacher links).');
