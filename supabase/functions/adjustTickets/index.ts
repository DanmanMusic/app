// supabase/functions/adjustTickets/index.ts

import { createClient } from 'supabase-js';

import { isActiveAdmin } from '../_shared/authHelpers.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface AdjustTicketsPayload {
  studentId: string;
  amount: number;
  notes: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  console.log(`Received ${req.method} request for adjustTickets`);

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

  try {
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
      data: { user: callerUser },
      error: userError,
    } = await supabaseAdminClient.auth.getUser(token);
    if (userError || !callerUser) {
      console.error('Auth token validation error:', userError?.message || 'User not found');
      return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const adjusterId = callerUser.id;
    console.log('Caller User ID (Adjuster):', adjusterId);

    const userIsActiveAdmin = await isActiveAdmin(supabaseAdminClient, adjusterId);
    if (!userIsActiveAdmin) {
      console.warn(`Authorization failed: User ${adjusterId} is not an Active Admin.`);
      return new Response(
        JSON.stringify({
          error: 'Permission denied: Only Active Admins can perform manual ticket adjustments.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    console.log(`Authorization success: Active Admin ${adjusterId} performing adjustment.`);

    // NEW: Step 4.5 - Get the Admin's Company ID
    const { data: adminProfile, error: adminProfileError } = await supabaseAdminClient
      .from('profiles')
      .select('company_id')
      .eq('id', adjusterId)
      .single();

    if (adminProfileError || !adminProfile?.company_id) {
      console.error(`Could not retrieve company_id for admin ${adjusterId}:`, adminProfileError);
      return new Response(JSON.stringify({ error: 'Could not determine admin company.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const adminCompanyId = adminProfile.company_id;
    console.log(`Admin ${adjusterId} belongs to company ${adminCompanyId}`);

    let payload: AdjustTicketsPayload;
    try {
      payload = await req.json();
    } catch (jsonError) {
      return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (
      !payload.studentId ||
      payload.amount == null ||
      typeof payload.amount !== 'number' ||
      !Number.isInteger(payload.amount) ||
      payload.amount === 0 ||
      !payload.notes ||
      typeof payload.notes !== 'string' ||
      payload.notes.trim().length === 0
    ) {
      return new Response(
        JSON.stringify({
          error:
            'Missing or invalid fields: studentId, amount (non-zero integer), notes (non-empty string).',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // NEW: Step 6.5 - Verify target student is in the same company
    const { data: studentProfile, error: studentProfileError } = await supabaseAdminClient
      .from('profiles')
      .select('company_id')
      .eq('id', payload.studentId)
      .single();

    if (studentProfileError || !studentProfile) {
      console.warn(`Could not find target student profile: ${payload.studentId}`);
      return new Response(JSON.stringify({ error: 'Target student not found.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (studentProfile.company_id !== adminCompanyId) {
      console.error(
        `Company mismatch! Admin ${adjusterId} from ${adminCompanyId} attempted to adjust tickets for student ${payload.studentId} from ${studentProfile.company_id}.`
      );
      return new Response(
        JSON.stringify({
          error: 'Permission denied: Cannot adjust tickets for a student in another company.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    console.log(`Company check passed. Admin and student are in company ${adminCompanyId}.`);

    const studentId = payload.studentId;
    const amountToAdjust = payload.amount;
    const notes = payload.notes.trim();
    const transactionType = amountToAdjust > 0 ? 'manual_add' : 'manual_subtract';

    if (amountToAdjust < 0) {
      const { data: balanceData, error: balanceError } = await supabaseAdminClient.rpc(
        'get_student_balance',
        { p_student_id: studentId }
      );
      if (balanceError) {
        return new Response(
          JSON.stringify({ error: `Failed to verify student balance: ${balanceError.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      const currentBalance = typeof balanceData === 'number' ? balanceData : 0;
      if (currentBalance + amountToAdjust < 0) {
        return new Response(
          JSON.stringify({
            error: `Insufficient balance. Student only has ${currentBalance} tickets.`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // MODIFIED: Inject company_id into the new ticket_transaction record
    const transactionData = {
      student_id: studentId,
      amount: amountToAdjust,
      type: transactionType as 'manual_add' | 'manual_subtract',
      source_id: adjusterId,
      notes: notes,
      company_id: adminCompanyId, // <-- The critical addition
    };

    console.log('Attempting to insert ticket transaction:', transactionData);
    const { data: insertedTransaction, error: insertError } = await supabaseAdminClient
      .from('ticket_transactions')
      .insert(transactionData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting ticket transaction:', insertError);
      return new Response(
        JSON.stringify({ error: `Failed to record transaction: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('Ticket transaction logged successfully:', insertedTransaction);

    let newBalance = 0;
    const { data: newBalanceData, error: newBalanceError } = await supabaseAdminClient.rpc(
      'get_student_balance',
      { p_student_id: studentId }
    );
    if (newBalanceError) throw newBalanceError;
    newBalance = typeof newBalanceData === 'number' ? newBalanceData : 0;

    return new Response(
      JSON.stringify({
        message: `Tickets adjusted successfully by ${amountToAdjust}.`,
        transaction: insertedTransaction,
        newBalance: newBalance,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Unhandled Adjust Tickets Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

console.log('adjustTickets function initialized (v3 - multi-tenant aware).');
