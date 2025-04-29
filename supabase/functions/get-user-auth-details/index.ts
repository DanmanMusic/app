// supabase/functions/get-user-auth-details/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// Define expected request body structure
interface GetAuthDetailsPayload {
  targetUserId: string; // The ID of the user whose details are requested
}

// Define expected success response structure
interface AuthDetailsResponse {
  email: string | null; // Return only the email (or null if not found/error)
  // Add other safe-to-expose fields if needed in the future
}

// Helper function to check if the caller is an Admin
// Assumes is_admin() function exists in your DB
async function isAdmin(supabaseClient: SupabaseClient, callerUserId: string): Promise<boolean> {
  // Reusing the same helper logic from deleteUser/createUser
  console.log('[getAuthDetails] isAdmin Check: Checking profile for caller ID:', callerUserId);
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', callerUserId)
      .single();
    if (error) {
      throw error;
    }
    const role = data?.role;
    console.log(`[getAuthDetails] isAdmin Check: Found role: ${role} for caller ${callerUserId}`);
    return role === 'admin';
  } catch (err) {
    console.error('[getAuthDetails] isAdmin Check Exception:', err.message);
    return false; // Default to false on error
  }
}

// Main Function Handler
Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders },
    });
  }

  console.log(`Received ${req.method} request for get-user-auth-details`);

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
    // Use the *Admin* client to validate the token, as the user might be calling this function
    const {
      data: { user: callerUser },
      error: userError,
    } = await supabaseAdminClient.auth.getUser(token);

    if (userError || !callerUser) {
      console.error(
        'Caller Auth token validation error:',
        userError?.message || 'User not found for token'
      );
      return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Caller User ID:', callerUser.id);

    const callerIsAdmin = await isAdmin(supabaseAdminClient, callerUser.id);
    if (!callerIsAdmin) {
      console.warn(`User ${callerUser.id} attempted getAuthDetails without admin role.`);
      return new Response(JSON.stringify({ error: 'Permission denied: Admin role required.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`Admin action authorized for user ${callerUser.id}.`);

    // 3. Parse Request Body
    let payload: GetAuthDetailsPayload;
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

    // 4. Validate Payload
    if (!payload.targetUserId || typeof payload.targetUserId !== 'string') {
      console.warn('Payload validation failed: Missing or invalid targetUserId.');
      return new Response(JSON.stringify({ error: 'Missing or invalid targetUserId.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const targetUserId = payload.targetUserId;

    // 5. Call Supabase Admin API to Get Target User Auth Details
    console.log(`Attempting to fetch auth details for target user: ${targetUserId}`);
    const { data: targetAuthData, error: getAuthError } =
      await supabaseAdminClient.auth.admin.getUserById(targetUserId);

    let responseEmail: string | null = null;

    if (getAuthError) {
      console.error(`Supabase Auth GetUserById Error for user ${targetUserId}:`, getAuthError);
      // Handle user not found specifically, but still return 200 with null email
      if (getAuthError.message.toLowerCase().includes('not found')) {
        console.warn(`Target auth user not found: ${targetUserId}`);
        // Set email to null, but don't throw a 500 error for this case
      } else {
        // For other errors, maybe still return 500? Or just null email? Let's return null email.
        console.error(`Failed to fetch auth details for ${targetUserId}: ${getAuthError.message}`);
      }
    } else if (!targetAuthData || !targetAuthData.user) {
      console.warn(`No auth user data returned for ${targetUserId}, but no error?`);
    } else {
      // Successfully fetched user, extract email
      responseEmail = targetAuthData.user.email ?? null;
      console.log(`Successfully fetched auth details for ${targetUserId}. Email: ${responseEmail}`);
    }

    // 6. Prepare and Return Success Response (even if email is null)
    const responseBody: AuthDetailsResponse = {
      email: responseEmail,
    };

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // OK - Return 200 even if user/email not found, indicates function worked
    });
  } catch (error) {
    // Catch errors from initial setup/auth/validation etc.
    console.error('Unhandled Get User Auth Details Function Error:', error);
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

console.log('Get-user-auth-details function initialized.');
