// File: supabase/functions/log-practice-and-check-streak/index.ts (Corrected)

import { createClient } from 'supabase-js';

import { corsHeaders } from '../_shared/cors.ts';

interface LogPracticePayload {
  studentId: string;
}

const STREAK_MILESTONE_DAYS = 7;
const STREAK_MILESTONE_AWARD = 10;

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { studentId }: LogPracticePayload = await req.json();
    if (!studentId) {
      throw new Error('Student ID is required.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing auth header.');
    }

    // Use the user's auth context to create the client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const companyId = user.app_metadata.company_id;
    if (!companyId) {
      throw new Error('Could not determine company from JWT.');
    }

    // 1. Log today's practice
    const { error: insertError } = await supabaseClient.from('practice_logs').insert({
      student_id: studentId,
      company_id: companyId,
    });

    if (insertError) {
      if (insertError.code === '23505') {
        // unique_violation
        return new Response(JSON.stringify({ error: 'Practice already logged for today.' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw insertError;
    }

    // 2. Calculate the new streak using the CORRECT RPC function
    // --- THIS IS THE FIX ---
    const { data: streakData, error: streakError } = await supabaseClient
      .rpc(
        'get_student_streak_details', // <-- Use the new, correct function name
        { p_student_id: studentId }
      )
      .single();

    if (streakError) {
      // Add more detailed logging for debugging
      console.error('Error calling get_student_streak_details RPC:', streakError);
      throw new Error(`Database error calculating streak: ${streakError.message}`);
    }

    // The new RPC returns a slightly different shape, but `current_streak` is still there.
    const newStreak = streakData?.current_streak ?? 0;

    // 3. Check for milestone and award tickets
    if (newStreak > 0 && newStreak % STREAK_MILESTONE_DAYS === 0) {
      const { error: transactionError } = await supabaseClient.from('ticket_transactions').insert({
        student_id: studentId,
        company_id: companyId,
        amount: STREAK_MILESTONE_AWARD,
        type: 'streak_award',
        description: `Awarded for ${newStreak}-day practice streak!`, // This description is used by the trigger
      });

      if (transactionError) {
        // This is not a fatal error, so just log it and continue.
        // The student has logged their practice, but we failed to give them tickets.
        console.error('Failed to award streak bonus tickets:', transactionError);
      }
    }

    return new Response(JSON.stringify({ success: true, newStreak }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // This will now catch the detailed error from our RPC call if it happens
    console.error('Edge function crashed:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
