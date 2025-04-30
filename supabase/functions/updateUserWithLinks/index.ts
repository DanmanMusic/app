// supabase/functions/updateUserWithLinks/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// Define expected User fields for update (Partial)
// Mirroring relevant parts of front-end User type
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
    // 1. Get current links from DB
    const { data: currentLinksData, error: fetchError } = await supabaseClient
      .from(tableName)
      .select(linkColumnName)
      .eq('student_id', studentId);

    if (fetchError) {
      console.error(`[syncLinkTable] Error fetching current ${tableName}:`, fetchError.message);
      errors.push(`Failed to fetch current ${linkColumnName} links.`);
      return { errors }; // Abort if fetching fails
    }

    const currentLinkIds = currentLinksData?.map(link => link[linkColumnName]) || [];
    console.log(`[syncLinkTable] Current ${linkColumnName} IDs:`, currentLinkIds);
    console.log(`[syncLinkTable] New ${linkColumnName} IDs:`, newLinkIds);

    // 2. Calculate links to delete and insert
    const idsToDelete = currentLinkIds.filter(id => !newLinkIds.includes(id));
    const idsToInsert = newLinkIds.filter(id => !currentLinkIds.includes(id));

    console.log(`[syncLinkTable] ${linkColumnName} IDs to delete:`, idsToDelete);
    console.log(`[syncLinkTable] ${linkColumnName} IDs to insert:`, idsToInsert);

    // 3. Perform Deletions (if any)
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabaseClient
        .from(tableName)
        .delete()
        .eq('student_id', studentId)
        .in(linkColumnName, idsToDelete);

      if (deleteError) {
        console.error(`[syncLinkTable] Error deleting from ${tableName}:`, deleteError.message);
        errors.push(`Failed to delete old ${linkColumnName} links.`);
        // Decide whether to continue or abort on delete error
      } else {
        console.log(
          `[syncLinkTable] Successfully deleted ${idsToDelete.length} old links from ${tableName}.`
        );
      }
    }

    // 4. Perform Inserts (if any)
    if (idsToInsert.length > 0) {
      const rowsToInsert = idsToInsert.map(linkId => ({
        student_id: studentId,
        [linkColumnName]: linkId,
      }));

      const { error: insertError } = await supabaseClient.from(tableName).insert(rowsToInsert);

      if (insertError) {
        console.error(`[syncLinkTable] Error inserting into ${tableName}:`, insertError.message);
        // Handle potential constraint violations etc.
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
  // 1. Handle Preflight CORS request
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

  // Initialize Supabase Admin Client
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
    // 2. Verify Caller is Authenticated and Admin
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
    console.log('Caller User ID:', callerUser.id);
    const callerIsAdmin = await isAdmin(supabaseAdminClient, callerUser.id);
    if (!callerIsAdmin) {
      return new Response(JSON.stringify({ error: 'Permission denied: Admin role required.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`Admin action authorized for user ${callerUser.id}.`);

    // 3. Parse Request Body
    let requestBody: UpdateUserRequestBody;
    try {
      requestBody = await req.json();
      console.log('Received payload:', requestBody);
    } catch (jsonError) {
      return new Response(JSON.stringify({ error: 'Invalid request body: Must be JSON.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Validate Payload
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

    // Fetch the user's current role to ensure we only modify links for students
    const { data: targetUserProfile, error: roleFetchError } = await supabaseAdminClient
      .from('profiles')
      .select('role')
      .eq('id', userIdToUpdate)
      .single();

    if (roleFetchError || !targetUserProfile) {
      console.error(
        `Failed to fetch profile role for user ${userIdToUpdate}:`,
        roleFetchError?.message
      );
      return new Response(
        JSON.stringify({ error: 'Target user not found or profile inaccessible.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const isTargetStudent = targetUserProfile.role === 'student';
    console.log(
      `Target user ${userIdToUpdate} role is ${targetUserProfile.role}. Is student: ${isTargetStudent}`
    );

    // --- Database Operations ---
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
    } // Allow null/empty to clear

    const allErrors: string[] = [];

    // 5. Update Profile Table (if necessary)
    if (hasProfileUpdates) {
      console.log(`Updating profile for ${userIdToUpdate}:`, profileUpdates);
      const { error: profileUpdateError } = await supabaseAdminClient
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userIdToUpdate);

      if (profileUpdateError) {
        console.error(`Error updating profile for ${userIdToUpdate}:`, profileUpdateError.message);
        allErrors.push('Failed to update profile details.');
        // If profile update fails, maybe abort? For now, collect error and continue.
      } else {
        console.log(`Profile updated successfully for ${userIdToUpdate}.`);
      }
    } else {
      console.log(`No basic profile updates for ${userIdToUpdate}.`);
    }

    // 6. Update Link Tables (Only if target is a student and links are provided)
    if (isTargetStudent && updates.instrumentIds !== undefined) {
      const { errors: instrumentErrors } = await syncLinkTable(
        supabaseAdminClient,
        'student_instruments',
        userIdToUpdate,
        updates.instrumentIds || [], // Pass empty array if null/undefined to clear links
        'instrument_id'
      );
      allErrors.push(...instrumentErrors);
    } else if (updates.instrumentIds !== undefined && !isTargetStudent) {
      console.warn(
        `Attempted to update instrumentIds for non-student user ${userIdToUpdate}. Skipping.`
      );
    }

    if (isTargetStudent && updates.linkedTeacherIds !== undefined) {
      const { errors: teacherErrors } = await syncLinkTable(
        supabaseAdminClient,
        'student_teachers',
        userIdToUpdate,
        updates.linkedTeacherIds || [], // Pass empty array if null/undefined to clear links
        'teacher_id'
      );
      allErrors.push(...teacherErrors);
    } else if (updates.linkedTeacherIds !== undefined && !isTargetStudent) {
      console.warn(
        `Attempted to update linkedTeacherIds for non-student user ${userIdToUpdate}. Skipping.`
      );
    }

    // 7. Check for Errors and Respond
    if (allErrors.length > 0) {
      // Return a 500 error if any part of the update failed
      return new Response(
        JSON.stringify({ error: `User update completed with errors: ${allErrors.join('; ')}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Return Success (maybe return the basic updated fields?)
    const successResponse = {
      message: `User ${userIdToUpdate} updated successfully.`,
      // Optionally include the updated fields if needed by client, but profile refetch is safer
      // updatedFields: profileUpdates // Be careful not to expose sensitive data
    };

    console.log(`User ${userIdToUpdate} update process completed successfully.`);
    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // OK
    });
  } catch (error) {
    // Catch errors from initial setup/auth/validation etc.
    console.error('Unhandled Update User Function Error:', error);
    const statusCode = error.message.includes('required')
      ? 403
      : error.message.includes('Authentication') || error.message.includes('token')
        ? 401
        : 500;
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );
  }
});

console.log('updateUserWithLinks function initialized.');
