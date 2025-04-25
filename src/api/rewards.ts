import { RewardItem } from '../types/dataTypes';

/**
 * Fetches the entire rewards catalog.
 * TODO: Add pagination/filtering parameters if needed.
 */
export const fetchRewards = async (): Promise<RewardItem[]> => {
  console.log(`[API] Fetching Rewards Catalog`);
  const response = await fetch('/api/rewards');
  console.log(`[API] Rewards Catalog Response status: ${response.status}`);
  if (!response.ok) {
    console.error(`[API] Rewards Catalog Network response was not ok: ${response.statusText}`);
    throw new Error(`Failed to fetch rewards catalog: ${response.statusText}`);
  }

  const data: RewardItem[] = await response.json();
  console.log(`[API] Received ${data?.length} reward items from API mock.`);
  return data;
};

/**
 * Creates a new reward item.
 */
export const createReward = async (rewardData: Omit<RewardItem, 'id'>): Promise<RewardItem> => {
  console.log('[API] Creating reward item:', rewardData.name);
  const response = await fetch('/api/rewards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rewardData),
  });
  console.log(`[API] Create Reward Item Response status: ${response.status}`);
  if (!response.ok) {
    let errorMsg = `Failed to create reward item: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {
      console.log('[API] rewards try/catch error:', e);
    }
    console.error(`[API] Create Reward Item failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  const createdReward: RewardItem = await response.json();
  console.log(`[API] Reward item created successfully (ID: ${createdReward.id})`);
  return createdReward;
};

/**
 * Updates an existing reward item.
 */
export const updateReward = async ({
  rewardId,
  updates,
}: {
  rewardId: string;
  updates: Partial<Omit<RewardItem, 'id'>>;
}): Promise<RewardItem> => {
  console.log(`[API] Updating reward item ${rewardId}:`, updates);
  const response = await fetch(`/api/rewards/${rewardId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  console.log(`[API] Update Reward Item Response status: ${response.status}`);
  if (!response.ok) {
    let errorMsg = `Failed to update reward item ${rewardId}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {
      console.log('[API] rewards try/catch error:', e);
    }
    console.error(`[API] Update Reward Item failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  const updatedReward: RewardItem = await response.json();
  console.log(`[API] Reward item ${rewardId} updated successfully`);
  return updatedReward;
};

/**
 * Deletes a reward item.
 */
export const deleteReward = async (rewardId: string): Promise<void> => {
  console.log(`[API] Deleting reward item ${rewardId}`);
  const response = await fetch(`/api/rewards/${rewardId}`, {
    method: 'DELETE',
  });
  console.log(`[API] Delete Reward Item Response status: ${response.status}`);
  if (!response.ok && response.status !== 204) {
    let errorMsg = `Failed to delete reward item ${rewardId}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {
      console.log('[API] rewards try/catch error:', e);
    }
    console.error(`[API] Delete Reward Item failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  if (response.status === 204) {
    console.log(`[API] Reward item ${rewardId} deleted successfully (204 No Content).`);
  } else {
    console.log(`[API] Reward item ${rewardId} deleted successfully (Status: ${response.status}).`);
  }
};
