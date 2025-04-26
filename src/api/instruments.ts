// src/api/instruments.ts
import { supabase, getSupabase } from '../lib/supabaseClient';
import { Instrument } from '../types/dataTypes';

export const fetchInstruments = async (): Promise<Instrument[]> => {
  const client = getSupabase();
  console.log(`[Supabase] Fetching Instruments`);
  const { data, error } = await client
    .from('instruments')
    .select('id, name, image_path')
    .order('name', { ascending: true });
  if (error) {
    console.error(`[Supabase] Error fetching instruments:`, error.message);
    throw new Error(`Failed to fetch instruments: ${error.message}`);
  }
  console.log(`[Supabase] Received ${data?.length ?? 0} instrument items.`);
  type InstrumentQueryResult = {
      id: string;
      name: string;
      image_path: string | null;
  }[] | null;
  const typedData = data as InstrumentQueryResult;
  return (typedData || []).map(item => ({
    id: item.id,
    name: item.name,
    image_path: item.image_path,
  }));
};

export const createInstrument = async (
  instrumentData: Pick<Instrument, 'name'>
): Promise<Instrument> => {
  const client = getSupabase();
  console.log('[Supabase] Creating instrument:', instrumentData.name);
  const instrumentToInsert = {
      name: instrumentData.name.trim(),
  };
  if (!instrumentToInsert.name) {
      throw new Error("Instrument name cannot be empty.");
  }
  const { data, error } = await client
    .from('instruments')
    .insert(instrumentToInsert)
    .select('id, name, image_path, created_at, updated_at')
    .single();
  if (error || !data) {
    console.error(`[Supabase] Error creating instrument:`, error?.message);
    throw new Error(`Failed to create instrument: ${error?.message || 'No data returned'}`);
  }
  const createdInstrument: Instrument = {
      id: data.id,
      name: data.name,
      image_path: data.image_path,
  };
  console.log(`[Supabase] Instrument created successfully (ID: ${createdInstrument.id})`);
  return createdInstrument;
};

export const updateInstrument = async ({
  instrumentId,
  updates,
}: {
  instrumentId: string;
  updates: Partial<Pick<Instrument, 'name'>>; // Changed to Partial
}): Promise<Instrument> => {
  const client = getSupabase();
  console.log(`[Supabase] Updating instrument ${instrumentId} with:`, updates);

  const updatePayload: { name?: string } = {};
  if (updates.name && updates.name.trim()) {
    updatePayload.name = updates.name.trim();
  } else if (updates.hasOwnProperty('name')) {
    throw new Error("Instrument name update cannot be empty.");
  }

  if (Object.keys(updatePayload).length === 0) {
    console.warn('[Supabase] updateInstrument called with no valid changes to apply.');
    const { data: currentData, error: currentError } = await client
       .from('instruments')
       .select('id, name, image_path')
       .eq('id', instrumentId)
       .single();
     if (currentError || !currentData) {
         console.error(`[Supabase] Failed to fetch current instrument ${instrumentId} during no-op update`, currentError);
         throw new Error('Failed to fetch instrument for no-op update');
     }
     return {
         id: currentData.id,
         name: currentData.name,
         image_path: currentData.image_path
     } as Instrument;
  }

  const { data, error } = await client
    .from('instruments')
    .update(updatePayload)
    .eq('id', instrumentId)
    .select('id, name, image_path, created_at, updated_at')
    .single();

  if (error || !data) {
    console.error(`[Supabase] Error updating instrument ${instrumentId}:`, error?.message);
    throw new Error(`Failed to update instrument ${instrumentId}: ${error?.message || 'No data returned'}`);
  }

  const updatedInstrument: Instrument = {
      id: data.id,
      name: data.name,
      image_path: data.image_path,
  };
  console.log(`[Supabase] Instrument ${instrumentId} updated successfully`);
  return updatedInstrument;
};

export const deleteInstrument = async (instrumentId: string): Promise<void> => {
  const client = getSupabase();
  console.log(`[Supabase] Deleting instrument ${instrumentId}`);

  let imagePathToDelete: string | null = null;
  try {
      const { data: instrumentData, error: fetchError } = await client
          .from('instruments')
          .select('image_path')
          .eq('id', instrumentId)
          .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
          console.warn(`[Supabase] Could not fetch image_path before deleting instrument ${instrumentId}:`, fetchError.message);
      } else if (instrumentData?.image_path) {
          imagePathToDelete = instrumentData.image_path;
          console.log(`[Supabase] Found image path to delete: ${imagePathToDelete}`);
      }
  } catch (e) {
      console.warn(`[Supabase] Error fetching image_path before delete:`, e);
  }

  const { error: deleteDbError } = await client
    .from('instruments')
    .delete()
    .eq('id', instrumentId);

  if (deleteDbError) {
    console.error(`[Supabase] Error deleting instrument ${instrumentId} from DB:`, deleteDbError.message);
    throw new Error(`Failed to delete instrument ${instrumentId} from database: ${deleteDbError.message}`);
  }

  console.log(`[Supabase] Instrument ${instrumentId} deleted successfully from database.`);

  if (imagePathToDelete) {
    console.log(`[Supabase] Attempting to delete image from Storage: ${imagePathToDelete}`);
    const cleanPath = imagePathToDelete.startsWith('/') ? imagePathToDelete.substring(1) : imagePathToDelete;
    const { error: deleteStorageError } = await client.storage
      .from('instrument-icons')
      .remove([cleanPath]);

    if (deleteStorageError) {
      console.warn(`[Supabase] Failed to delete instrument icon '${cleanPath}' from Storage:`, deleteStorageError.message);
    } else {
      console.log(`[Supabase] Successfully deleted instrument icon '${cleanPath}' from Storage.`);
    }
  }
};