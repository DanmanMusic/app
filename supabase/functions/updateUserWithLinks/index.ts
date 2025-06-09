// supabase/functions/updateUserWithLinks/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { isActiveAdmin, isTeacherLinked } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface UserUpdatePayload {
  firstName?: string;
  lastName?: string;
  nickname?: string | null;
  avatarPath?: string | null;
  instrumentIds?: string[];
  linkedTeacherIds?: string[];
}
interface UpdateUserRequestBody {
  userIdToUpdate: string;
  updates: UserUpdatePayload;
}

// MODIFIED: Helper now returns a simple string array
async function syncLinkTable(
  supabase: SupabaseClient,
  tableName: string,
  studentId: string,
  newLinkIds: string[],
  linkColumnName: string
): Promise<string[]> {
  const errors: string[] = [];
  const { data: currentLinksData, error: fetchError } = await supabase
    .from(tableName)
    .select(linkColumnName)
    .eq('student_id', studentId);
  if (fetchError) {
    errors.push(`Failed to fetch current links for ${tableName}.`);
    return errors;
  }

  const currentLinkIds = currentLinksData?.map(link => link[linkColumnName]) || [];
  const idsToDelete = currentLinkIds.filter(id => !newLinkIds.includes(id));
  const idsToInsert = newLinkIds.filter(id => !currentLinkIds.includes(id));

  if (idsToDelete.length > 0) {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('student_id', studentId)
      .in(linkColumnName, idsToDelete);
    if (error) errors.push(`Failed to delete old ${tableName} links: ${error.message}`);
  }
  if (idsToInsert.length > 0) {
    const rowsToInsert = idsToInsert.map(linkId => ({
      student_id: studentId,
      [linkColumnName]: linkId,
    }));
    const { error } = await supabase.from(tableName).insert(rowsToInsert);
    if (error) errors.push(`Failed to insert new ${tableName} links: ${error.message}`);
  }
  return errors;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!['POST', 'PATCH', 'PUT'].includes(req.method))
    return new Response(JSON.stringify({ error: `Method Not Allowed` }), {
      status: 405,
      headers: corsHeaders,
    });

  try {
    const supabaseAdminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const authHeader = req.headers.get('Authorization');
    if (!authHeader)
      return new Response(JSON.stringify({ error: 'Authentication required.' }), {
        status: 401,
        headers: corsHeaders,
      });
    const {
      data: { user: callerUser },
      error: userError,
    } = await supabaseAdminClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !callerUser)
      return new Response(JSON.stringify({ error: 'Invalid token.' }), {
        status: 401,
        headers: corsHeaders,
      });

    const { userIdToUpdate, updates }: UpdateUserRequestBody = await req.json();
    if (!userIdToUpdate || !updates)
      return new Response(JSON.stringify({ error: 'Missing userIdToUpdate or updates object.' }), {
        status: 400,
        headers: corsHeaders,
      });

    const { data: profiles, error: profilesError } = await supabaseAdminClient
      .from('profiles')
      .select('id, role, company_id')
      .in('id', [callerUser.id, userIdToUpdate]);
    if (profilesError || !profiles)
      return new Response(JSON.stringify({ error: 'Could not verify user profiles.' }), {
        status: 500,
        headers: corsHeaders,
      });

    const callerProfile = profiles.find(p => p.id === callerUser.id);
    const targetProfile = profiles.find(p => p.id === userIdToUpdate);
    if (!callerProfile || !targetProfile)
      return new Response(JSON.stringify({ error: 'Caller or target user not found.' }), {
        status: 404,
        headers: corsHeaders,
      });
    if (callerProfile.company_id !== targetProfile.company_id)
      return new Response(
        JSON.stringify({ error: 'Permission denied: Cannot update a user in another company.' }),
        { status: 403, headers: corsHeaders }
      );

    const allErrors: string[] = [];
    const isSelf = callerUser.id === userIdToUpdate;
    const isAdmin = callerProfile.role === 'admin';
    const isLinkedTeacher =
      callerProfile.role === 'teacher' && targetProfile.role === 'student'
        ? await isTeacherLinked(supabaseAdminClient, callerUser.id, userIdToUpdate)
        : false;

    if (isSelf || isAdmin || isLinkedTeacher) {
      const profileUpdatesPayload: Record<string, any> = {};
      if (updates.firstName !== undefined)
        profileUpdatesPayload.first_name = updates.firstName.trim();
      if (updates.lastName !== undefined) profileUpdatesPayload.last_name = updates.lastName.trim();
      if (updates.hasOwnProperty('nickname')) profileUpdatesPayload.nickname = updates.nickname;
      if (updates.hasOwnProperty('avatarPath'))
        profileUpdatesPayload.avatar_path = updates.avatarPath;

      if (Object.keys(profileUpdatesPayload).length > 0) {
        if (profileUpdatesPayload.first_name === '' || profileUpdatesPayload.last_name === '') {
          allErrors.push('First Name and Last Name cannot be empty.');
        } else {
          const { error } = await supabaseAdminClient
            .from('profiles')
            .update(profileUpdatesPayload)
            .eq('id', userIdToUpdate);
          if (error) allErrors.push(`Failed to update profile: ${error.message}`);
        }
      }
    }

    if (targetProfile.role === 'student') {
      if (updates.instrumentIds !== undefined) {
        if (isAdmin || isLinkedTeacher) {
          // MODIFIED: Correctly handle the returned array
          const instrumentErrors = await syncLinkTable(
            supabaseAdminClient,
            'student_instruments',
            userIdToUpdate,
            updates.instrumentIds,
            'instrument_id'
          );
          allErrors.push(...instrumentErrors);
        } else {
          allErrors.push('Not authorized to update instrument links.');
        }
      }
      if (updates.linkedTeacherIds !== undefined) {
        if (isAdmin) {
          // MODIFIED: Correctly handle the returned array
          const teacherErrors = await syncLinkTable(
            supabaseAdminClient,
            'student_teachers',
            userIdToUpdate,
            updates.linkedTeacherIds,
            'teacher_id'
          );
          allErrors.push(...teacherErrors);
        } else {
          allErrors.push('Not authorized to update teacher links.');
        }
      }
    }

    if (allErrors.length > 0) {
      return new Response(
        JSON.stringify({ error: `User update failed: ${allErrors.join('; ')}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ message: `User ${userIdToUpdate} processed successfully.` }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
