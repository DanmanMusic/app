// src/api/rewards.ts
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

import { getSupabase } from '../lib/supabaseClient';
import { RewardItem } from '../types/dataTypes';

const REWARD_ICONS_BUCKET = 'reward-icons';

// --- Storage Helper Functions (Adapted for Rewards) ---

const uploadRewardIcon = async (
  imageUri: string,
  mimeType?: string
): Promise<string | null> => {
  const client = getSupabase();
  try {
    const fileExt = mimeType ? mimeType.split('/')[1] : 'jpg';
    const filePath = `public/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

    console.log(`[Supabase Storage] Uploading reward icon to bucket '${REWARD_ICONS_BUCKET}' at path: ${filePath}`);

    let uploadError: any | null = null;
    let uploadData: { path: string } | null = null;

    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      if (!response.ok) {
          throw new Error(`Failed to fetch image blob from URI: ${response.statusText}`);
      }
      const imageBlob = await response.blob();
      const effectiveMimeType = mimeType || imageBlob.type || 'image/jpeg';

      console.log(`[Supabase Storage] Uploading Blob (Web). Size: ${imageBlob.size}, Type: ${effectiveMimeType}`);
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
      console.log(`[Supabase Storage] Successfully deleted reward icon '${cleanPath}' from Storage.`);
    }
  } catch (e) {
    console.warn(`[Supabase Storage] Exception during reward icon deletion for path ${imagePath}:`, e);
  }
};


// --- API Functions ---

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

  // Transform data to match RewardItem type, ensuring image_path is handled
  // and generating the full public URL for imageUrl
  const rewards = (data || []).map(item => {
      let publicUrl: string | undefined = undefined;
      if (item.image_path) {
        try {
           // Use getPublicUrl to generate the full URL expected by RewardItem['imageUrl']
           const { data: urlData } = client.storage.from(REWARD_ICONS_BUCKET).getPublicUrl(item.image_path);
           publicUrl = urlData?.publicUrl;
        } catch (urlError) {
            console.error(`[Supabase Storage] Error getting public URL for reward ${item.id} path ${item.image_path}:`, urlError);
        }
      }

      return {
          id: item.id,
          name: item.name,
          cost: item.cost,
          imageUrl: publicUrl || 'https://via.placeholder.com/100?text=No+Image', // Use placeholder if no URL
          description: item.description ?? undefined, // Ensure description is string or undefined
      };
  });

  return rewards;
};


export const createReward = async ({
  name,
  cost,
  description,
  imageUri, // Expecting URI from image picker
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
    throw new Error("Reward name and a non-negative cost are required.");
  }

  const rewardToInsert: {
      name: string;
      cost: number;
      description?: string | null;
      image_path?: string | null; // Store path in DB
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
        // Throw upload error directly to prevent DB insert attempt
        console.error('[Supabase] Image upload failed during createReward:', uploadError);
        throw uploadError; // Propagate error
    }
  }

  // Insert into database
  const { data, error } = await client
    .from('rewards')
    .insert(rewardToInsert)
    .select('id, name, cost, image_path, description')
    .single();

  if (error || !data) {
    console.error(`[Supabase] Error creating reward in DB:`, error?.message);
    // If DB insert failed but an image *was* uploaded, attempt cleanup
    if (uploadedImagePath) {
      console.warn(`[Supabase] DB insert failed for reward ${name}, attempting to clean up uploaded image: ${uploadedImagePath}`);
      await deleteRewardIcon(uploadedImagePath);
    }
    throw new Error(`Failed to create reward: ${error?.message || 'No data returned'}`);
  }

  // Generate public URL for the returned object
  let publicUrl: string | undefined = undefined;
  if (data.image_path) {
     try {
        const { data: urlData } = client.storage.from(REWARD_ICONS_BUCKET).getPublicUrl(data.image_path);
        publicUrl = urlData?.publicUrl;
     } catch(urlError) {
        console.error(`[Supabase Storage] Error getting public URL for newly created reward ${data.id}:`, urlError);
     }
  }

  // Return data matching RewardItem structure
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
  imageUri, // New image URI from picker, or null to remove, or undefined to leave unchanged
  mimeType,
}: {
  rewardId: string;
  updates: Partial<Omit<RewardItem, 'id' | 'imageUrl'>>; // Don't allow direct imageUrl update
  imageUri?: string | null;
  mimeType?: string;
}): Promise<RewardItem> => {
    const client = getSupabase();
    console.log(`[Supabase] Updating reward item ${rewardId} with:`, updates, "New Image URI:", imageUri === undefined ? "Unchanged" : (imageUri || "Removed"));

    // Fetch current reward data to get old image path and check diffs
    const { data: currentData, error: currentFetchError } = await client
      .from('rewards')
      .select('name, cost, description, image_path')
      .eq('id', rewardId)
      .single();

    if (currentFetchError || !currentData) {
      console.error(`[Supabase] Failed to fetch current reward ${rewardId} before update`, currentFetchError);
      throw new Error(`Failed to fetch current reward data before update: ${currentFetchError?.message || 'Not found'}`);
    }

    const oldImagePath = currentData.image_path;
    const updatePayload: {
        name?: string;
        cost?: number;
        description?: string | null;
        image_path?: string | null;
    } = {};
    let needsDbUpdate = false;

    // Check and prepare field updates
    if (updates.name && updates.name.trim() && updates.name.trim() !== currentData.name) {
        updatePayload.name = updates.name.trim();
        needsDbUpdate = true;
    }
    if (updates.cost !== undefined && updates.cost >= 0 && updates.cost !== currentData.cost) {
        updatePayload.cost = updates.cost;
        needsDbUpdate = true;
    }
    const newDescription = updates.description === undefined ? currentData.description : (updates.description?.trim() || null);
    if (newDescription !== currentData.description) {
        updatePayload.description = newDescription;
        needsDbUpdate = true;
    }

    // Handle image update logic
    let newImagePath: string | null | undefined = undefined; // undefined = no change intent

    if (imageUri !== undefined) { // Image change was intended (new URI or null for removal)
        if (imageUri) { // New image provided
            console.log(`[Supabase] New image provided for reward ${rewardId}. Uploading...`);
            try {
                newImagePath = await uploadRewardIcon(imageUri, mimeType);
            } catch (uploadError) {
                console.error('[Supabase] Image upload failed during updateReward:', uploadError);
                throw uploadError; // Stop the update if upload fails
            }
            if (newImagePath !== oldImagePath) {
                updatePayload.image_path = newImagePath;
                needsDbUpdate = true;
                // Delete old image only after successful upload of new one
                if (oldImagePath) {
                    console.log(`[Supabase] Deleting old reward image: ${oldImagePath}`);
                    await deleteRewardIcon(oldImagePath); // Await deletion, but don't block if it fails
                }
            } else {
                // Uploaded image resulted in the same path somehow? Or no actual change needed.
                console.log(`[Supabase] Uploaded image path ${newImagePath} is same as old ${oldImagePath}. No image path update needed.`);
                newImagePath = undefined; // Reset intent as no DB change needed for path
            }
        } else if (imageUri === null && oldImagePath) { // Explicit removal
            console.log(`[Supabase] Request to remove image for reward ${rewardId}.`);
            updatePayload.image_path = null;
            newImagePath = null; // Mark for DB update
            needsDbUpdate = true;
            await deleteRewardIcon(oldImagePath);
        }
    }

    if (!needsDbUpdate) {
        console.warn('[Supabase] updateReward called with no changes to apply.');
        // Return current data formatted as RewardItem
         let publicUrl: string | undefined = undefined;
         if (currentData.image_path) {
             try {
                 const { data: urlData } = client.storage.from(REWARD_ICONS_BUCKET).getPublicUrl(currentData.image_path);
                 publicUrl = urlData?.publicUrl;
             } catch (urlError) {
                 console.error(`[Supabase Storage] Error getting public URL for reward ${rewardId} path ${currentData.image_path}:`, urlError);
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

    // Perform the database update
    console.log(`[Supabase] Performing DB update for reward ${rewardId} with payload:`, updatePayload);
    const { data, error } = await client
      .from('rewards')
      .update(updatePayload)
      .eq('id', rewardId)
      .select('id, name, cost, image_path, description')
      .single();

    if (error || !data) {
      console.error(`[Supabase] Error updating reward ${rewardId} in DB:`, error?.message);
      // If DB update failed but a *new* image was involved, try to clean up the newly uploaded/updated storage object
       if (newImagePath !== undefined && typeof newImagePath === 'string') {
           console.warn(`[Supabase] DB update failed for reward ${rewardId}, attempting to clean up newly uploaded image: ${newImagePath}`);
           await deleteRewardIcon(newImagePath);
       }
       // If removal was intended and DB failed, the storage item might already be deleted, less critical to revert
      throw new Error(`Failed to update reward ${rewardId}: ${error?.message || 'No data returned'}`);
    }

    // Generate public URL for the updated object
    let updatedPublicUrl: string | undefined = undefined;
    if (data.image_path) {
       try {
          const { data: urlData } = client.storage.from(REWARD_ICONS_BUCKET).getPublicUrl(data.image_path);
          updatedPublicUrl = urlData?.publicUrl;
       } catch(urlError) {
          console.error(`[Supabase Storage] Error getting public URL for updated reward ${data.id}:`, urlError);
       }
    }

    // Return data matching RewardItem structure
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
    // Fetch the image path before deleting the DB record
    const { data: rewardData, error: fetchError } = await client
        .from('rewards')
        .select('image_path')
        .eq('id', rewardId)
        .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
        console.warn(`[Supabase] Could not fetch image_path before deleting reward ${rewardId}:`, fetchError.message);
    } else if (rewardData?.image_path) {
        imagePathToDelete = rewardData.image_path;
        console.log(`[Supabase] Found reward image path to delete: ${imagePathToDelete}`);
    }
  } catch (e) {
      console.warn(`[Supabase] Error fetching reward image_path before delete:`, e);
  }

  // Delete the database record
  const { error: deleteDbError } = await client
    .from('rewards')
    .delete()
    .eq('id', rewardId);

  if (deleteDbError) {
    console.error(`[Supabase] Error deleting reward ${rewardId} from DB:`, deleteDbError.message);
    throw new Error(`Failed to delete reward ${rewardId} from database: ${deleteDbError.message}`);
  }

  console.log(`[Supabase] Reward ${rewardId} deleted successfully from database.`);

  // If DB delete was successful, attempt to delete the image from storage
  if (imagePathToDelete) {
    await deleteRewardIcon(imagePathToDelete);
  }
};