// src/hooks/usePaginatedStudentHistory.ts
import { useState, useCallback, useEffect } from 'react';
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'; // Added useQueryClient

// Import the Supabase-backed API function and types
import { fetchTicketHistory } from '../api/tickets';
import { TicketTransaction } from '../types/dataTypes';

// Interface for the hook's return value remains the same
export interface UsePaginatedStudentHistoryReturn {
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

// Production-ready page size for history lists
const ITEMS_PER_PAGE = 20; // Increased from 10/15

export const usePaginatedStudentHistory = (
  studentId: string | null | undefined // Hook requires a student ID
): UsePaginatedStudentHistoryReturn => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  // Define the query key, dependent on studentId and pagination
  const queryKey = ['ticket-history', { studentId, page: currentPage, limit: ITEMS_PER_PAGE }];

  const queryResult = useQuery({
    queryKey: queryKey,
    queryFn: () => fetchTicketHistory({ // Use the Supabase API function
        studentId: studentId ?? undefined, // Pass undefined if null/undefined
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      }),
    // Only run the query if a valid studentId is provided
    enabled: !!studentId,
    placeholderData: keepPreviousData,
    staleTime: 1 * 60 * 1000, // History might update frequently with actions
    gcTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  // Extract data or default
  const history = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  // Effect to reset page to 1 if the studentId changes
  useEffect(() => {
    // Only reset if not already on page 1 and studentId has actually changed
    if (currentPage !== 1) {
        console.log(`[usePaginatedStudentHistory] studentId changed to ${studentId}, resetting page to 1.`);
        setCurrentPage(1);
    }
    // Query refetches automatically due to queryKey change
  }, [studentId]); // Dependency is only studentId


   // --- Prefetching Logic (Optional) ---
   useEffect(() => {
    // Ensure studentId is valid before prefetching
    if (!studentId) return;

    const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
    const prefetchParamsBase = { studentId: studentId ?? undefined, limit: ITEMS_PER_PAGE };

    // Prefetch next page
    if (!isPlaceholderData && currentPage < effectiveTotalPages && !isFetching) {
        const nextPage = currentPage + 1;
        const nextQueryKey = ['ticket-history', { ...prefetchParamsBase, page: nextPage }];
        console.log(`[usePaginatedStudentHistory] Prefetching next page for student ${studentId}: ${nextPage}`);
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
        console.log(`[usePaginatedStudentHistory] Prefetching previous page for student ${studentId}: ${prevPage}`);
        queryClient.prefetchQuery({
            queryKey: prevQueryKey,
            queryFn: () => fetchTicketHistory({ ...prefetchParamsBase, page: prevPage }),
            staleTime: 1 * 60 * 1000,
        });
    }
  }, [currentPage, totalPages, isPlaceholderData, isFetching, queryClient, studentId]); // Add studentId dependency
  // --- End Prefetching Logic ---


  // Callback to change page
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
       if (targetPage !== currentPage) {
           console.log(`[usePaginatedStudentHistory] Setting current page to: ${targetPage}`);
           setCurrentPage(targetPage);
       } else {
           console.log(`[usePaginatedStudentHistory] Already on page ${targetPage}.`);
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