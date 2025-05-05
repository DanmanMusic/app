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
  console.log('[updateUserWL] isAdmin Check: Checking profile for caller ID:', callerUserId);
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', callerUserId)
      .single();
    if (error) {
      console.error(`[updateUserWL] isAdmin Check failed for ${callerUserId}:`, error.message);
      return false; // Treat error as not admin
    }
    const role = data?.role;
    console.log(`[updateUserWL] isAdmin Check: Found role: ${role} for caller ${callerUserId}`);
    return role === 'admin';
  } catch (err) {
    console.error('[updateUserWL] isAdmin Check Exception:', err.message);
    return false;
  }
}

// Helper function to check if caller is a Teacher linked to the student
async function isTeacherLinked(
  supabaseClient: SupabaseClient,
  teacherId: string,
  studentId: string
): Promise<boolean> {
  // Avoid check if IDs are the same (teacher can't be linked to themselves as student)
  if (teacherId === studentId) return false;
  try {
    const { count, error } = await supabaseClient
      .from('student_teachers')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', teacherId)
      .eq('student_id', studentId);

    if (error) {
      console.error(
        `[updateUserWL] isTeacherLinked check failed for T:${teacherId} S:${studentId}:`,
        error.message
      );
      return false;
    }
    console.log(
      `[updateUserWL] isTeacherLinked check: T:${teacherId} S:${studentId} - Count: ${count}`
    );
    return (count ?? 0) > 0;
  } catch (err) {
    console.error(
      `[updateUserWL] isTeacherLinked check Exception for T:${teacherId} S:${studentId}:`,
      err.message
    );
    return false;
  }
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
    // Fetch current links
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
      return { errors }; // Exit early if fetch fails
    }

    const currentLinkIds = currentLinksData?.map(link => link[linkColumnName]) || [];
    console.log(`[syncLinkTable] Current ${linkColumnName} IDs:`, currentLinkIds);
    console.log(`[syncLinkTable] New ${linkColumnName} IDs:`, newLinkIds);

    // Determine IDs to delete and insert
    const idsToDelete = currentLinkIds.filter(id => !newLinkIds.includes(id));
    const idsToInsert = newLinkIds.filter(id => !currentLinkIds.includes(id));
    console.log(`[syncLinkTable] ${linkColumnName} IDs to delete:`, idsToDelete);
    console.log(`[syncLinkTable] ${linkColumnName} IDs to insert:`, idsToInsert);

    // Perform Deletions
    if (idsToDelete.length > 0) {
      console.log(`[syncLinkTable] Deleting ${idsToDelete.length} links from ${tableName}...`);
      const { error: deleteError } = await supabaseClient
        .from(tableName)
        .delete()
        .eq('student_id', studentId)
        .in(linkColumnName, idsToDelete);
      if (deleteError) {
        console.error(`[syncLinkTable] Error deleting from ${tableName}:`, deleteError.message);
        errors.push(`Failed to delete old ${linkColumnName} links.`);
        // Consider stopping? Or continue with inserts? Continuing for now.
      } else {
        console.log(`[syncLinkTable] Deleted ${idsToDelete.length} old links from ${tableName}.`);
      }
    }

    // Perform Insertions
    if (idsToInsert.length > 0) {
      console.log(`[syncLinkTable] Inserting ${idsToInsert.length} links into ${tableName}...`);
      const rowsToInsert = idsToInsert.map(linkId => ({
        student_id: studentId,
        [linkColumnName]: linkId,
      }));
      const { error: insertError } = await supabaseClient.from(tableName).insert(rowsToInsert);
      if (insertError) {
        console.error(`[syncLinkTable] Error inserting into ${tableName}:`, insertError.message);
        errors.push(`Failed to insert new ${linkColumnName} links (check if IDs exist).`);
      } else {
        console.log(`[syncLinkTable] Inserted ${idsToInsert.length} new links into ${tableName}.`);
      }
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (!['POST', 'PATCH', 'PUT'].includes(req.method)) {
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders },
    });
  }
  console.log(`Received ${req.method} request for updateUserWithLinks`);

  // 2. Initialize Supabase Admin Client
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
    // 3. Verify Caller Authentication
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

    // 4. Parse Request Body
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

    // 5. Validate Payload
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

    // --- 6. Refined Authorization Logic ---
    let canUpdateProfile = false;
    let canUpdateInstruments = false;
    let canUpdateTeachers = false;
    let callerRole: string | null = null;
    let targetRole: string | null = null;

    // Fetch caller's profile role
    const { data: callerProfileData, error: callerProfileError } = await supabaseAdminClient
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .single();
    if (callerProfileError || !callerProfileData) {
      console.error(`Failed to fetch caller profile ${callerId}:`, callerProfileError?.message);
      // If caller profile cannot be fetched, deny authorization
    } else {
      callerRole = callerProfileData.role;
    }

    // Fetch target user's profile role
    const { data: targetProfileData, error: targetProfileError } = await supabaseAdminClient
      .from('profiles')
      .select('role')
      .eq('id', userIdToUpdate)
      .single();
    if (targetProfileError || !targetProfileData) {
      // If target doesn't exist, return 404 earlier
      console.warn(`Target user ${userIdToUpdate} not found.`);
      return new Response(JSON.stringify({ error: 'Target user not found.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    targetRole = targetProfileData.role;

    console.log(
      `[updateUserWL] Caller: ${callerId} (Role: ${callerRole}), Target: ${userIdToUpdate} (Role: ${targetRole})`
    );

    // --- Determine Permissions ---
    if (callerRole) {
      // Proceed only if caller role was fetched
      // Can update basic profile info?
      if (callerId === userIdToUpdate) {
        canUpdateProfile = true; // User updates own profile
        console.log(`[updateUserWL] Auth: User updating own profile.`);
      } else if (callerRole === 'admin') {
        canUpdateProfile = true; // Admin updates other profile
        console.log(`[updateUserWL] Auth: Admin updating other user's profile.`);
      } else if (callerRole === 'teacher' && targetRole === 'student') {
        const teacherIsLinked = await isTeacherLinked(
          supabaseAdminClient,
          callerId,
          userIdToUpdate
        );
        if (teacherIsLinked) {
          canUpdateProfile = true; // Linked Teacher updates student profile
          console.log(`[updateUserWL] Auth: Linked Teacher updating student profile.`);
        }
      }
      // Add parent logic here if needed:
      // else if (callerRole === 'parent' && targetRole === 'student') { /* Check parent link */ }

      // Can update instrument links? (Target must be student)
      if (targetRole === 'student') {
        if (callerRole === 'admin') {
          canUpdateInstruments = true;
          console.log(`[updateUserWL] Auth: Admin updating student instruments.`);
        } else if (callerRole === 'teacher') {
          const teacherIsLinked = await isTeacherLinked(
            supabaseAdminClient,
            callerId,
            userIdToUpdate
          );
          if (teacherIsLinked) {
            canUpdateInstruments = true;
            console.log(`[updateUserWL] Auth: Linked Teacher updating student instruments.`);
          }
        }
      }

      // Can update teacher links? (Target must be student, caller must be admin)
      if (targetRole === 'student' && callerRole === 'admin') {
        canUpdateTeachers = true;
        console.log(`[updateUserWL] Auth: Admin updating student teachers.`);
      }
    } else {
      console.warn(
        `[updateUserWL] Could not determine caller role for ${callerId}. Authorization denied.`
      );
    }

    // --- 7. Process Updates Based on Permissions ---
    const profileUpdatesPayload: Record<string, any> = {};
    let hasProfilePayload = false;
    const allErrors: string[] = [];

    // Check and prepare profile updates
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

    // Perform profile update if authorized and changes exist
    if (hasProfilePayload && canUpdateProfile) {
      if (
        !profileUpdatesPayload.first_name &&
        !profileUpdatesPayload.last_name &&
        !profileUpdatesPayload.hasOwnProperty('nickname')
      ) {
        console.log(
          `[updateUserWL] No actual profile field changes detected for ${userIdToUpdate}. Skipping DB update.`
        );
        hasProfilePayload = false; // Prevent unnecessary DB call if only whitespace was trimmed
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

    // Sync instrument links if authorized and data provided
    if (targetRole === 'student' && updates.instrumentIds !== undefined) {
      if (canUpdateInstruments) {
        console.log(`Syncing instruments for student ${userIdToUpdate}`);
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
        console.warn(
          `Skipping instrument sync for ${userIdToUpdate} - Caller ${callerId} not authorized.`
        );
      }
    }

    // Sync teacher links if authorized (Admin only) and data provided
    if (targetRole === 'student' && updates.linkedTeacherIds !== undefined) {
      if (canUpdateTeachers) {
        console.log(`Syncing teachers for student ${userIdToUpdate}`);
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
        console.warn(
          `Skipping teacher sync for ${userIdToUpdate} - Caller ${callerId} not authorized.`
        );
      }
    }

    // --- 8. Final Response ---
    if (allErrors.length > 0) {
      const isOnlyAuthErrors = allErrors.every(e => e.toLowerCase().includes('not authorized'));
      const statusCode = isOnlyAuthErrors ? 403 : 500; // Use 403 if only auth errors, 500 otherwise
      return new Response(
        JSON.stringify({ error: `User update completed with errors: ${allErrors.join('; ')}` }),
        { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no errors occurred
    const successResponse = { message: `User ${userIdToUpdate} processed successfully.` };
    console.log(`User ${userIdToUpdate} update request processed.`);
    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // OK
    });
  } catch (error) {
    console.error('Unhandled Update User Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

console.log('updateUserWithLinks function initialized (v4 - refined auth checks).');
