// src/api/announcements.ts

import { getSupabase } from '../lib/supabaseClient';
import { Announcement, AnnouncementType } from '../types/dataTypes';
import { Database } from '../types/database.types';
import { getUserDisplayName } from '../utils/helpers';

type AnnouncementWithProfile = Database['public']['Tables']['announcements']['Row'] & {
  profiles: Pick<
    Database['public']['Tables']['profiles']['Row'],
    'first_name' | 'last_name' | 'nickname' | 'avatar_path'
  > | null;
};

const mapDbRowToAnnouncement = (item: AnnouncementWithProfile): Announcement => {
  const relatedProfile = item.profiles;
  return {
    id: item.id,
    type: item.type as AnnouncementType,
    title: item.title,
    message: item.message,
    date: item.date,
    relatedStudentId: item.related_student_id ?? undefined,
    relatedStudentName: relatedProfile ? getUserDisplayName(relatedProfile) : undefined,
    relatedStudentAvatarPath: relatedProfile ? relatedProfile.avatar_path : null,
  };
};

export const fetchAnnouncements = async (): Promise<Announcement[]> => {
  const client = getSupabase();
  console.log(`[Supabase] Fetching Announcements`);

  const {
    data: { session },
  } = await client.auth.getSession();

  let query;

  if (session) {
    query = client
      .from('announcements')
      .select('*, profiles ( first_name, last_name, nickname, avatar_path )')
      .order('date', { ascending: false });
  } else {
    query = client
      .from('announcements')
      .select('*, profiles ( first_name, last_name, nickname, avatar_path )')
      .order('date', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    console.error(`[Supabase] Error fetching announcements:`, error.message);
    throw new Error(`Failed to fetch announcements: ${error.message}`);
  }

  const typedData = data as any as AnnouncementWithProfile[];

  const filteredData = session
    ? typedData
    : (typedData || []).filter(item => item.type === 'announcement');

  console.log(
    `[Supabase] Received ${typedData?.length ?? 0} total, returning ${filteredData?.length ?? 0} announcement items.`
  );
  const announcements: Announcement[] = (filteredData || []).map(mapDbRowToAnnouncement);
  return announcements;
};

export const createAnnouncement = async (
  announcementData: Omit<
    Announcement,
    'id' | 'date' | 'relatedStudentName' | 'relatedStudentAvatarPath'
  > & { companyId: string }
): Promise<Announcement> => {
  const client = getSupabase();
  console.log('[Supabase] Creating announcement:', announcementData.title);

  const trimmedTitle = announcementData.title?.trim();
  const trimmedMessage = announcementData.message?.trim();
  if (!trimmedTitle || !trimmedMessage) {
    throw new Error('Announcement title and message cannot be empty.');
  }

  const itemToInsert = {
    type: announcementData.type,
    title: trimmedTitle,
    message: trimmedMessage,
    related_student_id: announcementData.relatedStudentId ?? null,
    company_id: announcementData.companyId,
  };

  const { data, error } = await client
    .from('announcements')
    .insert(itemToInsert)
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create announcement: ${error?.message || 'No data returned'}`);
  }

  const { data: createdAnnouncementData, error: fetchError } = await client
    .from('announcements')
    .select('*, profiles ( first_name, last_name, nickname, avatar_path )')
    .eq('id', data.id)
    .single();

  if (fetchError || !createdAnnouncementData) {
    throw new Error(`Announcement created, but failed to re-fetch details: ${fetchError?.message}`);
  }

  console.log(`[Supabase] Announcement created successfully (ID: ${createdAnnouncementData.id})`);
  return mapDbRowToAnnouncement(createdAnnouncementData as any as AnnouncementWithProfile);
};

export const updateAnnouncement = async ({
  announcementId,
  updates,
}: {
  announcementId: string;
  updates: Partial<
    Omit<Announcement, 'id' | 'date' | 'relatedStudentName' | 'relatedStudentAvatarPath'>
  >;
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
    return fetchAnnouncements().then(
      announcements => announcements.find(a => a.id === announcementId)!
    );
  }

  const { data, error } = await client
    .from('announcements')
    .update(updatePayload)
    .eq('id', announcementId)
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to update announcement ${announcementId}: ${error?.message || 'No data returned'}`
    );
  }

  const { data: updatedAnnouncementData, error: fetchError } = await client
    .from('announcements')
    .select('*, profiles ( first_name, last_name, nickname, avatar_path )')
    .eq('id', data.id)
    .single();

  if (fetchError || !updatedAnnouncementData) {
    throw new Error(`Announcement updated, but failed to re-fetch details: ${fetchError?.message}`);
  }

  console.log(`[Supabase] Announcement ${announcementId} updated successfully.`);
  return mapDbRowToAnnouncement(updatedAnnouncementData as any as AnnouncementWithProfile);
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
