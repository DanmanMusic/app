// Import necessary hooks and types from React and TanStack Query
import { useState, useCallback, useEffect } from 'react';

import { useQuery, keepPreviousData } from '@tanstack/react-query';

// Import the API function to fetch ticket history and the transaction type
import { fetchTicketHistory } from '../api/tickets';
import { TicketTransaction } from '../mocks/mockTickets'; // Assuming type is here

// Define the shape of the object returned by this hook
export interface UsePaginatedStudentHistoryReturn {
  history: TicketTransaction[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  setPage: (page: number) => void;
  isLoading: boolean; // Loading state from TQ
  isFetching: boolean; // Fetching state from TQ (for background updates)
  isPlaceholderData: boolean; // Indicates if placeholder data is shown
  isError: boolean; // Error state from TQ
  error: Error | null; // Error object from TQ
}

// Define the number of items to fetch per page
const ITEMS_PER_PAGE = 10; // Or keep the previous value (was 15 in global history)

// The custom hook function
export const usePaginatedStudentHistory = (
  studentId: string | null | undefined // Accept studentId to fetch history for
): UsePaginatedStudentHistoryReturn => {
  // State for the current page number
  const [currentPage, setCurrentPage] = useState(1);

  // Use TanStack Query's useQuery hook to fetch data
  const queryResult = useQuery({
    // Define the query key. Include studentId, page, and limit.
    queryKey: ['ticket-history', { studentId, page: currentPage, limit: ITEMS_PER_PAGE }],
    // The function that performs the data fetching
    queryFn: () =>
      fetchTicketHistory({
        studentId: studentId ?? undefined, // Pass studentId (or undefined if null)
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      }),
    // Only run the query if a studentId is provided
    enabled: !!studentId,
    // Keep previous data visible while fetching new data
    placeholderData: keepPreviousData,
    // Configure caching behavior
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Destructure the result object from useQuery
  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  // Extract the relevant data from the API response, providing defaults
  const history = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  // Effect to reset the page to 1 if the studentId changes
  useEffect(() => {
    console.log(`[usePaginatedStudentHistory] studentId changed to ${studentId}, resetting page.`);
    // Only reset if the page is not already 1
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    // Dependency array ensures this runs only when studentId changes
  }, [studentId]);

  // Callback function to safely update the current page
  const setPage = useCallback(
    (page: number) => {
      console.log(`[usePaginatedStudentHistory] setPage called with: ${page}`);
      let targetPage = page;
      // Ensure the target page is within valid bounds
      const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
      if (page < 1) {
        targetPage = 1;
      } else if (page > effectiveTotalPages) {
        targetPage = effectiveTotalPages;
      }
      console.log(`[usePaginatedStudentHistory] Setting current page to: ${targetPage}`);
      setCurrentPage(targetPage);
    },
    [totalPages] // Dependency: totalPages
  );

  // Return the state and functions needed by the component
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
