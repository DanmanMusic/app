
import { Announcement } from '../mocks/mockAnnouncements'; 


interface AnnouncementsListResponse {
  items: Announcement[];
  
}



/**
 * Fetches all announcements.
 * TODO: Add pagination/filtering parameters if needed.
 */
export const fetchAnnouncements = async (): Promise<Announcement[]> => {
  console.log(`[API] Fetching Announcements`);
  const response = await fetch('/api/announcements'); 
  console.log(`[API] Announcements Response status: ${response.status}`);
  if (!response.ok) {
    console.error(`[API] Announcements Network response was not ok: ${response.statusText}`);
    throw new Error(`Failed to fetch announcements: ${response.statusText}`);
  }
  
  const data: Announcement[] = await response.json();
  console.log(`[API] Received ${data?.length} announcement items from API mock.`);
  
  
  return data;
};



/**
 * Creates a new announcement item.
 */
export const createAnnouncement = async (
  announcementData: Omit<Announcement, 'id' | 'date'>
): Promise<Announcement> => {
  console.log('[API] Creating announcement:', announcementData.title);
  
  const payload = { ...announcementData };
  if ('date' in payload) {
    delete (payload as any).date;
  }

  const response = await fetch('/api/announcements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  console.log(`[API] Create Announcement Response status: ${response.status}`);
  if (!response.ok) {
    let errorMsg = `Failed to create announcement: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {
      
    }
    console.error(`[API] Create Announcement failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  const createdAnnouncement: Announcement = await response.json();
  console.log(`[API] Announcement created successfully (ID: ${createdAnnouncement.id})`);
  return createdAnnouncement;
};

/**
 * Updates an existing announcement item.
 */
export const updateAnnouncement = async ({
  announcementId,
  updates,
}: {
  announcementId: string;
  updates: Partial<Omit<Announcement, 'id' | 'date'>>; 
}): Promise<Announcement> => {
  console.log(`[API] Updating announcement ${announcementId}:`, updates);
  const response = await fetch(`/api/announcements/${announcementId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  console.log(`[API] Update Announcement Response status: ${response.status}`);
  if (!response.ok) {
    let errorMsg = `Failed to update announcement ${announcementId}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {
      
    }
    console.error(`[API] Update Announcement failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  const updatedAnnouncement: Announcement = await response.json();
  console.log(`[API] Announcement ${announcementId} updated successfully`);
  return updatedAnnouncement;
};

/**
 * Deletes an announcement item.
 */
export const deleteAnnouncement = async (announcementId: string): Promise<void> => {
  console.log(`[API] Deleting announcement ${announcementId}`);
  const response = await fetch(`/api/announcements/${announcementId}`, {
    method: 'DELETE',
  });
  console.log(`[API] Delete Announcement Response status: ${response.status}`);
  if (!response.ok && response.status !== 204) {
    let errorMsg = `Failed to delete announcement ${announcementId}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {
      
    }
    console.error(`[API] Delete Announcement failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  if (response.status === 204) {
    console.log(`[API] Announcement ${announcementId} deleted successfully (204 No Content).`);
  } else {
    console.log(
      `[API] Announcement ${announcementId} deleted successfully (Status: ${response.status}).`
    );
  }
};
