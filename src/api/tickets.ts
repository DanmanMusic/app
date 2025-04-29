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

/**
 * Manually adjusts a student's ticket balance.
 * DEFERRED: This requires server-side logic (Edge Function) for atomicity.
 */
export const adjustTickets = async ({
  studentId,
  amount,
  notes,
  adjusterId,
}: {
  studentId: string;
  amount: number;
  notes: string;
  adjusterId: string;
}): Promise<TicketTransaction> => {
  console.error('adjustTickets API called, but implementation is deferred to Edge Function.');
  throw new Error(
    'Ticket adjustment functionality requires server-side implementation (Edge Function).'
  );
};

/**
 * Redeems a reward for a student, deducting tickets.
 * DEFERRED: This requires server-side logic (Edge Function) for atomicity.
 */
export const redeemReward = async ({
  studentId,
  rewardId,
  redeemerId,
}: {
  studentId: string;
  rewardId: string;
  redeemerId: string;
}): Promise<TicketTransaction> => {
  console.error('redeemReward API called, but implementation is deferred to Edge Function.');
  throw new Error(
    'Reward redemption functionality requires server-side implementation (Edge Function).'
  );
};
