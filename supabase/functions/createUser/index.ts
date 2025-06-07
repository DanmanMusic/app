// supabase/functions/createUser/index.ts

import { createClient } from 'supabase-js';

import { isActiveAdmin } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface CreateUserPayload {
  role: 'admin' | 'teacher' | 'student' | 'parent';
  firstName: string;
  lastName: string;
  nickname?: string;
  instrumentIds?: string[];
  linkedTeacherIds?: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  console.log(`Received ${req.method} request for createUser`);

  try {
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
      data: { user: callerAdmin },
      error: userError,
    } = await supabaseAdminClient.auth.getUser(token);

    if (userError || !callerAdmin) {
      console.error(
        'Auth token validation error:',
        userError?.message || 'User not found for token'
      );
      return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Caller Admin ID:', callerAdmin.id);

    const callerIsActiveAdmin = await isActiveAdmin(supabaseAdminClient, callerAdmin.id);
    if (!callerIsActiveAdmin) {
      console.warn(`User ${callerAdmin.id} attempted admin action without active admin role.`);
      return new Response(
        JSON.stringify({ error: 'Permission denied: Active Admin role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`Admin action authorized for active admin ${callerAdmin.id}.`);

    // NEW: Step 4.5 - Get the Admin's Company ID
    const { data: adminProfile, error: adminProfileError } = await supabaseAdminClient
      .from('profiles')
      .select('company_id')
      .eq('id', callerAdmin.id)
      .single();

    if (adminProfileError || !adminProfile?.company_id) {
      console.error(
        `Could not retrieve company_id for admin ${callerAdmin.id}:`,
        adminProfileError
      );
      return new Response(JSON.stringify({ error: 'Could not determine admin company.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const adminCompanyId = adminProfile.company_id;
    console.log(`Admin belongs to company: ${adminCompanyId}`);

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

    if (!payload.role || !payload.firstName || !payload.lastName) {
      console.warn('Payload validation failed: Missing required fields.');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: role, firstName, lastName.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!['admin', 'teacher', 'student', 'parent'].includes(payload.role)) {
      console.warn(`Payload validation failed: Invalid role '${payload.role}'.`);
      return new Response(JSON.stringify({ error: 'Invalid role provided.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userEmail = `${crypto.randomUUID()}@placeholder.app`;
    console.log(
      `Attempting to create auth user with email ${userEmail} and role metadata: ${payload.role}`
    );
    const { data: authUserData, error: authError } =
      await supabaseAdminClient.auth.admin.createUser({
        email: userEmail,
        user_metadata: {
          role: payload.role,
          full_name: `${payload.firstName} ${payload.lastName}`,
        },
        email_confirm: true,
        phone_confirm: true,
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

    let profileDataResult: any = null;
    try {
      // MODIFIED: Inject the admin's company_id into the new profile
      const profileData = {
        id: newUserId,
        role: payload.role,
        first_name: payload.firstName,
        last_name: payload.lastName,
        nickname: payload.nickname || null,
        status: 'active',
        company_id: adminCompanyId, // <-- The critical addition
      };
      console.log(`Inserting profile for ${newUserId}:`, profileData);
      const { data: insertedProfile, error: profileError } = await supabaseAdminClient
        .from('profiles')
        .insert(profileData)
        .select()
        .single();
      if (profileError) throw profileError;
      profileDataResult = insertedProfile;
      console.log(`Profile created for ${newUserId}.`);

      if (payload.role === 'student') {
        if (payload.instrumentIds && payload.instrumentIds.length > 0) {
          const instrumentLinks = payload.instrumentIds.map(instId => ({
            student_id: newUserId,
            instrument_id: instId,
          }));
          console.log(`Inserting instrument links for student ${newUserId}:`, instrumentLinks);
          await supabaseAdminClient.from('student_instruments').insert(instrumentLinks);
        }
        if (payload.linkedTeacherIds && payload.linkedTeacherIds.length > 0) {
          const teacherLinks = payload.linkedTeacherIds.map(teachId => ({
            student_id: newUserId,
            teacher_id: teachId,
          }));
          console.log(`Inserting teacher links for student ${newUserId}:`, teacherLinks);
          await supabaseAdminClient.from('student_teachers').insert(teacherLinks);
        }
      }

      const createdUserResponse = {
        id: profileDataResult.id,
        role: profileDataResult.role,
        firstName: profileDataResult.first_name,
        lastName: profileDataResult.last_name,
        nickname: profileDataResult.nickname ?? undefined,
        status: profileDataResult.status,
        companyId: profileDataResult.company_id, // NEW: Return companyId
        ...(payload.role === 'student' && {
          instrumentIds: payload.instrumentIds || [],
          linkedTeacherIds: payload.linkedTeacherIds || [],
        }),
      };

      console.log('User creation process completed successfully.');
      return new Response(JSON.stringify(createdUserResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    } catch (dbError) {
      console.error('Error during DB inserts after Auth User creation:', dbError.message);
      console.warn(`Attempting to delete orphaned auth user: ${newUserId}`);
      await supabaseAdminClient.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: `Failed to complete user creation: ${dbError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Unhandled Create User Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

console.log('CreateUser function initialized (v4 - multi-tenant aware).');
