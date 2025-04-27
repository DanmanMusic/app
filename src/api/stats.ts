// src/api/stats.ts
import { getSupabase } from '../lib/supabaseClient';

// Interfaces remain the same
export interface UserCounts {
  studentCount: number;
  teacherCount: number;
  parentCount: number;
  activeStudentCount: number;
}

export interface TaskStats {
  pendingVerificationCount: number;
}

// --- Fetch User Counts from Supabase ---
export const fetchUserCounts = async (): Promise<UserCounts> => {
  const client = getSupabase();
  console.log(`[Supabase] Fetching User Counts`);

  // Use Supabase count aggregation for efficiency
  const { count: studentCount, error: studentError } = await client
    .from('profiles')
    .select('*', { count: 'exact', head: true }) // head: true optimizes by not fetching data
    .eq('role', 'student');

  const { count: teacherCount, error: teacherError } = await client
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'teacher');

  const { count: parentCount, error: parentError } = await client
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'parent');

  const { count: activeStudentCount, error: activeStudentError } = await client
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student')
    .eq('status', 'active');

  // Basic error handling - could be more granular
  if (studentError || teacherError || parentError || activeStudentError) {
    console.error(
        "[Supabase] Error fetching user counts:",
        { studentError, teacherError, parentError, activeStudentError }
    );
    // Decide how to handle partial failures - throw generic error for now
    throw new Error(`Failed to fetch one or more user counts.`);
  }

  // Construct the result object
  const userCounts: UserCounts = {
    studentCount: studentCount ?? 0,
    teacherCount: teacherCount ?? 0,
    parentCount: parentCount ?? 0,
    activeStudentCount: activeStudentCount ?? 0,
  };

  console.log(`[Supabase] Received user counts:`, userCounts);
  return userCounts;
};

// --- Fetch Pending Task Count from Supabase ---
export const fetchPendingTaskCount = async (): Promise<TaskStats> => {
  const client = getSupabase();
  console.log(`[Supabase] Fetching Pending Task Count`);

  const { count, error } = await client
    .from('assigned_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('is_complete', true)
    .eq('verification_status', 'pending'); // Match the status enum/text used in DB

  if (error) {
     console.error("[Supabase] Error fetching pending task count:", error.message);
     throw new Error(`Failed to fetch pending task count: ${error.message}`);
  }

  const taskStats: TaskStats = {
    pendingVerificationCount: count ?? 0,
  };

  console.log(`[Supabase] Received task stats:`, taskStats);
  return taskStats;
};