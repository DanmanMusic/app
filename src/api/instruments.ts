// src/api/instruments.ts
import { Platform } from 'react-native'; // Import Platform
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

import { getSupabase } from '../lib/supabaseClient';
import { Instrument } from '../types/dataTypes';

const INSTRUMENT_ICONS_BUCKET = 'instrument-icons';

// Helper function to upload image - NOW PLATFORM AWARE
const uploadInstrumentIcon = async (
  imageUri: string,
  mimeType?: string // Make mimeType optional, try to infer if not provided
): Promise<string | null> => {
  const client = getSupabase();
  try {
    // Generate a unique file path (same for both platforms)
    const fileExt = mimeType ? mimeType.split('/')[1] : 'jpg'; // Default to jpg if no mimeType
    const filePath = `public/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

    console.log(`[Supabase Storage] Uploading to bucket '${INSTRUMENT_ICONS_BUCKET}' at path: ${filePath}`);

    let uploadError: any | null = null;
    let uploadData: { path: string } | null = null;

    if (Platform.OS === 'web') {
      // WEB: Fetch the Blob directly from the URI
      const response = await fetch(imageUri);
      if (!response.ok) {
          throw new Error(`Failed to fetch image blob from URI: ${response.statusText}`);
      }
      const imageBlob = await response.blob();
      const effectiveMimeType = mimeType || imageBlob.type || 'image/jpeg'; // Use blob type if available, else default

      console.log(`[Supabase Storage] Uploading Blob (Web). Size: ${imageBlob.size}, Type: ${effectiveMimeType}`);

      // Upload the Blob
      const { data, error } = await client.storage
        .from(INSTRUMENT_ICONS_BUCKET)
        .upload(filePath, imageBlob, { contentType: effectiveMimeType, upsert: false });
      uploadData = data;
      uploadError = error;

    } else {
      // NATIVE: Read as base64 and decode
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const effectiveMimeType = mimeType || 'image/jpeg'; // Default if native picker didn't provide type

      console.log(`[Supabase Storage] Uploading ArrayBuffer (Native). Type: ${effectiveMimeType}`);

      // Upload the ArrayBuffer
      const { data, error } = await client.storage
        .from(INSTRUMENT_ICONS_BUCKET)
        .upload(filePath, decode(base64), { contentType: effectiveMimeType, upsert: false });
      uploadData = data;
      uploadError = error;
    }

    // Handle result
    if (uploadError) {
      console.error('[Supabase Storage] Error uploading file:', uploadError.message);
      throw uploadError;
    }

    console.log('[Supabase Storage] Upload successful:', uploadData);
    // IMPORTANT: Supabase upload returns the path, not the full URL
    return uploadData?.path ?? null;

  } catch (e) {
    console.error('[Supabase Storage] Exception during upload:', e);
    if (e instanceof Error) {
      throw new Error(`Failed to upload image: ${e.message}`);
    } else {
      throw new Error('An unknown error occurred during image upload.');
    }
  }
};

// Helper function to delete image (remains the same)
const deleteInstrumentIcon = async (imagePath: string | null): Promise<void> => {
  if (!imagePath) return;
  const client = getSupabase();
  try {
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    console.log(`[Supabase Storage] Attempting to delete icon from Storage: ${cleanPath}`);
    const { error } = await client.storage.from(INSTRUMENT_ICONS_BUCKET).remove([cleanPath]);
    if (error) {
      console.warn(
        `[Supabase Storage] Failed to delete instrument icon '${cleanPath}' from Storage:`,
        error.message
      );
    } else {
      console.log(`[Supabase Storage] Successfully deleted instrument icon '${cleanPath}' from Storage.`);
    }
  } catch (e) {
    console.warn(`[Supabase Storage] Exception during icon deletion for path ${imagePath}:`, e);
  }
};

// fetchInstruments (remains the same)
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

// createInstrument (remains the same, calls the updated helper)
export const createInstrument = async ({
    name,
    imageUri,
    mimeType,
  }: {
    name: string;
    imageUri?: string | null;
    mimeType?: string;
  }): Promise<Instrument> => {
    const client = getSupabase();
    console.log('[Supabase] Creating instrument:', name);
    const instrumentToInsert: { name: string; image_path?: string | null } = {
      name: name.trim(),
    };
    if (!instrumentToInsert.name) {
        throw new Error("Instrument name cannot be empty.");
    }

    // Upload image if provided using the platform-aware helper
    if (imageUri) {
        instrumentToInsert.image_path = await uploadInstrumentIcon(imageUri, mimeType);
    }

    const { data, error } = await client
      .from('instruments')
      .insert(instrumentToInsert)
      .select('id, name, image_path') // Only select needed fields
      .single();
    if (error || !data) {
      console.error(`[Supabase] Error creating instrument:`, error?.message);
      if (instrumentToInsert.image_path) {
        console.warn(`[Supabase] DB insert failed for ${name}, attempting to clean up uploaded image: ${instrumentToInsert.image_path}`);
        await deleteInstrumentIcon(instrumentToInsert.image_path);
      }
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

// updateInstrument (remains mostly the same, calls the updated helper)
export const updateInstrument = async ({
    instrumentId,
    updates,
    imageUri,
    mimeType,
  }: {
    instrumentId: string;
    updates: Partial<Pick<Instrument, 'name'>>;
    imageUri?: string | null; // New image URI
    mimeType?: string;
  }): Promise<Instrument> => {
    const client = getSupabase();
    console.log(`[Supabase] Updating instrument ${instrumentId} with:`, updates, "New Image URI:", imageUri ? "Yes" : "No");

    const updatePayload: { name?: string; image_path?: string | null } = {};
    let nameChanged = false;
    let imageNeedsProcessing = false; // Flag to track if image part needs handling

    // Fetch current data first to get old image path and check name diff
    const { data: currentData, error: currentFetchError } = await client
      .from('instruments')
      .select('name, image_path')
      .eq('id', instrumentId)
      .single();

    if (currentFetchError) {
        console.error(`[Supabase] Failed to fetch current instrument ${instrumentId} before update`, currentFetchError);
        throw new Error('Failed to fetch current instrument data before update.');
    }

    const oldImagePath = currentData.image_path;

    // Prepare name update
    if (updates.name && updates.name.trim()) {
        if (updates.name.trim() !== currentData.name) {
            updatePayload.name = updates.name.trim();
            nameChanged = true;
        }
    } else if (updates.hasOwnProperty('name')) {
        // If name property exists but is empty/whitespace
        throw new Error("Instrument name update cannot be empty.");
    }

    // Check if image needs processing (new image provided OR explicit removal requested)
    if (imageUri !== undefined) { // Check if imageUri was explicitly passed (could be null for removal)
       imageNeedsProcessing = true;
    }

    let newImagePath: string | null | undefined = undefined; // Use undefined to signify no change intent initially

    if (imageNeedsProcessing) {
        if (imageUri) { // New image provided
            console.log(`[Supabase] New image provided for instrument ${instrumentId}. Uploading...`);
            newImagePath = await uploadInstrumentIcon(imageUri, mimeType);
            updatePayload.image_path = newImagePath;
            // Delete old image *after* new one is uploaded and path is ready for DB update
            if (oldImagePath && newImagePath !== oldImagePath) {
                console.log(`[Supabase] Deleting old image: ${oldImagePath}`);
                await deleteInstrumentIcon(oldImagePath);
            }
        } else if (imageUri === null && oldImagePath) { // Explicit removal (imageUri is null)
            console.log(`[Supabase] Request to remove image for instrument ${instrumentId}.`);
            updatePayload.image_path = null;
            newImagePath = null; // Indicate removal in DB
            await deleteInstrumentIcon(oldImagePath);
        }
    }


    // Determine if an actual update is needed
    const requiresDbUpdate = nameChanged || (imageNeedsProcessing && updatePayload.image_path !== undefined);


    if (!requiresDbUpdate) {
        console.warn('[Supabase] updateInstrument called with no valid changes to apply.');
        // Return current data as no update was needed
        return {
            id: instrumentId, // We know the ID
            name: currentData.name,
            image_path: currentData.image_path
        } as Instrument;
    }


    // Perform the database update only if needed
    console.log(`[Supabase] Performing DB update for ${instrumentId} with payload:`, updatePayload);
    const { data, error } = await client
      .from('instruments')
      .update(updatePayload)
      .eq('id', instrumentId)
      .select('id, name, image_path')
      .single();

    if (error || !data) {
      console.error(`[Supabase] Error updating instrument ${instrumentId} in DB:`, error?.message);
      // If DB update failed but a *new* image was uploaded, try to delete the new orphaned image
      if (typeof newImagePath === 'string') { // Check if newImagePath is a non-null string
          console.warn(`[Supabase] DB update failed for ${instrumentId}, attempting to clean up newly uploaded image: ${newImagePath}`);
          await deleteInstrumentIcon(newImagePath);
      }
      throw new Error(`Failed to update instrument ${instrumentId}: ${error?.message || 'No data returned'}`);
    }

    const updatedInstrument: Instrument = {
        id: data.id,
        name: data.name,
        image_path: data.image_path,
    };
    console.log(`[Supabase] Instrument ${instrumentId} updated successfully in DB`);
    return updatedInstrument;
  };

// deleteInstrument (remains the same)
export const deleteInstrument = async (instrumentId: string): Promise<void> => {
    const client = getSupabase();
    console.log(`[Supabase] Deleting instrument ${instrumentId}`);

    let imagePathToDelete: string | null = null;
    try {
        // Fetch the image path *before* deleting the DB record
        const { data: instrumentData, error: fetchError } = await client
            .from('instruments')
            .select('image_path')
            .eq('id', instrumentId)
            .maybeSingle(); // Use maybeSingle to handle potential 404 if already deleted

        if (fetchError && fetchError.code !== 'PGRST116') { // Ignore "Not Found" errors
            console.warn(`[Supabase] Could not fetch image_path before deleting instrument ${instrumentId}:`, fetchError.message);
        } else if (instrumentData?.image_path) {
            imagePathToDelete = instrumentData.image_path;
            console.log(`[Supabase] Found image path to delete: ${imagePathToDelete}`);
        }
    } catch (e) {
        console.warn(`[Supabase] Error fetching image_path before delete:`, e);
    }

    // Delete the database record
    const { error: deleteDbError } = await client
      .from('instruments')
      .delete()
      .eq('id', instrumentId);

    if (deleteDbError) {
      console.error(`[Supabase] Error deleting instrument ${instrumentId} from DB:`, deleteDbError.message);
      // Don't attempt storage delete if DB delete failed, but still throw
      throw new Error(`Failed to delete instrument ${instrumentId} from database: ${deleteDbError.message}`);
    }

    console.log(`[Supabase] Instrument ${instrumentId} deleted successfully from database.`);

    // If DB delete was successful, attempt to delete the image from storage
    if (imagePathToDelete) {
      await deleteInstrumentIcon(imagePathToDelete);
    }
  };