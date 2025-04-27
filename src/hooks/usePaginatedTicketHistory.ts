// src/hooks/usePaginatedTicketHistory.ts
import { useState, useCallback, useEffect } from 'react';
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'; // Added useQueryClient

// Import the Supabase-backed API function and types
import { fetchTicketHistory } from '../api/tickets';
import { TicketTransaction } from '../types/dataTypes';

// Interface for the hook's return value remains the same
export interface UsePaginatedTicketHistoryReturn {
  history: TicketTransaction[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
  error: Error | null;
}

// Production-ready page size
const ITEMS_PER_PAGE = 25; // History lists can often show more items

// NOTE: This hook is intended for GLOBAL history view (no studentId passed)
// For student-specific history, use usePaginatedStudentHistory
export const usePaginatedTicketHistory = (): UsePaginatedTicketHistoryReturn => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  // Define the query key for global history with pagination
  const queryKey = ['ticket-history', { /* No studentId implies global */ page: currentPage, limit: ITEMS_PER_PAGE }];

  const queryResult = useQuery({
    queryKey: queryKey,
    queryFn: () => fetchTicketHistory({ // Use the Supabase API function
        // No studentId is passed, so it fetches global history
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      }),
    placeholderData: keepPreviousData,
    staleTime: 1 * 60 * 1000, // History can change frequently
    gcTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  // Extract data or default
  const history = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  // --- Prefetching Logic (Optional) ---
  useEffect(() => {
    const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
    const prefetchParamsBase = { limit: ITEMS_PER_PAGE }; // No studentId for global

    // Prefetch next page
    if (!isPlaceholderData && currentPage < effectiveTotalPages && !isFetching) {
        const nextPage = currentPage + 1;
        const nextQueryKey = ['ticket-history', { ...prefetchParamsBase, page: nextPage }];
        console.log(`[usePaginatedTicketHistory - Global] Prefetching next page: ${nextPage}`);
        queryClient.prefetchQuery({
            queryKey: nextQueryKey,
            queryFn: () => fetchTicketHistory({ ...prefetchParamsBase, page: nextPage }),
            staleTime: 1 * 60 * 1000,
        });
    }
    // Prefetch previous page
    if (!isPlaceholderData && currentPage > 1 && !isFetching) {
        const prevPage = currentPage - 1;
        const prevQueryKey = ['ticket-history', { ...prefetchParamsBase, page: prevPage }];
        console.log(`[usePaginatedTicketHistory - Global] Prefetching previous page: ${prevPage}`);
        queryClient.prefetchQuery({
            queryKey: prevQueryKey,
            queryFn: () => fetchTicketHistory({ ...prefetchParamsBase, page: prevPage }),
            staleTime: 1 * 60 * 1000,
        });
    }
  }, [currentPage, totalPages, isPlaceholderData, isFetching, queryClient]);
  // --- End Prefetching Logic ---

  // Callback to change page
  const setPage = useCallback(
    (page: number) => {
      console.log(`[usePaginatedTicketHistory - Global] setPage called with: ${page}`);
      let targetPage = page;
      const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
      if (page < 1) {
        targetPage = 1;
      } else if (page > effectiveTotalPages) {
        targetPage = effectiveTotalPages;
      }
       if (targetPage !== currentPage) {
          console.log(`[usePaginatedTicketHistory - Global] Setting current page to: ${targetPage}`);
          setCurrentPage(targetPage);
       } else {
          console.log(`[usePaginatedTicketHistory - Global] Already on page ${targetPage}.`);
       }
    },
    [totalPages, currentPage] // Add currentPage dependency
  );

  return {
    history,
    currentPage,
    totalPages,
    totalItems,
    setPage,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    error: error instanceof Error ? error : null,
  };
};