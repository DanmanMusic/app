// File: supabase/functions/log-practice-and-check-streak/index.ts

import { createClient } from 'supabase-js';

import { isParentOfStudent } from '../_shared/authHelpers.ts'; // Import the new helper
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

    const supabaseAdminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const {
      data: { user: caller },
      error: userError,
    } = await supabaseAdminClient.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- CORRECT AUTHORIZATION LOGIC ---
    const isSelf = caller.id === studentId;
    const isLinkedParent = await isParentOfStudent(supabaseAdminClient, caller.id, studentId);

    if (!isSelf && !isLinkedParent) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: You cannot log practice for this student.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    // --- END OF FIX ---

    const companyId = caller.app_metadata.company_id;
    if (!companyId) {
      throw new Error('Could not determine company from JWT.');
    }

    const { error: insertError } = await supabaseAdminClient.from('practice_logs').insert({
      student_id: studentId,
      company_id: companyId,
    });

    if (insertError) {
      if (insertError.code === '23505') {
        return new Response(JSON.stringify({ error: 'Practice already logged for today.' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw insertError;
    }

    const { data: streakData, error: streakError } = await supabaseAdminClient
      .rpc('get_student_streak_details', { p_student_id: studentId })
      .single();

    if (streakError) {
      console.error('Error calling get_student_streak_details RPC:', streakError);
      throw new Error(`Database error calculating streak: ${streakError.message}`);
    }

    const newStreak = streakData?.current_streak ?? 0;

    if (newStreak > 0 && newStreak % STREAK_MILESTONE_DAYS === 0) {
      const { error: transactionError } = await supabaseAdminClient
        .from('ticket_transactions')
        .insert({
          student_id: studentId,
          company_id: companyId,
          amount: STREAK_MILESTONE_AWARD,
          type: 'streak_award',
          description: `Awarded for ${newStreak}-day practice streak!`,
        });

      if (transactionError) {
        console.error('Failed to award streak bonus tickets:', transactionError);
      }
    }

    return new Response(JSON.stringify({ success: true, newStreak }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Edge function crashed:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
