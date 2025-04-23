// src/hooks/usePaginatedStudentHistory.ts
import { useState, useCallback, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query'; // Import TQ hooks

// API Client & Types
import { fetchTicketHistory } from '../api/tickets'; // Import API function
import { TicketTransaction } from '../mocks/mockTickets';
// Removed: useData context import

// Define the shape of the return value, adding TQ flags and total count
export interface UsePaginatedStudentHistoryReturn {
  history: TicketTransaction[];
  currentPage: number;
  totalPages: number;
  totalItems: number; // Renamed from totalHistoryCount
  setPage: (page: number) => void;
  isLoading: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
  error: Error | null;
}

const ITEMS_PER_PAGE = 10; // Page size for student history view

export const usePaginatedStudentHistory = (
  studentId: string | null | undefined
): UsePaginatedStudentHistoryReturn => {
  // Removed: useData hook call

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);

  // --- TanStack Query ---
  const queryResult = useQuery({
    // Query key includes 'studentId' to differentiate student histories
    // and trigger refetch when studentId changes.
    queryKey: ['ticket-history', { studentId, page: currentPage, limit: ITEMS_PER_PAGE }],
    // Query function calls the API client with the studentId
    queryFn: () =>
      fetchTicketHistory({
        studentId: studentId ?? undefined, // Pass studentId if available
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      }),
    // Only enable the query if studentId is provided
    enabled: !!studentId,
    placeholderData: keepPreviousData,
    staleTime: 1 * 60 * 1000, // History might update
    gcTime: 5 * 60 * 1000,
  });

  // Extract data and state from queryResult
  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  // Memoized values from data or defaults
  const history = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  // Reset to page 1 if studentId changes
  useEffect(() => {
    console.log(`[usePaginatedStudentHistory] studentId changed to ${studentId}, resetting page.`);
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    // TQ refetches automatically because studentId is in the queryKey
  }, [studentId]); // Removed currentPage dependency

  // Function to change the current page
  const setPage = useCallback(
    (page: number) => {
      console.log(`[usePaginatedStudentHistory] setPage called with: ${page}`);
      let targetPage = page;
      const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
      if (page < 1) {
        targetPage = 1;
      } else if (page > effectiveTotalPages) {
        targetPage = effectiveTotalPages;
      }
      console.log(`[usePaginatedStudentHistory] Setting current page to: ${targetPage}`);
      setCurrentPage(targetPage);
    },
    [totalPages]
  );

  // Return the state and functions needed by components
  return {
    history,
    currentPage,
    totalPages,
    totalItems, // Use totalItems from API response
    setPage,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    error: error instanceof Error ? error : null,
  };
};