// src/api/users.ts
import { getSupabase } from '../lib/supabaseClient'; // Use getSupabase
import { SimplifiedStudent, User, UserRole, UserStatus } from '../types/dataTypes';
import { getUserDisplayName } from '../utils/helpers';

// --- Response Type Interfaces ---
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
  filter?: UserStatus | 'all';
  searchTerm?: string;
  teacherId?: string;
}

interface FetchStudentsResult {
  students: SimplifiedStudent[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

// --- Helper mapProfileToUser ---
// Fetches linked data and maps a profile row to the User type
const mapProfileToUser = async (profile: any, client: ReturnType<typeof getSupabase>): Promise<User> => {
    const userId = profile.id;
    let instrumentIds: string[] | undefined = undefined;
    let linkedTeacherIds: string[] | undefined = undefined;
    let linkedStudentIds: string[] | undefined = undefined;

    // Fetch related data based on role
    if (profile.role === 'student') {
        // Fetch instruments
        const { data: instruments, error: instError } = await client
            .from('student_instruments')
            .select('instrument_id')
            .eq('student_id', userId);
        if (instError) console.error(`Error fetching instruments for student ${userId}:`, instError.message);
        else instrumentIds = instruments?.map(i => i.instrument_id) || [];

        // Fetch teachers
        const { data: teachers, error: teachError } = await client
            .from('student_teachers')
            .select('teacher_id')
            .eq('student_id', userId);
         if (teachError) console.error(`Error fetching teachers for student ${userId}:`, teachError.message);
         else linkedTeacherIds = teachers?.map(t => t.teacher_id) || [];

    } else if (profile.role === 'parent') {
         // Fetch students linked to parent
         const { data: students, error: stuError } = await client
            .from('parent_students')
            .select('student_id')
            .eq('parent_id', userId);
        if (stuError) console.error(`Error fetching students for parent ${userId}:`, stuError.message);
        else linkedStudentIds = students?.map(s => s.student_id) || [];
    }
    // Teachers don't have specific links stored *on* their profile in this model

    // Return the mapped User object
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

// --- Generic fetchProfilesByRole ---
// Fetches paginated profiles for Teachers or Parents
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

     // Fetch linked data for each profile (can be inefficient, consider views/RPC later)
     const itemsWithLinks = await Promise.all((data || []).map(profile => mapProfileToUser(profile, client)));

     console.log(`[Supabase] Received ${itemsWithLinks.length} ${role}s from API. Total: ${totalItems}`);

     return {
        items: itemsWithLinks,
        totalPages,
        currentPage: page,
        totalItems,
     };
};


// --- fetchStudents ---
// Fetches paginated students with filtering and search
export const fetchStudents = async ({
  page = 1,
  limit = 20, // Default page size
  filter = 'active',
  searchTerm = '',
  teacherId,
}: {
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

    // Apply search term filter
    if (searchTerm) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`);
    }

    // Apply teacherId filter using the student_teachers link table
    if (teacherId) {
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
             console.log(`[Supabase] Teacher ${teacherId} has no linked students.`);
             return { students: [], totalPages: 1, currentPage: 1, totalItems: 0 };
        }
        query = query.in('id', linkedStudentIds);
    }

    // Add ordering and pagination
    query = query
        .order('status', { ascending: true })
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

    // Fetch instruments for the fetched students
    const studentIds = studentProfiles?.map(p => p.id) || [];
    let instrumentsMap: Record<string, string[]> = {};
    if (studentIds.length > 0) {
         const { data: instrumentsData, error: instError } = await client
            .from('student_instruments')
            .select('student_id, instrument_id')
            .in('student_id', studentIds);

        if (instError) {
            console.error(`[Supabase] Error fetching instruments for student list:`, instError.message);
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
        instrumentIds: instrumentsMap[profile.id] || [],
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

// --- fetchTeachers ---
// Fetches paginated teachers
export const fetchTeachers = async ({
    page = 1,
    limit = 20, // Default page size
 }: { page?: number, limit?: number } = {}): Promise<ProfilesApiResponse> => {
      // Reuse the generic fetch function
      return fetchProfilesByRole({ page, limit, role: 'teacher' });
};

// --- fetchParents ---
// Fetches paginated parents
export const fetchParents = async ({
    page = 1,
    limit = 20, // Default page size
 }: { page?: number, limit?: number } = {}): Promise<ProfilesApiResponse> => {
     // Reuse the generic fetch function
     return fetchProfilesByRole({ page, limit, role: 'parent' });
};


// --- fetchUserProfile ---
// Fetches a single complete user profile by ID, including linked data
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

    if (!profile) return null; // Should be handled by single() error check

    // Fetch linked data and map to the full User type
    return mapProfileToUser(profile, client);
};


// --- Write Operations ---

// *** UPDATED createUser TO CALL EDGE FUNCTION ***
export const createUser = async (
    // Payload structure should match the Edge Function's expected input
    // This includes potentially optional fields like nickname, instrumentIds, linkedTeacherIds
    // And 'initialPin' only if role is student (though handled internally in function now)
    userData: Omit<User, 'id' | 'status'> & { initialPin?: string }
): Promise<User> => {
  const client = getSupabase();
  console.log('[API] Calling createUser Edge Function with payload:', userData);

  // Use supabase.functions.invoke() to call the deployed function
  const { data, error } = await client.functions.invoke('createUser', {
    body: userData, // Pass the client-side data structure as the body
  });

  if (error) {
    console.error('[API] Error invoking createUser function:', error);
    // Attempt to extract a more specific error message from the function response
    let detailedError = error.message || 'Unknown function error';
    if (error.context && typeof error.context === 'object' && error.context !== null && 'error' in error.context) {
        detailedError = String((error.context as any).error) || detailedError;
    } else {
        try {
            const parsed = JSON.parse(error.message);
            if (parsed && parsed.error) detailedError = String(parsed.error);
        } catch (e) { /* Ignore parsing error */ }
    }
    // Add context if available
    if (error.context?.message) {
        detailedError += ` (Context: ${error.context.message})`;
    }
    throw new Error(`User creation failed: ${detailedError}`);
  }

  // Assuming the function returns the created User object matching the User type
  console.log('[API] createUser Edge Function returned successfully:', data);

  // Basic validation of the returned data structure
  if (!data || typeof data !== 'object' || !data.id || !data.role || !data.firstName || !data.lastName || !data.status) {
      console.error('[API] createUser Edge Function returned unexpected data structure:', data);
      throw new Error('User creation function returned invalid data format.');
  }

  // Cast the returned data to the User type
  return data as User;
};
// *** END UPDATED createUser ***


// --- updateUser ---
// Updates profile fields. Link table updates are currently deferred/logged as warnings.
export const updateUser = async ({
  userId,
  updates,
}: {
  userId: string;
  updates: Partial<Omit<User, 'id' | 'role' | 'status'>>;
}): Promise<User> => {
    const client = getSupabase();
    console.log(`[Supabase] Updating profile for user ${userId}:`, updates);

    // Prepare payload for 'profiles' table update
    const profileUpdates: { first_name?: string; last_name?: string; nickname?: string | null } = {};
    let needsProfileUpdate = false;

    if (updates.firstName !== undefined) { profileUpdates.first_name = updates.firstName; needsProfileUpdate = true; }
    if (updates.lastName !== undefined) { profileUpdates.last_name = updates.lastName; needsProfileUpdate = true; }
    if (updates.hasOwnProperty('nickname')) { profileUpdates.nickname = updates.nickname || null; needsProfileUpdate = true; }

    // --- Execute Profile Update if Needed ---
    if (needsProfileUpdate) {
        console.log(`[Supabase] Updating profile fields for ${userId}:`, profileUpdates);
        const { error: profileError } = await client.from('profiles').update(profileUpdates).eq('id', userId);
        if (profileError) { throw new Error(`Failed to update profile: ${profileError.message}`); }
        console.log(`[Supabase] Profile fields updated successfully for ${userId}.`);
    } else { console.log(`[Supabase] No profile fields needed updating for ${userId}.`); }

    // --- Handle Link Table Updates (Deferred - Log Warnings) ---
    // TODO: Implement Edge Function or dedicated API calls for link table updates
    if (updates.instrumentIds !== undefined) { console.warn(`[Supabase] updateUser: Updating instrumentIds for ${userId} requires server-side logic (deferred).`); }
    if (updates.linkedTeacherIds !== undefined) { console.warn(`[Supabase] updateUser: Updating linkedTeacherIds for ${userId} requires server-side logic (deferred).`); }
    if (updates.linkedStudentIds !== undefined) { console.warn(`[Supabase] updateUser: Updating linkedStudentIds for ${userId} requires server-side logic (deferred).`); }


    // Re-fetch the complete user profile after updates
    console.log(`[Supabase] Re-fetching full profile for ${userId} after update attempt.`);
    const updatedUser = await fetchUserProfile(userId);
    if (!updatedUser) { throw new Error(`Update might have succeeded, but failed to re-fetch profile for ${userId}.`); }

    console.log(`[Supabase] User ${userId} update process finished.`);
    return updatedUser;
};

// --- deleteUser ---
// Deferred - Requires server-side implementation (Edge Function)
export const deleteUser = async (userId: string): Promise<void> => {
     console.error("[API] deleteUser called, but implementation is deferred to Edge Function.");
     throw new Error("User deletion requires server-side implementation (Edge Function).");
     // Placeholder/Previous logic:
     // const client = getSupabase();
     // console.warn(`[Supabase] deleteUser: Requires Admin privileges/Edge Function for auth.users removal.`);
     // const { error: profileDeleteError } = await client.from('profiles').delete().eq('id', userId);
     // if (profileDeleteError) { throw new Error(`Failed to delete profile (Auth user may remain): ${profileDeleteError.message}`); }
};

// --- toggleUserStatus ---
// Updates the 'status' field in the 'profiles' table.
export const toggleUserStatus = async (userId: string): Promise<User> => {
    const client = getSupabase();
    console.log(`[Supabase] Toggling status for user ${userId}`);

    // 1. Fetch current status
    const { data: currentProfile, error: fetchError } = await client.from('profiles').select('status').eq('id', userId).single();
    if (fetchError || !currentProfile) { throw new Error(`Failed to fetch user status: ${fetchError?.message || 'User not found'}`); }

    // 2. Determine new status
    const newStatus: UserStatus = currentProfile.status === 'active' ? 'inactive' : 'active';

    // 3. Update the status
    const { data: updatedProfileData, error: updateError } = await client.from('profiles').update({ status: newStatus }).eq('id', userId).select('id').single();
    if (updateError || !updatedProfileData) { throw new Error(`Failed to toggle status: ${updateError?.message || 'Update failed'}`); }

     console.log(`[Supabase] Status for user ${userId} toggled to ${newStatus}. Re-fetching profile...`);

     // 4. Re-fetch the full profile to return consistent User object
     const updatedUser = await fetchUserProfile(userId);
     if (!updatedUser) { throw new Error(`Status updated, but failed to re-fetch profile.`); }

    return updatedUser;
};

export const fetchActiveProfilesForDevSelector = async (): Promise<Pick<User, 'id' | 'role' | 'firstName' | 'lastName' | 'nickname' | 'status'>[]> => {
    const client = getSupabase();
    console.log(`[Supabase] Fetching Active Profiles for Dev Selector`);
  
    // Select only needed fields and filter for active users
    const { data, error } = await client
      .from('profiles')
      .select('id, role, first_name, last_name, nickname, status')
      .eq('status', 'active') // Only show active users in the selector
      .order('role') // Group by role visually
      .order('last_name')
      .order('first_name');
      // Add a reasonable limit if needed, e.g., .limit(100)
  
    if (error) {
      console.error(`[Supabase] Error fetching active profiles for selector:`, error.message);
      // Return empty array on error to avoid crashing the selector
      return [];
    }
  
    // Map snake_case to camelCase User subset
    return (data || []).map(profile => ({
      id: profile.id,
      role: profile.role as UserRole,
      firstName: profile.first_name,
      lastName: profile.last_name,
      nickname: profile.nickname ?? undefined,
      status: profile.status as UserStatus, // Status will always be 'active' here
    }));
  };