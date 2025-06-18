// supabase/functions/send-notification/index.ts

import { createClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

interface NotificationPayload {
  tokens: string[];
  title: string;
  message: string;
  data: Record<string, unknown>;
  log_id: number;
}

const EXPO_API_URL = 'https://exp.host/--/api/v2/push/send';

console.log('send-notification function initialized');

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // This function should only be called by the database via a webhook,
  // secured by the service_role_key.
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
    console.warn('Unauthorized attempt to call send-notification function.');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let payload: NotificationPayload | null = null;
  let logId: number | null = null;

  try {
    payload = await req.json();
    logId = payload?.log_id ?? null;

    if (
      !payload ||
      !payload.tokens ||
      payload.tokens.length === 0 ||
      !payload.title ||
      !payload.message
    ) {
      throw new Error('Invalid payload: Missing tokens, title, or message.');
    }

    const expoPayload = {
      to: payload.tokens,
      title: payload.title,
      body: payload.message,
      data: payload.data,
      sound: 'default', // You can customize this
    };

    const response = await fetch(EXPO_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expoPayload),
    });

    const responseData = await response.json();

    if (logId) {
      await supabaseAdmin
        .from('notification_log')
        .update({
          status: 'sent',
          provider_response: responseData,
        })
        .eq('id', logId);
    }

    return new Response(JSON.stringify({ success: true, details: responseData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-notification function:', error.message);
    if (logId) {
      await supabaseAdmin
        .from('notification_log')
        .update({
          status: 'error',
          provider_response: { error: error.message },
        })
        .eq('id', logId);
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
