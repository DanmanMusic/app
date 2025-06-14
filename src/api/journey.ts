// src/api/journey.ts
import { getSupabase } from '../lib/supabaseClient';

// Define the type for a Journey Location
export interface JourneyLocation {
  id: string;
  name: string;
  description: string | null;
}

// Maps a raw DB row to our clean JourneyLocation type
const mapDbRowToJourneyLocation = (row: any): JourneyLocation => ({
  id: row.id,
  name: row.name,
  description: row.description ?? null,
});

/**
 * Fetches all journey locations (categories) from the database.
 * RLS automatically filters this to the user's company.
 */
export const fetchJourneyLocations = async (): Promise<JourneyLocation[]> => {
  const client = getSupabase();
  console.log(`[API journey] Fetching Journey Locations`);
  const { data, error } = await client
    .from('journey_locations')
    .select('id, name, description')
    .order('name', { ascending: true });

  if (error) {
    console.error(`[API journey] Error fetching journey locations:`, error.message);
    throw new Error(`Failed to fetch journey locations: ${error.message}`);
  }

  return (data || []).map(mapDbRowToJourneyLocation);
};

/**
 * MODIFIED: Creates a new journey location for a specific company.
 * Requires companyId to satisfy the RLS policy.
 */
export const createJourneyLocation = async ({
  locationData,
  companyId, // <-- The ID of the company this location belongs to.
}: {
  locationData: Omit<JourneyLocation, 'id'>;
  companyId: string;
}): Promise<JourneyLocation> => {
  const client = getSupabase();
  const trimmedName = locationData.name.trim();

  if (!trimmedName) {
    throw new Error('Journey Location name cannot be empty.');
  }
  if (!companyId) {
    throw new Error('Company ID is required to create a journey location.');
  }

  const itemToInsert = {
    name: trimmedName,
    description: locationData.description?.trim() || null,
    company_id: companyId,
  };

  const { data, error } = await client
    .from('journey_locations')
    .insert(itemToInsert)
    .select('id, name, description')
    .single();

  if (error) {
    throw new Error(`Failed to create journey location: ${error.message}`);
  }

  return mapDbRowToJourneyLocation(data);
};

export const updateJourneyLocation = async ({
  locationId,
  updates,
}: {
  locationId: string;
  updates: Partial<Omit<JourneyLocation, 'id'>>;
}): Promise<JourneyLocation> => {
  const client = getSupabase();
  const updatePayload: { name?: string; description?: string | null } = {};

  if (updates.hasOwnProperty('name')) {
    const trimmedName = updates.name?.trim();
    if (!trimmedName) throw new Error('Journey Location name cannot be empty.');
    updatePayload.name = trimmedName;
  }
  if (updates.hasOwnProperty('description')) {
    updatePayload.description = updates.description?.trim() || null;
  }

  if (Object.keys(updatePayload).length === 0) {
    const { data: currentData } = await client
      .from('journey_locations')
      .select('*')
      .eq('id', locationId)
      .single();
    if (!currentData) throw new Error('Could not find journey location to update.');
    return mapDbRowToJourneyLocation(currentData);
  }

  const { data, error } = await client
    .from('journey_locations')
    .update(updatePayload)
    .eq('id', locationId)
    .select('id, name, description')
    .single();

  if (error) {
    throw new Error(`Failed to update journey location: ${error.message}`);
  }

  return mapDbRowToJourneyLocation(data);
};

export const deleteJourneyLocation = async (locationId: string): Promise<void> => {
  const client = getSupabase();
  const { error } = await client.from('journey_locations').delete().eq('id', locationId);

  if (error) {
    throw new Error(`Failed to delete journey location: ${error.message}`);
  }
};
