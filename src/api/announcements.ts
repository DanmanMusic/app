import { getSupabase } from '../lib/supabaseClient';

import { Announcement, AnnouncementType } from '../types/dataTypes';

export const fetchAnnouncements = async (): Promise<Announcement[]> => {
  const client = getSupabase();
  console.log(`[Supabase] Fetching Announcements`);
  const { data, error } = await client
    .from('announcements')
    .select('id, type, title, message, date, related_student_id')
    .order('date', { ascending: false });
  if (error) {
    console.error(`[Supabase] Error fetching announcements:`, error.message);
    throw new Error(`Failed to fetch announcements: ${error.message}`);
  }
  console.log(`[Supabase] Received ${data?.length ?? 0} announcement items.`);
  const announcements: Announcement[] = (data || []).map(item => ({
    id: item.id,
    type: item.type as AnnouncementType,
    title: item.title,
    message: item.message,
    date: item.date,
    relatedStudentId: item.related_student_id ?? undefined,
  }));
  return announcements;
};

export const createAnnouncement = async (
  announcementData: Omit<Announcement, 'id' | 'date'>
): Promise<Announcement> => {
  const client = getSupabase();
  console.log('[Supabase] Creating announcement:', announcementData.title);
  const trimmedTitle = announcementData.title?.trim();
  const trimmedMessage = announcementData.message?.trim();
  const type = announcementData.type;
  if (!trimmedTitle) {
    throw new Error('Announcement title cannot be empty.');
  }
  if (!trimmedMessage) {
    throw new Error('Announcement message cannot be empty.');
  }
  if (!type) {
    throw new Error('Announcement type must be selected.');
  }
  const itemToInsert = {
    type: type,
    title: trimmedTitle,
    message: trimmedMessage,
    related_student_id: announcementData.relatedStudentId ?? null,
  };
  const { data, error } = await client
    .from('announcements')
    .insert(itemToInsert)
    .select('id, type, title, message, date, related_student_id')
    .single();
  if (error || !data) {
    console.error(`[Supabase] Error creating announcement:`, error?.message);
    throw new Error(`Failed to create announcement: ${error?.message || 'No data returned'}`);
  }
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

export const updateAnnouncement = async ({
  announcementId,
  updates,
}: {
  announcementId: string;
  updates: Partial<Omit<Announcement, 'id' | 'date'>>;
}): Promise<Announcement> => {
  const client = getSupabase();
  console.log(`[Supabase] Updating announcement ${announcementId}:`, updates);
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
    if (!trimmedTitle) throw new Error('Title cannot be empty.');
    updatePayload.title = trimmedTitle;
    hasChanges = true;
  }
  if (updates.message !== undefined) {
    const trimmedMessage = updates.message.trim();
    if (!trimmedMessage) throw new Error('Message cannot be empty.');
    updatePayload.message = trimmedMessage;
    hasChanges = true;
  }
  if (updates.hasOwnProperty('relatedStudentId')) {
    updatePayload.related_student_id = updates.relatedStudentId ?? null;
    hasChanges = true;
  }
  if (!hasChanges) {
    console.warn(`[Supabase] updateAnnouncement called for ${announcementId} with no changes.`);
    const { data: currentData, error: currentError } = await client
      .from('announcements')
      .select('id, type, title, message, date, related_student_id')
      .eq('id', announcementId)
      .single();
    if (currentError || !currentData) {
      throw new Error(
        `Failed to fetch current announcement ${announcementId}: ${currentError?.message || 'Not Found'}`
      );
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
    throw new Error(
      `Failed to update announcement ${announcementId}: ${error?.message || 'No data returned'}`
    );
  }

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

export const deleteAnnouncement = async (announcementId: string): Promise<void> => {
  const client = getSupabase();
  console.log(`[Supabase] Deleting announcement ${announcementId}`);

  const { error } = await client.from('announcements').delete().eq('id', announcementId);

  if (error) {
    console.error(`[Supabase] Error deleting announcement ${announcementId}:`, error.message);
    throw new Error(`Failed to delete announcement ${announcementId}: ${error.message}`);
  }

  console.log(`[Supabase] Announcement ${announcementId} deleted successfully.`);
};
