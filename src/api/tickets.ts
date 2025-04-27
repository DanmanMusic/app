// src/api/tickets.ts
import { getSupabase } from '../lib/supabaseClient';
import { TicketTransaction, TransactionType } from '../types/dataTypes'; // Import TransactionType

// Response structure for history remains the same
interface TicketHistoryResponse {
  items: TicketTransaction[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

// Interface for balance (remains simple)
interface BalanceResponse {
  balance: number;
}

// Helper to map DB row to TicketTransaction type
const mapDbRowToTicketTransaction = (row: any): TicketTransaction => ({
    id: String(row.id), // bigserial might come as number, ensure string
    studentId: row.student_id,
    timestamp: row.timestamp, // ISO string from timestamptz
    amount: row.amount,
    type: row.type as TransactionType, // Cast from DB enum/text
    sourceId: row.source_id ?? '', // Ensure string, fallback to empty
    notes: row.notes ?? undefined, // Ensure undefined if null
});


/**
 * Fetches ticket transaction history from Supabase for a specific student or globally.
 */
export const fetchTicketHistory = async ({
  studentId,
  page = 1,
  limit = 15, // Keep default limit consistent
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

  // Base query
  let query = client
    .from('ticket_transactions')
    .select('*', { count: 'exact' }); // Select all columns for mapping

  // Filter by student if ID provided
  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  // Apply ordering (newest first) and pagination
  query = query
    .order('timestamp', { ascending: false }) // Use quoted "timestamp" column name
    .range(startIndex, endIndex);

  // Execute query
  const { data, error, count } = await query;

  if (error) {
    console.error(`[Supabase] Error fetching ticket history ${logPrefix}:`, error.message);
    throw new Error(`Failed to fetch ticket history: ${error.message}`);
  }

  const totalItems = count ?? 0;
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;

  // Map results
  const historyItems = (data || []).map(mapDbRowToTicketTransaction);

  console.log(`[Supabase] Received ${historyItems.length} history items ${logPrefix}. Total: ${totalItems}`);
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

  // Use Supabase aggregate function to sum the 'amount' column
  const { data, error } = await client
    .from('ticket_transactions')
    .select('amount')
    .eq('student_id', studentId);

  if (error) {
     console.error(`[Supabase] Error fetching transactions to calculate balance for student ${studentId}:`, error.message);
     // Decide how to handle - return 0 or throw? Throwing is safer.
     throw new Error(`Failed to calculate balance for student ${studentId}: ${error.message}`);
  }

  // Sum the amounts from the fetched transactions
  const balance = (data || []).reduce((sum, transaction) => sum + transaction.amount, 0);

  console.log(`[Supabase] Calculated balance for student ${studentId}: ${balance}`);
  // Return the calculated balance
  return balance;

  /*
   // Alternative using rpc (if you create a DB function `get_student_balance(student_uuid)`)
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
    console.error("adjustTickets API called, but implementation is deferred to Edge Function.");
    throw new Error("Ticket adjustment functionality requires server-side implementation (Edge Function).");
    // --- Conceptual Edge Function Logic ---
    // 1. Validate input (studentId, amount, notes, adjusterId, permissions)
    // 2. START TRANSACTION
    // 3. Insert into ticket_transactions table.
    // 4. Update student's balance (e.g., in profiles table or a balances table).
    // 5. COMMIT TRANSACTION
    // 6. Return the created TicketTransaction record.
};

/**
 * Redeems a reward for a student, deducting tickets.
 * DEFERRED: This requires server-side logic (Edge Function) for atomicity.
 */
export const redeemReward = async ({
  studentId,
  rewardId,
  redeemerId, // Admin/Teacher performing the redemption
}: {
  studentId: string;
  rewardId: string;
  redeemerId: string;
}): Promise<TicketTransaction> => {
     console.error("redeemReward API called, but implementation is deferred to Edge Function.");
     throw new Error("Reward redemption functionality requires server-side implementation (Edge Function).");
    // --- Conceptual Edge Function Logic ---
    // 1. Validate input (studentId, rewardId, redeemerId, permissions)
    // 2. Fetch reward cost from 'rewards' table.
    // 3. Fetch student's current balance.
    // 4. Check if balance >= cost. If not, throw error.
    // 5. START TRANSACTION
    // 6. Insert negative transaction into ticket_transactions table (-cost).
    // 7. Update student's balance.
    // 8. COMMIT TRANSACTION
    // 9. (Optional) Trigger 'redemption_celebration' announcement?
    // 10. Return the created TicketTransaction record.
};