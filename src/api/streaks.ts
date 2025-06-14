// File: src/api/streaks.ts

import { getSupabase } from '../lib/supabaseClient';

// We still import our clean frontend types for the function's return signature.
import { StudentStreakDetails, CompanyStreakStats } from '../types/dataTypes';

/**
 * Fetches detailed streak statistics for a single student.
 * @param studentId The UUID of the student.
 * @returns An object with current_streak, longest_streak, and last_log_date.
 */
export const getStudentStreakDetails = async (studentId: string): Promise<StudentStreakDetails> => {
  const client = getSupabase();
  if (!studentId) {
    throw new Error('A student ID must be provided to fetch streak details.');
  }

  // TypeScript now knows the exact shape of `data` from our generated types.
  const { data, error } = await client
    .rpc('get_student_streak_details', { p_student_id: studentId })
    .single();

  if (error) {
    console.error('Error fetching student streak details:', error);
    throw new Error(error.message);
  }

  // The errors are gone! `data` is now correctly typed.
  return {
    current_streak: data?.current_streak ?? 0,
    longest_streak: data?.longest_streak ?? 0,
    last_log_date: data?.last_log_date ?? null,
  };
};

/**
 * Fetches aggregate streak statistics for a given company.
 * @param companyId The UUID of the company.
 * @returns An object with counts of active streaks and milestone earners.
 */
export const getCompanyStreakStats = async (companyId: string): Promise<CompanyStreakStats> => {
  const client = getSupabase();
  if (!companyId) {
    throw new Error('A company ID must be provided to fetch streak stats.');
  }

  // TypeScript also knows the shape of this RPC's return data.
  const { data, error } = await client
    .rpc('get_company_streak_stats', { p_company_id: companyId })
    .single();

  if (error) {
    console.error('Error fetching company streak stats:', error);
    throw new Error(error.message);
  }

  // The errors are gone!
  return {
    total_active_streaks: data?.total_active_streaks ?? 0,
    streaks_over_7_days: data?.streaks_over_7_days ?? 0,
    milestone_earners_this_month: data?.milestone_earners_this_month ?? 0,
  };
};

// This function remains the same as it doesn't rely on RPC return types.
export const logPracticeForToday = async (
  studentId: string
): Promise<{ success: boolean; newStreak: number }> => {
  const client = getSupabase();
  const { data, error } = await client.functions.invoke('log-practice-and-check-streak', {
    body: { studentId },
  });

  if (error) {
    console.error('Error invoking log-practice-and-check-streak function:', error);
    const errorMessage = error.context?.error?.message || error.message;
    throw new Error(errorMessage);
  }

  return data;
};
