// supabase/functions/createUser/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts'; // Assuming this exists and is correct

// Define the expected request body structure (NO initialPin)
interface CreateUserPayload {
  role: 'admin' | 'teacher' | 'student' | 'parent';
  firstName: string;
  lastName: string;
  nickname?: string;
  // Student specific (optional)
  instrumentIds?: string[];
  linkedTeacherIds?: string[];
}

// Helper function to check if the caller is an Admin
async function isAdmin(supabaseClient: SupabaseClient, userId: string): Promise<boolean> {
  console.log('isAdmin Check: Checking profile for user ID:', userId);
  try {
    const { data, error, status } = await supabaseClient
      .from('profiles')
      .select('role', { count: 'exact' })
      .eq('id', userId)
      .single();

    if (error) {
       if (error.code === 'PGRST116') { console.warn(`isAdmin Check: Profile not found for user ${userId}`); }
       else { console.error('isAdmin Check Error:', error.message, `(Status: ${status})`); }
       return false;
    }
    console.log(`isAdmin Check: Found profile role: ${data?.role} for user ${userId}`);
    return data?.role === 'admin';
  } catch (err) {
      console.error('isAdmin Check Exception:', err);
      return false;
  }
}

// PIN Hashing function is no longer needed here
// async function hashPin(pin: string): Promise<string> { /* ... */ }

// Main Function Handler
Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  console.log(`Received ${req.method} request for createUser`);

  try {
    // 2. Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
       console.error("Missing Supabase environment variables.");
       throw new Error("Server configuration error.");
    }
    const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { fetch: fetch }
    });
    console.log('Supabase Admin Client initialized.');


    // 3. Verify Caller is Authenticated and Admin
     const authHeader = req.headers.get('Authorization');
     if (!authHeader || !authHeader.startsWith('Bearer ')) {
       console.warn('Missing or invalid Authorization header.');
       return new Response(JSON.stringify({ error: "Authentication required." }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
     }
     const token = authHeader.replace('Bearer ', '');
     const { data: { user }, error: userError } = await supabaseAdminClient.auth.getUser(token);
     if (userError || !user) {
       console.error("Auth token validation error:", userError?.message || "User not found for token");
       return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
     }
     console.log('Caller User ID:', user.id);
     const callerIsAdmin = await isAdmin(supabaseAdminClient, user.id);
     if (!callerIsAdmin) {
         console.warn(`User ${user.id} attempted admin action without admin role.`);
         return new Response(JSON.stringify({ error: 'Permission denied: Admin role required.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
     }
     console.log(`Admin action authorized for user ${user.id}.`);


    // 4. Parse Request Body
    let payload: CreateUserPayload;
    try {
        payload = await req.json();
        console.log('Received payload:', payload);
    } catch (jsonError) {
         console.error("Failed to parse request body:", jsonError);
         return new Response(JSON.stringify({ error: "Invalid request body: Must be JSON." }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // 5. Basic Payload Validation (No PIN check)
    if (!payload.role || !payload.firstName || !payload.lastName) {
        console.warn("Payload validation failed: Missing required fields.");
      return new Response(JSON.stringify({ error: 'Missing required fields: role, firstName, lastName.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
    // Add more validation if needed (e.g., role value check)


    // 6. Create Auth User
    // Use a placeholder email, as PIN users don't provide one initially
    const userEmail = `${crypto.randomUUID()}@placeholder.app`;
    console.log(`Attempting to create auth user with email ${userEmail} and role metadata: ${payload.role}`);
    const { data: authUserData, error: authError } = await supabaseAdminClient.auth.admin.createUser({
      email: userEmail,
      // password: payload.password, // Add logic if collecting PW for Admin/Teacher
      user_metadata: { role: payload.role, full_name: `${payload.firstName} ${payload.lastName}` },
      email_confirm: true,
      phone_confirm: true,
    });

    if (authError) {
      console.error('Supabase Auth Create Error:', authError);
      const errorMessage = authError.message.includes('unique constraint') ? 'An account with this identifier might already exist.' : `Failed to create auth user: ${authError.message}`;
      return new Response(JSON.stringify({ error: errorMessage }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    const newUserId = authUserData.user.id;
    console.log('Auth user created successfully:', newUserId);

    // --- Database Operations (Profile & Links) ---
    let profileDataResult: any = null;
    try {
        // 7. Create Profile Entry
        const profileData = {
          id: newUserId,
          role: payload.role,
          first_name: payload.firstName,
          last_name: payload.lastName,
          nickname: payload.nickname, // Will be null if not provided
          status: 'active',
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

        // 8. Handle Student Specifics (Links ONLY)
        if (payload.role === 'student') {
            // --- PIN Handling REMOVED ---

            // Add Instrument Links
            if (payload.instrumentIds && payload.instrumentIds.length > 0) {
                const instrumentLinks = payload.instrumentIds.map(instId => ({ student_id: newUserId, instrument_id: instId }));
                console.log(`Inserting instrument links for student ${newUserId}:`, instrumentLinks);
                const { error: instrumentLinkError } = await supabaseAdminClient.from('student_instruments').insert(instrumentLinks);
                // Log error but don't necessarily fail the whole process for optional links
                if (instrumentLinkError) console.error('Instrument Link Error:', instrumentLinkError.message);
                else console.log(`Instrument links created for student ${newUserId}.`);
            }

            // Add Teacher Links
            if (payload.linkedTeacherIds && payload.linkedTeacherIds.length > 0) {
                const teacherLinks = payload.linkedTeacherIds.map(teachId => ({ student_id: newUserId, teacher_id: teachId }));
                 console.log(`Inserting teacher links for student ${newUserId}:`, teacherLinks);
                const { error: teacherLinkError } = await supabaseAdminClient.from('student_teachers').insert(teacherLinks);
                 if (teacherLinkError) console.error('Teacher Link Error:', teacherLinkError.message);
                 else console.log(`Teacher links created for student ${newUserId}.`);
            }
        }

        // --- If all critical operations succeed ---

        // 9. Map result to expected client format
        const createdUserResponse = {
            id: profileDataResult.id,
            role: profileDataResult.role,
            firstName: profileDataResult.first_name,
            lastName: profileDataResult.last_name,
            nickname: profileDataResult.nickname ?? undefined,
            status: profileDataResult.status,
            // Conditionally include empty arrays for student links if not provided in payload
            ...(payload.role === 'student' && {
                instrumentIds: payload.instrumentIds || [],
                linkedTeacherIds: payload.linkedTeacherIds || [],
            }),
            // Add linkedStudentIds if creating a parent (though parent creation might be separate flow)
        };

        console.log('User creation process completed successfully.');
        return new Response(JSON.stringify(createdUserResponse), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201, // Created
        });

    } catch (dbError) {
        // --- Cleanup on DB Error ---
        console.error('Error during DB inserts after Auth User creation:', dbError.message);
        console.warn(`Attempting to delete orphaned auth user: ${newUserId}`);
        const { error: deleteError } = await supabaseAdminClient.auth.admin.deleteUser(newUserId);
        if (deleteError) { console.error(`CRITICAL: Failed to delete orphaned auth user ${newUserId}:`, deleteError.message); }
        else { console.log(`Successfully deleted orphaned auth user ${newUserId}.`); }

        return new Response(JSON.stringify({ error: `Failed to complete user creation: ${dbError.message}` }), {
             status: 500,
             headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    // Catch errors from initial setup/auth/validation
    console.error('Unhandled Create User Function Error:', error);
    const statusCode = error.message.includes('required') ? 403 : error.message.includes('Authentication') || error.message.includes('token') ? 401 : 500;
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode,
    });
  }
});

console.log('CreateUser function initialized (v2 - no PIN).'); // Added version marker