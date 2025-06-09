// src/api/rewards.ts
import { Platform } from 'react-native';

import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

import { getSupabase } from '../lib/supabaseClient';

import { RewardItem } from '../types/dataTypes';

const REWARD_ICONS_BUCKET = 'reward-icons';

// This helper remains unchanged
const uploadRewardIcon = async (imageUri: string, mimeType?: string): Promise<string | null> => {
  const client = getSupabase();
  try {
    const fileExt = mimeType ? mimeType.split('/')[1] : 'jpg';
    const filePath = `public/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    let uploadData: { path: string } | null = null;
    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      if (!response.ok) throw new Error(`Failed to fetch image blob: ${response.statusText}`);
      const imageBlob = await response.blob();
      const { data, error } = await client.storage
        .from(REWARD_ICONS_BUCKET)
        .upload(filePath, imageBlob, {
          contentType: mimeType || imageBlob.type || 'image/jpeg',
          upsert: false,
        });
      if (error) throw error;
      uploadData = data;
    } else {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const { data, error } = await client.storage
        .from(REWARD_ICONS_BUCKET)
        .upload(filePath, decode(base64), { contentType: mimeType || 'image/jpeg', upsert: false });
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

// This helper remains unchanged
const deleteRewardIcon = async (imagePath: string | null): Promise<void> => {
  if (!imagePath) return;
  const client = getSupabase();
  try {
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    const { error } = await client.storage.from(REWARD_ICONS_BUCKET).remove([cleanPath]);
    if (error)
      console.warn(
        `[Supabase Storage] Failed to delete reward icon '${cleanPath}':`,
        error.message
      );
  } catch (e) {
    console.warn(
      `[Supabase Storage] Exception during reward icon deletion for path ${imagePath}:`,
      e
    );
  }
};

// MODIFIED: fetchRewards to include is_goal_eligible
export const fetchRewards = async (): Promise<RewardItem[]> => {
  const client = getSupabase();
  console.log(`[Supabase] Fetching Rewards Catalog`);
  const { data, error } = await client
    .from('rewards')
    .select('id, name, cost, image_path, description, is_goal_eligible') // MODIFIED: Added is_goal_eligible
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
      isGoalEligible: item.is_goal_eligible, // MODIFIED: Map the new property
    };
  });

  return rewards;
};

// MODIFIED: createReward to include isGoalEligible
export const createReward = async ({
  name,
  cost,
  description,
  imageUri,
  mimeType,
  isGoalEligible, // NEW parameter
}: {
  name: string;
  cost: number;
  description?: string;
  imageUri?: string | null;
  mimeType?: string;
  isGoalEligible?: boolean; // NEW parameter
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
    is_goal_eligible?: boolean; // MODIFIED: New DB column
  } = {
    name: name.trim(),
    cost: cost,
    description: description?.trim() || null,
    is_goal_eligible: isGoalEligible ?? false, // MODIFIED: Default to false if not provided
  };

  let uploadedImagePath: string | null = null;
  if (imageUri) {
    uploadedImagePath = await uploadRewardIcon(imageUri, mimeType);
    rewardToInsert.image_path = uploadedImagePath;
  }

  const { data, error } = await client
    .from('rewards')
    .insert(rewardToInsert)
    .select('id, name, cost, image_path, description, is_goal_eligible') // MODIFIED: Select new column
    .single();

  if (error || !data) {
    if (uploadedImagePath) await deleteRewardIcon(uploadedImagePath);
    throw new Error(`Failed to create reward: ${error?.message || 'No data returned'}`);
  }

  let publicUrl: string | undefined = undefined;
  if (data.image_path) {
    const { data: urlData } = client.storage
      .from(REWARD_ICONS_BUCKET)
      .getPublicUrl(data.image_path);
    publicUrl = urlData?.publicUrl;
  }

  const createdReward: RewardItem = {
    id: data.id,
    name: data.name,
    cost: data.cost,
    imageUrl: publicUrl || 'https://via.placeholder.com/100?text=No+Image',
    description: data.description ?? undefined,
    isGoalEligible: data.is_goal_eligible, // MODIFIED: Map new property
  };

  return createdReward;
};

// MODIFIED: updateReward to include isGoalEligible
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
    .select('name, cost, description, image_path, is_goal_eligible') // MODIFIED
    .eq('id', rewardId)
    .single();

  if (currentFetchError || !currentData) {
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
    is_goal_eligible?: boolean; // MODIFIED
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
    updates.description !== undefined &&
    (updates.description?.trim() || null) !== (currentData.description || null)
  ) {
    updatePayload.description = updates.description?.trim() || null;
    needsDbUpdate = true;
  }
  // NEW: Check if isGoalEligible needs updating
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
      newImagePath = await uploadRewardIcon(imageUri, mimeType);
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
    return fetchRewards().then(rewards => rewards.find(r => r.id === rewardId)!); // Re-fetch to be safe
  }

  const { data, error } = await client
    .from('rewards')
    .update(updatePayload)
    .eq('id', rewardId)
    .select('id, name, cost, image_path, description, is_goal_eligible') // MODIFIED
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

  const updatedReward: RewardItem = {
    id: data.id,
    name: data.name,
    cost: data.cost,
    imageUrl: updatedPublicUrl || 'https://via.placeholder.com/100?text=No+Image',
    description: data.description ?? undefined,
    isGoalEligible: data.is_goal_eligible, // MODIFIED
  };

  return updatedReward;
};

// This function remains unchanged
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
