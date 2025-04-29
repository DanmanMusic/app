import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

import { getSupabase } from '../lib/supabaseClient';
import { RewardItem } from '../types/dataTypes';

const REWARD_ICONS_BUCKET = 'reward-icons';

const uploadRewardIcon = async (imageUri: string, mimeType?: string): Promise<string | null> => {
  const client = getSupabase();
  try {
    const fileExt = mimeType ? mimeType.split('/')[1] : 'jpg';
    const filePath = `public/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

    console.log(
      `[Supabase Storage] Uploading reward icon to bucket '${REWARD_ICONS_BUCKET}' at path: ${filePath}`
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

      console.log(
        `[Supabase Storage] Uploading Blob (Web). Size: ${imageBlob.size}, Type: ${effectiveMimeType}`
      );
      const { data, error } = await client.storage
        .from(REWARD_ICONS_BUCKET)
        .upload(filePath, imageBlob, { contentType: effectiveMimeType, upsert: false });
      uploadData = data;
      uploadError = error;
    } else {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const effectiveMimeType = mimeType || 'image/jpeg';

      console.log(`[Supabase Storage] Uploading ArrayBuffer (Native). Type: ${effectiveMimeType}`);
      const { data, error } = await client.storage
        .from(REWARD_ICONS_BUCKET)
        .upload(filePath, decode(base64), { contentType: effectiveMimeType, upsert: false });
      uploadData = data;
      uploadError = error;
    }

    if (uploadError) {
      console.error('[Supabase Storage] Error uploading reward icon:', uploadError.message);
      throw uploadError;
    }

    console.log('[Supabase Storage] Reward icon upload successful:', uploadData);
    return uploadData?.path ?? null;
  } catch (e) {
    console.error('[Supabase Storage] Exception during reward icon upload:', e);
    if (e instanceof Error) {
      throw new Error(`Failed to upload reward image: ${e.message}`);
    } else {
      throw new Error('An unknown error occurred during reward image upload.');
    }
  }
};

const deleteRewardIcon = async (imagePath: string | null): Promise<void> => {
  if (!imagePath) return;
  const client = getSupabase();
  try {
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    console.log(`[Supabase Storage] Attempting to delete reward icon from Storage: ${cleanPath}`);
    const { error } = await client.storage.from(REWARD_ICONS_BUCKET).remove([cleanPath]);
    if (error) {
      console.warn(
        `[Supabase Storage] Failed to delete reward icon '${cleanPath}' from Storage:`,
        error.message
      );
    } else {
      console.log(
        `[Supabase Storage] Successfully deleted reward icon '${cleanPath}' from Storage.`
      );
    }
  } catch (e) {
    console.warn(
      `[Supabase Storage] Exception during reward icon deletion for path ${imagePath}:`,
      e
    );
  }
};

export const fetchRewards = async (): Promise<RewardItem[]> => {
  const client = getSupabase();
  console.log(`[Supabase] Fetching Rewards Catalog`);
  const { data, error } = await client
    .from('rewards')
    .select('id, name, cost, image_path, description')
    .order('cost', { ascending: true });

  if (error) {
    console.error(`[Supabase] Error fetching rewards:`, error.message);
    throw new Error(`Failed to fetch rewards catalog: ${error.message}`);
  }

  console.log(`[Supabase] Received ${data?.length ?? 0} reward items.`);

  const rewards = (data || []).map(item => {
    let publicUrl: string | undefined = undefined;
    if (item.image_path) {
      try {
        const { data: urlData } = client.storage
          .from(REWARD_ICONS_BUCKET)
          .getPublicUrl(item.image_path);
        publicUrl = urlData?.publicUrl;
      } catch (urlError) {
        console.error(
          `[Supabase Storage] Error getting public URL for reward ${item.id} path ${item.image_path}:`,
          urlError
        );
      }
    }

    return {
      id: item.id,
      name: item.name,
      cost: item.cost,
      imageUrl: publicUrl || 'https://via.placeholder.com/100?text=No+Image',
      description: item.description ?? undefined,
    };
  });

  return rewards;
};

export const createReward = async ({
  name,
  cost,
  description,
  imageUri,
  mimeType,
}: {
  name: string;
  cost: number;
  description?: string;
  imageUri?: string | null;
  mimeType?: string;
}): Promise<RewardItem> => {
  const client = getSupabase();
  console.log('[Supabase] Creating reward item:', name);

  if (!name || cost == null || cost < 0) {
    throw new Error('Reward name and a non-negative cost are required.');
  }

  const rewardToInsert: {
    name: string;
    cost: number;
    description?: string | null;
    image_path?: string | null;
  } = {
    name: name.trim(),
    cost: cost,
    description: description?.trim() || null,
  };

  let uploadedImagePath: string | null = null;
  if (imageUri) {
    try {
      uploadedImagePath = await uploadRewardIcon(imageUri, mimeType);
      rewardToInsert.image_path = uploadedImagePath;
    } catch (uploadError) {
      console.error('[Supabase] Image upload failed during createReward:', uploadError);
      throw uploadError;
    }
  }

  const { data, error } = await client
    .from('rewards')
    .insert(rewardToInsert)
    .select('id, name, cost, image_path, description')
    .single();

  if (error || !data) {
    console.error(`[Supabase] Error creating reward in DB:`, error?.message);

    if (uploadedImagePath) {
      console.warn(
        `[Supabase] DB insert failed for reward ${name}, attempting to clean up uploaded image: ${uploadedImagePath}`
      );
      await deleteRewardIcon(uploadedImagePath);
    }
    throw new Error(`Failed to create reward: ${error?.message || 'No data returned'}`);
  }

  let publicUrl: string | undefined = undefined;
  if (data.image_path) {
    try {
      const { data: urlData } = client.storage
        .from(REWARD_ICONS_BUCKET)
        .getPublicUrl(data.image_path);
      publicUrl = urlData?.publicUrl;
    } catch (urlError) {
      console.error(
        `[Supabase Storage] Error getting public URL for newly created reward ${data.id}:`,
        urlError
      );
    }
  }

  const createdReward: RewardItem = {
    id: data.id,
    name: data.name,
    cost: data.cost,
    imageUrl: publicUrl || 'https://via.placeholder.com/100?text=No+Image',
    description: data.description ?? undefined,
  };

  console.log(`[Supabase] Reward item created successfully (ID: ${createdReward.id})`);
  return createdReward;
};

export const updateReward = async ({
  rewardId,
  updates,
  imageUri,
  mimeType,
}: {
  rewardId: string;
  updates: Partial<Omit<RewardItem, 'id' | 'imageUrl'>>;
  imageUri?: string | null;
  mimeType?: string;
}): Promise<RewardItem> => {
  const client = getSupabase();
  console.log(
    `[Supabase] Updating reward item ${rewardId} with:`,
    updates,
    'New Image URI:',
    imageUri === undefined ? 'Unchanged' : imageUri || 'Removed'
  );

  const { data: currentData, error: currentFetchError } = await client
    .from('rewards')
    .select('name, cost, description, image_path')
    .eq('id', rewardId)
    .single();

  if (currentFetchError || !currentData) {
    console.error(
      `[Supabase] Failed to fetch current reward ${rewardId} before update`,
      currentFetchError
    );
    throw new Error(
      `Failed to fetch current reward data before update: ${currentFetchError?.message || 'Not found'}`
    );
  }

  const oldImagePath = currentData.image_path;
  const updatePayload: {
    name?: string;
    cost?: number;
    description?: string | null;
    image_path?: string | null;
  } = {};
  let needsDbUpdate = false;

  if (updates.name && updates.name.trim() && updates.name.trim() !== currentData.name) {
    updatePayload.name = updates.name.trim();
    needsDbUpdate = true;
  }
  if (updates.cost !== undefined && updates.cost >= 0 && updates.cost !== currentData.cost) {
    updatePayload.cost = updates.cost;
    needsDbUpdate = true;
  }
  const newDescription =
    updates.description === undefined
      ? currentData.description
      : updates.description?.trim() || null;
  if (newDescription !== currentData.description) {
    updatePayload.description = newDescription;
    needsDbUpdate = true;
  }

  let newImagePath: string | null | undefined = undefined;

  if (imageUri !== undefined) {
    if (imageUri) {
      console.log(`[Supabase] New image provided for reward ${rewardId}. Uploading...`);
      try {
        newImagePath = await uploadRewardIcon(imageUri, mimeType);
      } catch (uploadError) {
        console.error('[Supabase] Image upload failed during updateReward:', uploadError);
        throw uploadError;
      }
      if (newImagePath !== oldImagePath) {
        updatePayload.image_path = newImagePath;
        needsDbUpdate = true;

        if (oldImagePath) {
          console.log(`[Supabase] Deleting old reward image: ${oldImagePath}`);
          await deleteRewardIcon(oldImagePath);
        }
      } else {
        console.log(
          `[Supabase] Uploaded image path ${newImagePath} is same as old ${oldImagePath}. No image path update needed.`
        );
        newImagePath = undefined;
      }
    } else if (imageUri === null && oldImagePath) {
      console.log(`[Supabase] Request to remove image for reward ${rewardId}.`);
      updatePayload.image_path = null;
      newImagePath = null;
      needsDbUpdate = true;
      await deleteRewardIcon(oldImagePath);
    }
  }

  if (!needsDbUpdate) {
    console.warn('[Supabase] updateReward called with no changes to apply.');

    let publicUrl: string | undefined = undefined;
    if (currentData.image_path) {
      try {
        const { data: urlData } = client.storage
          .from(REWARD_ICONS_BUCKET)
          .getPublicUrl(currentData.image_path);
        publicUrl = urlData?.publicUrl;
      } catch (urlError) {
        console.error(
          `[Supabase Storage] Error getting public URL for reward ${rewardId} path ${currentData.image_path}:`,
          urlError
        );
      }
    }
    return {
      id: rewardId,
      name: currentData.name,
      cost: currentData.cost,
      imageUrl: publicUrl || 'https://via.placeholder.com/100?text=No+Image',
      description: currentData.description ?? undefined,
    };
  }

  console.log(
    `[Supabase] Performing DB update for reward ${rewardId} with payload:`,
    updatePayload
  );
  const { data, error } = await client
    .from('rewards')
    .update(updatePayload)
    .eq('id', rewardId)
    .select('id, name, cost, image_path, description')
    .single();

  if (error || !data) {
    console.error(`[Supabase] Error updating reward ${rewardId} in DB:`, error?.message);

    if (newImagePath !== undefined && typeof newImagePath === 'string') {
      console.warn(
        `[Supabase] DB update failed for reward ${rewardId}, attempting to clean up newly uploaded image: ${newImagePath}`
      );
      await deleteRewardIcon(newImagePath);
    }

    throw new Error(`Failed to update reward ${rewardId}: ${error?.message || 'No data returned'}`);
  }

  let updatedPublicUrl: string | undefined = undefined;
  if (data.image_path) {
    try {
      const { data: urlData } = client.storage
        .from(REWARD_ICONS_BUCKET)
        .getPublicUrl(data.image_path);
      updatedPublicUrl = urlData?.publicUrl;
    } catch (urlError) {
      console.error(
        `[Supabase Storage] Error getting public URL for updated reward ${data.id}:`,
        urlError
      );
    }
  }

  const updatedReward: RewardItem = {
    id: data.id,
    name: data.name,
    cost: data.cost,
    imageUrl: updatedPublicUrl || 'https://via.placeholder.com/100?text=No+Image',
    description: data.description ?? undefined,
  };

  console.log(`[Supabase] Reward item ${rewardId} updated successfully in DB.`);
  return updatedReward;
};

export const deleteReward = async (rewardId: string): Promise<void> => {
  const client = getSupabase();
  console.log(`[Supabase] Deleting reward item ${rewardId}`);

  let imagePathToDelete: string | null = null;
  try {
    const { data: rewardData, error: fetchError } = await client
      .from('rewards')
      .select('image_path')
      .eq('id', rewardId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.warn(
        `[Supabase] Could not fetch image_path before deleting reward ${rewardId}:`,
        fetchError.message
      );
    } else if (rewardData?.image_path) {
      imagePathToDelete = rewardData.image_path;
      console.log(`[Supabase] Found reward image path to delete: ${imagePathToDelete}`);
    }
  } catch (e) {
    console.warn(`[Supabase] Error fetching reward image_path before delete:`, e);
  }

  const { error: deleteDbError } = await client.from('rewards').delete().eq('id', rewardId);

  if (deleteDbError) {
    console.error(`[Supabase] Error deleting reward ${rewardId} from DB:`, deleteDbError.message);
    throw new Error(`Failed to delete reward ${rewardId} from database: ${deleteDbError.message}`);
  }

  console.log(`[Supabase] Reward ${rewardId} deleted successfully from database.`);

  if (imagePathToDelete) {
    await deleteRewardIcon(imagePathToDelete);
  }
};
