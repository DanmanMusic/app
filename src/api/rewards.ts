// src/api/rewards.ts
import { Platform } from 'react-native';

import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

import { getSupabase } from '../lib/supabaseClient';

import { RewardItem } from '../types/dataTypes';

const REWARD_ICONS_BUCKET = 'reward-icons';

// --- MODIFIED: uploadRewardIcon to be company/reward specific ---
const uploadRewardIcon = async (
  companyId: string,
  rewardId: string,
  imageUri: string,
  mimeType?: string
): Promise<string | null> => {
  const client = getSupabase();
  try {
    const fileExt = mimeType ? mimeType.split('/')[1] : 'jpg';
    // NEW PATH STRUCTURE: {company_id}/{reward_id}/icon.{ext}
    const filePath = `${companyId}/${rewardId}/icon.${fileExt}`;
    let uploadData: { path: string } | null = null;

    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      if (!response.ok) throw new Error(`Failed to fetch image blob: ${response.statusText}`);
      const imageBlob = await response.blob();
      const { data, error } = await client.storage
        .from(REWARD_ICONS_BUCKET)
        .upload(filePath, imageBlob, {
          contentType: mimeType || imageBlob.type || 'image/jpeg',
          upsert: true, // Use upsert because the path is now predictable
        });
      if (error) throw error;
      uploadData = data;
    } else {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const { data, error } = await client.storage
        .from(REWARD_ICONS_BUCKET)
        .upload(filePath, decode(base64), {
          contentType: mimeType || 'image/jpeg',
          upsert: true, // Use upsert
        });
      if (error) throw error;
      uploadData = data;
    }
    return uploadData?.path ?? null;
  } catch (e) {
    console.error('[Supabase Storage] Exception during reward icon upload:', e);
    throw new Error(
      `Failed to upload reward image: ${e instanceof Error ? e.message : 'Unknown error'}`
    );
  }
};

// --- MODIFIED: deleteRewardIcon to handle potential folder deletion ---
const deleteRewardIcon = async (imagePath: string | null): Promise<void> => {
  if (!imagePath) return;
  const client = getSupabase();
  try {
    const { error } = await client.storage.from(REWARD_ICONS_BUCKET).remove([imagePath]);
    if (error) {
      console.warn(
        `[Supabase Storage] Failed to delete reward icon '${imagePath}':`,
        error.message
      );
    } else {
      console.log(`[Supabase Storage] Successfully deleted reward icon '${imagePath}'.`);
    }
  } catch (e) {
    console.warn(
      `[Supabase Storage] Exception during reward icon deletion for path ${imagePath}:`,
      e
    );
  }
};

// fetchRewards is unchanged and correct.
export const fetchRewards = async (): Promise<RewardItem[]> => {
  const client = getSupabase();
  console.log(`[Supabase] Fetching Rewards Catalog`);
  const { data, error } = await client
    .from('rewards')
    .select('id, name, cost, image_path, description, is_goal_eligible')
    .order('cost', { ascending: true });

  if (error) {
    console.error(`[Supabase] Error fetching rewards:`, error.message);
    throw new Error(`Failed to fetch rewards catalog: ${error.message}`);
  }

  const rewards = (data || []).map(item => {
    let publicUrl: string | undefined = undefined;
    if (item.image_path) {
      const { data: urlData } = client.storage
        .from(REWARD_ICONS_BUCKET)
        .getPublicUrl(item.image_path);
      publicUrl = urlData?.publicUrl;
    }

    return {
      id: item.id,
      name: item.name,
      cost: item.cost,
      imageUrl: publicUrl || 'https://via.placeholder.com/100?text=No+Image',
      description: item.description ?? undefined,
      isGoalEligible: item.is_goal_eligible,
    };
  });

  return rewards;
};

// --- REWRITTEN: createReward to handle the two-step process ---
export const createReward = async ({
  name,
  cost,
  description,
  imageUri,
  mimeType,
  isGoalEligible,
  companyId,
}: {
  name: string;
  cost: number;
  description?: string;
  imageUri?: string | null;
  mimeType?: string;
  isGoalEligible?: boolean;
  companyId: string;
}): Promise<RewardItem> => {
  const client = getSupabase();
  if (!name.trim() || cost == null || cost < 0) {
    throw new Error('Reward name and a non-negative cost are required.');
  }
  if (!companyId) {
    throw new Error('Company ID is required to create a reward.');
  }

  // Step 1: Insert reward data WITHOUT the image path first to get an ID.
  const initialRewardData = {
    name: name.trim(),
    cost,
    description: description?.trim() || null,
    is_goal_eligible: isGoalEligible ?? false,
    company_id: companyId,
  };

  const { data: createdRewardRow, error: insertError } = await client
    .from('rewards')
    .insert(initialRewardData)
    .select('id, name, cost, image_path, description, is_goal_eligible')
    .single();

  if (insertError || !createdRewardRow) {
    throw new Error(`Failed to create reward item: ${insertError?.message || 'No data returned'}`);
  }

  // If no image was provided, we are done.
  if (!imageUri) {
    return {
      id: createdRewardRow.id,
      name: createdRewardRow.name,
      cost: createdRewardRow.cost,
      imageUrl: 'https://via.placeholder.com/100?text=No+Image',
      description: createdRewardRow.description ?? undefined,
      isGoalEligible: createdRewardRow.is_goal_eligible,
    };
  }

  // Step 2: Now that we have an ID, upload the image to the correct path.
  const rewardId = createdRewardRow.id;
  let finalImagePath: string | null = null;
  try {
    finalImagePath = await uploadRewardIcon(companyId, rewardId, imageUri, mimeType);

    if (!finalImagePath) {
      throw new Error('Image uploaded, but no path was returned.');
    }

    // Step 3: Update the reward row with the new image_path.
    const { data: updatedRewardRow, error: updateError } = await client
      .from('rewards')
      .update({ image_path: finalImagePath })
      .eq('id', rewardId)
      .select('id, name, cost, image_path, description, is_goal_eligible')
      .single();

    if (updateError || !updatedRewardRow) {
      throw new Error(`Reward created, but failed to link image: ${updateError?.message}`);
    }

    // Success! Return the fully formed reward item.
    const { data: urlData } = client.storage.from(REWARD_ICONS_BUCKET).getPublicUrl(finalImagePath);
    return {
      id: updatedRewardRow.id,
      name: updatedRewardRow.name,
      cost: updatedRewardRow.cost,
      imageUrl: urlData?.publicUrl || 'https://via.placeholder.com/100?text=No+Image',
      description: updatedRewardRow.description ?? undefined,
      isGoalEligible: updatedRewardRow.is_goal_eligible,
    };
  } catch (uploadOrUpdateError) {
    console.error(
      'Error during image upload/update step, rolling back reward creation...',
      uploadOrUpdateError
    );
    await client.from('rewards').delete().eq('id', rewardId);
    if (finalImagePath) {
      await deleteRewardIcon(finalImagePath); // Also attempt to clean up the orphaned storage object
    }
    throw uploadOrUpdateError;
  }
};

// --- MODIFIED: updateReward to use the new path structure ---
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

  const { data: currentData, error: currentFetchError } = await client
    .from('rewards')
    .select('name, cost, description, image_path, is_goal_eligible, company_id') // Get company_id
    .eq('id', rewardId)
    .single();

  if (currentFetchError || !currentData) {
    throw new Error(
      `Failed to fetch current reward data: ${currentFetchError?.message || 'Not found'}`
    );
  }

  const { company_id: companyId, image_path: oldImagePath } = currentData;

  const updatePayload: {
    name?: string;
    cost?: number;
    description?: string | null;
    image_path?: string | null;
    is_goal_eligible?: boolean;
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
  if (
    updates.hasOwnProperty('description') &&
    (updates.description?.trim() || null) !== (currentData.description || null)
  ) {
    updatePayload.description = updates.description?.trim() || null;
    needsDbUpdate = true;
  }
  if (
    updates.isGoalEligible !== undefined &&
    updates.isGoalEligible !== currentData.is_goal_eligible
  ) {
    updatePayload.is_goal_eligible = updates.isGoalEligible;
    needsDbUpdate = true;
  }

  let newImagePath: string | null | undefined = undefined;
  if (imageUri !== undefined) {
    if (imageUri) {
      newImagePath = await uploadRewardIcon(companyId, rewardId, imageUri, mimeType);
      if (newImagePath !== oldImagePath) {
        updatePayload.image_path = newImagePath;
        needsDbUpdate = true;
        if (oldImagePath) await deleteRewardIcon(oldImagePath);
      }
    } else if (imageUri === null && oldImagePath) {
      updatePayload.image_path = null;
      needsDbUpdate = true;
      await deleteRewardIcon(oldImagePath);
    }
  }

  if (!needsDbUpdate) {
    return fetchRewards().then(rewards => rewards.find(r => r.id === rewardId)!);
  }

  const { data, error } = await client
    .from('rewards')
    .update(updatePayload)
    .eq('id', rewardId)
    .select('id, name, cost, image_path, description, is_goal_eligible')
    .single();

  if (error || !data) {
    if (newImagePath !== undefined && typeof newImagePath === 'string') {
      await deleteRewardIcon(newImagePath);
    }
    throw new Error(`Failed to update reward ${rewardId}: ${error?.message || 'No data returned'}`);
  }

  let updatedPublicUrl: string | undefined = undefined;
  if (data.image_path) {
    const { data: urlData } = client.storage
      .from(REWARD_ICONS_BUCKET)
      .getPublicUrl(data.image_path);
    updatedPublicUrl = urlData?.publicUrl;
  }

  return {
    id: data.id,
    name: data.name,
    cost: data.cost,
    imageUrl: updatedPublicUrl || 'https://via.placeholder.com/100?text=No+Image',
    description: data.description ?? undefined,
    isGoalEligible: data.is_goal_eligible,
  };
};

// deleteReward is unchanged and correct.
export const deleteReward = async (rewardId: string): Promise<void> => {
  const client = getSupabase();
  let imagePathToDelete: string | null = null;
  try {
    const { data: rewardData } = await client
      .from('rewards')
      .select('image_path')
      .eq('id', rewardId)
      .maybeSingle();
    if (rewardData?.image_path) imagePathToDelete = rewardData.image_path;
  } catch (e) {
    /* ignore */
  }

  const { error: deleteDbError } = await client.from('rewards').delete().eq('id', rewardId);
  if (deleteDbError)
    throw new Error(`Failed to delete reward from database: ${deleteDbError.message}`);

  if (imagePathToDelete) await deleteRewardIcon(imagePathToDelete);
};
