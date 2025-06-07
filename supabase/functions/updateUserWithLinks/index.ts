// supabase/functions/updateUserWithLinks/index.ts

import { createClient, SupabaseClient } from 'supabase-js';

import { isActiveAdmin, isTeacherLinked } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface UserUpdatePayload {
  firstName?: string;
  lastName?: string;
  nickname?: string | null;
  instrumentIds?: string[];
  linkedTeacherIds?: string[];
}

interface UpdateUserRequestBody {
  userIdToUpdate: string;
  updates: UserUpdatePayload;
}

async function syncLinkTable(
  supabaseClient: SupabaseClient,
  tableName: 'student_instruments' | 'student_teachers',
  studentId: string,
  newLinkIds: string[],
  linkColumnName: 'instrument_id' | 'teacher_id'
): Promise<{ errors: string[] }> {
  // This helper function remains unchanged
  const errors: string[] = [];
  if (newLinkIds === undefined) return { errors };

  const { data: currentLinksData, error: fetchError } = await supabaseClient
    .from(tableName)
    .select(linkColumnName)
    .eq('student_id', studentId);
  if (fetchError) {
    errors.push(`Failed to fetch current ${linkColumnName} links.`);
    return { errors };
  }

  const currentLinkIds = currentLinksData?.map(link => link[linkColumnName]) || [];
  const idsToDelete = currentLinkIds.filter(id => !newLinkIds.includes(id));
  const idsToInsert = newLinkIds.filter(id => !currentLinkIds.includes(id));

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabaseClient
      .from(tableName)
      .delete()
      .eq('student_id', studentId)
      .in(linkColumnName, idsToDelete);
    if (deleteError) errors.push(`Failed to delete old ${linkColumnName} links.`);
  }
  if (idsToInsert.length > 0) {
    const rowsToInsert = idsToInsert.map(linkId => ({
      student_id: studentId,
      [linkColumnName]: linkId,
    }));
    const { error: insertError } = await supabaseClient.from(tableName).insert(rowsToInsert);
    if (insertError) errors.push(`Failed to insert new ${linkColumnName} links.`);
  }
  return { errors };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!['POST', 'PATCH', 'PUT'].includes(req.method))
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
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
    const callerId = callerUser.id;

    let requestBody: UpdateUserRequestBody;
    try {
      requestBody = await req.json();
    } catch (jsonError) {
      return new Response(JSON.stringify({ error: 'Invalid request body: Must be JSON.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (
      !requestBody.userIdToUpdate ||
      !requestBody.updates ||
      typeof requestBody.updates !== 'object'
    ) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userIdToUpdate, updates.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    const userIdToUpdate = requestBody.userIdToUpdate;
    const updates = requestBody.updates;

    // NEW: Fetch profiles for both caller and target to get roles and company IDs
    const { data: profiles, error: profilesError } = await supabaseAdminClient
      .from('profiles')
      .select('id, role, company_id')
      .in('id', [callerId, userIdToUpdate]);

    if (profilesError || !profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ error: 'Could not verify user profiles.' }), {
        status: 500,
        headers: { ...corsHeaders },
      });
    }

    const callerProfile = profiles.find(p => p.id === callerId);
    const targetProfile = profiles.find(p => p.id === userIdToUpdate);

    if (!callerProfile || !targetProfile) {
      return new Response(JSON.stringify({ error: 'Caller or target user not found.' }), {
        status: 404,
        headers: { ...corsHeaders },
      });
    }

    // NEW: The Core Multi-Tenancy Security Check
    if (callerProfile.company_id !== targetProfile.company_id) {
      console.error(
        `Company mismatch! Caller ${callerId} from ${callerProfile.company_id} attempted to update user ${userIdToUpdate} from ${targetProfile.company_id}.`
      );
      return new Response(
        JSON.stringify({ error: 'Permission denied: Cannot update a user in another company.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    const companyId = callerProfile.company_id; // Safe to use this as the scope for all operations.

    let canUpdateProfile = false;
    let canUpdateInstruments = false;
    let canUpdateTeachers = false;

    if (callerId === userIdToUpdate) canUpdateProfile = true;
    else if (callerProfile.role === 'admin') canUpdateProfile = true;
    else if (callerProfile.role === 'teacher' && targetProfile.role === 'student') {
      if (await isTeacherLinked(supabaseAdminClient, callerId, userIdToUpdate)) {
        canUpdateProfile = true;
      }
    }

    if (targetProfile.role === 'student') {
      if (callerProfile.role === 'admin') canUpdateInstruments = true;
      else if (callerProfile.role === 'teacher') {
        if (await isTeacherLinked(supabaseAdminClient, callerId, userIdToUpdate)) {
          canUpdateInstruments = true;
        }
      }
    }

    if (targetProfile.role === 'student' && callerProfile.role === 'admin') {
      if (await isActiveAdmin(supabaseAdminClient, callerId)) {
        canUpdateTeachers = true;
      }
    }

    const profileUpdatesPayload: Record<string, any> = {};
    const allErrors: string[] = [];

    if (updates.firstName !== undefined) {
      if (!canUpdateProfile) allErrors.push('Not authorized to update first name.');
      else profileUpdatesPayload.first_name = updates.firstName.trim();
    }
    if (updates.lastName !== undefined) {
      if (!canUpdateProfile) allErrors.push('Not authorized to update last name.');
      else profileUpdatesPayload.last_name = updates.lastName.trim();
    }
    if (updates.hasOwnProperty('nickname')) {
      if (!canUpdateProfile) allErrors.push('Not authorized to update nickname.');
      else
        profileUpdatesPayload.nickname =
          updates.nickname === null ? null : updates.nickname?.trim();
    }

    if (Object.keys(profileUpdatesPayload).length > 0) {
      if (profileUpdatesPayload.first_name === '' || profileUpdatesPayload.last_name === '') {
        allErrors.push('First Name and Last Name cannot be empty.');
      } else {
        const { error: profileUpdateError } = await supabaseAdminClient
          .from('profiles')
          .update(profileUpdatesPayload)
          .eq('id', userIdToUpdate);
        if (profileUpdateError) allErrors.push('Failed to update profile details.');
      }
    }

    // MODIFIED: Teacher and Instrument link updates now need to verify company consistency.
    if (targetProfile.role === 'student' && updates.linkedTeacherIds !== undefined) {
      if (canUpdateTeachers) {
        // NEW: Verify all teachers to be linked belong to the same company
        const { count, error } = await supabaseAdminClient
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .in('id', updates.linkedTeacherIds)
          .eq('company_id', companyId);
        if (error || count !== updates.linkedTeacherIds.length) {
          allErrors.push(
            'One or more teachers to be linked do not exist or are not in your company.'
          );
        } else {
          const { errors: teacherErrors } = await syncLinkTable(
            supabaseAdminClient,
            'student_teachers',
            userIdToUpdate,
            updates.linkedTeacherIds,
            'teacher_id'
          );
          allErrors.push(...teacherErrors);
        }
      } else {
        allErrors.push('Not authorized to update teacher links.');
      }
    }

    if (targetProfile.role === 'student' && updates.instrumentIds !== undefined) {
      if (canUpdateInstruments) {
        // NEW: Verify all instruments to be linked belong to the same company
        const { count, error } = await supabaseAdminClient
          .from('instruments')
          .select('*', { count: 'exact', head: true })
          .in('id', updates.instrumentIds)
          .eq('company_id', companyId);
        if (error || count !== updates.instrumentIds.length) {
          allErrors.push(
            'One or more instruments to be linked do not exist or are not in your company.'
          );
        } else {
          const { errors: instrumentErrors } = await syncLinkTable(
            supabaseAdminClient,
            'student_instruments',
            userIdToUpdate,
            updates.instrumentIds,
            'instrument_id'
          );
          allErrors.push(...instrumentErrors);
        }
      } else {
        allErrors.push('Not authorized to update instrument links.');
      }
    }

    if (allErrors.length > 0) {
      const isOnlyAuthErrors = allErrors.every(e => e.toLowerCase().includes('not authorized'));
      const statusCode = isOnlyAuthErrors ? 403 : 500;
      return new Response(
        JSON.stringify({ error: `User update completed with errors: ${allErrors.join('; ')}` }),
        { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ message: `User ${userIdToUpdate} processed successfully.` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Unhandled Update User Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

console.log('updateUserWithLinks function initialized (v6 - multi-tenant aware).');
