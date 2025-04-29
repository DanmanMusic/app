// supabase/functions/update-auth-credentials/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// Define expected request body structure
// User provides *at least one* of email or password
interface UpdateAuthPayload {
  email?: string;
  password?: string;
}

// No specific helper needed, relies on auth context from JWT

// Main Function Handler
Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }
  // Allow only POST or PUT/PATCH requests for updates
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    console.warn(`Received non-POST/PUT/PATCH request: ${req.method}`);
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders },
    });
  }

  console.log(`Received ${req.method} request for update-auth-credentials`);

  // Initialize Supabase Admin Client (needed for admin update user call)
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
    // 2. Verify Caller is Authenticated (using their JWT passed in header)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Missing or invalid Authorization header.');
      return new Response(JSON.stringify({ error: 'Authentication required.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    // Validate token and get the user ID making the request
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
    const userIdToUpdate = user.id; // The ID of the logged-in user making the request
    console.log(`Update credentials request authorized for user: ${userIdToUpdate}`);

    // 3. Parse Request Body
    let payload: UpdateAuthPayload;
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

    // 4. Validate Payload - Ensure at least one field is present and potentially validate format
    if (!payload.email && !payload.password) {
      console.warn('Payload validation failed: Missing email or password.');
      return new Response(
        JSON.stringify({ error: 'Must provide at least email or password to update.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construct update object for Supabase Auth Admin API
    const updateData: { email?: string; password?: string; email_confirm?: boolean } = {}; // Add email_confirm

    if (payload.email) {
      // Basic check for '@' symbol
      if (typeof payload.email === 'string' && payload.email.includes('@')) {
        updateData.email = payload.email.trim();
        // When changing email, usually want to require re-verification
        // Set email_confirm to false IF your Supabase project requires email verification
        // Check your project's Auth settings (Settings > Auth > Email verification)
        // updateData.email_confirm = false; // Uncomment if email verification is ON
        console.log(`Prepared email update for user ${userIdToUpdate}`);
      } else {
        console.warn('Payload validation failed: Invalid email format provided.');
        return new Response(JSON.stringify({ error: 'Invalid email format provided.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (payload.password) {
      // Example: Basic password length check (e.g., Supabase default is 6)
      if (typeof payload.password === 'string' && payload.password.length >= 6) {
        updateData.password = payload.password; // Don't trim password
        console.log(`Prepared password update for user ${userIdToUpdate}`);
      } else {
        console.warn('Payload validation failed: Password too short.');
        return new Response(
          JSON.stringify({ error: 'Password must be at least 6 characters long.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 5. Call Supabase Admin API to Update User by ID
    console.log(
      `Attempting to update auth credentials for user ${userIdToUpdate} with data:`,
      updateData
    );
    const { data: updatedUserData, error: updateError } =
      await supabaseAdminClient.auth.admin.updateUserById(
        userIdToUpdate,
        updateData // Pass the constructed { email?, password?, email_confirm? } object
      );

    if (updateError) {
      console.error(`Supabase Auth Update Error for user ${userIdToUpdate}:`, updateError);
      // Handle common errors like email already exists
      const isConflictError =
        updateError.message.includes('unique constraint') ||
        updateError.message.toLowerCase().includes('already exist');
      const errorMessage = isConflictError
        ? 'Email address is already in use by another account.'
        : `Failed to update credentials: ${updateError.message}`;
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: isConflictError ? 409 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }); // 409 Conflict
    }

    console.log(
      `Auth credentials updated successfully for user ${userIdToUpdate}. Response:`,
      updatedUserData
    );

    // 6. Return Success Response
    // The client might need to handle the session implications (e.g., sign out if password changed)
    return new Response(JSON.stringify({ message: 'Credentials updated successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // OK
    });
  } catch (error) {
    // Catch errors from initial setup/auth/validation etc.
    console.error('Unhandled Update Auth Credentials Function Error:', error);
    const statusCode =
      error.message.includes('Authentication') || error.message.includes('token') ? 401 : 500;
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );
  }
});

console.log('Update-auth-credentials function initialized.');
