// supabase/functions/update-auth-credentials/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// Define expected request body structure
// User provides *at least one* of email or password
interface UpdateAuthPayload {
  email?: string;
  password?: string;
}

// Helper - we don't need isAdmin, just need the authenticated user ID

// Main Function Handler
Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  console.log(`Received ${req.method} request for update-auth-credentials`);

  // Initialize Supabase Admin Client (needed for admin update user call)
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
     console.error("Missing Supabase environment variables.");
     return new Response(JSON.stringify({ error: "Server configuration error." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
  const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: fetch }
  });
  console.log('Supabase Admin Client initialized.');

  try {
    // 2. Verify Caller is Authenticated (using their JWT)
     const authHeader = req.headers.get('Authorization');
     if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('Missing or invalid Authorization header.');
       return new Response(JSON.stringify({ error: "Authentication required." }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
     }
     const token = authHeader.replace('Bearer ', '');
     // Validate token and get user ID
     const { data: { user }, error: userError } = await supabaseAdminClient.auth.getUser(token);
     if (userError || !user) {
        console.error("Auth token validation error:", userError?.message || "User not found for token");
       return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
     }
     const userIdToUpdate = user.id; // The ID of the logged-in user making the request
     console.log(`Update credentials request authorized for user: ${userIdToUpdate}`);


    // 3. Parse Request Body
    let payload: UpdateAuthPayload;
    try {
        payload = await req.json();
        console.log('Received payload:', payload);
    } catch (jsonError) {
         console.error("Failed to parse request body:", jsonError);
         return new Response(JSON.stringify({ error: "Invalid request body: Must be JSON." }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // 4. Validate Payload - Ensure at least one field is present
    if (!payload.email && !payload.password) {
        console.warn("Payload validation failed: Missing email or password.");
      return new Response(JSON.stringify({ error: 'Must provide at least email or password to update.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // Construct update object for Supabase Auth Admin API
    const updateData: { email?: string; password?: string } = {};
    if (payload.email && typeof payload.email === 'string' && payload.email.includes('@')) { // Basic email format check
        updateData.email = payload.email.trim();
    } else if (payload.email) {
         console.warn("Payload validation failed: Invalid email format provided.");
         return new Response(JSON.stringify({ error: 'Invalid email format provided.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    if (payload.password && typeof payload.password === 'string' && payload.password.length >= 6) { // Example: Basic password length check
        updateData.password = payload.password; // Don't trim password
    } else if (payload.password) {
         console.warn("Payload validation failed: Password too short.");
         return new Response(JSON.stringify({ error: 'Password must be at least 6 characters long.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // 5. Call Supabase Admin API to Update User by ID
    console.log(`Attempting to update auth credentials for user ${userIdToUpdate}`);
    const { data: updatedUserData, error: updateError } = await supabaseAdminClient.auth.admin.updateUserById(
      userIdToUpdate,
      updateData
    );

    if (updateError) {
        console.error(`Supabase Auth Update Error for user ${userIdToUpdate}:`, updateError);
        // Handle common errors like email already exists
        const errorMessage = updateError.message.includes('unique constraint') || updateError.message.toLowerCase().includes('already exists')
            ? 'Email address is already in use.'
            : `Failed to update credentials: ${updateError.message}`;
       return new Response(JSON.stringify({ error: errorMessage }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    console.log(`Auth credentials updated successfully for user ${userIdToUpdate}.`);


    // 6. Return Success Response
    // Optionally return the updated user object from auth if needed, but often just success is fine.
    return new Response(JSON.stringify({ message: "Credentials updated successfully." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // OK
    });

  } catch (error) {
    // Catch errors from initial setup/auth/validation etc.
    console.error('Unhandled Update Auth Credentials Function Error:', error);
    const statusCode = error.message.includes('Authentication') || error.message.includes('token') ? 401 : 500;
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode,
    });
  }
});

console.log('Update-auth-credentials function initialized.');