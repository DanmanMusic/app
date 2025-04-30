import { getSupabase } from '../lib/supabaseClient';
import { TicketTransaction, TransactionType } from '../types/dataTypes';

interface TicketHistoryResponse {
  items: TicketTransaction[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

interface BalanceResponse {
  balance: number;
}

interface RedeemRewardSuccessResponse {
  message: string;
  newBalance: number; // The RPC function returns the calculated new balance
}

interface AdjustTicketsSuccessResponse {
  message: string;
  transaction: TicketTransaction; // Return the created transaction record
  newBalance: number; // Return the new balance calculated by the server
}

const mapDbRowToTicketTransaction = (row: any): TicketTransaction => ({
  id: String(row.id),
  studentId: row.student_id,
  timestamp: row.timestamp,
  amount: row.amount,
  type: row.type as TransactionType,
  sourceId: row.source_id ?? '',
  notes: row.notes ?? undefined,
});

/**
 * Fetches ticket transaction history from Supabase for a specific student or globally.
 */
export const fetchTicketHistory = async ({
  studentId,
  page = 1,
  limit = 15,
}: {
  studentId?: string;
  page?: number;
  limit?: number;
}): Promise<TicketHistoryResponse> => {
  const client = getSupabase();
  const logPrefix = studentId ? `for student ${studentId}` : '(Global)';
  console.log(`[Supabase] Fetching Ticket History ${logPrefix}: page=${page}, limit=${limit}`);

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit - 1;

  let query = client.from('ticket_transactions').select('*', { count: 'exact' });

  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  query = query.order('timestamp', { ascending: false }).range(startIndex, endIndex);

  const { data, error, count } = await query;

  if (error) {
    console.error(`[Supabase] Error fetching ticket history ${logPrefix}:`, error.message);
    throw new Error(`Failed to fetch ticket history: ${error.message}`);
  }

  const totalItems = count ?? 0;
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;

  const historyItems = (data || []).map(mapDbRowToTicketTransaction);

  console.log(
    `[Supabase] Received ${historyItems.length} history items ${logPrefix}. Total: ${totalItems}`
  );
  return { items: historyItems, totalPages, currentPage: page, totalItems };
};

/**
 * Fetches the current ticket balance for a specific student from Supabase.
 * NOTE: This implementation sums transactions, which can be inefficient.
 * Consider using a DB view or function, or a dedicated balance column later.
 */
export const fetchStudentBalance = async (studentId: string): Promise<number> => {
  const client = getSupabase();
  console.log(`[Supabase] Fetching balance for student ${studentId} by summing transactions.`);

  const { data, error } = await client
    .from('ticket_transactions')
    .select('amount')
    .eq('student_id', studentId);

  if (error) {
    console.error(
      `[Supabase] Error fetching transactions to calculate balance for student ${studentId}:`,
      error.message
    );

    throw new Error(`Failed to calculate balance for student ${studentId}: ${error.message}`);
  }

  const balance = (data || []).reduce((sum, transaction) => sum + transaction.amount, 0);

  console.log(`[Supabase] Calculated balance for student ${studentId}: ${balance}`);

  return balance;

  /*

   const { data, error } = await client.rpc('get_student_balance', { p_student_id: studentId });
   if (error) { throw new Error(...) }
   return data ?? 0;
  */
};

export const adjustTickets = async ({
studentId,
amount, // Keep amount as integer (positive or negative)
notes,
// adjusterId is handled by the Edge Function via the auth token
}: {
studentId: string;
amount: number; // Can be positive or negative, but not zero
notes: string;
}): Promise<AdjustTicketsSuccessResponse> => { // Update return type
  const client = getSupabase();
  console.log(`[API adjustTickets] Calling Edge Function "adjustTickets" for student ${studentId}, amount: ${amount}`);

  // Prepare payload for the Edge Function
  const payload = {
      studentId: studentId,
      amount: amount,
      notes: notes,
  };

  // Basic client-side validation
  if (!payload.studentId || typeof payload.amount !== 'number' || !Number.isInteger(payload.amount) || payload.amount === 0 || !payload.notes || payload.notes.trim().length === 0) {
      console.error("[API adjustTickets] Validation failed:", payload);
      throw new Error("Invalid input: Missing student ID, amount (non-zero integer), or notes.");
  }

  console.log('[API adjustTickets] Payload being sent:', payload);

  const { data, error } = await client.functions.invoke('adjustTickets', {
      body: payload,
  });

  if (error) {
      console.error('[API adjustTickets] Error invoking adjustTickets function:', error);
      let detailedError = error.message || 'Unknown function error';
      if (error.context && typeof error.context === 'object' && error.context !== null && 'error' in error.context) { detailedError = String((error.context as any).error) || detailedError; }
      else { try { const parsed = JSON.parse(error.message); if (parsed && parsed.error) detailedError = String(parsed.error); } catch (e) {} }
      if (error.context?.message) { detailedError += ` (Context: ${error.context.message})`; }

      // Throw the error message from the Edge Function (e.g., "Insufficient balance")
      throw new Error(`Ticket adjustment failed: ${detailedError}`);
  }

  console.log('[API adjustTickets] Edge Function returned successfully:', data);

  // Validate the success response structure from the Edge Function
  if (!data || typeof data !== 'object' || typeof data.message !== 'string' || typeof data.transaction !== 'object' || typeof data.newBalance !== 'number') {
       console.error('[API adjustTickets] Edge Function returned unexpected data structure:', data);
       throw new Error('Ticket adjustment function returned invalid data format.');
  }

  // Map the returned transaction data if necessary (or assume Edge Function returns camelCase)
  // For now, assume direct mapping works or adjust if needed
  const responseData = {
      ...data,
      transaction: mapDbRowToTicketTransaction(data.transaction) // Map the nested transaction
  }

  return responseData as AdjustTicketsSuccessResponse;
};

export const redeemReward = async ({
studentId,
rewardId,
// redeemerId is handled by the Edge Function via the auth token, not passed from client API
}: {
studentId: string;
rewardId: string;
}): Promise<RedeemRewardSuccessResponse> => { // Return the success response structure
  const client = getSupabase();
  console.log(`[API redeemReward] Calling Edge Function "redeemReward" for student ${studentId}, reward ${rewardId}`);

  // Prepare payload for the Edge Function
  const payload = {
      studentId: studentId,
      rewardId: rewardId,
  };

  if (!payload.studentId || !payload.rewardId) {
      console.error("[API redeemReward] Validation failed: studentId or rewardId missing.");
      throw new Error("Missing required fields for reward redemption.");
  }

  console.log('[API redeemReward] Payload being sent:', payload);

  const { data, error } = await client.functions.invoke('redeemReward', {
      body: payload,
  });

  if (error) {
      console.error('[API redeemReward] Error invoking redeemReward function:', error);
      let detailedError = error.message || 'Unknown function error';
      if (error.context && typeof error.context === 'object' && error.context !== null && 'error' in error.context) { detailedError = String((error.context as any).error) || detailedError; }
      else { try { const parsed = JSON.parse(error.message); if (parsed && parsed.error) detailedError = String(parsed.error); } catch (e) {} }
      if (error.context?.message) { detailedError += ` (Context: ${error.context.message})`; }

      // Throw the error message received from the Edge Function (e.g., "Insufficient balance")
      throw new Error(`Redemption failed: ${detailedError}`);
  }

  console.log('[API redeemReward] Edge Function returned successfully:', data);

  // Validate the success response structure
  if (!data || typeof data !== 'object' || typeof data.message !== 'string' || typeof data.newBalance !== 'number') {
       console.error('[API redeemReward] Edge Function returned unexpected data structure:', data);
       throw new Error('Reward redemption function returned invalid data format.');
  }

  // Return the success message and new balance
  return data as RedeemRewardSuccessResponse;
};
