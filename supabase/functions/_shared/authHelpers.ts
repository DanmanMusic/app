// supabase/functions/_shared/authHelpers.ts

import { SupabaseClient } from 'supabase-js';

/**
 * Checks if a given user ID belongs to a profile with 'admin' role AND 'active' status.
 * Logs errors but returns false on failure.
 */
export async function isActiveAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  // console.log(`[isActiveAdmin] Checking user: ${userId}`);
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', userId)
      .single();
    if (error) {
      console.error(`[isActiveAdmin] Error fetching profile for ${userId}: ${error.message}`);
      return false;
    }
    return data?.role === 'admin' && data?.status === 'active';
  } catch (err) {
    console.error(`[isActiveAdmin] Exception for user ${userId}: ${err.message}`);
    return false;
  }
}

/**
 * Checks if a given user ID belongs to a profile with 'teacher' role AND 'active' status.
 * Logs errors but returns false on failure.
 */
export async function isActiveTeacher(supabase: SupabaseClient, userId: string): Promise<boolean> {
  // console.log(`[isActiveTeacher] Checking user: ${userId}`);
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', userId)
      .single();
    if (error) {
      console.error(`[isActiveTeacher] Error fetching profile for ${userId}: ${error.message}`);
      return false;
    }
    return data?.role === 'teacher' && data?.status === 'active';
  } catch (err) {
    console.error(`[isActiveTeacher] Exception for user ${userId}: ${err.message}`);
    return false;
  }
}

/**
 * Checks if a given user ID belongs to a profile with 'admin' OR 'teacher' role AND 'active' status.
 * Returns an object containing the authorization result and the user's role (or null).
 * Logs errors and returns { authorized: false, role: null } on failure.
 */
export async function isActiveAdminOrTeacher(
  supabase: SupabaseClient,
  userId: string
): Promise<{ authorized: boolean; role: string | null }> {
  // <-- UPDATED RETURN TYPE
  // console.log(`[isActiveAdminOrTeacher] Checking user: ${userId}`);
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', userId)
      .single();

    // Log the fetched data regardless of error for debugging
    console.log('[isActiveAdminOrTeacher] Fetched data:', data);

    if (error) {
      // Throw the error to be caught by the catch block below
      throw new Error(`DB Error fetching profile for ${userId}: ${error.message}`);
    }

    if (!data) {
      // Handle case where user profile doesn't exist
      console.warn(`[isActiveAdminOrTeacher] Profile not found for user ${userId}.`);
      return { authorized: false, role: null };
    }

    const isActive = data.status === 'active';
    const isAllowedRole = data.role === 'admin' || data.role === 'teacher';
    const userRole = data.role || null; // Get the role to return

    // Return structured object
    return { authorized: isActive && isAllowedRole, role: userRole };
  } catch (err) {
    console.error(`[isActiveAdminOrTeacher] Exception for user ${userId}: ${err.message}`);
    // Return structured object indicating failure
    return { authorized: false, role: null }; // Return null role on error
  }
}

/**
 * Checks if a given teacher ID is linked to a given student ID via the student_teachers table.
 * Logs errors but returns false on failure.
 */
export async function isTeacherLinked(
  supabase: SupabaseClient,
  teacherId: string,
  studentId: string
): Promise<boolean> {
  if (!teacherId || !studentId || teacherId === studentId) return false;
  // console.log(`[isTeacherLinked] Checking link T:${teacherId} S:${studentId}`);
  try {
    const { count, error } = await supabase
      .from('student_teachers')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', teacherId)
      .eq('student_id', studentId);

    if (error) {
      console.error(
        `[isTeacherLinked] Error checking link T:${teacherId} S:${studentId}: ${error.message}`
      );
      return false;
    }
    return (count ?? 0) > 0;
  } catch (err) {
    console.error(
      `[isTeacherLinked] Exception checking link T:${teacherId} S:${studentId}: ${err.message}`
    );
    return false;
  }
}

export async function hashTokenWithSalt(token: string): Promise<string> {
  const salt = Deno.env.get('REFRESH_TOKEN_SALT');
  if (!salt) {
    console.error('CRITICAL: REFRESH_TOKEN_SALT environment variable is not set!');
    throw new Error('Server configuration error [Salt Missing]');
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + token); // Consistent order: salt first
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
