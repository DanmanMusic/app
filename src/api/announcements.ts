// src/api/announcements.ts
import { getSupabase } from '../lib/supabaseClient';
import { Announcement, AnnouncementType } from '../types/dataTypes';

/**
 * Fetches all announcements from Supabase, ordered by date descending.
 */
export const fetchAnnouncements = async (): Promise<Announcement[]> => {
  const client = getSupabase();
  console.log(`[Supabase] Fetching Announcements`);

  const { data, error } = await client
    .from('announcements')
    .select('id, type, title, message, date, related_student_id')
    .order('date', { ascending: false }); // Order by the 'date' column

  if (error) {
    console.error(`[Supabase] Error fetching announcements:`, error.message);
    throw new Error(`Failed to fetch announcements: ${error.message}`);
  }

  console.log(`[Supabase] Received ${data?.length ?? 0} announcement items.`);

  // Map the snake_case data from Supabase to the camelCase Announcement type
  const announcements: Announcement[] = (data || []).map(item => ({
    id: item.id,
    type: item.type as AnnouncementType, // Cast the type from DB
    title: item.title,
    message: item.message,
    date: item.date, // Supabase returns ISO string for timestamptz
    relatedStudentId: item.related_student_id ?? undefined, // Map snake_case to camelCase, ensure undefined if null
  }));

  return announcements;
};

/**
 * Creates a new announcement item in Supabase.
 */
export const createAnnouncement = async (
  announcementData: Omit<Announcement, 'id' | 'date'> // Input uses camelCase
): Promise<Announcement> => {
  const client = getSupabase();
  console.log('[Supabase] Creating announcement:', announcementData.title);

  // Basic validation
  const trimmedTitle = announcementData.title?.trim();
  const trimmedMessage = announcementData.message?.trim();
  const type = announcementData.type;

  if (!trimmedTitle) {
    throw new Error("Announcement title cannot be empty.");
  }
  if (!trimmedMessage) {
    throw new Error("Announcement message cannot be empty.");
  }
  if (!type) {
    throw new Error("Announcement type must be selected.");
  }
  // Note: relatedStudentId is optional, no validation needed here

  // Prepare object with snake_case keys for Supabase insertion
  const itemToInsert = {
    type: type,
    title: trimmedTitle,
    message: trimmedMessage,
    related_student_id: announcementData.relatedStudentId ?? null, // Use null if undefined
    // 'date' column defaults to now() in the database
  };

  const { data, error } = await client
    .from('announcements')
    .insert(itemToInsert)
    .select('id, type, title, message, date, related_student_id') // Select columns needed for Announcement type
    .single(); // Expect a single row back

  if (error || !data) {
    console.error(`[Supabase] Error creating announcement:`, error?.message);
    throw new Error(`Failed to create announcement: ${error?.message || 'No data returned'}`);
  }

  // Map the result back to the camelCase Announcement type
  const createdAnnouncement: Announcement = {
    id: data.id,
    type: data.type as AnnouncementType,
    title: data.title,
    message: data.message,
    date: data.date,
    relatedStudentId: data.related_student_id ?? undefined,
  };

  console.log(`[Supabase] Announcement created successfully (ID: ${createdAnnouncement.id})`);
  return createdAnnouncement;
};

/**
 * Updates an existing announcement item in Supabase.
 */
export const updateAnnouncement = async ({
  announcementId,
  updates, // Input uses camelCase
}: {
  announcementId: string;
  updates: Partial<Omit<Announcement, 'id' | 'date'>>; // Only allow updating specific fields
}): Promise<Announcement> => {
  const client = getSupabase();
  console.log(`[Supabase] Updating announcement ${announcementId}:`, updates);

  // Prepare the payload with snake_case keys, only including provided updates
  const updatePayload: {
      type?: AnnouncementType;
      title?: string;
      message?: string;
      related_student_id?: string | null;
   } = {};
  let hasChanges = false;

  if (updates.type !== undefined) {
    updatePayload.type = updates.type;
    hasChanges = true;
  }
  if (updates.title !== undefined) {
    const trimmedTitle = updates.title.trim();
    if (!trimmedTitle) throw new Error("Title cannot be empty.");
    updatePayload.title = trimmedTitle;
    hasChanges = true;
  }
  if (updates.message !== undefined) {
    const trimmedMessage = updates.message.trim();
     if (!trimmedMessage) throw new Error("Message cannot be empty.");
    updatePayload.message = trimmedMessage;
    hasChanges = true;
  }
  if (updates.hasOwnProperty('relatedStudentId')) { // Check if property exists, even if value is null/undefined
    updatePayload.related_student_id = updates.relatedStudentId ?? null;
    hasChanges = true;
  }

  if (!hasChanges) {
     console.warn(`[Supabase] updateAnnouncement called for ${announcementId} with no changes.`);
     // Fetch and return the current data if no changes detected
     const { data: currentData, error: currentError } = await client
        .from('announcements')
        .select('id, type, title, message, date, related_student_id')
        .eq('id', announcementId)
        .single();
     if (currentError || !currentData) {
         throw new Error(`Failed to fetch current announcement ${announcementId}: ${currentError?.message || 'Not Found'}`);
     }
      return {
        id: currentData.id,
        type: currentData.type as AnnouncementType,
        title: currentData.title,
        message: currentData.message,
        date: currentData.date,
        relatedStudentId: currentData.related_student_id ?? undefined,
      };
  }

  const { data, error } = await client
    .from('announcements')
    .update(updatePayload)
    .eq('id', announcementId)
    .select('id, type, title, message, date, related_student_id')
    .single();

  if (error || !data) {
    console.error(`[Supabase] Error updating announcement ${announcementId}:`, error?.message);
    throw new Error(`Failed to update announcement ${announcementId}: ${error?.message || 'No data returned'}`);
  }

  // Map result back to Announcement type
  const updatedAnnouncement: Announcement = {
      id: data.id,
      type: data.type as AnnouncementType,
      title: data.title,
      message: data.message,
      date: data.date,
      relatedStudentId: data.related_student_id ?? undefined,
  };

  console.log(`[Supabase] Announcement ${announcementId} updated successfully.`);
  return updatedAnnouncement;
};

/**
 * Deletes an announcement item from Supabase.
 */
export const deleteAnnouncement = async (announcementId: string): Promise<void> => {
  const client = getSupabase();
  console.log(`[Supabase] Deleting announcement ${announcementId}`);

  const { error } = await client
    .from('announcements')
    .delete()
    .eq('id', announcementId);

  if (error) {
    console.error(`[Supabase] Error deleting announcement ${announcementId}:`, error.message);
    throw new Error(`Failed to delete announcement ${announcementId}: ${error.message}`);
  }

  console.log(`[Supabase] Announcement ${announcementId} deleted successfully.`);
  // No return value
};