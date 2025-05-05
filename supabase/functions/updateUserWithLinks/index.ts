// supabase/functions/updateUserWithLinks/index.ts

import { createClient, SupabaseClient } from 'supabase-js';

import { isActiveAdmin, isTeacherLinked } from '../_shared/authHelpers.ts'; // Use shared helpers
import { corsHeaders } from '../_shared/cors.ts';
// Import shared helpers

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

// Helper function to sync link table entries (Keep local as it handles multiple link types)
async function syncLinkTable(
  supabaseClient: SupabaseClient,
  tableName: 'student_instruments' | 'student_teachers',
  studentId: string,
  newLinkIds: string[],
  linkColumnName: 'instrument_id' | 'teacher_id'
): Promise<{ errors: string[] }> {
  const errors: string[] = [];
  console.log(`[syncLinkTable in updateUserWL] Syncing ${tableName} for student ${studentId}`);
  try {
    const { data: currentLinksData, error: fetchError } = await supabaseClient
      .from(tableName)
      .select(linkColumnName)
      .eq('student_id', studentId);

    if (fetchError) {
      console.error(
        `[syncLinkTable] Error fetching current ${tableName} for ${studentId}:`,
        fetchError.message
      );
      errors.push(`Failed to fetch current ${linkColumnName} links.`);
      return { errors };
    }

    const currentLinkIds = currentLinksData?.map(link => link[linkColumnName]) || [];
    const idsToDelete = currentLinkIds.filter(id => !newLinkIds.includes(id));
    const idsToInsert = newLinkIds.filter(id => !currentLinkIds.includes(id));

    if (idsToDelete.length > 0) {
      console.log(`[syncLinkTable] Deleting ${idsToDelete.length} links from ${tableName}...`);
      const { error: deleteError } = await supabaseClient
        .from(tableName)
        .delete()
        .eq('student_id', studentId)
        .in(linkColumnName, idsToDelete);
      if (deleteError) errors.push(`Failed to delete old ${linkColumnName} links.`);
      else
        console.log(`[syncLinkTable] Deleted ${idsToDelete.length} old links from ${tableName}.`);
    }

    if (idsToInsert.length > 0) {
      console.log(`[syncLinkTable] Inserting ${idsToInsert.length} links into ${tableName}...`);
      const rowsToInsert = idsToInsert.map(linkId => ({
        student_id: studentId,
        [linkColumnName]: linkId,
      }));
      const { error: insertError } = await supabaseClient.from(tableName).insert(rowsToInsert);
      if (insertError)
        errors.push(`Failed to insert new ${linkColumnName} links (check if IDs exist).`);
      else
        console.log(`[syncLinkTable] Inserted ${idsToInsert.length} new links into ${tableName}.`);
    }
  } catch (syncError) {
    console.error(`[syncLinkTable] Unexpected error during sync for ${tableName}:`, syncError);
    errors.push(`Unexpected error syncing ${linkColumnName} links.`);
  }
  console.log(`[syncLinkTable] Sync completed for ${tableName}. Errors: ${errors.length}`);
  return { errors };
}

// Main Function Handler
Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS request & Method Check
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!['POST', 'PATCH', 'PUT'].includes(req.method))
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  console.log(`Received ${req.method} request for updateUserWithLinks`);

  // 2. Initialize Supabase Admin Client - *** RESTORED ERROR HANDLING ***
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase environment variables.');
    return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  // *** END RESTORED ERROR HANDLING ***
  const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: fetch },
  });

  try {
    // 3. Verify Caller Authentication - *** RESTORED ERROR HANDLING ***
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Missing or invalid Authorization header.');
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
      console.error('Auth token validation error:', userError?.message || 'User not found');
      return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // *** END RESTORED ERROR HANDLING ***
    const callerId = callerUser.id;
    console.log('Caller User ID:', callerId);

    // 4. Parse Request Body - *** RESTORED ERROR HANDLING ***
    let requestBody: UpdateUserRequestBody;
    try {
      requestBody = await req.json();
    } catch (jsonError) {
      console.error('Failed to parse request body:', jsonError);
      return new Response(JSON.stringify({ error: 'Invalid request body: Must be JSON.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // *** END RESTORED ERROR HANDLING ***
    console.log('Received payload:', requestBody);

    // 5. Validate Payload - *** RESTORED ERROR HANDLING ***
    if (
      !requestBody.userIdToUpdate ||
      !requestBody.updates ||
      typeof requestBody.updates !== 'object'
    ) {
      console.warn('Payload validation failed: Missing userIdToUpdate or updates object.');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userIdToUpdate, updates.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // *** END RESTORED ERROR HANDLING ***
    const userIdToUpdate = requestBody.userIdToUpdate;
    const updates = requestBody.updates;

    // --- 6. Refined Authorization Logic - Using imported helpers ---
    let canUpdateProfile = false;
    let canUpdateInstruments = false;
    let canUpdateTeachers = false;
    let callerRole: string | null = null;
    let targetRole: string | null = null;

    // Fetch caller's profile role - *** RESTORED ERROR HANDLING ***
    const { data: callerProfileData, error: callerProfileError } = await supabaseAdminClient
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .single();
    if (callerProfileError || !callerProfileData) {
      console.error(`Failed to fetch caller profile ${callerId}:`, callerProfileError?.message);
      // Deny authorization if caller profile cannot be fetched
      return new Response(JSON.stringify({ error: 'Could not verify caller permissions.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      callerRole = callerProfileData.role;
    }
    // *** END RESTORED ERROR HANDLING ***

    // Fetch target user's profile role - *** RESTORED ERROR HANDLING ***
    const { data: targetProfileData, error: targetProfileError } = await supabaseAdminClient
      .from('profiles')
      .select('role')
      .eq('id', userIdToUpdate)
      .single();
    if (targetProfileError || !targetProfileData) {
      const status = targetProfileError?.code === 'PGRST116' ? 404 : 500;
      const message =
        targetProfileError?.code === 'PGRST116'
          ? 'Target user not found.'
          : 'Failed to fetch target user profile.';
      console.warn(`Target user ${userIdToUpdate} not found or fetch error.`);
      return new Response(JSON.stringify({ error: message }), {
        status: status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      targetRole = targetProfileData.role;
    }
    // *** END RESTORED ERROR HANDLING ***

    console.log(
      `[updateUserWL] Caller: ${callerId} (Role: ${callerRole}), Target: ${userIdToUpdate} (Role: ${targetRole})`
    );

    // --- Determine Permissions (Logic remains the same) ---
    if (callerRole) {
      if (callerId === userIdToUpdate) {
        canUpdateProfile = true;
      } else if (callerRole === 'admin') {
        canUpdateProfile = true;
      } else if (callerRole === 'teacher' && targetRole === 'student') {
        const teacherIsLinkedCheck = await isTeacherLinked(
          supabaseAdminClient,
          callerId,
          userIdToUpdate
        );
        if (teacherIsLinkedCheck) {
          canUpdateProfile = true;
        }
      }

      if (targetRole === 'student') {
        if (callerRole === 'admin') {
          canUpdateInstruments = true;
        } else if (callerRole === 'teacher') {
          const teacherIsLinkedCheck = await isTeacherLinked(
            supabaseAdminClient,
            callerId,
            userIdToUpdate
          );
          if (teacherIsLinkedCheck) {
            canUpdateInstruments = true;
          }
        }
      }

      if (targetRole === 'student' && callerRole === 'admin') {
        const callerIsActiveAdminCheck = await isActiveAdmin(supabaseAdminClient, callerId);
        if (callerIsActiveAdminCheck) {
          canUpdateTeachers = true;
        } else {
          console.warn(
            `[updateUserWL] Caller ${callerId} has 'admin' role but is not active. Denying teacher link update.`
          );
        }
      }
    } else {
      console.warn(
        `[updateUserWL] Could not determine caller role for ${callerId}. Authorization denied.`
      );
      // This case should be caught by the earlier check, but added for safety
      return new Response(JSON.stringify({ error: 'Could not verify caller role.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- 7. Process Updates Based on Permissions (Logic remains the same) ---
    const profileUpdatesPayload: Record<string, any> = {};
    let hasProfilePayload = false;
    const allErrors: string[] = [];

    if (updates.firstName !== undefined) {
      if (!canUpdateProfile) allErrors.push('Not authorized to update first name.');
      else {
        profileUpdatesPayload.first_name = updates.firstName.trim();
        hasProfilePayload = true;
      }
    }
    if (updates.lastName !== undefined) {
      if (!canUpdateProfile) allErrors.push('Not authorized to update last name.');
      else {
        profileUpdatesPayload.last_name = updates.lastName.trim();
        hasProfilePayload = true;
      }
    }
    if (updates.hasOwnProperty('nickname')) {
      if (!canUpdateProfile) allErrors.push('Not authorized to update nickname.');
      else {
        profileUpdatesPayload.nickname =
          updates.nickname === null ? null : updates.nickname?.trim();
        hasProfilePayload = true;
      }
    }

    if (hasProfilePayload && canUpdateProfile) {
      if (profileUpdatesPayload.first_name === '' || profileUpdatesPayload.last_name === '') {
        allErrors.push('First Name and Last Name cannot be empty.');
        hasProfilePayload = false;
      } else {
        console.log(`Updating profile for ${userIdToUpdate}:`, profileUpdatesPayload);
        const { error: profileUpdateError } = await supabaseAdminClient
          .from('profiles')
          .update(profileUpdatesPayload)
          .eq('id', userIdToUpdate);
        if (profileUpdateError) {
          allErrors.push('Failed to update profile details.');
          console.error(
            `Error updating profile for ${userIdToUpdate}:`,
            profileUpdateError.message
          );
        } else {
          console.log(`Profile updated successfully for ${userIdToUpdate}.`);
        }
      }
    } else if (hasProfilePayload && !canUpdateProfile) {
      console.warn(`Skipping profile update for ${userIdToUpdate} due to lack of authorization.`);
    }

    if (targetRole === 'student' && updates.instrumentIds !== undefined) {
      if (canUpdateInstruments) {
        const { errors: instrumentErrors } = await syncLinkTable(
          supabaseAdminClient,
          'student_instruments',
          userIdToUpdate,
          updates.instrumentIds || [],
          'instrument_id'
        );
        allErrors.push(...instrumentErrors);
      } else {
        allErrors.push('Not authorized to update instrument links.');
      }
    }

    if (targetRole === 'student' && updates.linkedTeacherIds !== undefined) {
      if (canUpdateTeachers) {
        const { errors: teacherErrors } = await syncLinkTable(
          supabaseAdminClient,
          'student_teachers',
          userIdToUpdate,
          updates.linkedTeacherIds || [],
          'teacher_id'
        );
        allErrors.push(...teacherErrors);
      } else {
        allErrors.push('Not authorized to update teacher links.');
      }
    }

    // --- 8. Final Response (Logic remains the same) ---
    if (allErrors.length > 0) {
      const isOnlyAuthErrors = allErrors.every(e => e.toLowerCase().includes('not authorized'));
      const statusCode = isOnlyAuthErrors ? 403 : 500;
      return new Response(
        JSON.stringify({ error: `User update completed with errors: ${allErrors.join('; ')}` }),
        { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const successResponse = { message: `User ${userIdToUpdate} processed successfully.` };
    console.log(`User ${userIdToUpdate} update request processed.`);
    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Unhandled Update User Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

console.log('updateUserWithLinks function initialized (v5 - uses shared helpers).');
