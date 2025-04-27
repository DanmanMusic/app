// src/api/users.ts
import { getSupabase } from '../lib/supabaseClient';
import { SimplifiedStudent, User, UserRole, UserStatus } from '../types/dataTypes';
import { getUserDisplayName } from '../utils/helpers'; // Keep for simplifying student name

// --- Response Type Interfaces (assuming pagination structure) ---
interface ProfilesApiResponse {
  items: User[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

interface FetchUsersParams {
  page?: number;
  limit?: number;
  role: UserRole;
  filter?: UserStatus | 'all'; // Used specifically for students
  searchTerm?: string; // Used specifically for students
  teacherId?: string; // Used specifically for students
  // Add parentId, studentId for fetching linked users later if needed
}

// --- Helper to map DB profile to User type ---
// We need this because link tables aren't directly on the profiles row
const mapProfileToUser = async (profile: any, client: ReturnType<typeof getSupabase>): Promise<User> => {
    const userId = profile.id;
    let instrumentIds: string[] | undefined = undefined;
    let linkedTeacherIds: string[] | undefined = undefined;
    let linkedStudentIds: string[] | undefined = undefined;

    // Fetch related data based on role
    if (profile.role === 'student') {
        const { data: instruments, error: instError } = await client
            .from('student_instruments')
            .select('instrument_id')
            .eq('student_id', userId);
        if (instError) console.error(`Error fetching instruments for student ${userId}:`, instError.message);
        else instrumentIds = instruments?.map(i => i.instrument_id) || [];

        const { data: teachers, error: teachError } = await client
            .from('student_teachers')
            .select('teacher_id')
            .eq('student_id', userId);
         if (teachError) console.error(`Error fetching teachers for student ${userId}:`, teachError.message);
         else linkedTeacherIds = teachers?.map(t => t.teacher_id) || [];

    } else if (profile.role === 'parent') {
         const { data: students, error: stuError } = await client
            .from('parent_students')
            .select('student_id')
            .eq('parent_id', userId);
        if (stuError) console.error(`Error fetching students for parent ${userId}:`, stuError.message);
        else linkedStudentIds = students?.map(s => s.student_id) || [];
    }
    // Teachers don't have specific links stored *on* their profile in this model

    return {
        id: profile.id,
        role: profile.role as UserRole,
        firstName: profile.first_name,
        lastName: profile.last_name,
        nickname: profile.nickname ?? undefined,
        status: profile.status as UserStatus,
        // Add fetched links if applicable
        ...(instrumentIds !== undefined && { instrumentIds }),
        ...(linkedTeacherIds !== undefined && { linkedTeacherIds }),
        ...(linkedStudentIds !== undefined && { linkedStudentIds }),
    };
}

// --- Generic Fetch Function ---
// This simplifies fetching for Teachers and Parents
const fetchProfilesByRole = async ({
    page = 1,
    limit = 10,
    role,
}: FetchUsersParams): Promise<ProfilesApiResponse> => {
    const client = getSupabase();
    console.log(`[Supabase] Fetching profiles: role=${role}, page=${page}, limit=${limit}`);

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit - 1;

    // Query profiles table filtered by role
    let query = client
        .from('profiles')
        .select('id, role, first_name, last_name, nickname, status', { count: 'exact' }) // Fetch base profile fields + count
        .eq('role', role)
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true })
        .range(startIndex, endIndex);

    const { data, error, count } = await query;

    if (error) {
        console.error(`[Supabase] Error fetching ${role}s:`, error.message);
        throw new Error(`Failed to fetch ${role}s: ${error.message}`);
    }

    const totalItems = count ?? 0;
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;

    // Fetch linked data for each profile (inefficient for large lists, consider DB functions/views later)
    const itemsWithLinks = await Promise.all((data || []).map(profile => mapProfileToUser(profile, client)));

    console.log(`[Supabase] Received ${itemsWithLinks.length} ${role}s from API. Total: ${totalItems}`);

    return {
        items: itemsWithLinks,
        totalPages,
        currentPage: page,
        totalItems,
    };
};


// --- Specific Fetch Functions ---

// Interface matching the old fetchStudents return structure for compatibility
interface FetchStudentsResult {
  students: SimplifiedStudent[]; // Using SimplifiedStudent for hooks
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

export const fetchStudents = async ({
  page = 1,
  limit = 10,
  filter = 'active',
  searchTerm = '',
  teacherId,
}: { // Destructure params for clarity
    page?: number;
    limit?: number;
    filter?: UserStatus | 'all';
    searchTerm?: string;
    teacherId?: string;
 }): Promise<FetchStudentsResult> => {
    const client = getSupabase();
    console.log(`[Supabase] Fetching students: page=${page}, limit=${limit}, filter=${filter}, search='${searchTerm}', teacherId=${teacherId}`);

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit - 1;

    // Start building the query for profiles with role 'student'
    let query = client
        .from('profiles')
        .select('id, first_name, last_name, nickname, status', { count: 'exact' })
        .eq('role', 'student');

    // Apply status filter
    if (filter !== 'all') {
        query = query.eq('status', filter);
    }

    // Apply search term filter (case-insensitive search on concatenated name)
    // Note: This basic search might be slow on large datasets. Consider full-text search later.
    if (searchTerm) {
        // Simple ILIKE search on first or last name
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`);
         // Alternative: Search combined name (might need DB function for efficiency)
         // query = query.ilike('concat(first_name, \' \', last_name)', `%${searchTerm}%`);
    }

    // Apply teacherId filter using the student_teachers link table
    if (teacherId) {
        // Fetch student IDs linked to the teacher first
        const { data: teacherStudentLinks, error: linkError } = await client
            .from('student_teachers')
            .select('student_id')
            .eq('teacher_id', teacherId);

        if (linkError) {
             console.error(`[Supabase] Error fetching student links for teacher ${teacherId}:`, linkError.message);
             throw new Error(`Failed to fetch student links for teacher: ${linkError.message}`);
        }

        const linkedStudentIds = teacherStudentLinks?.map(link => link.student_id) || [];

        if (linkedStudentIds.length === 0) {
            // If teacher has no students, return empty result immediately
             console.log(`[Supabase] Teacher ${teacherId} has no linked students.`);
             return { students: [], totalPages: 1, currentPage: 1, totalItems: 0 };
        }
        // Add the filter to the main query
        query = query.in('id', linkedStudentIds);
    }

    // Add ordering and pagination
    query = query
        .order('status', { ascending: true }) // Active first
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true })
        .range(startIndex, endIndex);

    // Execute the query
    const { data: studentProfiles, error, count } = await query;

    if (error) {
        console.error(`[Supabase] Error fetching students:`, error.message);
        throw new Error(`Failed to fetch students: ${error.message}`);
    }

    const totalItems = count ?? 0;
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;

    // Fetch instruments for the fetched students (could be optimized with a join or view later)
    const studentIds = studentProfiles?.map(p => p.id) || [];
    let instrumentsMap: Record<string, string[]> = {};
    if (studentIds.length > 0) {
         const { data: instrumentsData, error: instError } = await client
            .from('student_instruments')
            .select('student_id, instrument_id')
            .in('student_id', studentIds);

        if (instError) {
            console.error(`[Supabase] Error fetching instruments for student list:`, instError.message);
            // Proceed without instruments if fetch fails
        } else {
            instrumentsMap = (instrumentsData || []).reduce((acc, row) => {
                if (!acc[row.student_id]) acc[row.student_id] = [];
                acc[row.student_id].push(row.instrument_id);
                return acc;
            }, {} as Record<string, string[]>);
        }
    }


    // Map profiles to SimplifiedStudent structure
    const simplifiedStudents = (studentProfiles || []).map(profile => ({
        id: profile.id,
        name: getUserDisplayName(profile), // Use helper for consistent display name
        instrumentIds: instrumentsMap[profile.id] || [], // Get instruments from map
        balance: 0, // TODO: Fetch balance separately or integrate later
        isActive: profile.status === 'active',
    }));

    console.log(`[Supabase] Received ${simplifiedStudents.length} students from API. Total: ${totalItems}`);

    return {
        students: simplifiedStudents,
        totalPages,
        currentPage: page,
        totalItems,
    };
};

// --- Fetch Teachers ---
export const fetchTeachers = async ({
    page = 1,
    limit = 10,
  }: { page?: number, limit?: number } = {}): Promise<ProfilesApiResponse> => {
      // Reuse the generic fetch function
      return fetchProfilesByRole({ page, limit, role: 'teacher' });
};

// --- Fetch Parents ---
export const fetchParents = async ({
    page = 1,
    limit = 10,
 }: { page?: number, limit?: number } = {}): Promise<ProfilesApiResponse> => {
     // Reuse the generic fetch function
     return fetchProfilesByRole({ page, limit, role: 'parent' });
};


// --- Fetch Single User Profile (more complete) ---
export const fetchUserProfile = async (userId: string): Promise<User | null> => {
    const client = getSupabase();
    console.log(`[Supabase] Fetching profile for user: ${userId}`);

    const { data: profile, error } = await client
        .from('profiles')
        .select('id, role, first_name, last_name, nickname, status')
        .eq('id', userId)
        .single(); // Use single to get one record or null/error

    if (error) {
        // If error is "PGRST116: Row not found", return null gracefully
        if (error.code === 'PGRST116') {
             console.log(`[Supabase] Profile not found for user: ${userId}`);
             return null;
        }
        // Otherwise, log and throw
        console.error(`[Supabase] Error fetching profile for ${userId}:`, error.message);
        throw new Error(`Failed to fetch profile: ${error.message}`);
    }

    if (!profile) return null; // Should be handled by single() error check, but belt-and-suspenders

    // Fetch linked data and map to the full User type
    return mapProfileToUser(profile, client);
};


// --- Write Operations ---

// TODO: createUser needs to handle auth.users creation FIRST, then profiles.
// This requires Admin privileges on Supabase (`service_role` key or Edge Function).
// For now, this function will likely fail without proper setup or if RLS blocks anon inserts
// into auth.users (which it should).
export const createUser = async (userData: Omit<User, 'id' | 'status'>): Promise<User> => {
    const client = getSupabase();
    console.warn('[Supabase] createUser: Attempting profile creation. Ensure RLS allows and consider auth.users creation.');
    // This function needs significant rework when Auth is added.
    // It cannot create the auth.users entry from the client with just anon key.

    // TEMPORARY: Assume profile insert works due to permissive RLS for dev testing UI flow.
    const profileData = {
        // id: ??? Needs ID from auth.users
        role: userData.role,
        first_name: userData.firstName,
        last_name: userData.lastName,
        nickname: userData.nickname,
        status: 'active', // Default status
    };

    // This will fail without an ID linked to auth.users
    // For now, let's simulate success by throwing a specific error if needed
    // Or, modify RLS on profiles temporarily to not require the FK during testing

    // Let's throw an error indicating the limitation
    console.error("[Supabase] createUser Limitation: Cannot create auth.users entry from client. This requires server-side logic (Edge Function or Admin SDK).");
    throw new Error("User creation requires server-side implementation.");

    /*
    // Hypothetical future structure (inside Edge Function):
    // 1. Create auth user: const { data: authUser, error: authError } = await supabase.auth.admin.createUser({...});
    // 2. If success, insert profile: const { data: profile, error: profileError } = await supabase.from('profiles').insert({ id: authUser.user.id, ...profileData }).select().single();
    // 3. If profile insert success, add links: await supabase.from('student_instruments').insert([...]);
    // 4. Return mapped User object
    */

   // Temporary return for type check (will not be reached due to throw)
   // return {} as User;
};

// updateUser primarily modifies the profiles table. Link table updates might need separate logic or transactions.
export const updateUser = async ({
  userId,
  updates,
}: {
  userId: string;
  updates: Partial<Omit<User, 'id' | 'role' | 'status'>>; // Can update name, nickname, links
}): Promise<User> => {
    const client = getSupabase();
    console.log(`[Supabase] Updating profile for user ${userId}:`, updates);

    // Prepare payload for 'profiles' table update
    const profileUpdates: { first_name?: string; last_name?: string; nickname?: string | null } = {};
    let needsProfileUpdate = false; // Flag to track if DB update is needed

    if (updates.firstName !== undefined) {
        profileUpdates.first_name = updates.firstName;
        needsProfileUpdate = true;
    }
    if (updates.lastName !== undefined) {
        profileUpdates.last_name = updates.lastName;
        needsProfileUpdate = true;
    }
    // Use hasOwnProperty to correctly handle setting nickname to null or empty string
    if (updates.hasOwnProperty('nickname')) {
        profileUpdates.nickname = updates.nickname || null; // Set db field to null if nickname is empty/null/undefined
        needsProfileUpdate = true;
    }

    // --- Execute Profile Update if Needed ---
    if (needsProfileUpdate) {
        console.log(`[Supabase] Updating profile fields for ${userId}:`, profileUpdates);
        // Directly await the update operation
        const { error: profileError } = await client
            .from('profiles')
            .update(profileUpdates)
            .eq('id', userId);

        // Check for error after awaiting
        if (profileError) {
            console.error(`[Supabase] Error updating profile for ${userId}:`, profileError.message);
            // Throw the error with the correct message
            throw new Error(`Failed to update profile: ${profileError.message}`);
        }
        console.log(`[Supabase] Profile fields updated successfully for ${userId}.`);
    } else {
        console.log(`[Supabase] No profile fields needed updating for ${userId}.`);
    }
    // --- End Profile Update ---


    // Handle link table updates (Deferred - Warnings remain)
    if (updates.instrumentIds !== undefined) {
         console.warn(`[Supabase] updateUser: Updating instrumentIds for ${userId} not fully implemented yet.`);
         // Requires fetching current links, comparing, deleting removed, inserting added.
    }
    if (updates.linkedTeacherIds !== undefined) {
         console.warn(`[Supabase] updateUser: Updating linkedTeacherIds for ${userId} not fully implemented yet.`);
    }
     if (updates.linkedStudentIds !== undefined) {
         console.warn(`[Supabase] updateUser: Updating linkedStudentIds for ${userId} not fully implemented yet.`);
    }


    // Re-fetch the complete user profile after updates (or if no updates were needed but caller expects the user back)
    console.log(`[Supabase] Re-fetching full profile for ${userId} after update attempt.`);
    const updatedUser = await fetchUserProfile(userId);
    if (!updatedUser) {
        // This is more concerning if an update supposedly succeeded
        console.error(`[Supabase] Failed to re-fetch user profile for ${userId} after update attempt.`);
        throw new Error(`Update might have succeeded, but failed to re-fetch profile for ${userId}.`);
    }

    console.log(`[Supabase] User ${userId} update process finished.`);
    return updatedUser;
};

// deleteUser needs Admin privileges to delete from auth.users. The profile delete will cascade.
// Client-side delete with anon key likely won't work on auth.users.
export const deleteUser = async (userId: string): Promise<void> => {
     const client = getSupabase();
     console.warn(`[Supabase] deleteUser: Attempting delete for ${userId}. Requires Admin privileges/Edge Function for auth.users removal.`);

     // TEMPORARY: Assume profile delete works due to permissive RLS (will cascade from auth delete later)
     // This won't actually delete the user from Supabase Auth.
     const { error: profileDeleteError } = await client
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileDeleteError) {
        console.error(`[Supabase] Error deleting profile for ${userId} (Auth user likely still exists):`, profileDeleteError.message);
        throw new Error(`Failed to delete profile (Auth user may remain): ${profileDeleteError.message}`);
      }

     // Proper implementation requires Admin SDK call:
     // await supabase.auth.admin.deleteUser(userId);
     console.error("[Supabase] deleteUser Limitation: Cannot delete auth.users entry from client. Profile possibly deleted, but Auth User remains.");
     throw new Error("User deletion requires server-side implementation.");

     // console.log(`[Supabase] User ${userId} deleted successfully.`); // Only if auth delete worked
};

// toggleUserStatus updates the 'status' field in the 'profiles' table.
export const toggleUserStatus = async (userId: string): Promise<User> => {
    const client = getSupabase();
    console.log(`[Supabase] Toggling status for user ${userId}`);

    // 1. Fetch current status
    const { data: currentProfile, error: fetchError } = await client
        .from('profiles')
        .select('status')
        .eq('id', userId)
        .single();

    if (fetchError || !currentProfile) {
        console.error(`[Supabase] Error fetching current status for ${userId}:`, fetchError?.message);
        throw new Error(`Failed to fetch user status: ${fetchError?.message || 'User not found'}`);
    }

    // 2. Determine new status
    const newStatus: UserStatus = currentProfile.status === 'active' ? 'inactive' : 'active';

    // 3. Update the status
    const { data: updatedProfileData, error: updateError } = await client
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId)
        .select('id') // Only need to confirm update happened
        .single();

    if (updateError || !updatedProfileData) {
        console.error(`[Supabase] Error updating status for ${userId}:`, updateError?.message);
        throw new Error(`Failed to toggle status: ${updateError?.message || 'Update failed'}`);
    }

     console.log(`[Supabase] Status for user ${userId} toggled to ${newStatus}. Re-fetching profile...`);

     // 4. Re-fetch the full profile to return consistent User object
     const updatedUser = await fetchUserProfile(userId);
     if (!updatedUser) {
        // This shouldn't happen if the update succeeded, but handle defensively
         console.error(`[Supabase] Failed to re-fetch profile for ${userId} after status toggle.`);
         throw new Error(`Status updated, but failed to re-fetch profile.`);
     }

    return updatedUser;
};