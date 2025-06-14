import { createClient } from 'supabase-js';

import { isActiveAdmin } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface ForceLogoutPayload {
  targetUserId: string;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const {
      data: { user: callerUser },
    } = await supabaseAdminClient.auth.getUser(
      req.headers.get('Authorization')!.replace('Bearer ', '')
    );
    if (!callerUser) {
      return new Response(JSON.stringify({ error: 'Invalid token.' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    if (!(await isActiveAdmin(supabaseAdminClient, callerUser.id))) {
      return new Response(JSON.stringify({ error: 'Permission denied.' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const { targetUserId }: ForceLogoutPayload = await req.json();
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'targetUserId is required.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // --- The Core Logic ---
    const { error: deleteError } = await supabaseAdminClient
      .from('active_refresh_tokens')
      .delete()
      .eq('user_id', targetUserId);

    if (deleteError) {
      console.error(`Error deleting refresh tokens for user ${targetUserId}:`, deleteError);
      throw new Error('Failed to invalidate user sessions.');
    }

    return new Response(
      JSON.stringify({
        message: `All PIN-based sessions for user ${targetUserId} have been invalidated.`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
