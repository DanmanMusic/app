// supabase/functions/createUser/index.ts

import { createClient, SupabaseClient } from 'supabase-js';

import { isActiveAdmin } from '../_shared/authHelpers.ts'; // Use isActiveAdmin
import { corsHeaders } from '../_shared/cors.ts';
// Import shared helper

// Define the expected request body structure
interface CreateUserPayload {
  role: 'admin' | 'teacher' | 'student' | 'parent';
  firstName: string;
  lastName: string;
  nickname?: string;
  // Student specific (optional)
  instrumentIds?: string[];
  linkedTeacherIds?: string[];
}

// Main Function Handler
Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS request & Method Check
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  console.log(`Received ${req.method} request for createUser`);

  try {
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

    // 3. Verify Caller is Authenticated
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
      data: { user },
      error: userError,
    } = await supabaseAdminClient.auth.getUser(token);
    if (userError || !user) {
      console.error(
        'Auth token validation error:',
        userError?.message || 'User not found for token'
      );
      return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Caller User ID:', user.id);

    // 4. Authorize Caller (Must be Active Admin) - Using imported helper
    const callerIsActiveAdmin = await isActiveAdmin(supabaseAdminClient, user.id); // Use shared helper
    if (!callerIsActiveAdmin) {
      console.warn(`User ${user.id} attempted admin action without active admin role.`);
      return new Response(
        JSON.stringify({ error: 'Permission denied: Active Admin role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`Admin action authorized for active admin ${user.id}.`);

    // 5. Parse Request Body
    let payload: CreateUserPayload;
    try {
      payload = await req.json();
      console.log('Received payload:', payload);
    } catch (jsonError) {
      console.error('Failed to parse request body:', jsonError);
      return new Response(JSON.stringify({ error: 'Invalid request body: Must be JSON.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Basic Payload Validation - *** RESTORED ***
    if (!payload.role || !payload.firstName || !payload.lastName) {
      console.warn('Payload validation failed: Missing required fields.');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: role, firstName, lastName.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Add role value check
    if (!['admin', 'teacher', 'student', 'parent'].includes(payload.role)) {
      console.warn(`Payload validation failed: Invalid role '${payload.role}'.`);
      return new Response(JSON.stringify({ error: 'Invalid role provided.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // *** END RESTORED VALIDATION ***

    // 7. Create Auth User
    const userEmail = `${crypto.randomUUID()}@placeholder.app`; // Placeholder email
    console.log(
      `Attempting to create auth user with email ${userEmail} and role metadata: ${payload.role}`
    );
    const { data: authUserData, error: authError } =
      await supabaseAdminClient.auth.admin.createUser({
        email: userEmail,
        // No password needed for PIN flow initially
        user_metadata: {
          role: payload.role, // Store intended role in metadata
          full_name: `${payload.firstName} ${payload.lastName}`,
        },
        email_confirm: true, // Auto-confirm placeholder email
        phone_confirm: true, // Auto-confirm phone if ever used
      });

    if (authError) {
      console.error('Supabase Auth Create Error:', authError);
      const errorMessage = authError.message.includes('unique constraint')
        ? 'An account with this identifier might already exist.'
        : `Failed to create auth user: ${authError.message}`;
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const newUserId = authUserData.user.id;
    console.log('Auth user created successfully:', newUserId);

    // --- Database Operations (Profile & Links) ---
    let profileDataResult: any = null;
    try {
      // 8. Create Profile Entry
      const profileData = {
        id: newUserId,
        role: payload.role,
        first_name: payload.firstName,
        last_name: payload.lastName,
        nickname: payload.nickname || null, // Use null if empty/undefined
        status: 'active', // Default to active
      };
      console.log(`Inserting profile for ${newUserId}:`, profileData);
      const { data: insertedProfile, error: profileError } = await supabaseAdminClient
        .from('profiles')
        .insert(profileData)
        .select()
        .single();
      if (profileError) throw profileError; // Throw to trigger cleanup
      profileDataResult = insertedProfile;
      console.log(`Profile created for ${newUserId}.`);

      // 9. Handle Student Specifics (Links ONLY)
      if (payload.role === 'student') {
        // Add Instrument Links
        if (payload.instrumentIds && payload.instrumentIds.length > 0) {
          const instrumentLinks = payload.instrumentIds.map(instId => ({
            student_id: newUserId,
            instrument_id: instId,
          }));
          console.log(`Inserting instrument links for student ${newUserId}:`, instrumentLinks);
          const { error: instrumentLinkError } = await supabaseAdminClient
            .from('student_instruments')
            .insert(instrumentLinks);
          if (instrumentLinkError)
            console.error('Instrument Link Error:', instrumentLinkError.message); // Log but don't fail
          else console.log(`Instrument links created for student ${newUserId}.`);
        }
        // Add Teacher Links
        if (payload.linkedTeacherIds && payload.linkedTeacherIds.length > 0) {
          const teacherLinks = payload.linkedTeacherIds.map(teachId => ({
            student_id: newUserId,
            teacher_id: teachId,
          }));
          console.log(`Inserting teacher links for student ${newUserId}:`, teacherLinks);
          const { error: teacherLinkError } = await supabaseAdminClient
            .from('student_teachers')
            .insert(teacherLinks);
          if (teacherLinkError)
            console.error('Teacher Link Error:', teacherLinkError.message); // Log but don't fail
          else console.log(`Teacher links created for student ${newUserId}.`);
        }
      }

      // 10. Map result to expected client format
      const createdUserResponse = {
        id: profileDataResult.id,
        role: profileDataResult.role,
        firstName: profileDataResult.first_name,
        lastName: profileDataResult.last_name,
        nickname: profileDataResult.nickname ?? undefined,
        status: profileDataResult.status,
        ...(payload.role === 'student' && {
          instrumentIds: payload.instrumentIds || [],
          linkedTeacherIds: payload.linkedTeacherIds || [],
        }),
      };

      console.log('User creation process completed successfully.');
      return new Response(JSON.stringify(createdUserResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }); // Created
    } catch (dbError) {
      // --- Cleanup on DB Error ---
      console.error('Error during DB inserts after Auth User creation:', dbError.message);
      console.warn(`Attempting to delete orphaned auth user: ${newUserId}`);
      const { error: deleteError } = await supabaseAdminClient.auth.admin.deleteUser(newUserId);
      if (deleteError)
        console.error(
          `CRITICAL: Failed to delete orphaned auth user ${newUserId}:`,
          deleteError.message
        );
      else console.log(`Successfully deleted orphaned auth user ${newUserId}.`);
      return new Response(
        JSON.stringify({ error: `Failed to complete user creation: ${dbError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Unhandled Create User Function Error:', error);
    const statusCode = error.message.includes('required')
      ? 403
      : error.message.includes('Authentication') || error.message.includes('token')
        ? 401
        : 500;
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

console.log('CreateUser function initialized (v3 - uses shared helpers).');
