// supabase/functions/deleteUser/index.ts

import { createClient } from 'supabase-js';

import { isActiveAdmin } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface DeleteUserPayload {
  userIdToDelete: string;
}

const PROTECTED_IDS_STRING = Deno.env.get('PROTECTED_ADMIN_IDS') || '';
const PROTECTED_ADMIN_IDS = PROTECTED_IDS_STRING.split(',')
  .map(id => id.trim())
  .filter(id => id.length > 0);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  console.log(`Received ${req.method} request for deleteUser`);

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

    const callerIsActiveAdmin = await isActiveAdmin(supabaseAdminClient, callerId);
    if (!callerIsActiveAdmin) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: Active Admin role required.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // NEW: Get Company IDs for security check
    const { data: profiles, error: profilesError } = await supabaseAdminClient
      .from('profiles')
      .select('id, company_id')
      .in('id', [callerId, requestBody.userIdToDelete]); // Assuming requestBody is parsed below

    // NOTE: This logic is moved before parsing the body for efficiency, but let's parse first for clarity.

    let payload: DeleteUserPayload;
    try {
      payload = await req.json();
    } catch (jsonError) {
      return new Response(JSON.stringify({ error: 'Invalid request body: Must be JSON.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!payload.userIdToDelete || typeof payload.userIdToDelete !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid userIdToDelete.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userIdToDelete = payload.userIdToDelete;

    // Fetch profiles again with the now-known userIdToDelete
    const { data: profilesData, error: profilesFetchError } = await supabaseAdminClient
      .from('profiles')
      .select('id, company_id')
      .in('id', [callerId, userIdToDelete]);

    if (profilesFetchError || !profilesData || profilesData.length < 1) {
      return new Response(JSON.stringify({ error: 'Could not verify user profiles.' }), {
        status: 500,
        headers: { ...corsHeaders },
      });
    }

    const callerProfile = profilesData.find(p => p.id === callerId);
    const targetProfile = profilesData.find(p => p.id === userIdToDelete);

    if (!targetProfile) {
      console.warn(`User ${userIdToDelete} not found in profiles. Assuming already deleted.`);
      return new Response(JSON.stringify({ message: 'User to delete was not found.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // NEW: The Core Multi-Tenancy Security Check
    if (callerProfile.company_id !== targetProfile.company_id) {
      console.error(
        `Company mismatch! Admin ${callerId} from ${callerProfile.company_id} attempted to delete user ${userIdToDelete} from ${targetProfile.company_id}.`
      );
      return new Response(
        JSON.stringify({ error: 'Permission denied: Cannot delete a user in another company.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (callerId === userIdToDelete) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account via this function.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    if (PROTECTED_ADMIN_IDS.includes(userIdToDelete)) {
      return new Response(
        JSON.stringify({ error: 'This administrator account cannot be deleted.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: _deleteResult, error: deleteError } =
      await supabaseAdminClient.auth.admin.deleteUser(userIdToDelete);

    if (deleteError) {
      const userNotFound = deleteError.message.toLowerCase().includes('not found');
      return new Response(
        JSON.stringify({
          error: userNotFound
            ? 'User to delete was not found.'
            : `Failed to delete user: ${deleteError.message}`,
        }),
        {
          status: userNotFound ? 404 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ message: `User ${userIdToDelete} deleted successfully.` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Unhandled Delete User Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

console.log('DeleteUser function initialized (v4 - multi-tenant aware).');
