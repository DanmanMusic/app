// src/api/instruments.ts
import { Instrument } from '../mocks/mockInstruments'; // Assuming type source

// --- API Response Interfaces (Adjust if backend differs) ---
interface InstrumentsListResponse {
  items: Instrument[];
  // Add pagination fields if needed later
}

// --- Fetch Functions ---

/**
 * Fetches all instruments.
 */
export const fetchInstruments = async (): Promise<Instrument[]> => {
  console.log(`[API] Fetching Instruments`);
  const response = await fetch('/api/instruments'); // Simple endpoint
  console.log(`[API] Instruments Response status: ${response.status}`);
  if (!response.ok) {
    console.error(`[API] Instruments Network response was not ok: ${response.statusText}`);
    throw new Error(`Failed to fetch instruments: ${response.statusText}`);
  }
  // Assuming direct list return for now
  const data: Instrument[] = await response.json();
  console.log(`[API] Received ${data?.length} instrument items from API mock.`);
  return data;
};

// --- Mutation Functions ---

/**
 * Creates a new instrument item.
 */
export const createInstrument = async (
  instrumentData: Omit<Instrument, 'id'>
): Promise<Instrument> => {
  console.log('[API] Creating instrument:', instrumentData.name);
  const response = await fetch('/api/instruments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(instrumentData),
  });
  console.log(`[API] Create Instrument Response status: ${response.status}`);
  if (!response.ok) {
    let errorMsg = `Failed to create instrument: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {
      /* Ignore */
    }
    console.error(`[API] Create Instrument failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  const createdInstrument: Instrument = await response.json();
  console.log(`[API] Instrument created successfully (ID: ${createdInstrument.id})`);
  return createdInstrument;
};

/**
 * Updates an existing instrument item.
 */
export const updateInstrument = async ({
  instrumentId,
  updates,
}: {
  instrumentId: string;
  updates: Partial<Omit<Instrument, 'id'>>;
}): Promise<Instrument> => {
  console.log(`[API] Updating instrument ${instrumentId}:`, updates);
  const response = await fetch(`/api/instruments/${instrumentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  console.log(`[API] Update Instrument Response status: ${response.status}`);
  if (!response.ok) {
    let errorMsg = `Failed to update instrument ${instrumentId}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {
      /* Ignore */
    }
    console.error(`[API] Update Instrument failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  const updatedInstrument: Instrument = await response.json();
  console.log(`[API] Instrument ${instrumentId} updated successfully`);
  return updatedInstrument;
};

/**
 * Deletes an instrument item.
 */
export const deleteInstrument = async (instrumentId: string): Promise<void> => {
  console.log(`[API] Deleting instrument ${instrumentId}`);
  const response = await fetch(`/api/instruments/${instrumentId}`, {
    method: 'DELETE',
  });
  console.log(`[API] Delete Instrument Response status: ${response.status}`);
  if (!response.ok && response.status !== 204) {
    let errorMsg = `Failed to delete instrument ${instrumentId}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {
      /* Ignore */
    }
    console.error(`[API] Delete Instrument failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  if (response.status === 204) {
    console.log(`[API] Instrument ${instrumentId} deleted successfully (204 No Content).`);
  } else {
    console.log(`[API] Instrument ${instrumentId} deleted successfully (Status: ${response.status}).`);
  }
};