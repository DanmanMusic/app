// src/api/stats.ts
import { getSupabase } from '../lib/supabaseClient';

export interface UserCounts {
  studentCount: number;
  teacherCount: number;
  parentCount: number;
  adminCount: number;
  activeStudentCount: number;
}

export interface TaskStats {
  pendingVerificationCount: number;
}

export interface GoalStat {
  reward_id: string;
  goal_count: number;
}

export const fetchUserCounts = async (): Promise<UserCounts> => {
  const client = getSupabase();
  console.log(`[Supabase] Fetching User Counts`);

  const { count: studentCount, error: studentError } = await client
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student');

  const { count: teacherCount, error: teacherError } = await client
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'teacher');

  const { count: parentCount, error: parentError } = await client
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'parent');

  const { count: adminCount, error: adminError } = await client
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin');

  const { count: activeStudentCount, error: activeStudentError } = await client
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student')
    .eq('status', 'active');

  if (studentError || teacherError || parentError || adminError || activeStudentError) {
    console.error('[Supabase] Error fetching user counts:', {
      studentError,
      teacherError,
      parentError,
      adminError,
      activeStudentError,
    });

    throw new Error(`Failed to fetch one or more user counts.`);
  }

  const userCounts: UserCounts = {
    studentCount: studentCount ?? 0,
    teacherCount: teacherCount ?? 0,
    parentCount: parentCount ?? 0,
    adminCount: adminCount ?? 0,
    activeStudentCount: activeStudentCount ?? 0,
  };

  console.log(`[Supabase] Received user counts:`, userCounts);
  return userCounts;
};

export const fetchPendingTaskCount = async (): Promise<TaskStats> => {
  const client = getSupabase();
  console.log(`[Supabase] Fetching Pending Task Count`);

  const { count, error } = await client
    .from('assigned_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('is_complete', true)
    .eq('verification_status', 'pending');

  if (error) {
    console.error('[Supabase] Error fetching pending task count:', error.message);
    throw new Error(`Failed to fetch pending task count: ${error.message}`);
  }

  const taskStats: TaskStats = {
    pendingVerificationCount: count ?? 0,
  };

  console.log(`[Supabase] Received task stats:`, taskStats);
  return taskStats;
};

export const fetchGoalStats = async (companyId: string): Promise<GoalStat[]> => {
  if (!companyId) return [];
  const client = getSupabase();
  const { data, error } = await client.rpc('get_company_goal_stats', {
    p_company_id: companyId,
  });
  if (error) {
    console.error('[API stats] Error fetching goal stats:', error.message);
    throw new Error(`Failed to fetch goal stats: ${error.message}`);
  }
  return data || [];
};
