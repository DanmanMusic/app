// supabase/functions/adjustTickets/index.ts

import { createClient, SupabaseClient } from 'supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
// Import shared helper
import { isActiveAdmin } from '../_shared/authHelpers.ts'; // Use isActiveAdmin

interface AdjustTicketsPayload {
  studentId: string;
  amount: number; // Can be positive (add) or negative (subtract)
  notes: string; // Reason for adjustment
  // adjusterId (adminId) comes from the caller's token
}

// Main Function Handler
Deno.serve(async (req: Request) => {
  // 1. Handle Preflight CORS & Method Check (POST)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }); // Added Content-Type

  console.log(`Received ${req.method} request for adjustTickets`);

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

  try {
    // 3. Verify Caller Authentication
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

    // 4. Parse Request Body
    let payload: AdjustTicketsPayload;
    try {
      payload = await req.json();
      console.log('Received payload:', payload);
    } catch (jsonError) {
      console.error('Failed to parse request body:', jsonError);
      return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Validate Payload
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
      console.warn('Payload validation failed:', payload);
      return new Response(
        JSON.stringify({
          error:
            'Missing or invalid fields: studentId, amount (non-zero integer), notes (non-empty string).',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const studentId = payload.studentId;
    const amountToAdjust = payload.amount;
    const notes = payload.notes.trim();
    const transactionType = amountToAdjust > 0 ? 'manual_add' : 'manual_subtract';

    // 6. Authorize Caller (MUST be Active Admin) - Using imported helper
    const userIsActiveAdmin = await isActiveAdmin(supabaseAdminClient, adjusterId); // Use shared helper
    if (!userIsActiveAdmin) {
      console.warn(`Authorization failed: User ${adjusterId} is not an Active Admin.`);
      return new Response(
        JSON.stringify({
          error: 'Permission denied: Only Active Admins can perform manual ticket adjustments.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`Authorization success: Active Admin ${adjusterId} performing adjustment.`);

    // 7. Check Balance if Subtracting (using RPC)
    if (amountToAdjust < 0) {
      console.log(`Subtraction detected. Checking balance for student ${studentId}...`);
      const { data: balanceData, error: balanceError } = await supabaseAdminClient.rpc(
        'get_student_balance',
        { p_student_id: studentId }
      );
      if (balanceError) {
        console.error(`Error fetching balance for student ${studentId}:`, balanceError);
        return new Response(
          JSON.stringify({ error: `Failed to verify student balance: ${balanceError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const currentBalance = typeof balanceData === 'number' ? balanceData : 0;
      console.log(`Current balance for student ${studentId}: ${currentBalance}`);
      if (currentBalance + amountToAdjust < 0) {
        console.warn(
          `Insufficient balance for subtraction. Current: ${currentBalance}, Amount: ${amountToAdjust}`
        );
        return new Response(
          JSON.stringify({
            error: `Insufficient balance. Student only has ${currentBalance} tickets.`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 8. Perform Database Insert into ticket_transactions
    const transactionData = {
      student_id: studentId,
      amount: amountToAdjust,
      type: transactionType as 'manual_add' | 'manual_subtract',
      source_id: adjusterId,
      notes: notes,
    };
    console.log('Attempting to insert ticket transaction:', transactionData);
    const { data: insertedTransaction, error: insertError } = await supabaseAdminClient
      .from('ticket_transactions')
      .insert(transactionData)
      .select()
      .single();

    // *** Restored Insert Error Handling ***
    if (insertError) {
      console.error('Error inserting ticket transaction:', insertError);
      return new Response(
        JSON.stringify({ error: `Failed to record transaction: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // *** End Restored Handling ***

    console.log('Ticket transaction logged successfully:', insertedTransaction);

    // 9. Fetch the *new* balance after the transaction
    let newBalance = 0;
    try {
      const { data: newBalanceData, error: newBalanceError } = await supabaseAdminClient.rpc(
        'get_student_balance',
        { p_student_id: studentId }
      );
      if (newBalanceError) throw newBalanceError;
      newBalance = typeof newBalanceData === 'number' ? newBalanceData : 0;
      console.log(`New balance confirmed for student ${studentId}: ${newBalance}`);
    } catch (e) {
      console.error('Failed to fetch new balance after adjustment:', e);
      // Log error but don't fail the request
    }

    // 10. Return Success Response
    return new Response(
      JSON.stringify({
        message: `Tickets adjusted successfully by ${amountToAdjust}.`,
        transaction: insertedTransaction,
        newBalance: newBalance,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // OK
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

console.log('adjustTickets function initialized (v2 - uses shared helpers).');
