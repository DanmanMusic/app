import { TicketTransaction } from '../mocks/mockTickets';

interface TicketHistoryResponse {
  items: TicketTransaction[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

interface BalanceResponse {
  balance: number;
}

/**
 * Fetches ticket transaction history for a specific student or globally.
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
  console.log(
    `[API] Fetching Ticket History: page=${page}, limit=${limit}${studentId ? `, studentId=${studentId}` : ' (Global)'}`
  );
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));
  if (studentId) {
    params.append('studentId', studentId);
  }

  const response = await fetch(`/api/ticket-history?${params.toString()}`);
  console.log(`[API] Ticket History Response status: ${response.status}`);
  if (!response.ok) {
    console.error(`[API] Ticket History Network response was not ok: ${response.statusText}`);
    throw new Error(`Failed to fetch ticket history: ${response.statusText}`);
  }
  const data: TicketHistoryResponse = await response.json();
  console.log(`[API] Received ${data.items?.length} history items. Total: ${data.totalItems}`);
  return data;
};

/**
 * Fetches the current ticket balance for a specific student.
 * NOTE: In a real backend, this might be part of the student profile fetch.
 */
export const fetchStudentBalance = async (studentId: string): Promise<number> => {
  console.log(`[API] Fetching balance for student ${studentId}`);

  const response = await fetch(`/api/students/${studentId}/balance`);
  console.log(`[API] Student Balance Response status: ${response.status}`);
  if (!response.ok) {
    console.error(`[API] Student Balance Network response was not ok: ${response.statusText}`);
    throw new Error(`Failed to fetch balance for student ${studentId}: ${response.statusText}`);
  }
  const data: BalanceResponse = await response.json();
  console.log(`[API] Received balance for student ${studentId}: ${data.balance}`);
  return data.balance;
};

/**
 * Manually adjusts a student's ticket balance.
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
  console.log(`[API] Adjusting tickets for ${studentId} by ${amount}. Notes: ${notes}`);
  const response = await fetch('/api/ticket-adjustments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, amount, notes, adjusterId }),
  });
  console.log(`[API] Adjust Tickets Response status: ${response.status}`);
  if (!response.ok) {
    let errorMsg = `Failed to adjust tickets: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {}
    console.error(`[API] Adjust Tickets failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  const transaction: TicketTransaction = await response.json();
  console.log(`[API] Ticket adjustment successful (Tx ID: ${transaction.id})`);
  return transaction;
};

/**
 * Redeems a reward for a student, deducting tickets.
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
  console.log(`[API] Redeeming reward ${rewardId} for student ${studentId}`);
  const response = await fetch('/api/reward-redemptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, rewardId, redeemerId }),
  });
  console.log(`[API] Redeem Reward Response status: ${response.status}`);
  if (!response.ok) {
    let errorMsg = `Failed to redeem reward: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorBody.error || errorMsg;
    } catch (e) {}
    console.error(`[API] Redeem Reward failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  const transaction: TicketTransaction = await response.json();
  console.log(`[API] Reward redemption successful (Tx ID: ${transaction.id})`);
  return transaction;
};
