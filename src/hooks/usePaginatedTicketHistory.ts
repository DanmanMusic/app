// src/hooks/usePaginatedTicketHistory.ts
import { useState, useCallback } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query'; // Import TQ hooks

// API Client & Types
import { fetchTicketHistory } from '../api/tickets'; // Import API function
import { TicketTransaction } from '../mocks/mockTickets';
// Removed: useData context import

// Define the shape of the return value, adding TQ flags
export interface UsePaginatedTicketHistoryReturn {
  history: TicketTransaction[]; // Transactions for the current page
  currentPage: number;
  totalPages: number;
  totalItems: number; // Added total count
  setPage: (page: number) => void;
  isLoading: boolean; // From TQ
  isFetching: boolean; // From TQ
  isPlaceholderData: boolean; // From TQ
  isError: boolean; // From TQ
  error: Error | null; // From TQ
}

const ITEMS_PER_PAGE = 15; // Page size for global history view

export const usePaginatedTicketHistory = (): UsePaginatedTicketHistoryReturn => {
  // Removed: useData hook call

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);

  // --- TanStack Query ---
  const queryResult = useQuery({
    // Query key for global history includes page and limit
    queryKey: ['ticket-history', { page: currentPage, limit: ITEMS_PER_PAGE }],
    // Query function calls the API client without studentId for global view
    queryFn: () => fetchTicketHistory({ page: currentPage, limit: ITEMS_PER_PAGE }),
    placeholderData: keepPreviousData, // Show previous data while fetching
    staleTime: 1 * 60 * 1000, // History might update frequently
    gcTime: 5 * 60 * 1000,
  });

  // Extract data and state from queryResult
  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  // Memoized values from data or defaults
  const history = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  // Function to change the current page
  const setPage = useCallback(
    (page: number) => {
      console.log(`[usePaginatedTicketHistory] setPage called with: ${page}`);
      let targetPage = page;
      const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
      if (page < 1) {
        targetPage = 1;
      } else if (page > effectiveTotalPages) {
        targetPage = effectiveTotalPages;
      }
      console.log(`[usePaginatedTicketHistory] Setting current page to: ${targetPage}`);
      setCurrentPage(targetPage);
    },
    [totalPages]
  );

  // Return the state and functions needed by components
  return {
    history,
    currentPage,
    totalPages,
    totalItems, // Return total count
    setPage,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    error: error instanceof Error ? error : null,
  };
};