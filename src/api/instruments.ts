// src/api/instruments.ts
import { Platform } from 'react-native';

import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

import { getSupabase } from '../lib/supabaseClient';

import { Instrument } from '../types/dataTypes';

const INSTRUMENT_ICONS_BUCKET = 'instrument-icons';

const uploadInstrumentIcon = async (
  companyId: string,
  instrumentName: string,
  imageUri: string,
  mimeType?: string
): Promise<string | null> => {
  const client = getSupabase();
  try {
    const fileExt = mimeType ? mimeType.split('/')[1] || 'jpg' : 'jpg';
    const safeName = instrumentName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const filePath = `${companyId}/${safeName}.${fileExt}`;

    console.log(
      `[Supabase Storage] Uploading to bucket '${INSTRUMENT_ICONS_BUCKET}' at path: ${filePath}`
    );

    let uploadError: any | null = null;
    let uploadData: { path: string } | null = null;

    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image blob from URI: ${response.statusText}`);
      }
      const imageBlob = await response.blob();
      const effectiveMimeType = mimeType || imageBlob.type || 'image/jpeg';
      const { data, error } = await client.storage
        .from(INSTRUMENT_ICONS_BUCKET)
        .upload(filePath, imageBlob, { contentType: effectiveMimeType, upsert: true });
      uploadData = data;
      uploadError = error;
    } else {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const effectiveMimeType = mimeType || 'image/jpeg';
      const { data, error } = await client.storage
        .from(INSTRUMENT_ICONS_BUCKET)
        .upload(filePath, decode(base64), { contentType: effectiveMimeType, upsert: true });
      uploadData = data;
      uploadError = error;
    }

    if (uploadError) {
      console.error('[Supabase Storage] Error uploading file:', uploadError.message);
      throw uploadError;
    }

    console.log('[Supabase Storage] Upload successful:', uploadData);
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

const deleteInstrumentIcon = async (imagePath: string | null): Promise<void> => {
  if (!imagePath) return;
  const client = getSupabase();
  try {
    const { error } = await client.storage.from(INSTRUMENT_ICONS_BUCKET).remove([imagePath]);
    if (error) {
      console.warn(
        `[Supabase Storage] Failed to delete instrument icon '${imagePath}' from Storage:`,
        error.message
      );
    } else {
      console.log(
        `[Supabase Storage] Successfully deleted instrument icon '${imagePath}' from Storage.`
      );
    }
  } catch (e) {
    console.warn(`[Supabase Storage] Exception during icon deletion for path ${imagePath}:`, e);
  }
};

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
  type InstrumentQueryResult =
    | {
        id: string;
        name: string;
        image_path: string | null;
      }[]
    | null;
  const typedData = data as InstrumentQueryResult;
  return (typedData || []).map(item => ({
    id: item.id,
    name: item.name,
    image_path: item.image_path,
  }));
};

export const createInstrument = async ({
  name,
  imageUri,
  mimeType,
  companyId,
}: {
  name: string;
  imageUri?: string | null;
  mimeType?: string;
  companyId: string;
}): Promise<Instrument> => {
  const client = getSupabase();
  console.log('[Supabase] Creating instrument:', name);
  const instrumentToInsert: {
    name: string;
    image_path?: string | null;
    company_id: string;
  } = {
    name: name.trim(),
    company_id: companyId,
  };
  if (!instrumentToInsert.name) {
    throw new Error('Instrument name cannot be empty.');
  }

  if (imageUri) {
    instrumentToInsert.image_path = await uploadInstrumentIcon(
      companyId,
      instrumentToInsert.name,
      imageUri,
      mimeType
    );
  }

  const { data, error } = await client
    .from('instruments')
    .insert(instrumentToInsert)
    .select('id, name, image_path')
    .single();

  if (error || !data) {
    console.error(`[Supabase] Error creating instrument:`, error?.message);
    if (instrumentToInsert.image_path) {
      console.warn(
        `[Supabase] DB insert failed for ${name}, attempting to clean up uploaded image: ${instrumentToInsert.image_path}`
      );
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

export const updateInstrument = async ({
  instrumentId,
  updates,
  imageUri,
  mimeType,
}: {
  instrumentId: string;
  updates: Partial<Pick<Instrument, 'name'>>;
  imageUri?: string | null;
  mimeType?: string;
}): Promise<Instrument> => {
  const client = getSupabase();
  console.log(
    `[Supabase] Updating instrument ${instrumentId} with:`,
    updates,
    'New Image URI:',
    imageUri ? 'Yes' : 'No'
  );

  const updatePayload: { name?: string; image_path?: string | null } = {};
  let nameChanged = false;
  let imageNeedsProcessing = false;

  const { data: currentData, error: currentFetchError } = await client
    .from('instruments')
    .select('name, image_path, company_id')
    .eq('id', instrumentId)
    .single();

  if (currentFetchError || !currentData) {
    throw new Error('Failed to fetch current instrument data before update.');
  }

  const oldImagePath = currentData.image_path;
  const companyId = currentData.company_id;

  if (updates.name && updates.name.trim()) {
    if (updates.name.trim() !== currentData.name) {
      updatePayload.name = updates.name.trim();
      nameChanged = true;
    }
  } else if (updates.hasOwnProperty('name')) {
    throw new Error('Instrument name update cannot be empty.');
  }

  if (imageUri !== undefined) {
    imageNeedsProcessing = true;
  }

  let newImagePath: string | null | undefined = undefined;

  if (imageNeedsProcessing) {
    const nameForPath = updatePayload.name || currentData.name;
    if (imageUri) {
      newImagePath = await uploadInstrumentIcon(companyId, nameForPath, imageUri, mimeType);
      updatePayload.image_path = newImagePath;
    } else if (imageUri === null) {
      updatePayload.image_path = null;
      newImagePath = null;
    }

    if (oldImagePath && newImagePath !== oldImagePath) {
      await deleteInstrumentIcon(oldImagePath);
    }
  }

  const requiresDbUpdate =
    nameChanged || (imageNeedsProcessing && updatePayload.image_path !== undefined);

  if (!requiresDbUpdate) {
    return {
      id: instrumentId,
      name: currentData.name,
      image_path: currentData.image_path,
    };
  }

  const { data, error } = await client
    .from('instruments')
    .update(updatePayload)
    .eq('id', instrumentId)
    .select('id, name, image_path')
    .single();

  if (error || !data) {
    if (typeof newImagePath === 'string') {
      await deleteInstrumentIcon(newImagePath);
    }
    throw new Error(
      `Failed to update instrument ${instrumentId}: ${error?.message || 'No data returned'}`
    );
  }

  const updatedInstrument: Instrument = {
    id: data.id,
    name: data.name,
    image_path: data.image_path,
  };
  return updatedInstrument;
};

export const deleteInstrument = async (instrumentId: string): Promise<void> => {
  const client = getSupabase();
  console.log(`[Supabase] Deleting instrument ${instrumentId}`);

  let imagePathToDelete: string | null = null;
  try {
    const { data: instrumentData } = await client
      .from('instruments')
      .select('image_path')
      .eq('id', instrumentId)
      .maybeSingle();
    if (instrumentData?.image_path) {
      imagePathToDelete = instrumentData.image_path;
    }
  } catch (e) {
    /* ignore */
  }

  const { error: deleteDbError } = await client.from('instruments').delete().eq('id', instrumentId);

  if (deleteDbError) {
    throw new Error(
      `Failed to delete instrument ${instrumentId} from database: ${deleteDbError.message}`
    );
  }

  console.log(`[Supabase] Instrument ${instrumentId} deleted successfully from database.`);

  if (imagePathToDelete) {
    await deleteInstrumentIcon(imagePathToDelete);
  }
};
